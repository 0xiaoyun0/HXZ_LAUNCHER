package top.hxzmc.bridge;

import com.google.gson.*;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.ByteBuffer;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/** A bounded background transport. No network operation runs on a Minecraft tick. */
public final class BridgeTransport implements AutoCloseable {
    public record Action(String id, String kind, JsonObject value, long expires) {}
    private record Envelope(String endpoint, JsonObject body) {}
    private static final Gson JSON = new Gson();
    private final String base, token, server;
    private final Consumer<String> log;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor(r -> {Thread t=new Thread(r,"HXZ community bridge");t.setDaemon(true);return t;});
    private final ArrayBlockingQueue<Envelope> outgoing = new ArrayBlockingQueue<>(128);
    private final ArrayBlockingQueue<Action> actions = new ArrayBlockingQueue<>(40);
    private final Set<String> queued = ConcurrentHashMap.newKeySet();
    private final AtomicReference<JsonObject> status = new AtomicReference<>();
    private volatile boolean chatAllowed;
    private volatile boolean whitelistAllowed;
    private long lastWarning;
    private Envelope pending;
    private final boolean allowChat, allowWhitelist;

    public BridgeTransport(Properties config, Consumer<String> log) {
        this.log=log;this.base=config.getProperty("community","").replaceAll("/+$","");
        URI address=URI.create(base);
        if(address.getUserInfo()!=null||address.getQuery()!=null||address.getFragment()!=null||!("https".equals(address.getScheme())||"http".equals(address.getScheme())&&Set.of("127.0.0.1","localhost","[::1]").contains(address.getHost())))
            throw new IllegalArgumentException("community must be HTTPS (HTTP is only allowed for loopback tests)");
        token=config.getProperty("token","");server=config.getProperty("server","");
        if(!token.matches("[a-fA-F0-9]{64}")||!Set.of("survival","mod-1","mod-2").contains(server))throw new IllegalArgumentException("Set a valid server and bridge token before enabling the bridge");
        allowChat=Boolean.parseBoolean(config.getProperty("chat","false"));allowWhitelist=Boolean.parseBoolean(config.getProperty("whitelist","false"));
    }
    public void start(){worker.scheduleWithFixedDelay(this::cycle,0,5,TimeUnit.SECONDS);}
    public void snapshot(JsonObject value){status.set(value);}
    public boolean chatEnabled(){return allowChat&&chatAllowed;}
    public boolean whitelistEnabled(){return allowWhitelist&&whitelistAllowed;}
    public Action nextAction(){return actions.poll();}
    public boolean submit(String endpoint,JsonObject body){return outgoing.offer(new Envelope(endpoint,body));}
    public void acknowledge(Action action, boolean ok, String note){
        JsonObject body=new JsonObject();body.addProperty("id",action.id());body.addProperty("status",ok?"done":"failed");body.addProperty("note",note);
        if(!submit("/api/game-bridge/ack",body))queued.remove(action.id());
    }
    private void cycle(){
        try{
            JsonObject snapshot=status.get();if(snapshot==null)return;
            JsonObject poll=new JsonObject();poll.add("status",snapshot);
            JsonObject result=send("/api/game-bridge/poll",poll);
            chatAllowed=result.getAsJsonObject("access").get("chat").getAsBoolean();
            whitelistAllowed=result.getAsJsonObject("access").get("whitelist").getAsBoolean();
            for(JsonElement element:result.getAsJsonArray("actions")){
                JsonObject raw=element.getAsJsonObject();String id=raw.get("id").getAsString(),kind=raw.get("kind").getAsString();
                if(queued.contains(id))continue;
                if(!Set.of("chat","whitelist").contains(kind))continue;
                Action action=new Action(id,kind,raw.getAsJsonObject("value"),raw.get("expires").getAsLong());
                if((kind.equals("chat")&&!allowChat)||(kind.equals("whitelist")&&!allowWhitelist)){acknowledge(action,false,"游戏服本地未允许此功能");continue;}
                if(queued.add(id)&&!actions.offer(action))queued.remove(id);
            }
            // Keep a failed envelope for retry. A single cycle has a bounded request budget.
            for(int i=0;i<4;i++){
                if(pending==null)pending=outgoing.poll();if(pending==null)break;
                try{send(pending.endpoint(),pending.body());if(pending.endpoint().endsWith("/ack"))queued.remove(pending.body().get("id").getAsString());pending=null;}
                catch(PermanentFailure error){if(pending.endpoint().endsWith("/ack"))queued.remove(pending.body().get("id").getAsString());log.accept("已拒绝一项同步操作：HTTP "+error.status);pending=null;}
            }
        }catch(InterruptedException error){Thread.currentThread().interrupt();}
        catch(Exception error){if(System.currentTimeMillis()-lastWarning>60000){lastWarning=System.currentTimeMillis();log.accept("社区同步暂不可用，将后台重试（"+error.getClass().getSimpleName()+"）；游戏继续运行。");}}
    }
    private JsonObject send(String endpoint,JsonObject body) throws IOException,InterruptedException{
        HttpRequest request=HttpRequest.newBuilder(URI.create(base+endpoint)).timeout(Duration.ofSeconds(8))
            .header("Content-Type","application/json").header("Authorization","Bearer "+token).header("X-HXZ-Server",server)
            .POST(HttpRequest.BodyPublishers.ofString(JSON.toJson(body),StandardCharsets.UTF_8)).build();
        var future=http.sendAsync(request,info->new LimitedBody());
        try{
            HttpResponse<byte[]> response=future.get(10,TimeUnit.SECONDS);
            byte[] bytes=response.body();
            if(response.statusCode()!=200){if(response.statusCode()==400||response.statusCode()==404)throw new PermanentFailure(response.statusCode());throw new IOException("Bridge HTTP "+response.statusCode());}
            return JsonParser.parseString(new String(bytes,StandardCharsets.UTF_8)).getAsJsonObject();
        }catch(TimeoutException error){future.cancel(true);throw new IOException("Bridge response timed out",error);}
        catch(ExecutionException error){throw new IOException("Bridge request failed",error.getCause());}
        catch(InterruptedException error){future.cancel(true);throw error;}
    }
    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate=HttpResponse.BodySubscribers.ofByteArray();
        private Flow.Subscription subscription;private long size;private boolean ended;
        public CompletionStage<byte[]> getBody(){return delegate.getBody();}
        public void onSubscribe(Flow.Subscription value){subscription=value;delegate.onSubscribe(value);}
        public void onNext(List<ByteBuffer> buffers){
            if(ended)return;for(ByteBuffer buffer:buffers)size+=buffer.remaining();
            if(size>262144){ended=true;subscription.cancel();delegate.onError(new IOException("Bridge response too large"));return;}
            delegate.onNext(buffers);
        }
        public void onError(Throwable error){if(!ended){ended=true;delegate.onError(error);}}
        public void onComplete(){if(!ended){ended=true;delegate.onComplete();}}
    }
    private static final class PermanentFailure extends IOException {final int status;PermanentFailure(int status){this.status=status;}}
    @Override public void close(){worker.shutdownNow();http.shutdownNow();actions.clear();outgoing.clear();queued.clear();}

    public static Properties load(Path file) throws IOException {
        Properties config=new Properties();
        if(!Files.exists(file)){
            Files.createDirectories(file.toAbsolutePath().getParent());
            Files.writeString(file,"# HXZ Community Bridge 0.8.0\n# Get a separate token per server from the community administrator.\nenabled=false\ncommunity=https://qqbot.hxzmc.top\nserver=mod-1\ntoken=\nchat=false\nwhitelist=false\n",StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
        }
        try(var reader=Files.newBufferedReader(file,StandardCharsets.UTF_8)){config.load(reader);}return config;
    }
}
