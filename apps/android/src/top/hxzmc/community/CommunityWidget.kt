package top.hxzmc.community

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.tungsten.fcl.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CommunityWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val prefs = context.getSharedPreferences("town-widget", Context.MODE_PRIVATE)
        val observed = prefs.getLong("observed", 0)
        val view = RemoteViews(context.packageName, R.layout.town_widget)
        if (observed > 0) {
            val time = SimpleDateFormat("M/d HH:mm", Locale.getDefault()).format(Date(observed))
            view.setTextViewText(R.id.town_widget_summary, "$time · 当时 ${prefs.getInt("online", 0)} 人在线")
        }
        for ((button, target) in shortcuts) view.setOnClickPendingIntent(button, open(context, target))
        for (id in ids) manager.updateAppWidget(id, view)
    }

    companion object {
        private const val EXTRA = "town_widget_destination"
        private val shortcuts = mapOf(
            R.id.town_widget_home to "home", R.id.town_widget_chat to "chat", R.id.town_widget_voice to "voice",
            R.id.town_widget_inbox to "inbox", R.id.town_widget_devices to "devices", R.id.town_widget_events to "events"
        )
        private val destinations = mapOf(
            "home" to "/town", "chat" to "/community", "voice" to "/community/voice",
            "inbox" to "/community/inbox", "devices" to "/town/devices", "events" to "/community/events"
        )
        fun consumeRoute(intent: Intent?): String? {
            val target = intent?.getStringExtra(EXTRA) ?: return null
            intent.removeExtra(EXTRA)
            return destinations[target]
        }
        fun open(context: Context, target: String): PendingIntent {
            require(target in destinations)
            val intent = Intent(context.packageName + ".widget." + target)
                .setClassName(context, "com.tungsten.fcl.activity.SplashActivity").putExtra(EXTRA, target)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            return PendingIntent.getActivity(context, target.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
        fun component(context: Context) = ComponentName(context, CommunityWidget::class.java)

        fun observe(context: Context, online: Int) {
            val prefs = context.getSharedPreferences("town-widget", Context.MODE_PRIVATE)
            val previous = prefs.getLong("observed", 0)
            if (online < 0) {
                if (previous == 0L) return
                prefs.edit().clear().apply()
            } else {
                val now = System.currentTimeMillis()
                if (now - previous in 0L..60_000L && prefs.getInt("online", -1) == online) return
                prefs.edit().putInt("online", online).putLong("observed", now).apply()
            }
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(component(context))
            if (ids.isNotEmpty()) CommunityWidget().onUpdate(context, manager, ids)
        }
    }
}
