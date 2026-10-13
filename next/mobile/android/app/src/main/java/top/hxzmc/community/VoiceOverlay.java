package top.hxzmc.community;

import android.graphics.Color;import android.graphics.PixelFormat;import android.graphics.drawable.GradientDrawable;
import android.os.SystemClock;import android.provider.Settings;import android.view.Gravity;import android.view.WindowManager;import android.widget.TextView;
import org.json.*;

/** Uses the existing voice foreground service; no extra network or microphone owner. */
final class VoiceOverlay {
 private final CommunityApp app;private final WindowManager manager;private TextView view;private boolean scheduled;
 VoiceOverlay(CommunityApp app){this.app=app;manager=(WindowManager)app.getSystemService(android.content.Context.WINDOW_SERVICE);}
 boolean enabled(){return app.getSharedPreferences("settings",0).getBoolean("voiceOverlay",false);}
 void enable(boolean value){app.getSharedPreferences("settings",0).edit().putBoolean("voiceOverlay",value).apply();refresh();}
 void refresh(){app.main.post(()->{if(!scheduled){scheduled=true;tick.run();}});}
 private int dp(int value){return Math.round(value*app.getResources().getDisplayMetrics().density);}
 private final Runnable tick=new Runnable(){public void run(){scheduled=false;
  if(!enabled()||app.room.isEmpty()||!Settings.canDrawOverlays(app)){hide();return;}
  try{if(view==null){view=new TextView(app);view.setTextColor(Color.rgb(241,246,255));view.setTextSize(13);view.setPadding(dp(14),dp(8),dp(14),dp(8));view.setMaxWidth(app.getResources().getDisplayMetrics().widthPixels-dp(28));view.setMaxLines(2);view.setGravity(Gravity.CENTER);GradientDrawable background=new GradientDrawable();background.setColor(Color.rgb(29,40,59));background.setCornerRadius(dp(14));view.setBackground(background);WindowManager.LayoutParams params=new WindowManager.LayoutParams(-2,-2,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,PixelFormat.TRANSLUCENT);params.gravity=Gravity.TOP|Gravity.CENTER_HORIZONTAL;params.y=dp(20);params.alpha=.78f;manager.addView(view,params);}
   long cutoff=SystemClock.elapsedRealtime()-650;StringBuilder names=new StringBuilder();JSONArray users=app.users;int count=0;for(int i=0;i<users.length();i++){JSONObject user=users.optJSONObject(i);if(user==null||!app.room.equals(user.optString("room"))||user.optBoolean("muted")||app.voiceActivity.getOrDefault(user.optString("id"),0L)<cutoff)continue;if(count++>0)names.append("   ");names.append("● ").append(user.optString("name"));if(count==5)break;}
   view.setText(names.length()>0?names.toString():"已加入语音 · 等待伙伴说话");scheduled=true;app.main.postDelayed(this,300);
  }catch(Exception e){hide();}
 }};
 private void hide(){if(view!=null){try{manager.removeView(view);}catch(Exception ignored){}view=null;}}
 void close(){app.main.removeCallbacks(tick);scheduled=false;hide();}
}
