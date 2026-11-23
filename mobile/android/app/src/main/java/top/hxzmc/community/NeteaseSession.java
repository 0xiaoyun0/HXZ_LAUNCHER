package top.hxzmc.community;

import android.content.Intent;
import android.content.SharedPreferences;
import android.webkit.CookieManager;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import okhttp3.*;
import org.json.*;

/** Official-site cookies remain in the native WebView cookie store, never the bridge. */
final class NeteaseSession {
    static final String ORIGIN="https://music.163.com";
    private final CommunityApp app;
    NeteaseSession(CommunityApp app){this.app=app;}
    private SharedPreferences preferences(){return app.getSharedPreferences("netease-account",0);}
    private String identity()throws Exception {app.session();return app.base+"|"+app.user.optString("uid");}
    private JSONObject access()throws Exception {return (JSONObject)app.api(CommunityApp.obj("path","/api/music/access"));}
    private <T>T main(java.util.concurrent.Callable<T> action)throws Exception {FutureTask<T> task=new FutureTask<>(action);app.main.post(task);return task.get(10,TimeUnit.SECONDS);}
    private String cookies()throws Exception{return main(()->CookieManager.getInstance().getCookie(ORIGIN));}
    private boolean bound()throws Exception{return identity().equals(preferences().getString("identity",""));}
    private void clear()throws Exception{main(()->{CookieManager manager=CookieManager.getInstance();for(String host:new String[]{"music.163.com",".music.163.com","163.com",".163.com"}){String old=manager.getCookie("https://"+host.replaceFirst("^\\.",""));if(old!=null)for(String piece:old.split(";")){String name=piece.trim().split("=",2)[0];manager.setCookie(ORIGIN,name+"=; Domain="+host+"; Path=/; Max-Age=0; Secure");}}manager.flush();return true;});preferences().edit().clear().apply();}
    Object call(JSONObject input)throws Exception{
        String action=input.optString("action");
        if(action.equals("account.logout")){clear();return CommunityApp.obj("loggedIn",false);}
        JSONObject grant=access();boolean allowed=grant.optBoolean("allowed"),same=bound();String cookie=same?cookies():"";
        if(action.equals("account.status"))return CommunityApp.obj("allowed",allowed,"consented",same,"loggedIn",allowed&&same&&cookie!=null&&cookie.matches("(?s).*(?:^|;\\s*)MUSIC_U=[^;]+.*"));
        if(!action.equals("account.login"))throw new IOException("不支持的账号操作");
        if(!allowed)throw new IOException("需要社区管理员授权个人网易云账号功能");
        if(!input.optBoolean("accepted"))throw new IOException("请先阅读并同意登录说明");
        String current=identity();if(!same)clear();preferences().edit().putString("identity",current).apply();
        main(()->{app.startActivity(new Intent(app,NeteaseActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));return true;});return CommunityApp.obj("opened",true);
    }
    String audio(String id)throws Exception{
        if(!bound()||!access().optBoolean("allowed"))return null;
        String cookie=cookies();if(cookie==null||!cookie.matches("(?s).*(?:^|;\\s*)MUSIC_U=[^;]+.*"))return null;
        FormBody body=new FormBody.Builder().add("ids",new JSONArray().put(id).toString()).add("br","320000").build();
        try(Response response=app.http.newCall(new Request.Builder().url(ORIGIN+"/api/song/enhance/player/url").header("Referer",ORIGIN+"/").header("Cookie",cookie).post(body).build()).execute()){
            if(!response.isSuccessful()||response.body()==null)throw new IOException("网易云暂时不可用，请稍后重试");
            JSONObject data=new JSONObject(new String(CommunityApp.bounded(response.body().byteStream(),1024*1024),StandardCharsets.UTF_8));JSONArray values=data.optJSONArray("data");JSONObject song=values==null?null:values.optJSONObject(0);
            if(song==null||song.isNull("url")||!song.isNull("freeTrialInfo"))throw new IOException("该账号暂不能完整播放此曲目，请确认版权或会员权限");
            HttpUrl url=HttpUrl.parse(song.optString("url"));if(url==null||!url.host().endsWith(".music.126.net")||!url.username().isEmpty()||!url.password().isEmpty())throw new IOException("音频地址不受支持");
            return url.newBuilder().scheme("https").build().toString();
        }
    }
}
