package top.hxzmc.community;

import android.app.ActivityManager;
import android.content.*;
import android.content.pm.*;
import android.os.Build;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateFactory;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.*;
import org.json.*;

/** Signed resources live in this application's private storage. No second APK is installed. */
final class GameEngine {
    private final CommunityApp app;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final OkHttpClient http=new OkHttpClient.Builder().connectTimeout(7,TimeUnit.SECONDS).readTimeout(15,TimeUnit.SECONDS).followRedirects(true).followSslRedirects(false).build();
    private final SharedPreferences prefs,runtimePrefs;
    private final File archive,part,modules;
    private volatile Call transfer;
    private volatile boolean busy,cancelled;
    private volatile String phase="idle",message="首次启动游戏时自动下载运行资源",checkedEnvelope="";
    private volatile long received,total,identityGeneration;
    private volatile JSONObject manifest,pending;
    private String activeKey="";private long activeChecked;private volatile long launchRequestedAt;private JSONObject activeValue;
    GameEngine(CommunityApp app){
        this.app=app;prefs=app.getSharedPreferences("game-engine",0);runtimePrefs=app.getSharedPreferences("hxz-runtime-module",0);
        File cache=new File(app.getCacheDir(),"game-runtime");cache.mkdirs();archive=new File(cache,"runtime.zip");part=new File(cache,"runtime.part");
        modules=new File(app.getFilesDir(),"runtime-modules");modules.mkdirs();
    }
    private String unsupportedReason(){
        if(!Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a"))return "游戏运行模块需要 ARM64 设备；社区功能仍可使用";
        try{if(android.system.Os.sysconf(android.system.OsConstants._SC_PAGESIZE)!=4096)return "当前游戏运行模块尚不支持此设备的内存页大小；社区功能仍可使用，暂不下载游戏资源";}
        catch(Exception e){return "无法确认设备的运行兼容性，请更新社区应用后重试";}
        return "";
    }
    private boolean supported(){return unsupportedReason().isEmpty();}
    private Intent runtimeIntent(){return new Intent().setClassName(app.getPackageName(),"top.hxzmc.community.game.GameRuntimeActivity");}
    private boolean backendReady(){return app.getPackageManager().resolveActivity(runtimeIntent(),0)!=null;}
    private synchronized JSONObject active(){String key=prefs.getString("activation","{}");long now=android.os.SystemClock.elapsedRealtime();if(key.equals(activeKey)&&now-activeChecked<5000)return activeValue;activeKey=key;activeChecked=now;activeValue=null;try{
        JSONObject activation=new JSONObject(key);JSONObject m=verify(activation.getString("envelope"));File root=new File(activation.getString("root"));
        if(!root.isAbsolute()||!root.getCanonicalPath().startsWith(modules.getCanonicalPath()+File.separator)||!root.getCanonicalFile().equals(root.getAbsoluteFile())||!GameRuntimeStore.valid(root,m))return null;
        activeValue=m;return m;
    }catch(Exception e){return null;}}
    synchronized JSONObject state(){JSONObject m=active();boolean backend=backendReady();String unsupported=unsupportedReason();return CommunityApp.obj("phase",phase,"message",!unsupported.isEmpty()?unsupported:backend?message:"专用游戏引擎正在开发，本构建尚不能启动手机游戏","received",received,"total",total,"busy",busy,"supported",unsupported.isEmpty(),"backendReady",backend,"module",true,"installed",m!=null&&backend,"trusted",m!=null,"version",m==null?"":m.optString("versionName"),"riskAccepted",prefs.getBoolean("riskAccepted",false),"ready",m!=null&&backend&&unsupported.isEmpty(),"renderers",m==null?new JSONArray():m.optJSONArray("renderers"));}
    private synchronized void publish(String stage,String text){phase=stage;message=text;app.event("gameEngine",state());}
    void accountChanged(){identityGeneration++;pending=null;cancelled=true;Call call=transfer;if(call!=null)call.cancel();}
    Object call(JSONObject input)throws Exception{
        switch(input.optString("action","state")){
            case "accept":prefs.edit().putBoolean("riskAccepted",input.optBoolean("accepted")).apply();return state();
            case "download":case "install":download(null);return state();
            case "cancel":pending=null;cancelled=true;if(transfer!=null)transfer.cancel();return state();
            case "launch":case "settings":case "importAccount":eligible();if(active()==null)download(input);else perform(input);return state();
            default:return state();
        }
    }
    private void eligible()throws Exception{if(!backendReady())throw new IOException("专用游戏引擎尚未完成，本开发构建不能启动手机游戏");String unsupported=unsupportedReason();if(!unsupported.isEmpty())throw new IOException(unsupported);if(!prefs.getBoolean("riskAccepted",false))throw new IOException("请先阅读并确认手机游戏运行提示");account();}
    private JSONObject verify(String raw)throws Exception{
        JSONObject envelope=new JSONObject(raw);byte[] payload=Base64.decode(envelope.getString("payload"),Base64.DEFAULT),sig=Base64.decode(envelope.getString("signature"),Base64.DEFAULT);boolean ok=false;
        PackageInfo self=app.getPackageManager().getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        for(android.content.pm.Signature signer:self.signingInfo.getApkContentsSigners())if(UpdateTrust.verify(payload,sig,CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(signer.toByteArray())).getPublicKey()))ok=true;
        if(!ok)throw new IOException("运行模块签名不匹配");JSONObject m=new JSONObject(new String(payload,StandardCharsets.UTF_8));
        if(!"android-runtime-module".equals(m.optString("kind"))||!app.getPackageName().equals(m.optString("package"))||m.optInt("interfaceVersion")!=1||!"arm64-v8a".equals(m.optString("abi"))||m.optInt("minSdk",29)>Build.VERSION.SDK_INT||m.optInt("minimumAppVersionCode",80400)>BuildConfig.VERSION_CODE||!m.getString("url").matches("https://github\\.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/[A-Za-z0-9._-]+/HXZ-Runtime-[A-Za-z0-9._-]+\\.zip")||m.getLong("size")<=0||m.getLong("size")>768L*1024*1024||!m.getString("sha256").matches("[a-f0-9]{64}")||!m.optString("moduleSha256").matches("[a-f0-9]{64}")||m.getLong("versionCode")<80400)throw new IOException("运行模块与当前社区版本不兼容，请先更新社区应用");return m;
    }
    private List<String> sources(){LinkedHashSet<String> all=new LinkedHashSet<>();all.add("");Collections.addAll(all,AppUpdater.MIRRORS);return new ArrayList<>(all);}
    private JSONObject check()throws Exception{
        Exception failure=null;
        String pinned="releases/download/v"+BuildConfig.VERSION_NAME+"/game-runtime-latest.json",latest="releases/latest/download/game-runtime-latest.json";
        // A fresh installation should not wait through older stable releases that predate this module.
        List<String> paths=active()==null?Arrays.asList(pinned,latest):Arrays.asList(latest,pinned);
        for(String path:paths)for(String prefix:sources()){
            if(cancelled)throw new IOException("已暂停");try{
                transfer=http.newBuilder().callTimeout(7,TimeUnit.SECONDS).build().newCall(new Request.Builder().url(prefix+AppUpdater.REPO+path).header("Cache-Control","no-cache").build());
                try(Response r=transfer.execute()){
                    if(!r.isSuccessful()||r.body()==null)throw new IOException("HTTP "+r.code());String raw=new String(CommunityApp.bounded(r.body().byteStream(),128*1024),StandardCharsets.UTF_8);
                    JSONObject m=verify(raw);checkedEnvelope=raw;return m;
                }
            }catch(Exception e){failure=e;}
        }
        throw new IOException("暂时无法获取运行模块，已保留进度，请稍后继续",failure);
    }
    private boolean gameProcessRunning(){
        ActivityManager manager=(ActivityManager)app.getSystemService(Context.ACTIVITY_SERVICE);List<ActivityManager.RunningAppProcessInfo> list=manager.getRunningAppProcesses();if(list==null)return false;
        for(ActivityManager.RunningAppProcessInfo p:list)if(p.uid==android.os.Process.myUid()&&(p.processName.equals(app.getPackageName()+":game")||p.processName.equals(app.getPackageName()+":jvm")))return true;return false;
    }
    private synchronized void download(JSONObject next)throws Exception{
        eligible();if(busy)throw new IOException("运行模块正在准备中，请等待完成或暂停当前下载");if(gameProcessRunning())throw new IOException("请先退出游戏及正在安装的任务，再更新运行模块");
        pending=next==null?null:new JSONObject(next.toString());final long ticket=identityGeneration;busy=true;cancelled=false;publish("checking","正在检查游戏运行资源");
        worker.execute(()->{
            try{
                manifest=check();total=manifest.getLong("size");JSONObject current=active();
                if(current==null||current.getLong("versionCode")<manifest.getLong("versionCode")){
                    boolean cached=archive.isFile()&&archive.length()==total&&GameRuntimeStore.sha(archive).equals(manifest.getString("sha256"));if(!cached)fetchArchive();
                    if(cancelled||ticket!=identityGeneration)throw new IOException("已暂停");publish("extracting","正在校验并准备游戏运行资源");
                    File root=GameRuntimeStore.extract(archive,modules,manifest,()->cancelled||ticket!=identityGeneration);
                    if(cancelled||ticket!=identityGeneration)throw new IOException("已暂停");if(gameProcessRunning())throw new IOException("游戏进程正在使用运行资源，请退出游戏后继续");
                    // Manifest and root are one atomic activation; failed writes preserve the previous generation.
                    String activation=new JSONObject().put("envelope",checkedEnvelope).put("root",root.getAbsolutePath()).toString();
                    if(!prefs.edit().putString("activation",activation).commit())throw new IOException("无法启用运行模块");
                    if(active()==null)throw new IOException("运行模块未能完整启用，请重试");
                }
                publish("ready","运行模块已就绪，无需另行安装应用");JSONObject action=pending;pending=null;
                if(action!=null&&!cancelled&&ticket==identityGeneration){if(app.foreground&&app.activity.get()!=null)perform(action);else publish("ready","运行模块已就绪，返回游戏页面即可启动");}
            }catch(Exception e){pending=null;publish(cancelled?"paused":"error",CommunityApp.reason(e));}
            finally{busy=false;transfer=null;app.event("gameEngine",state());}
        });
    }
    private void fetchArchive()throws Exception{
        if(!prefs.getString("partialHash","").equals(manifest.getString("sha256"))&&part.exists()&&!part.delete())throw new IOException("无法清理旧版本下载缓存");
        prefs.edit().putString("partialHash",manifest.getString("sha256")).apply();Exception failure=null;
        for(String prefix:sources())for(int attempt=0;attempt<5;attempt++){
            if(cancelled)throw new IOException("已暂停");long offset=part.length();if(offset>total){if(!part.delete())throw new IOException("下载缓存无法重置");offset=0;}
            received=offset;publish("downloading","正在下载运行资源，可暂停后继续");
            try{
                if(offset!=total){
                    Request.Builder request=new Request.Builder().url(prefix+manifest.getString("url"));if(offset>0)request.header("Range","bytes="+offset+"-");transfer=http.newCall(request.build());
                    try(Response r=transfer.execute()){
                        if(r.code()==404||r.code()==403){failure=new IOException("下载节点 HTTP "+r.code());break;}
                        if(r.code()==416){part.delete();throw new IOException("下载断点已过期，正在重新获取");}
                        if(!r.isSuccessful()||r.body()==null)throw new IOException("下载节点 HTTP "+r.code());boolean append=offset>0&&r.code()==206;
                        if(r.code()==206&&!r.header("Content-Range","").startsWith("bytes "+offset+"-"))throw new IOException("下载断点不匹配");if(!append)received=0;
                        try(InputStream in=r.body().byteStream();OutputStream out=new FileOutputStream(part,append)){
                            byte[] bytes=new byte[65536];int n;long last=0;while((n=in.read(bytes))!=-1){if(cancelled)throw new IOException("已暂停");received+=n;if(received>total)throw new IOException("模块大小不匹配");out.write(bytes,0,n);if(System.currentTimeMillis()-last>250){app.event("gameEngine",state());last=System.currentTimeMillis();}}
                        }
                    }
                }
                if(part.length()!=total)throw new IOException("下载连接提前断开，已保留断点");if(!GameRuntimeStore.sha(part).equals(manifest.getString("sha256")))throw new IOException("运行模块完整性校验失败");
                if(archive.exists()&&!archive.delete())throw new IOException("旧模块缓存无法删除");if(!part.renameTo(archive))throw new IOException("无法保存运行模块");return;
            }catch(Exception e){failure=e;if(part.length()>=total)part.delete();if(cancelled)throw e;for(int n=0;n<5&&!cancelled;n++)Thread.sleep(100);}
        }
        throw new IOException("运行资源下载已暂停，可继续下载；已完成的部分会保留",failure);
    }
    private JSONObject account()throws Exception{
        JSONObject c=app.gameCredentials(),p=c.optJSONObject("selectedProfile");if(p==null||c.optString("accessToken").isEmpty()||c.optString("clientToken").isEmpty())throw new IOException("请先登录皮肤站并选择角色");
        return CommunityApp.obj("name",p.getString("name"),"username",c.optString("loginUsername",p.getString("name")),"uuid",p.getString("id"),"accessToken",c.getString("accessToken"),"clientToken",c.getString("clientToken"));
    }
    private void perform(JSONObject input)throws Exception{
        eligible();if(!"launch".equals(input.optString("action"))){open(CommunityApp.obj("protocol",1,"created",System.currentTimeMillis(),"accountOnly",true,"account",account()));return;}
        String id=input.getString("id");if(!Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(id))throw new IOException("请选择已配置的默认服务器整合包");
        JSONObject response;try{response=(JSONObject)app.request(app.apiUrl("/api/server-presets"),"GET",null,"");prefs.edit().putString("presets",response.toString()).apply();}catch(Exception e){response=new JSONObject(prefs.getString("presets","{}"));}
        JSONArray servers=response.optJSONArray("servers");JSONObject preset=null;if(servers!=null)for(int i=0;i<servers.length();i++)if(id.equals(servers.getJSONObject(i).optString("id")))preset=servers.getJSONObject(i);if(preset==null)throw new IOException("无法读取服务器配置，请先连接社区");
        JSONObject options=input.optJSONObject("options");options=options==null?new JSONObject():new JSONObject(options.toString());if(options.toString().length()>2000)throw new IOException("运行设置过大");options.remove("joinServer");options.remove("hostLanPort");
        JSONObject job=CommunityApp.obj("protocol",1,"created",System.currentTimeMillis(),"server",preset,"options",options,"account",account());
        if(input.optBoolean("room")){
            JSONObject guest=app.gameLobby.guestConfig(),host=app.gameLobby.hostConfig();
            if(guest!=null&&id.equals(guest.optString("instance"))){options.put("joinServer",guest.getString("address")).put("autoJoin",true);job.put("expectedGame",guest.getJSONObject("game"));}
            else if(host!=null&&id.equals(host.optString("instance"))){options.put("hostLanPort",host.getInt("port")).put("autoJoin",false);}
            else throw new IOException("联机通道已关闭或实例不匹配，请返回联机大厅重新连接");
        }
        open(job);
    }
    private synchronized void open(JSONObject job)throws Exception{
        long now=android.os.SystemClock.elapsedRealtime();
        if(gameProcessRunning()||launchRequestedAt!=0&&now-launchRequestedAt<15000)throw new IOException("游戏窗口已在启动或运行，请先返回当前游戏窗口");
        final long ticket=identityGeneration;
        JSONObject selected=active();if(selected==null)throw new IOException("请先准备游戏运行模块");
        File root=new File(new JSONObject(prefs.getString("activation","{}")).getString("root"));
        if(!GameRuntimeStore.validDeep(root,selected))throw new IOException("游戏运行资源已损坏，请重新下载运行模块");
        if(ticket!=identityGeneration||!job.getJSONObject("account").getString("uuid").equals(account().getString("uuid")))throw new IOException("社区角色已切换，请重新启动游戏");
        job.put("runtimeRoot",root.getAbsolutePath());Intent intent=runtimeIntent().putExtra("job",job.toString());
        launchRequestedAt=android.os.SystemClock.elapsedRealtime();app.main.post(()->{try{MainActivity a=app.activity.get();if(a!=null&&app.foreground&&ticket==identityGeneration)a.startActivity(intent);else{launchRequestedAt=0;publish("ready","返回游戏页面即可启动");}}catch(Exception e){launchRequestedAt=0;publish("error",CommunityApp.reason(e));}});
    }
}
