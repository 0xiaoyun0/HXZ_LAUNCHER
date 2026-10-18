package top.hxzmc.community;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;

/** Local shortcuts only: no widget tokens, private messages or background network polling. */
public final class CommunityWidget extends AppWidgetProvider {
    static final String EXTRA="community_widget_target";
    static String target(String value){return java.util.Arrays.asList("chat","voice","inbox","devices","event").contains(value)?value:"";}
    private static PendingIntent open(Context c,String target,int code){
        Intent i=new Intent(c,MainActivity.class).putExtra(EXTRA,target).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c,code,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void render(Context c,AppWidgetManager manager,int id){
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.community_widget);
        android.content.SharedPreferences p=c.getSharedPreferences("widget",0);
        long time=p.getLong("observed",0);String status="打开社区，与伙伴保持联系";
        if(time>0){java.text.SimpleDateFormat date=new java.text.SimpleDateFormat("M月d日 HH:mm",java.util.Locale.CHINA);status="上次访问 "+date.format(new java.util.Date(time))+" · "+p.getInt("online",0)+" 人在线";}
        v.setTextViewText(R.id.widget_summary,status);
        v.setOnClickPendingIntent(R.id.widget_title,open(c,"event",1));
        v.setOnClickPendingIntent(R.id.widget_chat,open(c,"chat",2));
        v.setOnClickPendingIntent(R.id.widget_inbox,open(c,"inbox",3));
        v.setOnClickPendingIntent(R.id.widget_devices,open(c,"devices",4));
        v.setOnClickPendingIntent(R.id.widget_events,open(c,"event",5));
        manager.updateAppWidget(id,v);
    }
    static void update(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(int id:m.getAppWidgetIds(new ComponentName(c,CommunityWidget.class)))render(c,m,id);}
    static boolean pin(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);return m.isRequestPinAppWidgetSupported()&&m.requestPinAppWidget(new ComponentName(c,CommunityWidget.class),null,null);}
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)render(c,m,id);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){render(c,m,id);}
}
