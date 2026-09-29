package top.hxzmc.community;
import android.webkit.CookieManager;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.*;
import java.nio.charset.StandardCharsets;
import okhttp3.*;
/** Website cookies stay separate from Yggdrasil credentials; never persist the password. */
final class SkinSession {
    static final String ORIGIN="https://skin.hxzmc.top";
    private static long generation;
    static synchronized long reset(){generation++;CookieManager.getInstance().removeAllCookies(null);return generation;}
    static void login(long ticket,String username,String password){
        List<Cookie> cookies=new ArrayList<>();
        CookieJar jar=new CookieJar(){public void saveFromResponse(HttpUrl url,List<Cookie> incoming){for(Cookie c:incoming){cookies.removeIf(old->old.name().equals(c.name())&&old.path().equals(c.path()));cookies.add(c);}}public List<Cookie> loadForRequest(HttpUrl url){List<Cookie> matched=new ArrayList<>();for(Cookie c:cookies)if(c.matches(url))matched.add(c);return matched;}};
        OkHttpClient http=new OkHttpClient.Builder().cookieJar(jar).connectTimeout(6,TimeUnit.SECONDS).readTimeout(6,TimeUnit.SECONDS).callTimeout(8,TimeUnit.SECONDS).followRedirects(false).build();
        try{
            String html;try(Response r=http.newCall(new Request.Builder().url(ORIGIN+"/auth/login").build()).execute()){if(!r.isSuccessful()||r.body()==null)return;html=new String(CommunityApp.bounded(r.body().byteStream(),512*1024),StandardCharsets.UTF_8);}
            Matcher token=Pattern.compile("<meta[^>]*name=[\"']csrf-token[\"'][^>]*content=[\"']([^\"']+)",Pattern.CASE_INSENSITIVE).matcher(html);if(!token.find())return;
            String body=CommunityApp.obj("identification",username,"password",password,"keep",true).toString();
            try(Response r=http.newCall(new Request.Builder().url(ORIGIN+"/auth/login").header("X-CSRF-TOKEN",token.group(1)).header("Accept","application/json").post(RequestBody.create(body,MediaType.get("application/json"))).build()).execute()){if(!r.isSuccessful())return;}
            synchronized(SkinSession.class){if(ticket!=generation)return;CookieManager manager=CookieManager.getInstance();for(Cookie cookie:cookies)manager.setCookie(ORIGIN,cookie.toString());manager.flush();}
        }catch(Exception ignored){/* Captcha or network failure can be completed in the embedded site. */}
    }
}
