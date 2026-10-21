package top.hxzmc.community;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Binder;
import android.os.Bundle;
import org.json.JSONObject;
import java.util.Arrays;

/** Private bridge between this application's community and game processes. */
public final class GameAccountProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public Bundle call(String method, String arg, Bundle extras) {
        if(Binder.getCallingUid()!=android.os.Process.myUid())throw new SecurityException("Private game bridge");
        CommunityApp owner=(CommunityApp)getContext().getApplicationContext();
        if("roomState".equals(method)){
            Bundle result=new Bundle();
            try{
                JSONObject host=owner.gameLobby.hostConfig();int port=extras==null?0:extras.getInt("port",0);
                boolean active=host!=null&&host.optInt("port")==port;result.putBoolean("active",active);
                if(active&&extras!=null){
                    String game=extras.getString("game","");if(!game.isEmpty())owner.gameLobby.setGame(new JSONObject(game));
                    String error=extras.getString("error","");
                    if(extras.getBoolean("exited")){owner.gameLobby.close("游戏已退出");result.putBoolean("active",false);}
                    else if(!error.isEmpty())owner.gameLobby.markError(error);
                    else if(extras.getBoolean("ready"))owner.gameLobby.markReady(port);
                    else if(!extras.getBoolean("poll"))owner.gameLobby.markWaiting();
                }
            }catch(Exception e){result.putBoolean("active",false);}
            return result;
        }
        if (!"selectedAccount".equals(method)) throw new IllegalArgumentException("Unknown operation");
        Bundle result = new Bundle();
        try {
            CommunityApp app = (CommunityApp) getContext().getApplicationContext();
            JSONObject c = app.gameCredentials(), p = c.optJSONObject("selectedProfile");
            if (p == null || c.optString("accessToken").isEmpty() || c.optString("clientToken").isEmpty()) {
                result.putString("message", "请先在幻想镇社区登录皮肤站并选择角色");
                return result;
            }
            result.putString("account", CommunityApp.obj("name", p.getString("name"),
                    "username", c.optString("loginUsername", p.getString("name")), "uuid", p.getString("id"),
                    "accessToken", c.getString("accessToken"), "clientToken", c.getString("clientToken")).toString());
        } catch (Exception e) {
            result.putString("message", "社区账号暂时无法读取，请返回社区重新登录后重试");
        }
        return result;
    }
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){throw new UnsupportedOperationException();}
    @Override public String getType(Uri uri){return null;}
    @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
    @Override public int delete(Uri uri,String selection,String[] args){throw new UnsupportedOperationException();}
    @Override public int update(Uri uri,ContentValues values,String selection,String[] args){throw new UnsupportedOperationException();}
}
