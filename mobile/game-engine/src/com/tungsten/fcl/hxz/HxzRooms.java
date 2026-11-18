package com.tungsten.fcl.hxz;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import com.tungsten.fcl.FCLApp;
import com.tungsten.fcl.setting.VersionSetting;
import com.tungsten.fclauncher.utils.FCLPath;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Consumer;

/** Room interface shared with the community's native transport; never exposes account data. */
public final class HxzRooms {
    private static volatile Session current;
    private static volatile Context launchedContext;
    private HxzRooms() {}

    public static String joinAddress(JSONObject options, String fallback) throws IOException {
        String address = options.optString("joinServer", "");
        if (address.isEmpty()) return options.optBoolean("autoJoin", true) ? fallback : "";
        if (!address.matches("127\\.0\\.0\\.1:[0-9]{1,5}")) throw new IOException("房间转发地址无效，请从社区重新加入");
        int port = Integer.parseInt(address.substring(address.indexOf(':') + 1));
        if (port < 1 || port > 65535) throw new IOException("房间转发端口无效");
        return address;
    }

    public static JSONObject describe(Path root, String minecraft, String loader, String loaderVersion, String preset) throws Exception {
        List<String> hashes = new ArrayList<>();
        Path mods = root.resolve("mods");
        if (Files.isSymbolicLink(mods)) throw new IOException("联机模组目录不支持符号链接");
        if (Files.isDirectory(mods)) try (java.util.stream.Stream<Path> files = Files.list(mods)) {
            for (Path file : (Iterable<Path>) files::iterator) {
                if (!file.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".jar")) continue;
                if (Files.isSymbolicLink(file)) throw new IOException("联机模组文件不支持符号链接");
                if (!Files.isRegularFile(file)) continue;
                if (hashes.size() >= 10000) throw new IOException("实例模组数量超过上限");
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream input = Files.newInputStream(file)) { byte[] buffer = new byte[65536]; int n; while ((n=input.read(buffer))!=-1) { if(Thread.currentThread().isInterrupted())throw new InterruptedException("预检已取消");digest.update(buffer,0,n); } }
                hashes.add(hex(digest.digest()));
            }
        }
        Collections.sort(hashes);
        JSONObject game = new JSONObject();
        game.put("minecraft", minecraft).put("loader", loader.equals("vanilla") ? "" : loader).put("loaderVersion", loader.equals("vanilla") ? "" : loaderVersion);
        game.put("modCount", hashes.size()).put("mods", hashes.isEmpty() ? "" : hex(MessageDigest.getInstance("SHA-256").digest(String.join("\n",hashes).getBytes(StandardCharsets.UTF_8))));
        game.put("preset", preset).put("platform", "android").put("compatibilityPolicy", "hxz-android-1");
        return game;
    }

    public static void validate(JSONObject actual, JSONObject expected, Consumer<String> progress) throws Exception {
        if (expected == null) return;
        for (String key : Arrays.asList("minecraft", "loader", "loaderVersion"))
            if (!actual.getString(key).equals(expected.optString(key))) throw new IOException("房间的 " + key + " 与本地实例不一致，请安装相同版本后重试");
        if (actual.getInt("modCount") == expected.optInt("modCount", -1) && actual.getString("mods").equals(expected.optString("mods"))) return;
        String preset=actual.getString("preset");
        boolean managed=Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(preset)&&preset.equals(expected.optString("preset"));
        if (managed && !"android".equals(expected.optString("platform"))) {
            progress.accept("已核对相同默认整合包版本；保留经过登记的安卓平台适配差异");
            return;
        }
        throw new IOException("房间与本地实例的模组清单不同，请先取得相同整合包；已下载文件保留");
    }

    public static void publishGame(Context context, JSONObject game) throws IOException {
        Bundle report = new Bundle(); report.putString("game",game.toString());
        Bundle response = report(context,report);
        if (response != null && !response.getString("error", "").isEmpty()) throw new IOException(response.getString("error"));
    }

    public static void configure(Context context, Path root, VersionSetting setting, JSONObject options) throws Exception {
        stop(false, "");
        launchedContext=context.getApplicationContext();
        String arguments=setting.getJavaArgs().replaceAll("(?:^|\\s)-javaagent:[^\\s]*[/\\\\]hxz-direct-lobby[/\\\\][^\\s]*", "").trim();
        setting.setJavaArgs(arguments);
        int port = options.optInt("hostLanPort",0);
        if (port == 0 || options.optBoolean("prepareOnly")) return;
        if (port < 1 || port > 65535) throw new IOException("房主局域网端口无效");
        byte[] agent;
        try (InputStream input=context.getAssets().open("hxz/direct-lobby.jar");ByteArrayOutputStream bytes=new ByteArrayOutputStream()) { byte[] buffer=new byte[16384];int n;while((n=input.read(buffer))!=-1)bytes.write(buffer,0,n);agent=bytes.toByteArray(); }
        String hash=hex(MessageDigest.getInstance("SHA-256").digest(agent));
        File folder=new File(context.getFilesDir(),"hxz-direct-lobby"); if(!folder.isDirectory()&&!folder.mkdirs())throw new IOException("无法准备联机控制器");
        File file=new File(folder,hash+".jar");
        if (!file.isFile()) {
            File temp=File.createTempFile("agent-", ".jar",folder);
            try { try(FileOutputStream output=new FileOutputStream(temp)){if(!temp.setReadOnly())throw new IOException("无法保护联机控制器");output.write(agent);output.getFD().sync();}Files.move(temp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING); }
            finally { if(temp.exists())temp.delete(); }
        }
        setting.setJavaArgs((arguments+" -javaagent:"+file.getAbsolutePath()).trim());
        Session session=new Session(context.getApplicationContext(),root,port);current=session;session.start();
    }

    public static void gameExited(int code) {
        Context context=launchedContext;launchedContext=null;
        if(current!=null)stop(true,code==0?"":"游戏进程已退出（"+code+"）");
        else if(context!=null){Bundle report=new Bundle();report.putBoolean("ready",false);report.putBoolean("exited",true);report.putString("error",code==0?"":"游戏进程已退出（"+code+"）");report(context,report);}
    }
    private static synchronized void stop(boolean exited, String error) {
        Session session=current;current=null;
        if(session!=null){session.closed=true;session.worker.interrupt();try{Files.deleteIfExists(session.control);}catch(IOException ignored){}if(exited){Bundle report=new Bundle();report.putInt("port",session.port);report.putBoolean("ready",false);report.putBoolean("exited",true);report.putString("error",error);report(session.context,report);}}
    }
    private static Bundle report(Context context,Bundle report) {
        try{return context.getContentResolver().call(Uri.parse("content://top.hxzmc.community.game-account"),"roomState",null,report);}catch(Exception ignored){return null;}
    }
    private static String hex(byte[] bytes){StringBuilder value=new StringBuilder(bytes.length*2);for(byte b:bytes)value.append(String.format(Locale.ROOT,"%02x",b&255));return value.toString();}

    private static final class Session {
        final Context context;final Path control;final int port;final Thread worker;final long started=System.currentTimeMillis();
        volatile boolean closed;long offset,lastHeartbeat;String carry="";
        Session(Context context,Path root,int port){this.context=context;this.control=root.resolve(".hxzl/direct-lobby.properties");this.port=port;worker=new Thread(this::run,"hxz-room-control");worker.setDaemon(true);}
        boolean authorized(){Bundle state=new Bundle();state.putInt("port",port);state.putBoolean("poll",true);Bundle response=report(context,state);return response!=null&&response.getBoolean("active");}
        void start()throws IOException{if(!authorized())throw new IOException("联机房间已关闭，请从社区重新创建");heartbeat();worker.start();}
        void heartbeat()throws IOException{
            Files.createDirectories(control.getParent());Path temp=Files.createTempFile(control.getParent(),"direct-",".tmp");
            try{Files.write(temp,("port="+port+"\n").getBytes(StandardCharsets.US_ASCII));Files.move(temp,control,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}lastHeartbeat=System.currentTimeMillis();
        }
        void run(){
            try{while(!closed){
                if(!authorized())break;
                if(System.currentTimeMillis()-lastHeartbeat>10000)heartbeat();
                File log=FCLPath.getLatestGameLog();
                if(log.isFile()&&log.lastModified()>=started){try(RandomAccessFile input=new RandomAccessFile(log,"r")){
                    if(input.length()<offset){offset=0;carry="";}input.seek(offset);byte[] bytes=new byte[(int)Math.min(65536,input.length()-offset)];input.readFully(bytes);offset+=bytes.length;
                    String text=carry+new String(bytes,StandardCharsets.UTF_8);int end=text.lastIndexOf('\n');if(end>=0){for(String line:text.substring(0,end).split("\n"))accept(line.trim());carry=text.substring(end+1);}else carry=text.length()>65536?"":text;
                }}Thread.sleep(2000);
            }}catch(InterruptedException ignored){Thread.currentThread().interrupt();}catch(Exception error){Bundle report=new Bundle();report.putInt("port",port);report.putBoolean("ready",false);report.putString("error","自动开放局域网未完成，请返回社区重试");report(context,report);}
            finally{closed=true;try{Files.deleteIfExists(control);}catch(IOException ignored){}}
        }
        void accept(String line){int marker=line.indexOf("[HXZ-DIRECT] ");if(marker<0)return;String message=line.substring(marker+13);Bundle report=new Bundle();report.putInt("port",port);
            if(message.equals("READY "+port))report.putBoolean("ready",true);
            else if(message.startsWith("WAITING"))report.putBoolean("ready",false);
            else if(message.startsWith("ERROR ")){report.putBoolean("ready",false);report.putString("error",message.substring(6,Math.min(message.length(),1000)));}
            else return;report(context,report);
        }
    }
}
