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

/** All file races share one bounded network executor. */
final class Network {
    final int timeout,retries;
    final AtomicLong received=new AtomicLong();
    private final AtomicLong verified=new AtomicLong();
    private final Set<RaceState> transfers=ConcurrentHashMap.newKeySet();
    long usefulBytes(){long sum=verified.get();for(RaceState state:transfers)sum+=state.bytes.get();return sum;}
    String currentFile(){for(RaceState state:transfers)return state.label;return "";}
    int activeFiles(){return transfers.size();}
    private final ThreadPoolExecutor sources;
    Network(int seconds,int retries){this(seconds,retries,32);}
    Network(int seconds,int retries,int concurrency){
        this.timeout=seconds*1000;this.retries=retries;
        int limit=Math.max(2,Math.min(16,concurrency));
        sources=new ThreadPoolExecutor(limit,limit,30,TimeUnit.SECONDS,new ArrayBlockingQueue<Runnable>(64*12),r->{Thread t=new Thread(r,"hxz-source");t.setDaemon(true);return t;});
        sources.allowCoreThreadTimeOut(true);
    }
    private static final class RaceState {
        final AtomicLong bytes=new AtomicLong();
        String label;
        boolean stopped; int active;
        synchronized boolean enter(){if(stopped)return false;active++;return true;}
        synchronized void leave(){active--;notifyAll();}
        synchronized boolean stopped(){return stopped;}
        synchronized void stop(){stopped=true;}
        synchronized void join(long millis)throws IOException{
            boolean interrupted=Thread.interrupted();long end=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(millis);
            try{while(active>0){long left=end-System.nanoTime();if(left<=0)throw new IOException("Download workers did not exit");try{TimeUnit.NANOSECONDS.timedWait(this,left);}catch(InterruptedException e){interrupted=true;}}}
            finally{if(interrupted)Thread.currentThread().interrupt();}
        }
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
            try{if(state!=null&&state.stopped())throw new IOException("Cancelled");status=c.getResponseCode();}
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
        BlockingQueue<FutureTask<Path>> completion=new LinkedBlockingQueue<>();RaceState state=new RaceState();
        state.label=label;transfers.add(state);
        Set<HttpURLConnection> connections=ConcurrentHashMap.newKeySet();Set<Path> temps=ConcurrentHashMap.newKeySet();List<FutureTask<Path>> futures=new ArrayList<>();List<String> errors=new ArrayList<>();Path winner=null;
        try{
            for(String url:unique){
                FutureTask<Path> task=new FutureTask<Path>(()->{
                if(!state.enter())throw new InterruptedException();
                try{
                IOException last=null;
                for(int attempt=0;attempt<=retries&&!state.stopped();attempt++){
                    HttpURLConnection c=null;Path temp=Files.createTempFile(directory,"download-",".part");temps.add(temp);
                    try{
                        if(state.stopped()||Thread.currentThread().isInterrupted())throw new InterruptedException();
                        c=connect(url,connections,state);if(state.stopped())throw new InterruptedException();
                        long advertised=c.getContentLengthLong();if(expected>=0&&advertised>=0&&advertised!=expected)throw new IOException("长度不匹配");
                        long maximum=requiredArray!=null?IO.MAX_JSON:8L*1024*1024*1024;if(advertised>maximum)throw new IOException("文件超过大小限制");
                        MessageDigest digest=IO.digest();long count=0;byte[] buffer=new byte[128*1024];
                        try(InputStream in=c.getInputStream();OutputStream out=Files.newOutputStream(temp)){
                            int n;while((n=in.read(buffer))!=-1){if(state.stopped()||Thread.currentThread().isInterrupted())throw new InterruptedException();count+=n;if((expected>=0&&count>expected)||count>maximum)throw new IOException("文件超过大小限制");out.write(buffer,0,n);digest.update(buffer,0,n);received.addAndGet(n);for(long old=state.bytes.get();count>old;old=state.bytes.get())if(state.bytes.compareAndSet(old,count))break;}
                        }
                        if(expected>=0&&count!=expected)throw new IOException("下载不完整");if(sha1!=null&&!IO.hex(digest.digest()).equalsIgnoreCase(sha1))throw new IOException("SHA1 校验失败");
                        if(requiredArray!=null)validateJson(temp,requiredArray);
                        return temp;
                    }catch(IOException e){last=e;Files.deleteIfExists(temp);temps.remove(temp);}
                    finally{if(c!=null){connections.remove(c);c.disconnect();}}
                    if(attempt<retries&&!state.stopped()){
                        long delay=retryDelay(last,attempt);if(delay<0)break;
                        // Interruptible sleep holds no connection and no temporary file.
                        Thread.sleep(delay);
                    }
                }
                throw new IOException(url+" → "+(last==null?"已取消":last.getMessage()),last);
                }finally{state.leave();}
                }){@Override protected void done(){completion.add(this);}};
                futures.add(task);sources.execute(task);
            }
            for(int i=0;i<unique.size();i++){
                try{winner=completion.take().get();break;}catch(ExecutionException e){errors.add(String.valueOf(e.getCause()));}
            }
            if(winner==null)throw new NetworkFailure("所有下载源均失败\n"+String.join("\n",errors));return winner;
        }catch(RejectedExecutionException e){throw new IOException("Download queue is full",e);}
        finally{
            state.stop();for(FutureTask<Path> f:futures){f.cancel(true);sources.remove(f);}for(HttpURLConnection c:connections)c.disconnect();
            // A cancelled Future may still have a running callable; wait before deleting files.
            try{state.join(timeout+12000L);for(Path p:temps)if(!p.equals(winner))Files.deleteIfExists(p);}
            finally{transfers.remove(state);if(winner!=null)verified.addAndGet(Files.size(winner));}
        }
    }
}
