package up.hxz;

import com.google.gson.*;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** GameInstaller bounds file concurrency; each file uses one source at a time. */
final class Network {
    final int timeout,retries;
    private final ConcurrentHashMap<String,Long> unhealthy=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Long> latency=new ConcurrentHashMap<>();
    private static String host(String url){try{return new URL(url).getHost();}catch(Exception e){return url;}}
    final AtomicLong received=new AtomicLong();
    private final AtomicLong verified=new AtomicLong();
    private final Set<RaceState> transfers=ConcurrentHashMap.newKeySet();
    long usefulBytes(){long sum=verified.get();for(RaceState state:transfers)sum+=state.bytes.get();return sum;}
    String currentFile(){for(RaceState state:transfers)return state.label;return "";}
    int activeFiles(){return transfers.size();}
    Network(int seconds,int retries){this(seconds,retries,8);}
    Network(int seconds,int retries,int concurrency){
        this.timeout=seconds*1000;this.retries=retries;System.setProperty("http.maxConnections",String.valueOf(Math.max(16,concurrency)));
    }
    private static final class RaceState {
        final AtomicLong bytes=new AtomicLong();
        String label;
    }
    private static void checkCancelled()throws InterruptedIOException{
        if(Thread.currentThread().isInterrupted())throw new InterruptedIOException("下载已取消");
    }
    HttpURLConnection connect(String raw)throws IOException{
        return connect(raw,null,null);
    }
    private HttpURLConnection connect(String raw,Set<HttpURLConnection> tracked,RaceState state)throws IOException{
        URL url=new URL(raw);if(!url.getProtocol().equals("https")&&!url.getProtocol().equals("http"))throw new IOException("只允许 HTTP(S) 下载");
        for(int i=0;i<6;i++){
            HttpURLConnection c=(HttpURLConnection)url.openConnection();c.setConnectTimeout(Math.min(timeout,10000));c.setReadTimeout(timeout);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","HXZ-UP/1.0");
            if(tracked!=null)tracked.add(c);
            int status;
            try{checkCancelled();status=c.getResponseCode();}
            catch(IOException e){c.disconnect();if(tracked!=null)tracked.remove(c);throw e;}
            if(status>=300&&status<400){String location=c.getHeaderField("Location");c.disconnect();if(tracked!=null)tracked.remove(c);if(location==null)throw new IOException("重定向缺少地址");URL next=new URL(url,location);if(!next.getProtocol().equals("http")&&!next.getProtocol().equals("https"))throw new IOException("无效重定向协议");if(url.getProtocol().equals("https")&&!next.getProtocol().equals("https"))throw new IOException("拒绝从 HTTPS 降级");url=next;continue;}
            if(status!=200){String retryAfter=c.getHeaderField("Retry-After");c.disconnect();if(tracked!=null)tracked.remove(c);throw new HttpFailure(status,raw,retryAfter);}return c;
        }throw new IOException("重定向次数过多");
    }
    private static final class HttpFailure extends NetworkFailure {
        final int status;
        final long retryAfter;
        HttpFailure(int status,String url,String header){super("HTTP "+status+" · "+url);this.status=status;this.retryAfter=parseRetryAfter(header);}
    }
    private static long parseRetryAfter(String header){
        if(header==null)return 0;
        String value=header.trim();
        if(value.matches("[0-9]+")){
            try{return Math.min(60001,Math.multiplyExact(Long.parseLong(value),1000));}
            catch(NumberFormatException|ArithmeticException e){return 60001;}
        }
        try{return Math.max(0,Math.min(60001,ZonedDateTime.parse(value,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli()-System.currentTimeMillis()));}
        catch(DateTimeParseException|ArithmeticException e){return 0;}
    }
    private static long retryDelay(IOException failure,int attempt){
        long requested=0;
        if(failure instanceof HttpFailure){
            HttpFailure http=(HttpFailure)failure;
            if(http.status>=400&&http.status<500&&http.status!=408&&http.status!=429)return -1;
            if(http.status==429||http.status==503)requested=http.retryAfter;
            // Do not retry earlier than a long server cooldown; allow other sources to win.
            if(requested>60000)return -1;
        }
        long backoff=250L<<Math.min(attempt,4);
        return Math.max(requested,backoff)+ThreadLocalRandom.current().nextLong(251);
    }
    String text(String url,int limit)throws IOException{
        HttpURLConnection connection=connect(url);
        try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int n;
            while((n=input.read(buffer))!=-1){if(output.size()+n>limit)throw new IOException("页面超过大小限制");output.write(buffer,0,n);}
            return new String(output.toByteArray(),StandardCharsets.UTF_8);
        }finally{connection.disconnect();}
    }
    JsonObject json(String url)throws IOException{
        HttpURLConnection c=connect(url);
        try(InputStream in=c.getInputStream();Reader reader=new InputStreamReader(new FilterInputStream(in){
            private long count;
            @Override public int read()throws IOException{int b=super.read();if(b>=0&&++count>IO.MAX_JSON)throw new IOException("服务端元数据过大");return b;}
            @Override public int read(byte[] b,int off,int len)throws IOException{int n=in.read(b,off,len);if(n>0){count+=n;if(count>IO.MAX_JSON)throw new IOException("服务端元数据过大");}return n;}
        },StandardCharsets.UTF_8)){
            return JsonParser.parseReader(reader).getAsJsonObject();
        }catch(JsonParseException|IllegalStateException e){throw new IOException("服务端返回无效 JSON",e);}finally{c.disconnect();}
    }
    Path race(List<String> urls,Path directory,String sha1,long expected)throws IOException,InterruptedException{
        String label="";if(!urls.isEmpty())try{String path=new URI(urls.get(0)).getPath();label=path.substring(path.lastIndexOf('/')+1);}catch(Exception ignored){}
        return race(urls,directory,sha1,expected,label);
    }
    Path race(List<String> urls,Path directory,String sha1,long expected,String label)throws IOException,InterruptedException{
        return race(urls,directory,sha1,expected,label,null);
    }
    JsonObject jsonSources(List<String> urls,Path directory,String label,String requiredArray)throws IOException{
        Path downloaded;
        try{downloaded=race(urls,directory,null,-1,label,requiredArray);}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException("安装元数据下载已取消",e);}
        try{return IO.read(downloaded);}finally{Files.deleteIfExists(downloaded);}
    }
    private static void validateJson(Path path,String requiredArray)throws IOException{
        // Validate each competing response without building multiple JSON object trees in heap.
        try(JsonReader reader=new JsonReader(Files.newBufferedReader(path,StandardCharsets.UTF_8))){
            if(reader.peek()!=JsonToken.BEGIN_OBJECT)throw new IOException("安装源没有返回 JSON 对象");
            int depth=0;boolean found=false;
            do{
                switch(reader.peek()){
                    case BEGIN_OBJECT:reader.beginObject();depth++;break;
                    case BEGIN_ARRAY:reader.beginArray();depth++;break;
                    case END_OBJECT:reader.endObject();depth--;break;
                    case END_ARRAY:reader.endArray();depth--;break;
                    case NAME:
                        String name=reader.nextName();
                        if(depth==1&&name.equals(requiredArray)){
                            if(reader.peek()!=JsonToken.BEGIN_ARRAY)throw new IOException("安装元数据缺少有效 "+requiredArray);
                            found=true;
                        }
                        break;
                    case END_DOCUMENT:throw new IOException("安装元数据不完整");
                    default:reader.skipValue();
                }
                if(depth>128)throw new IOException("安装元数据嵌套过深");
            }while(depth>0);
            if(reader.peek()!=JsonToken.END_DOCUMENT)throw new IOException("安装元数据包含多余内容");
            if(!found)throw new IOException("安装元数据缺少 "+requiredArray);
        }catch(IllegalStateException e){throw new IOException("无效安装元数据",e);}
    }
    private Path race(List<String> urls,Path directory,String sha1,long expected,String label,String requiredArray)throws IOException,InterruptedException{
        List<String> unique=new ArrayList<>(new LinkedHashSet<>(urls));if(unique.isEmpty())throw new IOException("没有下载地址");if(unique.size()>12)throw new IOException("单文件下载源超过 12 个");
        Map<String,Long> weights=new HashMap<>();long now=System.currentTimeMillis();
        for(String u:unique)weights.put(u,(unhealthy.getOrDefault(host(u),0L)>now?1000000L:0L)+latency.getOrDefault(host(u),300L));
        unique.sort(Comparator.comparingLong(weights::get));
        RaceState state=new RaceState();state.label=label;transfers.add(state);
        int[] attempts=new int[unique.size()];long[] readyAt=new long[unique.size()];
        String[] errors=new String[unique.size()];
        try{
            while(true){
                for(int i=0;i<unique.size();i++){
                    checkCancelled();
                    if(attempts[i]>retries||readyAt[i]>System.currentTimeMillis())continue;
                    String url=unique.get(i);int attempt=attempts[i]++;
                    state.bytes.set(0);
                    try{
                        long started=System.nanoTime();Path file=downloadSource(url,directory,sha1,expected,requiredArray,state);
                        latency.put(host(url),Math.min(30000,(System.nanoTime()-started)/1000000));unhealthy.remove(host(url));
                        verified.addAndGet(Files.size(file));return file;
                    }catch(IOException failure){
                        checkCancelled();errors[i]=url+" → "+failure.getMessage();
                        if(!(failure instanceof HttpFailure)||((HttpFailure)failure).status==429||((HttpFailure)failure).status>=500)unhealthy.put(host(url),System.currentTimeMillis()+15000);
                        System.err.println("[下载换源] "+label+" · "+host(url)+" · "+failure.getClass().getSimpleName()+" · 尝试 "+(attempt+1));
                        long delay=retryDelay(failure,attempt);
                        if(delay<0)attempts[i]=retries+1;
                        else readyAt[i]=System.currentTimeMillis()+delay;
                    }
                }
                long next=Long.MAX_VALUE;
                for(int i=0;i<unique.size();i++)if(attempts[i]<=retries)next=Math.min(next,readyAt[i]);
                if(next==Long.MAX_VALUE)throw new NetworkFailure("所有下载源均失败\n"+String.join("\n",errors));
                // Retry only after the server's cooldown, with no open stream or held file.
                Thread.sleep(Math.max(1,next-System.currentTimeMillis()));
            }
        }finally{transfers.remove(state);}
    }
    private Path downloadSource(String url,Path directory,String sha1,long expected,String requiredArray,RaceState state)throws IOException{
        checkCancelled();Path temp=Files.createTempFile(directory,"download-",".part");
        HttpURLConnection c=null;boolean keep=false;
        try{
            c=connect(url);checkCancelled();
            long advertised=c.getContentLengthLong();if(expected>=0&&advertised>=0&&advertised!=expected)throw new IOException("长度不匹配");
            long maximum=requiredArray!=null?IO.MAX_JSON:8L*1024*1024*1024;if(advertised>maximum)throw new IOException("文件超过大小限制");
            MessageDigest digest=IO.digest();long count=0;byte[] buffer=new byte[128*1024];
            try(InputStream in=c.getInputStream();OutputStream out=Files.newOutputStream(temp)){
                int n;while((n=in.read(buffer))!=-1){checkCancelled();count+=n;if((expected>=0&&count>expected)||count>maximum)throw new IOException("文件超过大小限制");out.write(buffer,0,n);digest.update(buffer,0,n);received.addAndGet(n);state.bytes.set(count);}
            }
            checkCancelled();
            if(expected>=0&&count!=expected)throw new IOException("下载不完整");
            if(sha1!=null&&!IO.hex(digest.digest()).equalsIgnoreCase(sha1))throw new IOException("SHA1 校验失败");
            if(requiredArray!=null)validateJson(temp,requiredArray);
            keep=true;return temp;
        }finally{
            try{if(c!=null&&!keep)c.disconnect();}finally{if(!keep)Files.deleteIfExists(temp);}
        }
    }
}
