package top.hxzmc.community;

import android.app.Application;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import java.io.*;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.*;
import okio.ByteString;
import org.json.*;

public final class CommunityApp extends Application {
    static final String SKIN = "https://skin.hxzmc.top/api/yggdrasil";
    final Handler main = new Handler(Looper.getMainLooper());
    final ExecutorService jobs = new ThreadPoolExecutor(4,4,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(48));
    final OkHttpClient http = new OkHttpClient.Builder().connectTimeout(15,TimeUnit.SECONDS).readTimeout(25,TimeUnit.SECONDS)
        .callTimeout(45,TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false).build();
    final OkHttpClient sockets = http.newBuilder().callTimeout(0,TimeUnit.SECONDS).pingInterval(15,TimeUnit.SECONDS).build();
    WeakReference<MainActivity> activity = new WeakReference<>(null);
    Vault vault;
    volatile JSONObject credentials = new JSONObject(), user = new JSONObject();
    volatile String base, token = "", connection = "未登录", selfId = "", room = "";
    volatile boolean connected, foreground, muted, deafened, ptt, pressing;
    volatile WebSocket socket;
    volatile VoiceEngine audio;
    volatile String recoveryRoom="";
    JSONArray users = new JSONArray(), messages = new JSONArray();
    private volatile long expires, generation, lastSeen;
    private int retries;
    private boolean connecting;
    private final Object authLock=new Object();
    private final Runnable retry = this::connect;
    private final Runnable heartbeat = new Runnable() { public void run() {
        if (connected) {
            if (System.currentTimeMillis()-lastSeen > 50000) { failed(generation,false); return; }
            send(obj("type","ping")); main.postDelayed(this,15000);
        }
    }};
    @Override public void onCreate() {
        super.onCreate(); vault = new Vault(this);
        base = getSharedPreferences("settings",0).getString("server","https://qqbot.hxzmc.top");
        try { credentials = vault.read(); } catch(Exception e) { vault.clear(); }
    }
    static JSONObject obj(Object... values) {
        JSONObject o = new JSONObject(); try { for (int i=0;i<values.length;i+=2) o.put(String.valueOf(values[i]),values[i+1]); } catch(JSONException ignored) {} return o;
    }
    static String reason(Throwable e) { String s=e.getMessage(); return s == null ? "操作失败，请稍后重试" : s.substring(0,Math.min(260,s.length())); }
    synchronized JSONObject state() {
        JSONArray profiles = credentials.optJSONArray("availableProfiles");
        JSONObject selected = credentials.optJSONObject("selectedProfile");
        return obj("server",base,"user",user,"profiles",profiles==null?new JSONArray():profiles,"selectedProfile",selected==null?JSONObject.NULL:selected,
            "hasAccount",credentials.has("accessToken"),"connected",connected,"connection",connection,"users",users,"messages",messages,
            "room",room,"recoveringRoom",recoveryRoom,"muted",muted,"deafened",deafened,"ptt",ptt,"id",selfId,"version","0.4.2",
            "systemDark",(getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)==android.content.res.Configuration.UI_MODE_NIGHT_YES);
    }
    void event(String name, Object value) { MainActivity a=activity.get(); if(a!=null)a.emit(name,value); }
    void changed() { JSONObject update=state();update.remove("messages");event("state",update); }
    static String validBase(String raw) throws Exception {
        HttpUrl url = HttpUrl.parse(raw.trim());
        if(url==null || !url.isHttps() || !url.username().isEmpty() || !url.password().isEmpty() || url.query()!=null || url.fragment()!=null)
            throw new IOException("社区地址必须是有效的 HTTPS 根地址");
        return url.toString().replaceAll("/+$", "");
    }
    String apiUrl(String path) throws Exception {
        if(!path.startsWith("/api/") && !path.equals("/health")) throw new IOException("接口地址无效");
        if(path.contains("..") || path.contains("\\") || path.contains("#")) throw new IOException("接口地址无效");
        String pathname = path.split("\\?",2)[0];
        if(!pathname.matches("/(api/[A-Za-z0-9_/-]+|health)")) throw new IOException("接口路径无效");
        return base+path;
    }
    Object request(String url,String method,JSONObject body,String bearer) throws Exception {
        Request.Builder b=new Request.Builder().url(url).header("Accept","application/json");
        if(!bearer.isEmpty()) b.header("Authorization","Bearer "+bearer);
        RequestBody data = (method.equals("GET")||method.equals("HEAD"))?null:RequestBody.create(body==null?"{}":body.toString(), MediaType.get("application/json; charset=utf-8"));
        try(Response r=http.newCall(b.method(method,data).build()).execute()) {
            byte[] bytes = bounded(r.body().byteStream(),4*1024*1024);
            String text = new String(bytes,StandardCharsets.UTF_8);
            Object result=text.isEmpty()?obj("ok",true):new JSONTokener(text).nextValue();
            if(!r.isSuccessful()) {
                String error = result instanceof JSONObject?((JSONObject)result).optString("errorMessage",((JSONObject)result).optString("error","HTTP "+r.code())):"HTTP "+r.code();
                throw new IOException(error);
            }
            return result;
        }
    }
    static byte[] bounded(InputStream stream,int max) throws Exception {
        try(InputStream input=stream; ByteArrayOutputStream output=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[16384]; int n,total=0;
            while((n=input.read(buffer))!=-1) { if((total+=n)>max)throw new IOException("响应超过大小限制"); output.write(buffer,0,n); }
            return output.toByteArray();
        }
    }
    synchronized void saveCredentials(JSONObject next) throws Exception {
        if(!next.has("accessToken"))throw new IOException("皮肤站没有返回有效登录凭据");
        if(!next.has("availableProfiles") && credentials.has("availableProfiles"))next.put("availableProfiles",credentials.get("availableProfiles"));
        if(!next.has("selectedProfile") && credentials.has("selectedProfile"))next.put("selectedProfile",credentials.get("selectedProfile"));
        vault.write(next); credentials=next;
    }
    Object login(JSONObject input) throws Exception { synchronized(authLock) {
        disconnect(true);
        JSONObject next=(JSONObject)request(SKIN+"/authserver/authenticate","POST",obj("agent",obj("name","Minecraft","version",1),"username",input.getString("username"),"password",input.getString("password"),"clientToken",UUID.randomUUID().toString(),"requestUser",true),"");
        credentials=new JSONObject(); saveCredentials(next); token=""; expires=0;
        JSONArray profiles=credentials.optJSONArray("availableProfiles");
        if(credentials.optJSONObject("selectedProfile")==null && profiles!=null && profiles.length()==1) selectProfile(profiles.getJSONObject(0).getString("id"));
        main.post(this::connect); return state();
    }}
    Object selectProfile(String id) throws Exception { synchronized(authLock) {
        JSONArray profiles=credentials.optJSONArray("availableProfiles"); JSONObject selected=null;
        if(profiles!=null)for(int i=0;i<profiles.length();i++)if(profiles.getJSONObject(i).optString("id").equals(id))selected=profiles.getJSONObject(i);
        if(selected==null)throw new IOException("角色不存在，请重新登录");
        disconnect(true);
        saveCredentials((JSONObject)request(SKIN+"/authserver/refresh","POST",obj("accessToken",credentials.getString("accessToken"),"clientToken",credentials.getString("clientToken"),"selectedProfile",selected,"requestUser",true),""));
        token=""; expires=0; user=new JSONObject(); messages=new JSONArray();
        main.post(this::connect); return state();
    }}
    String session() throws Exception { synchronized(authLock) {
        if(!token.isEmpty() && expires>System.currentTimeMillis())return token;
        if(!credentials.has("accessToken"))return "";
        if(credentials.optJSONObject("selectedProfile")==null)throw new IOException("请先选择皮肤站角色");
        JSONObject result=(JSONObject)request(base+"/api/session","POST",obj("accessToken",credentials.getString("accessToken"),"clientToken",credentials.getString("clientToken")),"");
        saveCredentials(result.getJSONObject("credentials"));
        token=result.getString("token"); user=result.getJSONObject("user"); expires=System.currentTimeMillis()+11*60*60*1000L;
        return token;
    }}
    Object api(JSONObject input) throws Exception { synchronized(authLock) {
        String path=input.getString("path"), method=input.optString("method","GET");
        if(!Arrays.asList("GET","POST","PUT","DELETE").contains(method))throw new IOException("请求方式无效");
        String url=apiUrl(path), auth=session();
        if(path.equals("/api/session")||path.startsWith("/api/admin/"))throw new IOException("此接口不向页面开放");
        return request(url,method,input.optJSONObject("body"),auth);
    }}
    void logout() { synchronized(authLock) {
        disconnect(true); vault.clear(); credentials=new JSONObject(); token=""; expires=0; user=new JSONObject(); users=new JSONArray(); messages=new JSONArray(); connection="未登录"; changed();
    }}
    void setServer(String value) throws Exception { synchronized(authLock) {
        String next=validBase(value); disconnect(true); base=next; token=""; expires=0; user=new JSONObject(); messages=new JSONArray(); users=new JSONArray();
        getSharedPreferences("settings",0).edit().putString("server",next).apply(); main.post(this::connect); changed();
    }}
    synchronized void connect() {
        if(connected||connecting||(!foreground&&room.isEmpty()&&recoveryRoom.isEmpty()))return;
        if(credentials.optJSONObject("selectedProfile")==null){connection=credentials.has("accessToken")?"请选择角色":"未登录";changed();return;}
        connecting=true; connection="正在连接"; final long ticket=++generation; changed();
        jobs.execute(()->{
            try {
                String auth=session();
                synchronized(this){if(ticket!=generation)return;}
                WebSocket ws=sockets.newWebSocket(new Request.Builder().url(base.replaceFirst("https:","wss:")+"/ws").build(),new WebSocketListener(){
                    @Override public void onOpen(WebSocket ws,Response response){ if(ticket!=generation){ws.cancel();return;} ws.send(obj("type","auth","token",auth).toString()); }
                    @Override public void onMessage(WebSocket ws,String text){ if(ticket!=generation)return; try {receive(new JSONObject(text));}catch(Exception ignored){} }
                    @Override public void onMessage(WebSocket ws,ByteString bytes){if(ticket==generation && audio!=null && !deafened)audio.receive(bytes.toByteArray());}
                    @Override public void onClosing(WebSocket ws,int code,String reason){ws.close(code,reason);}
                    @Override public void onClosed(WebSocket ws,int code,String reason){failed(ticket,code==4001||code==4003||code==1008);}
                    @Override public void onFailure(WebSocket ws,Throwable t,Response response){failed(ticket,false);}
                });
                synchronized(this){if(ticket==generation)socket=ws;else ws.cancel();}
                main.postDelayed(()->{if(ticket==generation&&!connected)failed(ticket,false);},20000);
            } catch(Exception e){ synchronized(this){if(ticket!=generation)return;connecting=false;connection=reason(e);} changed();scheduleReconnect(); }
        });
    }
    synchronized void failed(long ticket,boolean unauthorized) {
        if(ticket!=generation)return;
        recoveryRoom=room.isEmpty()?recoveryRoom:room;room="";generation++;connecting=false;connected=false;selfId="";
        main.removeCallbacks(heartbeat);if(socket!=null){socket.cancel();socket=null;}
        VoiceEngine engine=audio;audio=null;if(engine!=null)engine.close();users=new JSONArray();
        if(unauthorized){token="";expires=0;}
        connection="连接中断，正在重试";changed();scheduleReconnect();
    }
    void scheduleReconnect(){main.removeCallbacks(retry);if(!foreground&&retries>=8){leave();return;}if(foreground||!recoveryRoom.isEmpty())main.postDelayed(retry,Math.min(30000,1500L*(1L<<Math.min(retries++,4)))+new Random().nextInt(700));}
    synchronized void disconnect(boolean reset) {
        generation++;connecting=false;main.removeCallbacks(retry);main.removeCallbacks(heartbeat);
        leave();connected=false;selfId="";if(socket!=null){socket.cancel();socket=null;} users=new JSONArray(); if(reset)retries=0;
    }
    synchronized void receive(JSONObject message) throws Exception {
        lastSeen=System.currentTimeMillis();String type=message.optString("type");
        if(type.equals("ready")){
            connected=true;connecting=false;retries=0;connection="已连接";selfId=message.getString("id");user=message.getJSONObject("user");messages=message.getJSONArray("messages");
            main.removeCallbacks(heartbeat);main.postDelayed(heartbeat,15000);event("state",state());
            if(!recoveryRoom.isEmpty())voiceJoin(recoveryRoom);
        }else if(type.equals("presence")){
            users=message.getJSONArray("users");String current="";
            for(int i=0;i<users.length();i++){JSONObject u=users.getJSONObject(i);if(u.optString("id").equals(selfId)&&!u.isNull("room"))current=u.optString("room");}
            if(!current.equals(room)){
                VoiceEngine previous=audio;audio=null;if(previous!=null)previous.close();
                room=current;if(room.isEmpty())stopAudio();else {recoveryRoom="";startAudio();}
            } changed();
        }else if(type.equals("chat")){
            messages.put(message.getJSONObject("message"));if(messages.length()>300)messages.remove(0);event("message",message.getJSONObject("message"));
        }else if(type.equals("error")){
            String error=message.optString("error");
            if(error.contains("登录已失效")||error.equals("请先登录")){failed(generation,true);return;}
            event("error",error);
        }
        else if(type.equals("voice-event")){if(audio!=null)audio.tone(message.optString("action").equals("join"));}
        else if(!type.equals("pong"))event(type,message);
    }
    void send(JSONObject value) { WebSocket ws=socket; if(ws!=null)ws.send(value.toString()); }
    synchronized void chat(String body) throws Exception {if(!connected)throw new IOException("尚未连接社区");if(body.trim().isEmpty()||body.length()>1000)throw new IOException("消息需为 1–1000 字");send(obj("type","chat","body",body));}
    void voiceJoin(String requested) throws Exception {
        if(!connected)throw new IOException("请先连接社区");
        if(!Arrays.asList("lobby","survival","mod-1","mod-2").contains(requested))throw new IOException("语音房间不存在");
        send(obj("type","voice-join","room",requested,"transport","ws-opus-v1"));
        main.postDelayed(()->{if(room.isEmpty()){recoveryRoom="";stopAudio();}},12000);
    }
    synchronized void startAudio() {
        if(audio!=null)return;
        try{audio=new VoiceEngine(this);audio.start();}catch(Exception e){event("error","无法开启语音："+reason(e));leave();}
    }
    synchronized void leave(){send(obj("type","voice-leave"));room="";recoveryRoom="";pressing=false;stopAudio();changed();}
    void stopAudio(){VoiceEngine engine=audio;audio=null;if(engine!=null)engine.close();stopService(new Intent(this,VoiceService.class));}
    void voiceSettings(JSONObject input){muted=input.optBoolean("muted",muted);deafened=input.optBoolean("deafened",deafened);ptt=input.optBoolean("ptt",ptt);pressing=input.optBoolean("pressing",false);send(obj("type","voice-mute","muted",muted||ptt&&!pressing));send(obj("type","voice-deafen","deafened",deafened));changed();}
}
