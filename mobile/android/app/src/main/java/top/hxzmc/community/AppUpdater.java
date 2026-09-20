package top.hxzmc.community;

import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateFactory;
import java.util.*;
import java.util.concurrent.*;
import okhttp3.*;
import org.json.*;

/** Independent, bounded update worker. Community credentials never go to update hosts. */
final class AppUpdater {
    static final String REPO="https://github.com/0xiaoyun0/HXZ_LAUNCHER/";
    static final String MANIFEST=REPO+"releases/latest/download/android-latest.json";
    static final String[] MIRRORS={"https://gh-proxy.com/","https://ghproxy.net/","https://ghfast.top/",""};
    private final CommunityApp app;
    private final SharedPreferences prefs;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final OkHttpClient http=new OkHttpClient.Builder().connectTimeout(7,TimeUnit.SECONDS).readTimeout(12,TimeUnit.SECONDS)
        .callTimeout(20,TimeUnit.SECONDS).followRedirects(true).followSslRedirects(false).build();
    private final File apk,part;
    private JSONObject info;
    private volatile Call activeCall;
    private volatile boolean cancelled;
    private boolean working;
    private String phase="idle",message="尚未检查",source="";
    private long received,total,lastAttempt;

    AppUpdater(CommunityApp app){
        this.app=app;prefs=app.getSharedPreferences("app-updates",0);
        File dir=new File(app.getCacheDir(),"app-update");dir.mkdirs();apk=new File(dir,"community.apk");part=new File(dir,"community.part");part.delete();
        worker.execute(()->{
            try{
                JSONObject saved=verifyManifest(prefs.getString("manifest",""));
                if(saved.getLong("versionCode")>BuildConfig.VERSION_CODE){
                    synchronized(this){info=saved;}
                    if(apk.isFile()){validateApk(apk,saved);set("ready","更新已就绪，点击安装");}
                    else set("available","发现新版本");
                }else apk.delete();
            }catch(Exception ignored){apk.delete();}
        });
    }
    synchronized JSONObject state(){
        return CommunityApp.obj("phase",phase,"message",message,"source",source,"received",received,"total",total,
            "currentVersion",BuildConfig.VERSION_NAME,"currentBuild",BuildConfig.VERSION_CODE,
            "autoCheck",prefs.getBoolean("autoCheck",true),"autoDownload",prefs.getBoolean("autoDownload",true),
            "checkedAt",prefs.getLong("checkedAt",0),"version",info==null?JSONObject.NULL:info);
    }
    private synchronized void set(String phase,String text){this.phase=phase;message=text;app.event("appUpdate",state());}
    private synchronized void progress(String source,long received,long total){this.source=source;this.received=received;this.total=total;app.event("appUpdate",state());}
    synchronized JSONObject settings(JSONObject value){
        SharedPreferences.Editor edit=prefs.edit();
        if(value.has("autoCheck"))edit.putBoolean("autoCheck",value.optBoolean("autoCheck"));
        if(value.has("autoDownload"))edit.putBoolean("autoDownload",value.optBoolean("autoDownload"));
        edit.apply();app.event("appUpdate",state());return state();
    }
    void foreground(){
        long now=System.currentTimeMillis();
        if(prefs.getBoolean("autoCheck",true)&&now-prefs.getLong("checkedAt",0)>6*60*60*1000L&&now-lastAttempt>15*60*1000L)check();
        app.event("appUpdate",state());
    }
    synchronized JSONObject check(){
        if(working)return state();working=true;cancelled=false;lastAttempt=System.currentTimeMillis();set("checking","正在检查更新…");
        worker.execute(()->{
            try{
                JSONObject candidate=null;String envelope=null;Exception failure=null;
                for(String prefix:MIRRORS){
                    ensureActive();progress(sourceName(prefix),0,0);
                    try{
                        String raw=fetch(prefix+MANIFEST+"?t="+System.currentTimeMillis());JSONObject found=verifyManifest(raw);
                        if(candidate==null||found.getLong("versionCode")>candidate.getLong("versionCode")){candidate=found;envelope=raw;}
                        if(found.getLong("versionCode")>BuildConfig.VERSION_CODE)break;
                    }catch(Exception e){failure=e;}
                }
                ensureActive();if(candidate==null)throw new IOException("所有更新源暂时不可用，请稍后重试",failure);
                prefs.edit().putLong("checkedAt",System.currentTimeMillis()).apply();
                synchronized(this){info=candidate;}
                if(candidate.getLong("versionCode")<=BuildConfig.VERSION_CODE){set("latest","已是最新版本");return;}
                prefs.edit().putString("manifest",envelope).apply();
                if(apk.isFile()){try{validateApk(apk,candidate);set("ready","更新已就绪，点击安装");return;}catch(Exception ignored){apk.delete();}}
                set("available","发现新版本");
                if(prefs.getBoolean("autoDownload",true))downloadNow(candidate);
            }catch(Exception e){set(cancelled?"paused":"error",cancelled?"已暂停，可重新下载":CommunityApp.reason(e));}
            finally{finish();}
        });return state();
    }
    synchronized JSONObject download(){
        if(working)return state();if(info==null||info.optLong("versionCode")<=BuildConfig.VERSION_CODE)return check();
        working=true;cancelled=false;JSONObject target=info;set("downloading","准备下载…");
        worker.execute(()->{try{downloadNow(target);}catch(Exception e){set(cancelled?"paused":"error",cancelled?"已暂停，可重新下载":CommunityApp.reason(e));}finally{finish();}});return state();
    }
    synchronized JSONObject cancel(){cancelled=true;Call call=activeCall;if(call!=null)call.cancel();return state();}
    private synchronized void finish(){part.delete();activeCall=null;working=false;}
    private void ensureActive() throws IOException{if(cancelled)throw new IOException("已取消");}
    private static String sourceName(String prefix){return prefix.isEmpty()?"GitHub 官方":prefix.contains("ghfast")?"GHFast 镜像":prefix.contains("gh-proxy")?"GH-Proxy 镜像":"GHProxy 镜像";}
    private String fetch(String url) throws Exception{
        activeCall=http.newCall(new Request.Builder().url(url).header("Cache-Control","no-cache").build());
        try(Response response=activeCall.execute()){
            if(!response.isSuccessful()||response.body()==null)throw new IOException("HTTP "+response.code());
            return new String(CommunityApp.bounded(response.body().byteStream(),128*1024),StandardCharsets.UTF_8);
        }
    }
    JSONObject verifyManifest(String raw) throws Exception{
        JSONObject envelope=new JSONObject(raw);
        byte[] payload=Base64.decode(envelope.getString("payload"),Base64.DEFAULT),signature=Base64.decode(envelope.getString("signature"),Base64.DEFAULT);
        PackageInfo installed=app.getPackageManager().getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        android.content.pm.Signature[] signers=installed.signingInfo.getApkContentsSigners();
        boolean verified=false;
        for(android.content.pm.Signature signer:signers){
            if(UpdateTrust.verify(payload,signature,CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(signer.toByteArray())).getPublicKey())){verified=true;break;}
        }
        if(!verified)throw new IOException("更新信息签名不匹配");
        JSONObject data=new JSONObject(new String(payload,StandardCharsets.UTF_8));
        String url=data.getString("url");
        UpdateTrust.metadata(url,data.getLong("size"),data.getLong("versionCode"),data.getString("sha256"));
        if(data.optInt("minSdk",29)>android.os.Build.VERSION.SDK_INT)throw new IOException("新版本不支持当前 Android 系统");
        return data;
    }
    private void downloadNow(JSONObject target) throws Exception{
        Exception failure=null;long expected=target.getLong("size");
        for(String prefix:MIRRORS){
            ensureActive();set("downloading","正在下载更新…");progress(sourceName(prefix),0,expected);
            try{
                activeCall=http.newBuilder().callTimeout(4,TimeUnit.MINUTES).build().newCall(new Request.Builder().url(prefix+target.getString("url")).build());
                try(Response response=activeCall.execute()){
                    if(!response.isSuccessful()||response.body()==null)throw new IOException("HTTP "+response.code());
                    if(response.body().contentLength()>0&&response.body().contentLength()!=expected)throw new IOException("下载大小不匹配");
                    try(InputStream in=response.body().byteStream();OutputStream out=new FileOutputStream(part)){
                        byte[] buffer=new byte[32768];long count=0,last=0;int n;
                        while((n=in.read(buffer))!=-1){ensureActive();count+=n;if(count>expected)throw new IOException("下载文件超过预期大小");out.write(buffer,0,n);
                            if(System.currentTimeMillis()-last>150){progress(sourceName(prefix),count,expected);last=System.currentTimeMillis();}}
                    }
                }
                ensureActive();set("verifying","正在验证安装包…");validateApk(part,target);
                if(apk.exists()&&!apk.delete())throw new IOException("无法替换旧更新文件");
                if(!part.renameTo(apk))throw new IOException("无法保存安装包");
                progress(sourceName(prefix),expected,expected);set("ready","更新已就绪，点击安装");return;
            }catch(Exception e){part.delete();failure=e;}
        }
        ensureActive();throw new IOException("更新下载失败，可重试并自动切换下载源",failure);
    }
    private void validateApk(File file,JSONObject target) throws Exception{
        if(file.length()!=target.getLong("size"))throw new IOException("安装包大小校验失败");
        if(!UpdateTrust.sha256(file).equalsIgnoreCase(target.getString("sha256")))throw new IOException("安装包 SHA-256 校验失败");
        PackageManager pm=app.getPackageManager();PackageInfo incoming=pm.getPackageArchiveInfo(file.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES);
        PackageInfo installed=pm.getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        if(incoming==null||!app.getPackageName().equals(incoming.packageName)||incoming.getLongVersionCode()!=target.getLong("versionCode")||incoming.getLongVersionCode()<=installed.getLongVersionCode())throw new IOException("安装包版本或应用标识不匹配");
        if(incoming.signingInfo==null||!new HashSet<>(Arrays.asList(incoming.signingInfo.getApkContentsSigners())).equals(new HashSet<>(Arrays.asList(installed.signingInfo.getApkContentsSigners()))))throw new IOException("安装包签名不匹配");
    }
    synchronized JSONObject install(){
        if(working)return state();if(info==null||!apk.isFile())throw new IllegalStateException("请先下载更新");
        working=true;JSONObject target=info;
        worker.execute(()->{try{
            validateApk(apk,target);
            app.main.post(()->{
                MainActivity activity=app.activity.get();if(activity==null){set("ready","请返回应用后安装更新");return;}
                try{
                    if(!app.getPackageManager().canRequestPackageInstalls()){
                        set("ready","请允许安装此来源的应用，返回后点击安装");
                        activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+app.getPackageName())));return;
                    }
                    activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(Uri.parse("content://"+app.getPackageName()+".updates/community.apk"),"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
                    set("ready","已打开系统安装确认；取消后可再次安装");
                }catch(Exception e){set("error","无法打开安装器："+CommunityApp.reason(e));}
            });
        }catch(Exception e){apk.delete();set("error",CommunityApp.reason(e));}finally{finish();}});return state();
    }
}
