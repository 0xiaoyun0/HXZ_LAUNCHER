package top.hxzmc.community;

import android.media.*;
import android.media.audiofx.*;
import android.os.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.WebSocket;
import okio.ByteString;
import org.concentus.*;

/** 20 ms raw Opus frames, exactly the ws-opus-v1 format used by community 0.4.2. */
final class VoiceEngine implements AutoCloseable {
    private static final int RATE=48000, FRAME=960;
    private final CommunityApp app;
    private final Map<String,Peer> peers=new ConcurrentHashMap<>();
    private final AudioManager manager;
    private final AudioFocusRequest focus;
    private volatile boolean running;
    private AudioRecord recorder;
    private AudioTrack player;
    private AcousticEchoCanceler echo;
    private NoiseSuppressor noise;
    private Thread capture, playback;
    private PowerManager.WakeLock wake;
    private ToneGenerator tone;
    private int previousMode;
    VoiceEngine(CommunityApp app) {
        this.app=app; manager=(AudioManager)app.getSystemService(android.content.Context.AUDIO_SERVICE);
        focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setOnAudioFocusChangeListener(change->{if(change<0)app.main.post(()->{app.event("error","语音已结束：音频被其他通话占用");app.leave();});}).build();
    }
    @SuppressWarnings("MissingPermission") void start() throws Exception {
        if(manager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)throw new Exception("无法取得通话音频，请结束其他通话");
        previousMode=manager.getMode();manager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        int min=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
        recorder=new AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(min,FRAME*8));
        if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new Exception("麦克风初始化失败");
        if(AcousticEchoCanceler.isAvailable()){echo=AcousticEchoCanceler.create(recorder.getAudioSessionId());if(echo!=null)echo.setEnabled(true);}
        if(NoiseSuppressor.isAvailable()){noise=NoiseSuppressor.create(recorder.getAudioSessionId());if(noise!=null)noise.setEnabled(true);}
        player=new AudioTrack.Builder().setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setAudioFormat(new AudioFormat.Builder().setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
            .setBufferSizeInBytes(Math.max(AudioTrack.getMinBufferSize(RATE,AudioFormat.CHANNEL_OUT_MONO,AudioFormat.ENCODING_PCM_16BIT),FRAME*8))
            .setTransferMode(AudioTrack.MODE_STREAM).build();
        tone=new ToneGenerator(AudioManager.STREAM_VOICE_CALL,35);
        wake=((PowerManager)app.getSystemService(android.content.Context.POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"hxz:voice");wake.acquire(6*60*60*1000L);
        recorder.startRecording();player.play();running=true;
        capture=new Thread(this::capture,"HXZ microphone");playback=new Thread(this::play,"HXZ voice mixer");capture.start();playback.start();
        app.voiceSettings(CommunityApp.obj("muted",app.muted,"deafened",app.deafened,"ptt",app.ptt));
    }
    private void capture() {
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);
        try {
            OpusEncoder encoder=new OpusEncoder(RATE,1,OpusApplication.OPUS_APPLICATION_VOIP);
            encoder.setBitrate(24000);encoder.setComplexity(3);encoder.setUseDTX(true);
            short[] pcm=new short[FRAME];byte[] compressed=new byte[4000];int sequence=0,epoch=new java.security.SecureRandom().nextInt();
            while(running){
                int read=0;while(running&&read<FRAME){int n=recorder.read(pcm,read,FRAME-read,AudioRecord.READ_BLOCKING);if(n<0)throw new Exception("麦克风读取失败 "+n);read+=n;}
                if(!running)break;
                if(app.muted||app.ptt&&!app.pressing)continue;
                int length=encoder.encode(pcm,0,FRAME,compressed,0,compressed.length);
                WebSocket socket=app.socket;
                if(length<=1||socket==null||socket.queueSize()>16000)continue;
                ByteBuffer packet=ByteBuffer.allocate(9+length).put((byte)1).putInt(epoch).putInt(++sequence).put(compressed,0,length);
                socket.send(ByteString.of(packet.array()));
            }
        }catch(Exception e){if(running)app.main.post(()->{app.event("error","语音采集失败："+CommunityApp.reason(e));app.leave();});}
    }
    void receive(byte[] bytes) {
        if(!running||bytes.length<46||bytes.length>4045||bytes[0]!=1)return;
        String id=new String(bytes,1,36,StandardCharsets.US_ASCII);
        if(!id.matches("[a-fA-F0-9-]{36}"))return;
        Peer peer=peers.get(id);
        if(peer==null){if(peers.size()>=19)return;peer=new Peer();peers.put(id,peer);}
        synchronized(peer){while(peer.queue.size()>=6)peer.queue.poll();peer.queue.offer(bytes);peer.last=SystemClock.elapsedRealtime();}
    }
    private void play() {
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);
        short[] mix=new short[FRAME];int[] sums=new int[FRAME];
        try {
            while(running){
                Arrays.fill(sums,0);
                long now=SystemClock.elapsedRealtime();
                for(Map.Entry<String,Peer> entry:peers.entrySet()){
                    Peer peer=entry.getValue();byte[] data;
                    synchronized(peer){data=peer.queue.poll();}
                    if(data==null){if(now-peer.last>3000)peers.remove(entry.getKey());continue;}
                    if(app.deafened)continue;
                    try{
                        ByteBuffer packet=ByteBuffer.wrap(data);int epoch=packet.getInt(37);long seq=Integer.toUnsignedLong(packet.getInt(41));
                        if(peer.decoder==null||peer.epoch!=epoch||seq-peer.sequence>25){peer.decoder=new OpusDecoder(RATE,1);peer.epoch=epoch;peer.sequence=-1;}
                        if(seq<=peer.sequence)continue;peer.sequence=seq;
                        int count=peer.decoder.decode(data,45,data.length-45,peer.pcm,0,FRAME,false);
                        for(int i=0;i<count;i++)sums[i]+=peer.pcm[i];
                    }catch(Exception ignored){peer.decoder=null;}
                }
                for(int i=0;i<FRAME;i++)mix[i]=(short)Math.max(-32768,Math.min(32767,sums[i]));
                int written=0;while(running&&written<FRAME){int n=player.write(mix,written,FRAME-written,AudioTrack.WRITE_BLOCKING);if(n<0)throw new Exception("扬声器播放失败 "+n);written+=n;}
            }
        }catch(Exception e){if(running)app.main.post(()->{app.event("error","语音播放中断："+CommunityApp.reason(e));app.leave();});}
    }
    void tone(boolean join){ToneGenerator t=tone;if(t!=null&&!app.deafened)t.startTone(join?ToneGenerator.TONE_PROP_BEEP:ToneGenerator.TONE_PROP_BEEP2,100);}
    void speaker(boolean enabled){manager.setSpeakerphoneOn(enabled);}
    @Override public void close(){
        running=false;
        try{if(recorder!=null)recorder.stop();}catch(Exception ignored){}
        try{if(player!=null)player.pause();}catch(Exception ignored){}
        // Never block UI/WebSocket threads while waiting for an AudioRecord driver.
        new Thread(()->{
            try{if(capture!=null)capture.join(1500);if(playback!=null)playback.join(1500);}catch(InterruptedException ignored){}
            if(echo!=null)echo.release();if(noise!=null)noise.release();
            if(recorder!=null)recorder.release();if(player!=null)player.release();if(tone!=null)tone.release();peers.clear();
        },"HXZ audio cleanup").start();
        manager.abandonAudioFocusRequest(focus);manager.setSpeakerphoneOn(false);manager.setMode(previousMode);
        if(wake!=null&&wake.isHeld())wake.release();
    }
    private static final class Peer { final ArrayDeque<byte[]> queue=new ArrayDeque<>();final short[] pcm=new short[FRAME];OpusDecoder decoder;int epoch;long sequence=-1,last; }
}
