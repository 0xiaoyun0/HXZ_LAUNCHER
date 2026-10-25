package top.hxzmc.community;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.*;
import org.json.*;

/** Community websocket carries SDP/ICE only; TLS Minecraft bytes stay peer to peer. */
final class GameLobbySignal implements AutoCloseable {
    private final CommunityApp app;
    private final Set<WebSocket> sockets=ConcurrentHashMap.newKeySet();
    private final Set<GamePeer> peers=ConcurrentHashMap.newKeySet();
    private volatile boolean closed,hostLive;
    private volatile Channel activeHost;
    private synchronized void hostLive(Channel channel,boolean value){if(activeHost==channel)hostLive=value;}
    GameLobbySignal(CommunityApp app){this.app=app;}
    private final class Channel extends WebSocketListener {
        final boolean host;final JSONObject room;final int localPort;
        final CountDownLatch ready=new CountDownLatch(1);
        final Map<String,GamePeer> pending=new ConcurrentHashMap<>();
        volatile WebSocket ws;volatile GamePeer guest;volatile String error="";volatile boolean complete;
        Channel(JSONObject room,boolean host,int port){this.room=room;this.host=host;localPort=port;}
        void send(JSONObject v){if(ws==null||!ws.send(v.toString()))fail("P2P 协商发送失败");}
        public void onOpen(WebSocket socket,Response response){ws=socket;if(closed){socket.cancel();return;}try{send(CommunityApp.obj("type",host?"host":"join","room",room.getString("id"),"proof",GameLobby.hex(MessageDigest.getInstance("SHA-256").digest(room.getString("key").getBytes(StandardCharsets.UTF_8))),"token",auth));}catch(Exception e){fail(CommunityApp.reason(e));}}
        String auth;
        public void onMessage(WebSocket socket,String text){if(closed){socket.cancel();return;}try{if(text.length()>20000)throw new IOException("协商消息过大");JSONObject v=new JSONObject(text);String type=v.optString("type"),pair=v.optString("pair");
            if(type.equals("error"))throw new IOException(v.optString("error","P2P 协商失败"));
            if(type.equals("registered")){if(host)hostLive(this,true);ready.countDown();return;}
            if(type.equals("incoming")||type.equals("ready")){
                peers.removeIf(GamePeer::isClosed);if(pending.size()>=64||peers.size()>=64)throw new IOException("P2P 连接数已满");
                GamePeer p=new GamePeer(app,!host,value->send(CommunityApp.obj("type","signal","pair",pair,"signal",value)));synchronized(GameLobbySignal.this){if(closed){p.close();return;}pending.put(pair,p);peers.add(p);}
                if(host){GameLobby.thread("lobby-p2p-host",()->{try{Socket stream=p.awaitStream();Socket target=new Socket();target.connect(new InetSocketAddress("127.0.0.1",localPort),6000);GameLobby.bridge(stream,target,()->{p.close();peers.remove(p);});}catch(Exception e){p.fail(CommunityApp.reason(e));peers.remove(p);}finally{pending.remove(pair);}});}
                else{guest=p;ready.countDown();}return;
            }
            if(type.equals("signal")){GamePeer p=pending.get(pair);if(p!=null)p.signal(v.getJSONObject("signal"));}
            else if(type.equals("closed")){GamePeer p=pending.remove(pair);if(p!=null)p.fail(v.optString("reason","P2P 协商已结束"));}
            else if(type.equals("complete")){complete=true;pending.remove(pair);}
        }catch(Exception e){fail(CommunityApp.reason(e));}}
        public void onMessage(WebSocket socket,okio.ByteString bytes){fail("协商服务不传输游戏数据");}
        public void onFailure(WebSocket socket,Throwable t,Response response){sockets.remove(socket);fail(CommunityApp.reason(t));}
        public void onClosing(WebSocket socket,int code,String reason){socket.close(code,reason);}
        public void onClosed(WebSocket socket,int code,String reason){if(host)hostLive(this,false);sockets.remove(socket);if(!complete){for(GamePeer p:pending.values())if(!p.isOpen())p.fail("P2P 协商已断开");}if(ready.getCount()>0)fail("P2P 协商服务已断开");}
        void fail(String message){if(host)hostLive(this,false);error=message;ready.countDown();for(GamePeer p:pending.values())if(!p.isOpen())p.fail(message);if(ws!=null){ws.cancel();sockets.remove(ws);}}
        void open()throws Exception {auth=app.session();if(auth.isEmpty())throw new IOException("请先登录社区");String base=CommunityApp.validBase(app.base);ws=app.sockets.newWebSocket(new Request.Builder().url(base.replaceFirst("https:","wss:")+"/lobby-signal").build(),this);sockets.add(ws);if(!ready.await(12,TimeUnit.SECONDS)){ws.cancel();throw new IOException("P2P 协商服务连接超时");}if(!error.isEmpty())throw new IOException(error);if(closed){ws.cancel();throw new IOException("操作已取消");}}
    }
    boolean hosting(){return hostLive&&!closed;}
    void host(JSONObject room,int port)throws Exception {Channel channel=new Channel(room,true,port);synchronized(this){activeHost=channel;hostLive=false;}try{channel.open();}catch(Exception e){synchronized(this){if(activeHost==channel){activeHost=null;hostLive=false;}}throw e;}}
    Socket dial(JSONObject room)throws Exception {if(closed)throw new IOException("P2P 已关闭");Channel c=new Channel(room,false,0);try{c.open();Socket result=c.guest.awaitStream();c.guest.onClose(()->{if(c.ws!=null){c.ws.cancel();sockets.remove(c.ws);}peers.remove(c.guest);c.pending.clear();});c.complete=true;c.send(CommunityApp.obj("type","done","pair",c.pending.keySet().stream().findFirst().orElse("")));return result;}catch(Exception e){if(c.guest!=null)c.guest.close();if(c.ws!=null)c.ws.cancel();throw e;}}
    public synchronized void close(){closed=true;activeHost=null;hostLive=false;for(WebSocket ws:sockets)ws.cancel();sockets.clear();for(GamePeer p:peers)p.close();peers.clear();}
}
