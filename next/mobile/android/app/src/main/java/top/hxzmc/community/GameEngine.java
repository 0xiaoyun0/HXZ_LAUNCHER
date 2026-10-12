package top.hxzmc.community;

import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateFactory;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.*;
import org.json.*;

/** An optional, separately signed runtime. Skin tokens never cross the WebView bridge. */
final class GameEngine {
    static final String PACKAGE="top.hxzmc.gameengine";
    private final CommunityApp app;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final OkHttpClient http=new OkHttpClient.Builder().connectTimeout(7,TimeUnit.SECONDS).readTimeout(15,TimeUnit.SECONDS).followRedirects(true).followSslRedirects(false).build();
    private final SharedPreferences prefs;
    private final File apk,part;
    private volatile Call transfer;
    private volatile boolean busy,cancelled;
    private String phase="idle",message="可选安装游戏运行组件";
    private long received,total;
    private volatile JSONObject manifest;
    GameEngine(CommunityApp app){this.app=app;prefs=app.getSharedPreferences("game-engine",0);File dir=new File(app.getCacheDir(),"game-engine");dir.mkdirs();apk=new File(dir,"engine.apk");part=new File(dir,"engine.part");if(apk.isFile())try{manifest=verify(prefs.getString("manifest",""));}catch(Exception ignored){manifest=null;}}
    private boolean supported(){return Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a");}
    private PackageInfo installed(){try{return app.getPackageManager().getPackageInfo(PACKAGE,PackageManager.GET_SIGNING_CERTIFICATES);}catch(Exception e){return null;}}
    synchronized JSONObject state(){
        PackageInfo p=installed();boolean trusted=p!=null&&app.getPackageManager().checkSignatures(app.getPackageName(),PACKAGE)==PackageManager.SIGNATURE_MATCH;
        JSONObject cached=manifest;boolean ready=apk.isFile()&&cached!=null&&(!trusted||p.getLongVersionCode()<cached.optLong("versionCode"));
        return CommunityApp.obj("phase",phase,"message",message,"received",received,"total",total,"busy",busy,"supported",supported(),"installed",p!=null,"trusted",trusted,"version",p==null?"":p.versionName,"riskAccepted",prefs.getBoolean("riskAccepted",false),"ready",ready);
    }
    private synchronized void publish(String stage,String text){phase=stage;message=text;app.event("gameEngine",state());}
    Object call(JSONObject input)throws Exception{
        switch(input.optString("action","state")){
            case "accept":prefs.edit().putBoolean("riskAccepted",input.optBoolean("accepted")).apply();return state();
            case "download":download();return state();
            case "cancel":cancelled=true;if(transfer!=null)transfer.cancel();return state();
            case "install":install();return state();
            case "launch":launch(input);return CommunityApp.obj("started",true);
            case "settings":open(null);return state();
            default:return state();
        }
    }
    private void eligible()throws IOException{if(!supported())throw new IOException("游戏运行组件目前需要 ARM64 手机；社区功能不受影响");if(!prefs.getBoolean("riskAccepted",false))throw new IOException("请先阅读并确认手机游戏运行提示");}
    private JSONObject verify(String raw)throws Exception{
        JSONObject envelope=new JSONObject(raw);byte[] payload=Base64.decode(envelope.getString("payload"),Base64.DEFAULT),sig=Base64.decode(envelope.getString("signature"),Base64.DEFAULT);boolean ok=false;
        PackageInfo self=app.getPackageManager().getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        for(android.content.pm.Signature signer:self.signingInfo.getApkContentsSigners())if(UpdateTrust.verify(payload,sig,CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(signer.toByteArray())).getPublicKey()))ok=true;
        if(!ok)throw new IOException("运行组件更新签名不匹配");JSONObject m=new JSONObject(new String(payload,StandardCharsets.UTF_8));
        if(!"android-game-engine".equals(m.optString("kind"))||!PACKAGE.equals(m.optString("package"))||!m.getString("url").matches("https://github\\.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/[A-Za-z0-9._-]+/HXZ-GameEngine-[A-Za-z0-9._-]+\\.apk")||m.getLong("size")<=0||m.getLong("size")>768L*1024*1024||!m.getString("sha256").matches("[a-fA-F0-9]{64}")||m.getLong("versionCode")<70000||m.optInt("minSdk",29)>Build.VERSION.SDK_INT)throw new IOException("运行组件更新信息无效");return m;
    }
    private JSONObject check()throws Exception{Exception failure=null;JSONObject best=null;for(String prefix:AppUpdater.MIRRORS){if(cancelled)throw new IOException("已暂停");try{transfer=http.newBuilder().callTimeout(7,TimeUnit.SECONDS).build().newCall(new Request.Builder().url(prefix+AppUpdater.REPO+"releases/latest/download/game-engine-latest.json").header("Cache-Control","no-cache").build());try(Response r=transfer.execute()){if(!r.isSuccessful())throw new IOException("HTTP "+r.code());String raw=new String(CommunityApp.bounded(r.body().byteStream(),128*1024),StandardCharsets.UTF_8);JSONObject m=verify(raw);if(best==null||m.getLong("versionCode")>best.getLong("versionCode")){best=m;prefs.edit().putString("manifest",raw).apply();}if(prefix.isEmpty())break;}}catch(Exception e){failure=e;}}
        if(best==null)throw new IOException("运行组件暂时无法下载。可安装本版随附的 HXZ-GameEngine APK 后返回。",failure);return best;}
    private synchronized void download()throws Exception{
        eligible();if(busy)return;busy=true;cancelled=false;publish("checking","正在检查游戏运行组件");
        worker.execute(()->{
            try{
                manifest=check();total=manifest.getLong("size");
                PackageInfo current=installed();
                if(current!=null&&current.getLongVersionCode()>=manifest.getLong("versionCode")&&app.getPackageManager().checkSignatures(app.getPackageName(),PACKAGE)==PackageManager.SIGNATURE_MATCH){apk.delete();publish("idle","游戏运行组件已是最新版本");return;}
                if(apk.isFile()){
                    try{validate(apk,manifest);publish("ready","组件已下载，请确认安装");return;}
                    catch(Exception ignored){apk.delete();}
                }
                if(!prefs.getString("partialHash","").equals(manifest.getString("sha256")))part.delete();
                prefs.edit().putString("partialHash",manifest.getString("sha256")).apply();
                Exception failure=null;
                for(String prefix:AppUpdater.MIRRORS){
                    for(int attempt=0;attempt<5;attempt++){
                        if(cancelled)throw new IOException("已暂停");
                        long offset=part.length();if(offset>total){part.delete();offset=0;}
                        received=offset;publish("downloading","正在下载运行组件，可暂停后继续");
                        try{
                            if(offset!=total){
                                Request.Builder request=new Request.Builder().url(prefix+manifest.getString("url"));
                                if(offset>0)request.header("Range","bytes="+offset+"-");
                                transfer=http.newCall(request.build());
                                try(Response r=transfer.execute()){
                                    if(r.code()==404||r.code()==403){failure=new IOException("下载节点 HTTP "+r.code());break;}
                                    if(!r.isSuccessful())throw new IOException("下载节点 HTTP "+r.code());
                                    boolean append=offset>0&&r.code()==206;
                                    if(r.code()==206&&!r.header("Content-Range","").startsWith("bytes "+offset+"-"))throw new IOException("下载断点不匹配");
                                    if(!append)received=0;
                                    try(InputStream in=r.body().byteStream();OutputStream out=new FileOutputStream(part,append)){
                                        byte[] bytes=new byte[65536];int n;long last=0;
                                        while((n=in.read(bytes))!=-1){
                                            if(cancelled)throw new IOException("已暂停");
                                            received+=n;if(received>total)throw new IOException("组件大小不匹配");out.write(bytes,0,n);
                                            if(System.currentTimeMillis()-last>250){app.event("gameEngine",state());last=System.currentTimeMillis();}
                                        }
                                    }
                                }
                            }
                            if(part.length()!=total)throw new IOException("下载连接提前断开");
                            validate(part,manifest);
                            if(apk.exists()&&!apk.delete())throw new IOException("旧组件缓存无法删除");
                            if(!part.renameTo(apk))throw new IOException("无法保存运行组件");
                            publish("ready","组件已下载，请确认安装");return;
                        }catch(Exception e){
                            failure=e;if(part.length()>=total)part.delete();if(cancelled)throw e;
                            if(attempt<4)Thread.sleep(Math.min(2000,250L*(attempt+1)));
                        }
                    }
                }
                throw new IOException("组件下载已暂停，可点击继续下载",failure);
            }catch(Exception e){publish(cancelled?"paused":"error",CommunityApp.reason(e));}
            finally{busy=false;transfer=null;app.event("gameEngine",state());}
        });
    }
    private void validate(File file,JSONObject m)throws Exception{
        if(file.length()!=m.getLong("size")||!UpdateTrust.sha256(file).equalsIgnoreCase(m.getString("sha256")))throw new IOException("运行组件校验失败");PackageManager pm=app.getPackageManager();PackageInfo incoming=pm.getPackageArchiveInfo(file.getPath(),PackageManager.GET_SIGNING_CERTIFICATES),self=pm.getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES),old=installed();
        if(incoming==null||!PACKAGE.equals(incoming.packageName)||incoming.getLongVersionCode()!=m.getLong("versionCode")||old!=null&&incoming.getLongVersionCode()<old.getLongVersionCode()||incoming.signingInfo==null||!new HashSet<>(Arrays.asList(incoming.signingInfo.getApkContentsSigners())).equals(new HashSet<>(Arrays.asList(self.signingInfo.getApkContentsSigners()))))throw new IOException("运行组件的签名、版本或身份不匹配");
    }
    private void install()throws Exception{eligible();if(busy)throw new IOException("下载仍在进行");JSONObject m=manifest==null?verify(prefs.getString("manifest","")):manifest;PackageInfo current=installed();if(current!=null&&current.getLongVersionCode()>=m.getLong("versionCode")&&app.getPackageManager().checkSignatures(app.getPackageName(),PACKAGE)==PackageManager.SIGNATURE_MATCH){download();return;}validate(apk,m);app.main.post(()->{MainActivity a=app.activity.get();if(a==null)return;try{if(!app.getPackageManager().canRequestPackageInstalls()){a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+app.getPackageName())));publish("ready","允许此来源安装后，请返回再次点击安装");return;}a.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(Uri.parse("content://"+app.getPackageName()+".updates/engine.apk"),"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}catch(Exception e){publish("error",CommunityApp.reason(e));}});}
    private void launch(JSONObject input)throws Exception{
        eligible();String id=input.getString("id");if(!Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(id))throw new IOException("实例无效");
        JSONObject response;try{response=(JSONObject)app.request(app.apiUrl("/api/server-presets"),"GET",null,"");prefs.edit().putString("presets",response.toString()).apply();}catch(Exception e){response=new JSONObject(prefs.getString("presets","{}"));}
        JSONArray servers=response.optJSONArray("servers");JSONObject preset=null;if(servers!=null)for(int i=0;i<servers.length();i++)if(id.equals(servers.getJSONObject(i).optString("id")))preset=servers.getJSONObject(i);if(preset==null)throw new IOException("无法读取服务器配置，请先连接社区");
        JSONObject c=app.credentials,profile=c.optJSONObject("selectedProfile");if(profile==null||c.optString("accessToken").isEmpty())throw new IOException("请先登录皮肤站并选择角色");
        JSONObject options=input.optJSONObject("options");if(options==null)options=new JSONObject();if(options.toString().length()>2000)throw new IOException("运行设置过大");
        open(CommunityApp.obj("protocol",1,"created",System.currentTimeMillis(),"server",preset,"options",options,"account",CommunityApp.obj("name",profile.getString("name"),"uuid",profile.getString("id"),"accessToken",c.getString("accessToken"),"clientToken",c.optString("clientToken"))));
    }
    private void open(JSONObject job)throws Exception{eligible();if(installed()==null)throw new IOException("请先安装游戏运行组件");if(app.getPackageManager().checkSignatures(app.getPackageName(),PACKAGE)!=PackageManager.SIGNATURE_MATCH)throw new IOException("运行组件签名不匹配，请安装幻想镇提供的组件");Intent intent=job==null?app.getPackageManager().getLaunchIntentForPackage(PACKAGE):new Intent().setClassName(PACKAGE,"com.tungsten.fcl.hxz.HxzBridgeActivity").putExtra("job",job.toString());if(intent==null)throw new IOException("运行组件入口不可用");app.main.post(()->{try{MainActivity a=app.activity.get();if(a!=null)a.startActivity(intent);}catch(Exception e){publish("error",CommunityApp.reason(e));}});}
}
