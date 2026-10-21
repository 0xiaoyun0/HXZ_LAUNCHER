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

/** Verified multi-source transfers with a shared connection budget and cancellable retries. */
final class Network {
    private static final DownloadRateLimiter RATE_LIMIT=new DownloadRateLimiter();
    final int timeout,retries;
    private volatile Semaphore slots;
    private Semaphore extraRanges;
    private int concurrencyLimit;
    private boolean official(){return Boolean.parseBoolean(System.getProperty("hxz.launcher.official","true"));}
    private static final ExecutorService SOURCES=Executors.newFixedThreadPool(128,r->{Thread t=new Thread(null,r,"hxz-download-source",256*1024);t.setDaemon(true);return t;});
    void concurrency(int count){concurrencyLimit=Math.max(1,Math.min(128,count));slots=new Semaphore(concurrencyLimit,true);extraRanges=new Semaphore(concurrencyLimit/2);}
    private final ConcurrentHashMap<String,Long> unhealthy=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Long> latency=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Long> cooldown=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Long> reported=new ConcurrentHashMap<>();
    private static String host(String url){try{return new URL(url).getHost();}catch(Exception e){return "地址无效";}}
    static String safeURL(String raw){
        try{URI uri=new URI(raw);String scheme=uri.getScheme(),host=uri.getHost();if(scheme==null||host==null)return "[地址已隐藏]";return scheme+"://"+host+(uri.getPort()<0?"":":"+uri.getPort())+(uri.getRawPath()==null?"":uri.getRawPath());}
        catch(Exception ignored){return "[地址已隐藏]";}
    }
    static String safeMessage(String value){
        if(value==null)return "网络请求失败";
        java.util.regex.Matcher matches=java.util.regex.Pattern.compile("(?i)https?://[^\\s<>\\\"']+").matcher(value);StringBuffer out=new StringBuffer();
        while(matches.find())matches.appendReplacement(out,java.util.regex.Matcher.quoteReplacement(safeURL(matches.group())));matches.appendTail(out);return out.toString();
    }
    // Never retain a raw nested cause: JDK/Gson messages can embed a complete URL.
    static IOException safeFailure(Throwable failure){return safeFailure(failure,0);}
    private static IOException safeFailure(Throwable failure,int depth){
        String message=safeMessage(failure.getMessage());IOException copy;
        if(failure instanceof HttpFailure){HttpFailure http=(HttpFailure)failure;copy=new HttpFailure(message,http.status,http.retryAfter);}
        else if(failure instanceof SocketTimeoutException)copy=new SocketTimeoutException(message);
        else if(failure instanceof UnknownHostException)copy=new UnknownHostException(message);
        else if(failure instanceof SocketException)copy=new SocketException(message);
        else if(failure instanceof javax.net.ssl.SSLException)copy=new javax.net.ssl.SSLException(message);
        else if(failure instanceof InterruptedIOException)copy=new InterruptedIOException(message);
        else if(failure instanceof NetworkFailure)copy=new NetworkFailure(message);
        else if(failure instanceof FileSystemException){FileSystemException file=(FileSystemException)failure;copy=new FileSystemException(safeMessage(file.getFile()),file.getOtherFile()==null?null:safeMessage(file.getOtherFile()),safeMessage(file.getReason()));}
        else copy=new IOException(message);
        copy.setStackTrace(failure.getStackTrace());
        if(depth<8){if(failure.getCause()!=null&&failure.getCause()!=failure)copy.initCause(safeFailure(failure.getCause(),depth+1));for(Throwable suppressed:failure.getSuppressed())if(suppressed!=failure)copy.addSuppressed(safeFailure(suppressed,depth+1));}
        return copy;
    }
    final AtomicLong received=new AtomicLong();
    private final AtomicLong verified=new AtomicLong();
    private final Set<RaceState> transfers=ConcurrentHashMap.newKeySet();
    void cancelActive(){cancelActive(null);}
    void cancelActive(Thread owner){for(RaceState state:transfers){if(owner!=null&&state.owner!=owner)continue;synchronized(state){state.cancelled=true;state.notifyAll();}for(HttpURLConnection c:state.connections)c.disconnect();}}
    private static void pause(RaceState state,long millis)throws IOException,InterruptedException{
        long end=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(millis);synchronized(state){while(!state.cancelled){checkCancelled();long remaining=end-System.nanoTime();if(remaining<=0)return;TimeUnit.NANOSECONDS.timedWait(state,remaining);}throw new InterruptedIOException("下载已取消");}
    }
    long usefulBytes(){long sum=verified.get();for(RaceState state:transfers)sum+=state.bytes.get();return sum;}
    String currentFile(){for(RaceState state:transfers)return describe(state);return "";}
    List<String> activeDetails(){List<String> out=new ArrayList<>();for(RaceState state:transfers){out.add(describe(state));if(out.size()>=8)break;}return out;}
    private String describe(RaceState state){return state.label+(state.expected>0?String.format(Locale.ROOT," · %.2f / %.2f MB",state.bytes.get()/1048576.0,state.expected/1048576.0):"");}
    int activeFiles(){return transfers.size();}
    Network(int seconds,int retries){this(seconds,retries,32);}
    Network(int seconds,int retries,int concurrency){
        this.timeout=seconds*1000;this.retries=retries;concurrency(concurrency);System.setProperty("http.maxConnections",String.valueOf(Math.max(16,concurrency)));
    }
    private static final class RaceState {
        final Thread owner=Thread.currentThread();
        final AtomicLong bytes=new AtomicLong();
        String label;
        long expected;
        final Set<HttpURLConnection> connections=ConcurrentHashMap.newKeySet();
        volatile boolean cancelled;
        boolean persistent;
        final Map<String,Path> cachePaths=new HashMap<>();
        final Map<String,Path> partials=new HashMap<>();
    }
    private final class Pace {
        long mark=System.nanoTime(),bytes;
        void add(int n,long remaining)throws IOException{bytes+=n;long ms=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-mark),window=Long.getLong("hxz.download.stallMillis",10000L);if(ms>=window){long minimum=remaining>256*1024&&transfers.size()<=Math.max(1,concurrencyLimit/4)?32:2;if(bytes<Math.max(512,window*minimum))throw new SocketTimeoutException("节点持续低速，切换备用来源");bytes=0;mark=System.nanoTime();}}
    }
    private static void checkCancelled()throws InterruptedIOException{
        if(Thread.currentThread().isInterrupted())throw new InterruptedIOException("下载已取消");
    }
    HttpURLConnection connect(String raw)throws IOException{
        return connect(raw,null,null);
    }
    private HttpURLConnection connect(String raw,Set<HttpURLConnection> tracked,RaceState state)throws IOException{
        return connect(raw,tracked,state,0);
    }
    private HttpURLConnection connect(String raw,Set<HttpURLConnection> tracked,RaceState state,long offset)throws IOException{
        return connect(raw,tracked,state,offset,-1);
    }
    private HttpURLConnection connect(String raw,Set<HttpURLConnection> tracked,RaceState state,long offset,long end)throws IOException{
        try{return connectRaw(raw,tracked,state,offset,end);}catch(IOException failure){throw safeFailure(failure);}
    }
    private HttpURLConnection connectRaw(String raw,Set<HttpURLConnection> tracked,RaceState state,long offset,long end)throws IOException{
        URL url;try{url=new URL(raw);}catch(MalformedURLException e){throw safeFailure(e);}if(!url.getProtocol().equals("https")&&!url.getProtocol().equals("http"))throw new IOException("只允许 HTTP(S) 下载");
        for(int i=0;i<6;i++){
            HttpURLConnection c=(HttpURLConnection)url.openConnection();c.setConnectTimeout(Math.max(1,Integer.getInteger("hxz.download.connectMillis",Math.min(timeout,6000))));c.setReadTimeout(Math.max(1,Integer.getInteger("hxz.download.idleMillis",Math.min(timeout,10000))));c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","HXZ-UP/1.0");
            c.setRequestProperty("Accept-Encoding","identity");if(offset>0||end>=0)c.setRequestProperty("Range","bytes="+offset+"-"+(end>=0?end:""));
            if(state!=null&&state.cancelled)throw new InterruptedIOException("下载已取消");
            if(tracked!=null)tracked.add(c);
            int status;
            try{checkCancelled();status=c.getResponseCode();}
            catch(IOException e){c.disconnect();if(tracked!=null)tracked.remove(c);throw safeFailure(e);}
            if(status>=300&&status<400){String location=c.getHeaderField("Location");c.disconnect();if(tracked!=null)tracked.remove(c);if(location==null)throw new IOException("重定向缺少地址");URL next=new URL(url,location);if(!next.getProtocol().equals("http")&&!next.getProtocol().equals("https"))throw new IOException("无效重定向协议");if(url.getProtocol().equals("https")&&!next.getProtocol().equals("https"))throw new IOException("拒绝从 HTTPS 降级");url=next;continue;}
            if(status!=200&&!(status==206&&(offset>0||end>=0))){String retryAfter=c.getHeaderField("Retry-After");c.disconnect();if(tracked!=null)tracked.remove(c);throw new HttpFailure(status,raw,retryAfter);}return c;
        }throw new IOException("重定向次数过多");
    }
    private static final class HttpFailure extends NetworkFailure {
        final int status;
        final long retryAfter;
        HttpFailure(int status,String url,String header){this("HTTP "+status+" · "+safeURL(url),status,parseRetryAfter(header));}
        HttpFailure(String message,int status,long retryAfter){super(message);this.status=status;this.retryAfter=retryAfter;}
    }
    private static long parseRetryAfter(String header){
        if(header==null)return 0;
        String value=header.trim();
        if(value.matches("[0-9]+")){
            try{return Math.min(1800000,Math.multiplyExact(Long.parseLong(value),1000));}
            catch(NumberFormatException|ArithmeticException e){return 1800000;}
        }
        try{return Math.max(0,Math.min(1800000,ZonedDateTime.parse(value,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli()-System.currentTimeMillis()));}
        catch(DateTimeParseException|ArithmeticException e){return 0;}
    }
    private static long retryDelay(IOException failure,int attempt){
        long requested=0;
        if(failure instanceof HttpFailure){
            HttpFailure http=(HttpFailure)failure;
            if(http.status>=400&&http.status<500&&http.status!=408&&http.status!=429)return -1;
            if(http.status==429||http.status==503)requested=http.retryAfter;
            // Do not retry earlier than a long server cooldown; allow other sources to win.
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
        }catch(IOException e){throw safeFailure(e);}finally{connection.disconnect();}
    }
    JsonObject json(String url)throws IOException{
        return json(url,null);
    }
    // Small update metadata has its own wall-clock budget, independent of file retries.
    JsonObject json(String url,int seconds)throws IOException{
        RaceState state=new RaceState();
        Network metadata=new Network(Math.max(1,Math.min(seconds,timeout/1000)),0,1);
        Future<JsonObject> task=SOURCES.submit(()->metadata.json(url,state));
        try{return task.get(seconds,TimeUnit.SECONDS);}
        catch(TimeoutException e){throw new SocketTimeoutException("更新信息请求超时: "+safeURL(url));}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new InterruptedIOException("更新检查已取消");}
        catch(ExecutionException e){throw safeFailure(e.getCause());}
        finally{state.cancelled=true;task.cancel(true);for(HttpURLConnection c:state.connections)SOURCES.execute(c::disconnect);}
    }
    static boolean unavailable(Throwable failure){
        for(Throwable e=failure;e!=null;e=e.getCause()){
            if(e instanceof HttpFailure){int code=((HttpFailure)e).status;return code==408||code==429||code>=500;}
            if(e instanceof SocketException||e instanceof SocketTimeoutException||e instanceof UnknownHostException||e instanceof javax.net.ssl.SSLException)return true;
        }
        return false;
    }
    private JsonObject json(String url,RaceState state)throws IOException{
        HttpURLConnection c=connect(url,state==null?null:state.connections,state);
        try(InputStream in=c.getInputStream();Reader reader=new InputStreamReader(new FilterInputStream(in){
            private long count;
            @Override public int read()throws IOException{int b=super.read();if(b>=0&&++count>IO.MAX_JSON)throw new IOException("服务端元数据过大");return b;}
            @Override public int read(byte[] b,int off,int len)throws IOException{int n=in.read(b,off,len);if(n>0){count+=n;if(count>IO.MAX_JSON)throw new IOException("服务端元数据过大");}return n;}
        },StandardCharsets.UTF_8)){
            return JsonParser.parseReader(reader).getAsJsonObject();
        }catch(JsonParseException|IllegalStateException e){throw new IOException("服务端返回无效 JSON",safeFailure(e));}catch(IOException e){throw safeFailure(e);}finally{c.disconnect();if(state!=null)state.connections.remove(c);}
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
        List<String> unique=new ArrayList<>(new LinkedHashSet<>(urls));if(unique.isEmpty())throw new IOException("没有下载地址");if(unique.size()>32)throw new IOException("单文件下载源超过 32 个");
        if(sha1!=null&&expected>=4L*1024*1024&&expected<=8L*1024*1024*1024){
            try{return segments(unique,directory,sha1,expected,label);}catch(IOException e){if(Thread.currentThread().isInterrupted()||e instanceof NetworkFailure||e instanceof FileSystemException)throw e;System.err.println("[下载] "+label+" · 分段不可用，回退完整文件校验："+e.getMessage());}
        }
        if(official()){
            Path ready=sequentialSources(unique,directory,sha1,expected,label,requiredArray);
            if(sha1!=null){Path cache=directory.toAbsolutePath().getParent().resolve("verified-ranges"),partial=cache.resolve(sha1.toLowerCase(Locale.ROOT)+"-"+expected+".partial"),index=cache.resolve(sha1.toLowerCase(Locale.ROOT)+"-"+expected+".index");IO.noLinks(partial);IO.noLinks(index);Files.deleteIfExists(partial);Files.deleteIfExists(index);}
            return ready;
        }
        Map<String,Long> weights=new HashMap<>();long now=System.currentTimeMillis();
        for(String u:unique)weights.put(u,(unhealthy.getOrDefault(host(u),0L)>now?1000000L:0L)+latency.getOrDefault(host(u),300L));
        unique.sort(Comparator.comparingLong(weights::get));
        RaceState state=new RaceState();state.label=label;state.expected=expected;transfers.add(state);
        final Map<String,String> errors=new ConcurrentHashMap<>();
        final Set<String> permanent=ConcurrentHashMap.newKeySet();
        final long deadline=now+Long.getLong("hxz.download.retryMillis",120000L);
        try{
            for(int round=0;;round++){
                checkCancelled();final int attempt=round;
                List<Future<Path>> futures=new ArrayList<>();
                CompletionService<Path> completed=new ExecutorCompletionService<>(SOURCES);
                AtomicReference<Path> winner=new AtomicReference<>();
                AtomicBoolean closed=new AtomicBoolean();
                boolean delivered=false;
                try{
                    int offset=0;
                    for(String url:unique){
                        if(permanent.contains(url))continue;
                        final int stagger=offset++*300;
                        futures.add(completed.submit(()->{
                            boolean acquired=false;Path file=null;
                            try{
                                long pause=Math.max(stagger,cooldown.getOrDefault(host(url),0L)-System.currentTimeMillis());
                                if(pause>0)pause(state,pause);
                                if(closed.get())return null;
                                slots.acquire();acquired=true;if(closed.get())return null;
                                long started=System.nanoTime();file=downloadSource(url,directory,sha1,expected,requiredArray,state);
                                latency.put(host(url),Math.min(30000,(System.nanoTime()-started)/1000000));unhealthy.remove(host(url));
                                if(!closed.get()&&winner.compareAndSet(null,file))return file;
                                return null;
                            }catch(IOException failure){
                                failure=safeFailure(failure);if(state.cancelled)throw failure;
                                if(closed.get())return null;
                                if(Thread.currentThread().isInterrupted())throw new InterruptedException("下载已取消");
                                errors.put(url,host(url)+" → "+failure.getMessage());
                                long retry=retryDelay(failure,attempt);
                                if(retry<0||failure.getMessage().contains("校验失败")||failure.getMessage().contains("长度不匹配"))permanent.add(url);
                                else{unhealthy.put(host(url),System.currentTimeMillis()+15000);cooldown.merge(host(url),System.currentTimeMillis()+Math.max(1000,retry),Math::max);}
                                long stamp=System.currentTimeMillis();Long prior=reported.putIfAbsent(host(url),stamp);if(prior==null||stamp-prior>5000){reported.put(host(url),stamp);System.err.println("[下载节点] "+label+" · "+host(url)+" · "+failure.getClass().getSimpleName()+" · "+failure.getMessage()+" · 第 "+(attempt+1)+" 次；尝试备用源");}
                                return null;
                            }finally{
                                if(acquired)slots.release();
                                if(file!=null&&(closed.get()||winner.get()!=file))Files.deleteIfExists(file);
                            }
                        }));
                    }
                    for(int i=0;i<futures.size();i++){
                        Path file;
                        try{file=completed.take().get();}catch(ExecutionException e){if(e.getCause() instanceof InterruptedException){Thread.currentThread().interrupt();throw new InterruptedIOException("下载已取消");}throw new IOException("下载任务异常",e.getCause());}
                        if(file!=null){verified.addAndGet(Files.size(file));delivered=true;return file;}
                    }
                }finally{
                    closed.set(true);for(Future<Path> future:futures)future.cancel(true);
                    for(HttpURLConnection c:state.connections)c.disconnect();state.connections.clear();
                    if(!delivered&&winner.get()!=null)Files.deleteIfExists(winner.get());
                }
                if(permanent.size()==unique.size()||(retries==0||System.currentTimeMillis()>=deadline))
                    throw new NetworkFailure("下载暂未完成，可继续任务\n"+String.join("\n",errors.values()));
                pause(state,Math.min(30000,1000L<<Math.min(round,5)));
            }
        }finally{synchronized(state.partials){state.cancelled=true;for(Path partial:state.partials.values())Files.deleteIfExists(partial);state.partials.clear();}for(HttpURLConnection c:state.connections)c.disconnect();transfers.remove(state);}
    }
    // The official source owns the first attempt. Mirrors are failover, not
    // duplicate downloads competing for the same 32 connections.
    private Path sequentialSources(List<String> urls,Path directory,String sha1,long size,String label,String requiredArray)throws IOException,InterruptedException{
        if(sha1==null)return sequentialSourcesLocked(urls,directory,sha1,size,label,requiredArray);
        Object lock=rangeLocks.computeIfAbsent(directory.toAbsolutePath().getParent().resolve("verified-files").resolve(sha1.toLowerCase(Locale.ROOT)+"-"+size).toString(),k->new Object());
        synchronized(lock){return sequentialSourcesLocked(urls,directory,sha1,size,label,requiredArray);}
    }
    private Path sequentialSourcesLocked(List<String> urls,Path directory,String sha1,long size,String label,String requiredArray)throws IOException,InterruptedException{
        RaceState state=new RaceState();state.label=label;state.expected=size;transfers.add(state);
        long deadline=Long.MAX_VALUE,budget=Long.getLong("hxz.download.retryMillis",120000L);IOException last=null;
        Set<String> permanent=new HashSet<>();
        Map<String,Long> savedBytes=new HashMap<>();
        if(sha1!=null){Path cache=directory.toAbsolutePath().getParent().resolve("verified-files");IO.noLinks(cache);Files.createDirectories(cache);state.persistent=true;
            for(String url:urls){String key=IO.hex(IO.digest().digest(url.getBytes(StandardCharsets.UTF_8)));Path partial=cache.resolve(sha1.toLowerCase(Locale.ROOT)+"-"+size+"-"+key+".part");IO.noLinks(partial);if(Files.exists(partial)){if(!Files.isRegularFile(partial))throw new IOException("下载缓存不是普通文件");savedBytes.put(url,Files.size(partial));}state.partials.put(url,partial);state.cachePaths.put(url,partial);}
        }
        try{for(int round=0;;round++){
            long pause=0;
            for(String url:urls){
                checkCancelled();if(permanent.contains(url))continue;
                long cool=cooldown.getOrDefault(host(url),0L)-System.currentTimeMillis();if(cool>0){pause=pause==0?cool:Math.min(pause,cool);continue;}
                for(int localAttempt=1;localAttempt<=5;localAttempt++){
                long localWait=0;boolean moveOn=false;
                slots.acquire();try{
                    Path file=downloadSource(url,directory,sha1,size,requiredArray,state);verified.addAndGet(Files.size(file));synchronized(state.partials){for(Path stale:state.partials.values())Files.deleteIfExists(stale);state.partials.clear();}if(state.persistent){Path ready=Files.createTempFile(directory,"verified-",".part");Files.move(file,ready,StandardCopyOption.REPLACE_EXISTING);file=ready;}return file;
                }catch(IOException failure){
                    failure=safeFailure(failure);
                    if(Thread.currentThread().isInterrupted()||state.cancelled||failure instanceof FileSystemException)throw failure;last=failure;long retry=retryDelay(failure,localAttempt-1);
                    // Retry time measures failed attempts, not minutes spent making useful progress.
                    long retained=0;synchronized(state.partials){Path p=state.partials.get(url);if(p!=null&&Files.isRegularFile(p))retained=Files.size(p);}
                    if(deadline==Long.MAX_VALUE||retained>savedBytes.getOrDefault(url,0L))deadline=System.currentTimeMillis()+budget;
                    savedBytes.put(url,retained);
                    if(retry<0||failure.getMessage().contains("校验失败")||failure.getMessage().contains("长度不匹配")){permanent.add(url);moveOn=true;}
                    else if(failure instanceof SocketTimeoutException||retry>2500||failure.getMessage().contains("持续低速")){if(retry>2500)cooldown.put(host(url),System.currentTimeMillis()+retry);moveOn=true;}
                    else localWait=retry;
                    long stamp=System.currentTimeMillis(),prior=reported.getOrDefault(host(url),0L);if(stamp-prior>5000){reported.put(host(url),stamp);System.err.println("[下载节点] "+label+" · "+host(url)+" · "+failure.getMessage()+" · "+localAttempt+"/5，进度已保留");}
                }finally{slots.release();}
                if(moveOn||localAttempt==5)break;if(localWait>0)pause(state,localWait);checkCancelled();
                }
            }
            if(permanent.size()==urls.size()||retries==0||System.currentTimeMillis()>=deadline)throw new NetworkFailure(label+" · 下载节点暂时无法完成传输，已保留下载进度，可继续任务",last);
            pause(state,Math.min(Math.min(Math.max(250,pause),10000),Math.max(1,deadline-System.currentTimeMillis())));
        }}finally{state.cancelled=true;for(HttpURLConnection c:state.connections)c.disconnect();if(!state.persistent)synchronized(state.partials){for(Path p:state.partials.values())Files.deleteIfExists(p);}transfers.remove(state);}
    }
    private static final ConcurrentHashMap<String,Object> rangeLocks=new ConcurrentHashMap<>();
    private Path segments(List<String> urls,Path directory,String sha1,long size,String label)throws IOException,InterruptedException{
        Path cache=directory.toAbsolutePath().getParent().resolve("verified-ranges");IO.noLinks(cache);Files.createDirectories(cache);
        String key=sha1.toLowerCase(Locale.ROOT)+"-"+size;Object lock=rangeLocks.computeIfAbsent(cache.resolve(key).toString(),k->new Object());
        synchronized(lock){
            int previous=0;long deadline=0;
            for(;;){
                try{return segmentsLocked(urls,directory,cache,key,sha1,size,label);}
                catch(IOException e){
                    if(Thread.currentThread().isInterrupted()||e instanceof FileSystemException)throw e;
                    int completed=0;Path index=cache.resolve(key+".index");
                    if(Files.isRegularFile(index))try(DataInputStream in=new DataInputStream(Files.newInputStream(index))){in.readLong();in.readLong();int count=in.readInt();if(count>0&&count<=1024)for(int i=0;i<count;i++)if(in.readBoolean())completed++;}
                    catch(IOException ignored){}
                    if(completed==0)throw e;
                    long now=System.currentTimeMillis();if(deadline==0||completed>previous)deadline=now+Long.getLong("hxz.download.retryMillis",120000L);previous=completed;
                    if(retries==0||now>=deadline)throw new NetworkFailure(label+" · 剩余分段暂未完成，已保留 "+completed+" 个分段，可继续任务",e);
                    System.err.println("[下载] "+label+" · 保留 "+completed+" 个已完成分段，正在重试剩余部分");Thread.sleep(1000);checkCancelled();
                }
            }
        }
    }
    private Path segmentsLocked(List<String> urls,Path directory,Path cache,String key,String sha1,long size,String label)throws IOException,InterruptedException{
        RaceState state=new RaceState();state.label=label;state.expected=size;transfers.add(state);
        final long block=Math.max(2L*1024*1024,(size+1023)/1024);final int count=(int)((size+block-1)/block);
        final Path file=cache.resolve(key+".partial"),index=cache.resolve(key+".index");IO.noLinks(file);IO.noLinks(index);
        final boolean[] done=new boolean[count];final Object journal=new Object();
        List<Future<?>> futures=new ArrayList<>();List<CountDownLatch> exits=new ArrayList<>();boolean success=false,invalid=false;Path merged=null;
        try{
            if(Files.isRegularFile(file)&&Files.size(file)==size&&Files.isRegularFile(index))try(DataInputStream in=new DataInputStream(Files.newInputStream(index))){
                if(in.readLong()==size&&in.readLong()==block&&in.readInt()==count)for(int i=0;i<count;i++)done[i]=in.readBoolean();
            }catch(IOException ignored){Arrays.fill(done,false);}
            try(RandomAccessFile out=new RandomAccessFile(file.toFile(),"rw")){out.setLength(size);}
            for(int i=0;i<count;i++)if(done[i])state.bytes.addAndGet(Math.min(block,size-i*block));
            AtomicInteger next=new AtomicInteger();int workers=Math.min(count,Math.min(8,concurrencyLimit));
            for(int worker=0;worker<workers;worker++){
                final boolean extra=worker>0;if(extra&&!extraRanges.tryAcquire())break;
                CountDownLatch exit=new CountDownLatch(1);exits.add(exit);
                futures.add(SOURCES.submit((Callable<Void>)()->{try{while(true){int part=next.getAndIncrement();if(part>=count)return null;checkCancelled();if(state.cancelled)throw new InterruptedIOException("下载已取消");if(done[part])continue;
                    long start=part*block,end=Math.min(size,start+block)-1;IOException failure=null;
                    for(int attempt=0;attempt<urls.size()*5;attempt++){
                        boolean acquired=false,complete=false;HttpURLConnection conn=null;long progress=0;
                        long delay=0;boolean nextSource=false;
                        try{slots.acquire();acquired=true;checkCancelled();if(state.cancelled)throw new InterruptedIOException("下载已取消");String url=urls.get(official()?attempt/5:(part+attempt/5)%urls.size());conn=connect(url,state.connections,state,start,end);
                            if(conn.getResponseCode()!=206||!("bytes "+start+"-"+end+"/"+size).equals(conn.getHeaderField("Content-Range")))throw new IOException("节点不支持可靠的分段下载");
                            Pace pace=new Pace();byte[] buffer=new byte[128*1024];try(InputStream in=conn.getInputStream();RandomAccessFile out=new RandomAccessFile(file.toFile(),"rw")){
                                out.seek(start);int n;while((n=in.read(buffer))!=-1){checkCancelled();if(state.cancelled)throw new InterruptedIOException("下载已取消");pace.add(n,end-start+1-progress-n);pace.mark+=RATE_LIMIT.consume(n,()->state.cancelled);if(progress+n>end-start+1)throw new IOException("分段长度不匹配");out.write(buffer,0,n);progress+=n;received.addAndGet(n);state.bytes.addAndGet(n);}
                            }
                            if(progress!=end-start+1)throw new IOException("分段下载不完整");
                            synchronized(journal){done[part]=true;Path pending=index.resolveSibling(index.getFileName()+".new");IO.noLinks(pending);
                                try(DataOutputStream out=new DataOutputStream(Files.newOutputStream(pending))){out.writeLong(size);out.writeLong(block);out.writeInt(count);for(boolean value:done)out.writeBoolean(value);}
                                Files.move(pending,index,StandardCopyOption.REPLACE_EXISTING);
                            }
                            complete=true;failure=null;break;
                        }catch(IOException e){if(Thread.currentThread().isInterrupted()||state.cancelled)throw new InterruptedIOException("下载已取消");if(e instanceof FileSystemException)throw e;failure=e;delay=retryDelay(e,attempt%5);nextSource=e instanceof SocketTimeoutException||delay<0||delay>2500||e.getMessage().contains("持续低速")||e.getMessage().contains("不支持可靠")||e.getMessage().contains("不匹配");}
                        finally{if(!complete)state.bytes.addAndGet(-progress);if(conn!=null){state.connections.remove(conn);if(!complete)conn.disconnect();}if(acquired)slots.release();}
                        if(nextSource)attempt=(attempt/5+1)*5-1;else if(attempt%5<4&&delay>0)pause(state,delay);
                    }
                    if(failure!=null)throw failure;
                }}finally{if(extra)extraRanges.release();exit.countDown();} }));
            }
            for(Future<?> future:futures)try{future.get();}catch(ExecutionException e){throw new IOException("分段请求失败",e.getCause());}
            if(!IO.hash(file).equalsIgnoreCase(sha1)){invalid=true;throw new IOException("分段合并 SHA1 校验失败");}
            checkCancelled();merged=Files.createTempFile(directory,"merged-",".part");Files.move(file,merged,StandardCopyOption.REPLACE_EXISTING);success=true;verified.addAndGet(size);return merged;
        }finally{
            state.cancelled=true;
            // Let workers observe cancellation and close their own file handles.
            // Cancelling queued Futures would skip their exit latch entirely.
            for(HttpURLConnection conn:state.connections)conn.disconnect();
            boolean interrupted=Thread.interrupted();long stopAt=System.nanoTime()+TimeUnit.SECONDS.toNanos(25);for(CountDownLatch exit:exits)try{exit.await(Math.max(0,stopAt-System.nanoTime()),TimeUnit.NANOSECONDS);}catch(InterruptedException e){interrupted=true;}
            if(interrupted)Thread.currentThread().interrupt();
            if(success||invalid){Files.deleteIfExists(index);if(invalid)Files.deleteIfExists(file);}
            if(!success&&merged!=null)Files.deleteIfExists(merged);transfers.remove(state);
        }
    }
    private Path downloadSource(String url,Path directory,String sha1,long expected,String requiredArray,RaceState state)throws IOException{
        checkCancelled();Path temp;synchronized(state.partials){temp=state.partials.remove(url);}if(temp==null)temp=state.cachePaths.get(url);if(temp==null)temp=Files.createTempFile(directory,"download-",".part");else if(!Files.exists(temp))Files.createFile(temp);
        HttpURLConnection c=null;boolean keep=false,retain=false;long offset=Files.size(temp);
        try{
            if(state.cancelled)throw new InterruptedIOException("下载已取消");
            if(offset>0&&sha1!=null&&(expected<0||offset==expected)&&IO.hash(temp).equalsIgnoreCase(sha1)){keep=true;state.bytes.set(offset);return temp;}
            try{c=connect(url,state.connections,state,offset);}catch(HttpFailure failure){if(failure.status!=416||offset==0)throw failure;Files.newOutputStream(temp,StandardOpenOption.TRUNCATE_EXISTING).close();offset=0;c=connect(url,state.connections,state,0);}checkCancelled();
            if(offset>0&&c.getResponseCode()!=206)offset=0;
            if(c.getResponseCode()==206){String range=c.getHeaderField("Content-Range");java.util.regex.Matcher match=java.util.regex.Pattern.compile("bytes ([0-9]+)-([0-9]+)/([0-9]+)").matcher(range==null?"":range);if(!match.matches()||!match.group(1).equals(String.valueOf(offset))||(expected>=0&&!match.group(3).equals(String.valueOf(expected)))||Long.parseLong(match.group(2))<offset||Long.parseLong(match.group(2))>=Long.parseLong(match.group(3)))throw new IOException("断点范围不匹配");}
            long advertised=c.getContentLengthLong();if(expected>=0&&advertised>=0&&advertised+offset!=expected)throw new IOException("长度不匹配");
            long maximum=requiredArray!=null?IO.MAX_JSON:8L*1024*1024*1024;if(advertised>maximum)throw new IOException("文件超过大小限制");
            MessageDigest digest=IO.digest();Pace pace=new Pace();long count=offset;byte[] buffer=new byte[128*1024];
            if(offset>0)try(InputStream prefix=Files.newInputStream(temp)){int n;while((n=prefix.read(buffer))!=-1){checkCancelled();digest.update(buffer,0,n);}}
            try(InputStream in=c.getInputStream();OutputStream out=Files.newOutputStream(temp,offset>0?StandardOpenOption.APPEND:StandardOpenOption.TRUNCATE_EXISTING)){
                int n;while((n=in.read(buffer))!=-1){checkCancelled();if(state.cancelled)throw new InterruptedIOException("下载已取消");pace.add(n,expected-count-n);pace.mark+=RATE_LIMIT.consume(n,()->state.cancelled);count+=n;if((expected>=0&&count>expected)||count>maximum)throw new IOException("文件超过大小限制");out.write(buffer,0,n);digest.update(buffer,0,n);received.addAndGet(n);state.bytes.set(count);}
            }
            checkCancelled();
            if(expected>=0&&count!=expected)throw new IOException("下载不完整");
            if(sha1!=null&&!IO.hex(digest.digest()).equalsIgnoreCase(sha1))throw new IOException("SHA1 校验失败");
            if(requiredArray!=null)validateJson(temp,requiredArray);
            keep=true;return temp;
        }catch(IOException e){
            e=safeFailure(e);
            boolean permanent=e.getMessage()!=null&&(e.getMessage().contains("校验")||e.getMessage().contains("不匹配")||e.getMessage().contains("大小限制"));
            if(sha1!=null&&!permanent&&retryDelay(e,0)>=0&&Files.size(temp)>0){synchronized(state.partials){if(state.persistent||(!state.cancelled&&!Thread.currentThread().isInterrupted())){state.partials.put(url,temp);retain=true;}}}throw e;
        }finally{
            try{if(c!=null){state.connections.remove(c);if(!keep)c.disconnect();}}finally{if(!keep&&!retain)Files.deleteIfExists(temp);}
        }
    }
}
