package top.hxzmc.community;

import java.io.*;
import java.net.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import org.json.*;
import org.webrtc.*;

/** Desktop p2p-preload.cjs wire format: binary <=16KiB, credit/end JSON text. No TURN. */
final class GamePeer implements AutoCloseable {
    static final int WINDOW=262144, CHUNK=16384;
    private static PeerConnectionFactory factory;
    private final ExecutorService rtc=Executors.newSingleThreadExecutor();
    private final BlockingQueue<byte[]> incoming=new ArrayBlockingQueue<>(64);
    private final CountDownLatch opened=new CountDownLatch(1);
    private final Object flow=new Object();
    private final Consumer<JSONObject> signal;
    private final List<IceCandidate> candidates=new ArrayList<>();
    private PeerConnection pc;
    private DataChannel channel;
    private Socket stream,bridge;
    private volatile boolean closed,remoteReady,remoteEnd;
    private volatile long disconnected;
    private volatile String failure="P2P 连接已关闭";
    private Runnable closeHook;
    private int credit=WINDOW,receiving;

    GamePeer(CommunityApp app,boolean initiator,Consumer<JSONObject> signal) throws Exception {
        this.signal=signal;
        synchronized(GamePeer.class){if(factory==null){PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(app).createInitializationOptions());factory=PeerConnectionFactory.builder().createPeerConnectionFactory();}}
        try(ServerSocket listener=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))){stream=new Socket("127.0.0.1",listener.getLocalPort());bridge=listener.accept();}
        stream.setTcpNoDelay(true);bridge.setTcpNoDelay(true);bridge.setSendBufferSize(65536);bridge.setReceiveBufferSize(65536);
        List<PeerConnection.IceServer> ice=new ArrayList<>();for(String url:new String[]{"stun:stun.cloudflare.com:3478","stun:global.stun.twilio.com:3478","stun:stun.l.google.com:19302"})ice.add(PeerConnection.IceServer.builder(url).createIceServer());
        PeerConnection.RTCConfiguration config=new PeerConnection.RTCConfiguration(ice);
        config.sdpSemantics=PeerConnection.SdpSemantics.UNIFIED_PLAN;
        pc=factory.createPeerConnection(config,new PeerConnection.Observer(){
            public void onSignalingChange(PeerConnection.SignalingState s){}
            public void onIceConnectionChange(PeerConnection.IceConnectionState s){if(s==PeerConnection.IceConnectionState.FAILED||s==PeerConnection.IceConnectionState.CLOSED)fail("P2P 网络连接已断开");else if(s==PeerConnection.IceConnectionState.DISCONNECTED){long since=System.nanoTime();disconnected=since;GameLobby.thread("lobby-p2p-disconnected",()->{try{Thread.sleep(15000);}catch(InterruptedException ignored){}if(!closed&&disconnected==since)fail("P2P 网络已断开，请重新加入房间");});}else if(s==PeerConnection.IceConnectionState.CONNECTED||s==PeerConnection.IceConnectionState.COMPLETED)disconnected=0;}
            public void onIceConnectionReceivingChange(boolean b){}
            public void onIceGatheringChange(PeerConnection.IceGatheringState s){}
            public void onIceCandidate(IceCandidate c){if(c.sdp.matches("(?s).* typ (host|srflx|prflx)( |$).*"))signal.accept(CommunityApp.obj("candidate",CommunityApp.obj("candidate",c.sdp,"sdpMid",c.sdpMid,"sdpMLineIndex",c.sdpMLineIndex)));}
            public void onIceCandidatesRemoved(IceCandidate[] c){}
            public void onAddStream(MediaStream s){}
            public void onRemoveStream(MediaStream s){}
            public void onDataChannel(DataChannel c){attach(c);}
            public void onRenegotiationNeeded(){}
            public void onAddTrack(RtpReceiver r,MediaStream[] s){}
        });
        if(pc==null){close();throw new IOException("无法初始化 P2P 数据通道");}
        if(initiator){DataChannel.Init init=new DataChannel.Init();init.ordered=true;attach(pc.createDataChannel("hxz-minecraft",init));rtc.execute(()->pc.createOffer(descriptionObserver(),new MediaConstraints()));}
        GameLobby.thread("lobby-p2p-out",this::outbound);GameLobby.thread("lobby-p2p-in",this::inbound);
    }
    private SdpObserver descriptionObserver(){return new SdpObserver(){
        public void onCreateSuccess(SessionDescription d){if(closed)return;pc.setLocalDescription(new SdpObserver(){public void onSetSuccess(){if(closed)return;signal.accept(CommunityApp.obj("description",CommunityApp.obj("type",d.type.canonicalForm(),"sdp",d.description)));}public void onSetFailure(String s){fail(s);}public void onCreateSuccess(SessionDescription s){}public void onCreateFailure(String s){fail(s);}},d);}
        public void onCreateFailure(String s){fail(s);}public void onSetSuccess(){}public void onSetFailure(String s){fail(s);}
    };}
    void signal(JSONObject value){if(closed)return;try{rtc.execute(()->{try{
        JSONObject d=value.optJSONObject("description");
        if(d!=null){String sdp=d.getString("sdp"),type=d.getString("type");if(!Arrays.asList("offer","answer").contains(type)||sdp.length()>16000||!sdp.startsWith("v=0")||!sdp.contains("m=application ")||sdp.contains("typ relay")||sdp.matches("(?s).*m=(audio|video) .*"))throw new IOException("P2P 描述无效");
            pc.setRemoteDescription(new SdpObserver(){public void onSetSuccess(){if(closed)return;try{rtc.execute(()->{if(closed)return;remoteReady=true;for(IceCandidate c:candidates)pc.addIceCandidate(c);candidates.clear();if(type.equals("offer"))pc.createAnswer(descriptionObserver(),new MediaConstraints());});}catch(RejectedExecutionException ignored){}}public void onSetFailure(String s){fail(s);}public void onCreateSuccess(SessionDescription s){}public void onCreateFailure(String s){fail(s);}},new SessionDescription(SessionDescription.Type.fromCanonicalForm(type),sdp));
        }else{JSONObject c=value.getJSONObject("candidate");String candidate=c.getString("candidate");if(candidate.length()>1024||!candidate.startsWith("candidate:")||!candidate.matches("(?s).* typ (host|srflx|prflx)( |$).*"))throw new IOException("P2P 候选无效");IceCandidate parsed=new IceCandidate(c.optString("sdpMid","0"),c.optInt("sdpMLineIndex",0),candidate);if(remoteReady)pc.addIceCandidate(parsed);else if(candidates.size()<128)candidates.add(parsed);else throw new IOException("P2P 候选过多");}
    }catch(Exception e){fail(CommunityApp.reason(e));}});}catch(RejectedExecutionException ignored){}}
    private synchronized void attach(DataChannel dc){if(closed||channel!=null||!dc.label().equals("hxz-minecraft")){dc.close();return;}channel=dc;
        dc.registerObserver(new DataChannel.Observer(){
            public void onBufferedAmountChange(long previous){synchronized(flow){flow.notifyAll();}}
            public void onStateChange(){if(dc.state()==DataChannel.State.OPEN){opened.countDown();synchronized(flow){flow.notifyAll();}}else if(dc.state()==DataChannel.State.CLOSED)fail("P2P 数据通道已关闭");}
            public void onMessage(DataChannel.Buffer b){try{ByteBuffer data=b.data;int size=data.remaining();if(size<1||size>CHUNK)throw new IOException("P2P 帧大小无效");byte[] bytes=new byte[size];data.get(bytes);
                synchronized(flow){if(b.binary){if(receiving+size>WINDOW||remoteEnd||!incoming.offer(bytes))throw new IOException("P2P 接收缓存超限");receiving+=size;}
                else{JSONObject value=new JSONObject(new String(bytes,StandardCharsets.UTF_8));if(value.optBoolean("end")){remoteEnd=true;}else{Object raw=value.opt("credit");if(!(raw instanceof Number)||((Number)raw).doubleValue()!=((Number)raw).intValue())throw new IOException("P2P 流量凭证无效");int amount=((Number)raw).intValue();if(amount<1||credit+amount>WINDOW)throw new IOException("P2P 流量凭证超限");credit+=amount;}flow.notifyAll();}}
            }catch(Exception e){fail(CommunityApp.reason(e));}}
        });if(dc.state()==DataChannel.State.OPEN)opened.countDown();
    }
    Socket awaitStream() throws Exception {if(!opened.await(30,TimeUnit.SECONDS)){fail("P2P 穿透超时，双方网络可能限制 UDP；可尝试同一局域网或公网 IPv6");}if(closed)throw new IOException(failure);return stream;}
    boolean isClosed(){return closed;}
    boolean isOpen(){return !closed&&opened.getCount()==0;}
    private void outbound(){try{opened.await();if(closed)return;byte[] bytes=new byte[CHUNK];int n;while((n=bridge.getInputStream().read(bytes))!=-1){synchronized(flow){while(!closed&&(credit<n||channel.bufferedAmount()>WINDOW))flow.wait(100);if(closed)return;credit-=n;byte[] chunk=Arrays.copyOf(bytes,n);if(!channel.send(new DataChannel.Buffer(ByteBuffer.wrap(chunk),true)))throw new IOException("P2P 发送失败");}}sendText(CommunityApp.obj("end",true));synchronized(flow){for(int i=0;i<50&&!closed&&!remoteEnd;i++)flow.wait(100);}close();}catch(Exception e){if(!closed)fail(CommunityApp.reason(e));}}
    private void inbound(){try{while(!closed){byte[] bytes=incoming.poll(100,TimeUnit.MILLISECONDS);if(bytes!=null){bridge.getOutputStream().write(bytes);synchronized(flow){receiving-=bytes.length;sendText(CommunityApp.obj("credit",bytes.length));}}else if(remoteEnd){bridge.shutdownOutput();return;}}}catch(Exception e){if(!closed)fail(CommunityApp.reason(e));}}
    private void sendText(JSONObject value)throws IOException {if(!closed&&(channel==null||channel.state()!=DataChannel.State.OPEN||!channel.send(new DataChannel.Buffer(ByteBuffer.wrap(value.toString().getBytes(StandardCharsets.UTF_8)),false))))throw new IOException("P2P 控制帧发送失败");}
    void fail(String message){failure=message;close();}
    void onClose(Runnable hook){boolean alreadyClosed;synchronized(flow){alreadyClosed=closed;if(!alreadyClosed)closeHook=hook;}if(alreadyClosed)hook.run();}
    @Override public void close(){Runnable hook;synchronized(flow){if(closed)return;closed=true;hook=closeHook;opened.countDown();flow.notifyAll();}GameLobby.quiet(stream);GameLobby.quiet(bridge);incoming.clear();try{rtc.execute(()->{if(channel!=null){channel.unregisterObserver();channel.close();channel.dispose();}if(pc!=null){pc.close();pc.dispose();}});}catch(RejectedExecutionException ignored){}rtc.shutdown();if(hook!=null)hook.run();}
}
