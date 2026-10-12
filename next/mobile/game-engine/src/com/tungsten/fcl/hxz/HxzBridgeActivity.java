package com.tungsten.fcl.hxz;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import com.tungsten.fcl.activity.SplashActivity;
import org.json.JSONObject;

/** Signature-protected entry. No job file; account persistence uses FCL's own account store. */
public final class HxzBridgeActivity extends Activity {
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        try {
            String value=getIntent().getStringExtra("job");
            if(value==null||value.length()>32768)throw new IllegalArgumentException("请求过大");
            JSONObject job=new JSONObject(value);
            if(job.getInt("protocol")!=1||Math.abs(System.currentTimeMillis()-job.getLong("created"))>120000)
                throw new IllegalArgumentException("启动请求已过期，请回到幻想镇社区重试");
            if(!job.optBoolean("accountOnly")){String id=job.getJSONObject("server").getString("id");
            if(!java.util.Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(id))throw new IllegalArgumentException("实例无效");}
            HxzRunner.offer(job);
            startActivity(new Intent(this,SplashActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
        } catch(Exception e) { android.widget.Toast.makeText(this,e.getMessage(),android.widget.Toast.LENGTH_LONG).show(); }
        getIntent().removeExtra("job");finish();
    }
}
