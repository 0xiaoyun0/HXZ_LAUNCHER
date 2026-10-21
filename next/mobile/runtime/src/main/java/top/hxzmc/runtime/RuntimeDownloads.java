package top.hxzmc.runtime;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.ZipFile;

/** Official first, equivalent mirrors second. Stages, resumes and verifies before activation. */
public final class RuntimeDownloads {
    public interface Http { Response open(String url,long offset) throws Exception; }
    public interface Mirrors { List<String> alternatives(String official) throws Exception; }
    public static final class Response implements AutoCloseable {
        public final int status; public final long length; public final String contentRange;
        public final InputStream stream; private final Runnable close;
        public Response(int status,long length,String contentRange,InputStream stream,Runnable close) {
            this.status=status; this.length=length; this.contentRange=contentRange; this.stream=stream; this.close=close;
        }
        @Override public void close() throws IOException { try {stream.close();} finally {if(close!=null)close.run();} }
    }
    public static final class FileSpec {
        public final File file; public final String url,sha1,sha256; public final long size;
        private final boolean archiveIntegrity;
        public FileSpec(File file,String url,String sha1,long size) {this(file,url,sha1,"",size);}
        public FileSpec(File file,String url,String sha1,String sha256,long size) {
            this(file,url,sha1,sha256,size,false);
        }
        private FileSpec(File file,String url,String sha1,String sha256,long size,boolean archiveIntegrity) {
            if(size< -1 || size>8L*1024*1024*1024 || (sha1!=null&&!sha1.isEmpty()&&!sha1.matches("(?i)[0-9a-f]{40}"))
                    || (sha256!=null&&!sha256.isEmpty()&&!sha256.matches("(?i)[0-9a-f]{64}"))) throw new IllegalArgumentException("Invalid integrity metadata");
            this.file=file; this.url=url==null?"":url; this.sha1=sha1==null?"":sha1; this.sha256=sha256==null?"":sha256; this.size=size;
            this.archiveIntegrity=archiveIntegrity;
        }
        /** Structural validation is separate from the digest: hashless repositories may serve HTML with HTTP 200. */
        public FileSpec withArchiveIntegrity() {return new FileSpec(file,url,sha1,sha256,size,true);}
        private boolean formatValid(File candidate) throws IOException {
            if(!archiveIntegrity)return true;
            try(ZipFile archive=new ZipFile(candidate)) {return true;}
            catch(java.util.zip.ZipException malformed) {return false;}
        }
        public boolean valid() throws Exception {
            RuntimeFiles.noLinks(file);
            if(!file.isFile() || file.length()==0 || (size>=0&&file.length()!=size))return false;
            if(!formatValid(file))return false;
            if(!sha1.isEmpty()&&!sha1.equalsIgnoreCase(RuntimeFiles.hash(file,"SHA-1")))return false;
            if(!sha256.isEmpty()&&!sha256.equalsIgnoreCase(RuntimeFiles.hash(file,"SHA-256")))return false;
            if(!sha1.isEmpty()||!sha256.isEmpty())return true;
            File stamp=new File(file.getPath()+".hxz-sha256"); RuntimeFiles.noLinks(stamp);
            return stamp.isFile()&&stamp.length()==64&&new String(Files.readAllBytes(stamp.toPath()),StandardCharsets.US_ASCII).equals(RuntimeFiles.hash(file,"SHA-256"));
        }
    }
    private final Http http; private final Mirrors mirrors;
    public final int concurrency;
    public RuntimeDownloads(Http http,Mirrors mirrors) {this(http,mirrors,8);}
    public RuntimeDownloads(Http http,Mirrors mirrors,int concurrency) {
        if(concurrency<4||concurrency>32)throw new IllegalArgumentException("Download concurrency must be 4..32");
        this.http=Objects.requireNonNull(http);this.mirrors=mirrors;this.concurrency=concurrency;
    }
    public RuntimeDownloads(int concurrency) {this(new UrlConnectionHttp(15000,15000),new DownloadMirrors(),concurrency);}
    public RuntimeDownloads() {this(8);}
    /** Only concurrency tasks exist at once even for a 100,000-object index. Progress may be concurrent. */
    public void fetchAll(List<FileSpec> files,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        EngineHost.Cancellation group=new EngineHost.Cancellation(cancel);
        ExecutorService pool=Executors.newFixedThreadPool(concurrency);CompletionService<Void> completed=new ExecutorCompletionService<>(pool);
        int next=0,running=0;boolean success=false;
        try {
            while(next<files.size()||running>0) {
                group.check();while(next<files.size()&&running<concurrency) {
                    FileSpec file=files.get(next++);completed.submit(()->{fetch(file,group,progress);return null;});running++;
                }
                try {Future<Void> result=completed.poll(100,TimeUnit.MILLISECONDS);if(result==null)continue;result.get();running--;}
                catch(ExecutionException e){Throwable cause=e.getCause();if(cause instanceof Exception)throw (Exception)cause;throw new IOException("Download worker failed",cause);}
            }success=true;
        } finally {
            if(!success)group.cancel();pool.shutdownNow();
            if(!pool.awaitTermination(20,TimeUnit.SECONDS))throw new IOException("Download workers failed to stop");
        }
    }
    private static final class PermanentDownloadException extends IOException {PermanentDownloadException(String message){super(message);}}
    public void fetch(FileSpec spec,EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        cancel.check(); if(spec.valid())return;
        if(spec.url.isEmpty())throw new IOException("Missing generated dependency: "+spec.file);
        LinkedHashSet<String> urls=new LinkedHashSet<>();urls.add(url(spec.url));
        if(mirrors!=null)for(String alternative:mirrors.alternatives(spec.url))urls.add(url(alternative));
        if(urls.size()>32)throw new IOException("Too many download sources");
        RuntimeFiles.noLinks(spec.file); Files.createDirectories(spec.file.getParentFile().toPath());
        Exception failure=null;Set<String> permanentlyFailed=new HashSet<>();
        // Complete a source round before retrying transient failures. An official failure never
        // makes the next file start at a mirror. 404/auth/hash failures are not retried.
        for(int attempt=0;attempt<5;attempt++)for(String source:urls) {
            if(permanentlyFailed.contains(source))continue;
            cancel.check();
            // A separate partial per source prevents mixing unverified, hashless mirror content.
            byte[] sourceHash=java.security.MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder sourceKey=new StringBuilder();for(int i=0;i<12;i++)sourceKey.append(String.format(Locale.ROOT,"%02x",sourceHash[i]&255));
            File partial=new File(spec.file.getPath()+".part-"+sourceKey);
            RuntimeFiles.noLinks(partial);
            try {
                // Mutable metadata without an authoritative digest cannot safely reuse a Range.
                if(spec.sha1.isEmpty()&&spec.sha256.isEmpty())Files.deleteIfExists(partial.toPath());
                long offset=partial.isFile()?partial.length():0;
                if(spec.size>=0&&offset>spec.size){Files.delete(partial.toPath());offset=0;}
                if(offset>0&&spec.size==offset&&verified(partial,spec)) {activate(partial,spec);return;}
                try(Response response=http.open(source,offset)) {
                    if(response.status!=200&&response.status!=206) {
                        String message="HTTP "+response.status+" from "+new URI(source).getHost();
                        if(response.status!=408&&response.status!=429&&response.status<500)throw new PermanentDownloadException(message);
                        throw new IOException(message);
                    }
                    boolean append=offset>0&&response.status==206;
                    if(response.status==206 && (response.contentRange==null||!response.contentRange.startsWith("bytes "+offset+"-")))throw new IOException("Invalid Content-Range");
                    if(!append)offset=0;
                    long total=spec.size>=0?spec.size:response.length<0?-1:offset+response.length;
                    long written=offset;
                    try(OutputStream out=new FileOutputStream(partial,append)) {
                        byte[] buffer=new byte[131072];int n;
                        while((n=response.stream.read(buffer))!=-1) {
                            cancel.check(); written+=n;
                            if(written>8L*1024*1024*1024 || (spec.size>=0&&written>spec.size))throw new IOException("Download exceeds declared size");
                            out.write(buffer,0,n);if(progress!=null)progress.update("download",spec.file.getName(),written,total);
                        }
                    }
                    if(total>=0&&written!=total)throw new IOException("Truncated download response");
                }
                cancel.check();
                if(!verified(partial,spec)) {Files.deleteIfExists(partial.toPath());throw new PermanentDownloadException("Download integrity mismatch: "+spec.file.getName());}
                activate(partial,spec);return;
            } catch(java.util.concurrent.CancellationException e) {throw e;}
            catch(PermanentDownloadException e){cancel.check();failure=e;permanentlyFailed.add(source);}
            catch(Exception e){cancel.check();failure=e;}
        }
        throw new IOException("All equivalent sources failed for "+spec.file.getName(),failure);
    }
    private static boolean verified(File file,FileSpec spec) throws Exception {
        if(!file.isFile()||file.length()==0||(spec.size>=0&&file.length()!=spec.size))return false;
        if(!spec.formatValid(file))return false;
        return (spec.sha1.isEmpty()||spec.sha1.equalsIgnoreCase(RuntimeFiles.hash(file,"SHA-1")))
                &&(spec.sha256.isEmpty()||spec.sha256.equalsIgnoreCase(RuntimeFiles.hash(file,"SHA-256")));
    }
    /** Pins an installer-bundled/generated file with no upstream digest after successful processing. */
    public static void pin(File file) throws Exception {
        RuntimeFiles.noLinks(file); if(!file.isFile()||file.length()==0)throw new IOException("Missing/empty output: "+file);
        File stamp=new File(file.getPath()+".hxz-sha256"); RuntimeFiles.noLinks(stamp);
        Files.write(stamp.toPath(),RuntimeFiles.hash(file,"SHA-256").getBytes(StandardCharsets.US_ASCII));
    }
    private static void activate(File partial,FileSpec spec) throws Exception {RuntimeFiles.replace(partial,spec.file);pin(spec.file);}
    public static String url(String value) throws Exception {
        URI uri=new URI(value); if(!Arrays.asList("https","http").contains(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawFragment()!=null)throw new IOException("Invalid download URL");
        return uri.toASCIIString();
    }
    public static final class UrlConnectionHttp implements Http {
        private final int connectTimeout,readTimeout;
        public UrlConnectionHttp(int connectTimeout,int readTimeout){this.connectTimeout=connectTimeout;this.readTimeout=readTimeout;}
        @Override public Response open(String initial,long offset) throws Exception {
            String next=url(initial);
            for(int redirects=0;redirects<=5;redirects++) {
                HttpURLConnection connection=(HttpURLConnection)new URL(next).openConnection();
                boolean handedOff=false;
                try {
                connection.setConnectTimeout(connectTimeout);connection.setReadTimeout(readTimeout);connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("User-Agent","HXZ-IndependentRuntime/0.8.4");connection.setRequestProperty("Accept-Encoding","identity");
                if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
                int status=connection.getResponseCode();
                if(Arrays.asList(301,302,303,307,308).contains(status)) {
                    String location=connection.getHeaderField("Location"); connection.disconnect();
                    if(location==null)throw new IOException("Redirect without location");
                    String target=url(new URI(next).resolve(location).toString());
                    if(next.startsWith("https:")&&!target.startsWith("https:"))throw new IOException("HTTPS downgrade rejected");
                    next=target;continue;
                }
                InputStream stream=status>=400?connection.getErrorStream():connection.getInputStream();
                if(stream==null)stream=new ByteArrayInputStream(new byte[0]);
                Response response=new Response(status,connection.getContentLengthLong(),connection.getHeaderField("Content-Range"),stream,connection::disconnect);handedOff=true;return response;
                }finally {if(!handedOff)connection.disconnect();}
            }
            throw new IOException("Too many redirects");
        }
    }
}
