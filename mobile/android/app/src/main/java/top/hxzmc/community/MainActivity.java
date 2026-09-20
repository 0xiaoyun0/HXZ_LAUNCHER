package top.hxzmc.community;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.net.Uri;
import android.os.*;
import android.provider.OpenableColumns;
import android.view.*;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import okhttp3.*;
import org.json.*;

public final class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private WebView web;
    private CommunityApp app;
    private String permissionId, permissionRoom, fileId, fileKind;
    private File selectedBlueprint, download;
    private JSONObject downloadInfo;
    private long lastBack;
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);app=(CommunityApp)getApplication();app.activity=new java.lang.ref.WeakReference<>(this);
        web=new WebView(this);web.setBackgroundColor(Color.rgb(245,246,241));
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);settings.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new Bridge(),"HXZNative");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(!ORIGIN.equals(uri.getScheme()+"://"+uri.getAuthority()))return response(403,"text/plain","外部页面已拦截".getBytes(StandardCharsets.UTF_8));
                String path=uri.getPath();
                try{
                    if(path.startsWith("/community/api/avatars/")){
                        String endpoint=path.substring("/community".length())+(uri.getQuery()==null?"":"?"+uri.getQuery());
                        try(Response r=app.http.newCall(new Request.Builder().url(app.apiUrl(endpoint)).build()).execute()){
                            if(!r.isSuccessful())return response(404,"image/png",new byte[0]);
                            return response(200,"image/png",CommunityApp.bounded(r.body().byteStream(),24576));
                        }
                    }
                    if(path.contains("..")||path.contains("\\"))return response(403,"text/plain",new byte[0]);
                    if(path.equals("/"))path="/index.html";
                    String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":"text/html";
                    Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(path.substring(1)));
                }catch(Exception e){return response(404,"text/plain",new byte[0]);}
            }
            @Override public void onPageFinished(WebView view,String url){app.changed();}
        });
        android.widget.FrameLayout container=new android.widget.FrameLayout(this);
        container.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(container);
        // Android 15 enforces edge-to-edge; apply system/IME insets to the container once.
        if(Build.VERSION.SDK_INT>=30){
            getWindow().setDecorFitsSystemWindows(false);
            container.setOnApplyWindowInsetsListener((v,insets)->{
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                android.graphics.Insets ime=insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));return insets;
            });
        }
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->emit("back",true));
        web.loadUrl(ORIGIN+"/index.html");
    }
    static WebResourceResponse response(int status,String mime,byte[] bytes){return new WebResourceResponse(mime,"UTF-8",status,status==200?"OK":"Blocked",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(bytes));}
    void emit(String name,Object data){String args=new JSONArray().put(name).put(data).toString();runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.HXZEvent && window.HXZEvent.apply(null,"+args+")",null);});}
    private void result(String id,Object data,String error){emit("result",CommunityApp.obj("id",id,"data",data==null?JSONObject.NULL:data,"error",error==null?JSONObject.NULL:error));}
    @Override protected void onResume(){super.onResume();app.foreground=true;app.activity=new java.lang.ref.WeakReference<>(this);app.connect();app.changed();app.updater.foreground();}
    @Override public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);app.changed();}
    @Override protected void onPause(){super.onPause();app.pressing=false;if(app.ptt)app.voiceSettings(CommunityApp.obj("pressing",false));}
    @Override protected void onStop(){super.onStop();app.foreground=false;app.main.postDelayed(()->{if(!app.foreground&&app.room.isEmpty()&&app.recoveryRoom.isEmpty()){app.disconnect(false);app.connection="已暂停";app.changed();}},1500);}
    @Override protected void onDestroy(){if(app.activity.get()==this)app.activity.clear();if(selectedBlueprint!=null)selectedBlueprint.delete();if(download!=null)download.delete();web.removeJavascriptInterface("HXZNative");web.destroy();web=null;super.onDestroy();}
    @Override public void onBackPressed(){emit("back",true);}
    private void beginVoice(String id,String room){
        if(permissionId!=null){result(id,null,"麦克风权限请求尚未完成");return;}
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){permissionId=id;permissionRoom=room;requestPermissions(Build.VERSION.SDK_INT>=33?new String[]{Manifest.permission.RECORD_AUDIO,Manifest.permission.POST_NOTIFICATIONS}:new String[]{Manifest.permission.RECORD_AUDIO},42);return;}
        try{if(!app.connected)throw new Exception("请先连接社区");startForegroundService(new Intent(this,VoiceService.class).putExtra("room",room));result(id,CommunityApp.obj("ok",true),null);}catch(Exception e){result(id,null,CommunityApp.reason(e));}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] grants){super.onRequestPermissionsResult(code,permissions,grants);if(code==42){String id=permissionId,room=permissionRoom;permissionId=null;if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)beginVoice(id,room);else result(id,null,"需要麦克风权限才能加入语音，请在系统设置中允许");}}
    private void choose(String id,String kind){
        if(fileId!=null){result(id,null,"请先完成当前文件选择");return;}
        fileId=id;fileKind=kind;
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(kind.equals("avatar")||kind.equals("cover")?"image/*":"*/*");
        try{startActivityForResult(intent,43);}catch(Exception e){fileId=null;result(id,null,"系统没有可用的文件选择器");}
    }
    private void chooseDownload(String id,JSONObject info,File staged){
        if(fileId!=null){staged.delete();result(id,null,"请先完成当前文件选择");return;}
        fileId=id;fileKind="download";download=staged;downloadInfo=info;
        try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE,info.optString("filename","blueprint.nbt")),43);}catch(Exception e){fileId=null;staged.delete();result(id,null,"系统无法打开保存窗口");}
    }
    @Override protected void onActivityResult(int request,int code,Intent data){
        super.onActivityResult(request,code,data);if(request!=43)return;
        String id=fileId,kind=fileKind;fileId=null;
        if(code!=RESULT_OK||data==null){if(download!=null){download.delete();download=null;}result(id,null,"已取消");return;}
        Uri uri=data.getData();
        app.jobs.execute(()->{try{
            if(kind.equals("download")){
                File staged=download;download=null;
                try(InputStream in=new FileInputStream(staged);OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("无法写入所选位置");byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);}finally{staged.delete();}
                result(id,CommunityApp.obj("saved",true),null);return;
            }
            if(kind.equals("avatar")||kind.equals("cover")){
                byte[] raw=CommunityApp.bounded(getContentResolver().openInputStream(uri),12*1024*1024);
                BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(raw,0,raw.length,bounds);
                if(bounds.outWidth<=0||bounds.outHeight<=0||bounds.outWidth>20000||bounds.outHeight>20000)throw new IOException("图片尺寸或格式无效");
                BitmapFactory.Options options=new BitmapFactory.Options();options.inSampleSize=1;while(Math.max(bounds.outWidth,bounds.outHeight)/options.inSampleSize>512)options.inSampleSize*=2;
                Bitmap bitmap=BitmapFactory.decodeByteArray(raw,0,raw.length,options);if(bitmap==null)throw new IOException("无法读取图片");
                int side=Math.min(bitmap.getWidth(),bitmap.getHeight());Bitmap crop=Bitmap.createBitmap(bitmap,(bitmap.getWidth()-side)/2,(bitmap.getHeight()-side)/2,side,side);
                int target=kind.equals("avatar")?64:256;
                Bitmap small=Bitmap.createScaledBitmap(crop,target,target,true);ByteArrayOutputStream out=new ByteArrayOutputStream();small.compress(Bitmap.CompressFormat.PNG,100,out);
                String avatar="data:image/png;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP);
                if(small!=crop)small.recycle();if(crop!=bitmap)crop.recycle();bitmap.recycle();
                result(id,CommunityApp.obj("avatar",avatar),null);return;
            }
            String name="blueprint.nbt";try(android.database.Cursor cursor=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);}
            if(!name.toLowerCase(Locale.ROOT).endsWith(".nbt"))throw new IOException("请选择机械动力导出的 .nbt 文件");
            File staged=File.createTempFile("blueprint-",".nbt",getCacheDir());
            try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(staged)){byte[] buf=new byte[16384];int n,total=0;while((n=in.read(buf))!=-1){if((total+=n)>8*1024*1024)throw new IOException("蓝图不能超过 8 MB");out.write(buf,0,n);}}catch(Exception e){staged.delete();throw e;}
            if(selectedBlueprint!=null)selectedBlueprint.delete();selectedBlueprint=staged;result(id,CommunityApp.obj("name",name,"size",staged.length()),null);
        }catch(Exception e){result(id,null,CommunityApp.reason(e));}});
    }
    private Object upload(JSONObject body) throws Exception {
        File file=selectedBlueprint;if(file==null||!file.exists())throw new IOException("请先选择蓝图文件");
        String token=app.session();JSONObject created=(JSONObject)app.request(app.apiUrl("/api/blueprints"),"POST",body,token);String path="/api/blueprints/"+created.getString("id");
        try(Response r=app.http.newCall(new Request.Builder().url(app.apiUrl(path+"/file")).header("Authorization","Bearer "+token).put(RequestBody.create(file,MediaType.get("application/octet-stream"))).build()).execute()){
            JSONObject response=new JSONObject(new String(CommunityApp.bounded(r.body().byteStream(),512*1024),StandardCharsets.UTF_8));
            if(!r.isSuccessful())throw new IOException(response.optString("error","上传失败"));
            file.delete();selectedBlueprint=null;return response;
        }catch(Exception e){try{app.request(app.apiUrl(path),"DELETE",null,token);}catch(Exception ignored){}throw e;}
    }
    private void download(String id,String blueprint) throws Exception {
        if(!blueprint.matches("[a-zA-Z0-9-]{1,80}"))throw new IOException("蓝图编号无效");
        String path="/api/blueprints/"+blueprint, token=app.session();JSONObject info=(JSONObject)app.request(app.apiUrl(path),"GET",null,token);
        File staged=File.createTempFile("download-",".nbt",getCacheDir());
        try{
            MessageDigest digest=MessageDigest.getInstance("SHA-256");int total=0;
            try(Response r=app.http.newCall(new Request.Builder().url(app.apiUrl(path+"/file")).header("Authorization","Bearer "+token).build()).execute()){
                if(!r.isSuccessful())throw new IOException("蓝图下载失败：HTTP "+r.code());
                try(InputStream in=r.body().byteStream();OutputStream out=new FileOutputStream(staged)){byte[] buffer=new byte[16384];int n;while((n=in.read(buffer))!=-1){if((total+=n)>8*1024*1024)throw new IOException("下载文件过大");digest.update(buffer,0,n);out.write(buffer,0,n);}}
            }
            StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format(Locale.ROOT,"%02x",b));
            if(total!=info.getLong("size")||!hash.toString().equalsIgnoreCase(info.getString("sha256")))throw new IOException("蓝图校验失败，请重新下载");
            runOnUiThread(()->chooseDownload(id,info,staged));
        }catch(Exception e){staged.delete();throw e;}
    }
    private final class Bridge {
        @JavascriptInterface public void call(String raw){
            if(raw.length()>1024*1024)return;
            try{
                JSONObject call=new JSONObject(raw);String id=call.getString("id"),op=call.getString("op");JSONObject input=call.optJSONObject("input");if(input==null)input=new JSONObject();final JSONObject value=input;
                if(op.equals("appUpdate")){try{String action=value.optString("action","state");Object output;switch(action){case "check":output=app.updater.check();break;case "download":output=app.updater.download();break;case "cancel":output=app.updater.cancel();break;case "install":output=app.updater.install();break;case "settings":output=app.updater.settings(value);break;default:output=app.updater.state();}result(id,output,null);}catch(Exception e){result(id,null,CommunityApp.reason(e));}return;}
                if(op.equals("voiceJoin")){runOnUiThread(()->beginVoice(id,value.optString("room")));return;}
                // Privacy controls must not wait behind uploads or account HTTP calls.
                if(op.equals("voiceSettings")||op.equals("voiceLeave")||op.equals("speaker")){
                    runOnUiThread(()->{try{if(op.equals("voiceSettings"))app.voiceSettings(value);else if(op.equals("voiceLeave"))app.leave();else if(app.audio!=null)app.audio.speaker(value.optBoolean("enabled"));result(id,true,null);}catch(Exception e){result(id,null,CommunityApp.reason(e));}});return;
                }
                if(op.equals("pick")){runOnUiThread(()->choose(id,value.optString("kind")));return;}
                if(op.equals("openSkin")){runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://skin.hxzmc.top/user")));result(id,true,null);}catch(Exception e){result(id,null,"没有可用的浏览器");}});return;}
                if(op.equals("background")){runOnUiThread(()->{moveTaskToBack(true);result(id,true,null);});return;}
                if(op.equals("appearance")){runOnUiThread(()->{boolean dark=value.optBoolean("dark");web.setBackgroundColor(dark?Color.rgb(20,28,25):Color.rgb(245,246,241));if(Build.VERSION.SDK_INT==29){getWindow().setStatusBarColor(dark?Color.rgb(20,28,25):Color.rgb(245,246,241));getWindow().setNavigationBarColor(dark?Color.rgb(20,28,25):Color.rgb(245,246,241));getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);}if(Build.VERSION.SDK_INT>=30){getWindow().getInsetsController().setSystemBarsAppearance(dark?0:WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);}result(id,true,null);});return;}
                try{app.jobs.execute(()->{try{
                    Object output;
                    switch(op){
                        case "state":output=app.state();break;
                        case "login":output=app.login(value);break;
                        case "profile":output=app.selectProfile(value.getString("id"));break;
                        case "logout":app.logout();output=app.state();break;
                        case "server":app.setServer(value.getString("url"));output=app.state();break;
                        case "api":output=app.api(value);break;
                        case "chat":app.chat(value.getString("body"));output=true;break;
                        case "reconnect":app.disconnect(false);app.main.post(app::connect);output=true;break;
                        case "voiceLeave":app.leave();output=true;break;
                        case "voiceSettings":app.voiceSettings(value);output=true;break;
                        case "speaker":if(app.audio!=null)app.audio.speaker(value.optBoolean("enabled"));output=true;break;
                        case "upload":output=upload(value);break;
                        case "download":download(id,value.getString("id"));return;
                        default:throw new IOException("不支持的操作");
                    }
                    result(id,output,null);
                }catch(Exception e){result(id,null,CommunityApp.reason(e));}});}catch(java.util.concurrent.RejectedExecutionException e){result(id,null,"操作过于频繁，请稍后重试");}
            }catch(Exception ignored){}
        }
    }
}
