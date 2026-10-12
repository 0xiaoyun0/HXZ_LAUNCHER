package com.tungsten.fcl.hxz;

import android.app.Activity;
import android.content.Context;
import com.tungsten.fcl.setting.Profile;
import com.tungsten.fclcore.auth.Account;
import org.json.JSONObject;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Keep native FCL launches on the same update path as the community entry. */
public final class HxzLaunch {
    static void remember(Path root,JSONObject preset,JSONObject options)throws Exception{
        JSONObject value=new JSONObject();value.put("server",preset);value.put("options",options);
        Path target=root.resolve("updater/android-launch.json");Files.createDirectories(target.getParent());
        Path temp=Files.createTempFile(target.getParent(),"launch-",".tmp");
        try{Files.write(temp,value.toString().getBytes(StandardCharsets.UTF_8));Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}
    }
    public static boolean intercept(Context context,Profile profile,Account account,String version){
        Path marker=profile.getGameDir().toPath().resolve("updater/android-launch.json");
        if(!Files.isRegularFile(marker))return false;
        try{
            if(!(context instanceof Activity))throw new IllegalStateException("请从运行组件主界面启动");
            if(Files.size(marker)>32768)throw new IllegalStateException("实例启动配置无效，请从社区重新打开");
            JSONObject job=new JSONObject(new String(Files.readAllBytes(marker),StandardCharsets.UTF_8));String id=job.getJSONObject("server").getString("id");
            if(!Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(id)||!version.startsWith(id+"-"))return false;
            job.getJSONObject("options").put("prepareOnly",false);job.put("account",HxzAccounts.export(account));
            HxzRunner.offer(job);HxzRunner.consume((Activity)context);
        }catch(Exception e){android.widget.Toast.makeText(context,e.getMessage(),android.widget.Toast.LENGTH_LONG).show();}
        return true;
    }
}
