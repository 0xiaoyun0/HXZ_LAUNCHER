package top.hxzmc.town

import top.hxzmc.community.CommunityWidget as TownWidget

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.lifecycle.Lifecycle
import org.json.JSONObject

internal class TownDeviceTools(private val host: TownCommunityActivity, private val event: (String, JSONObject) -> Unit) {
    private val prefs = host.getSharedPreferences("town-device-tools", 0)
    private val widgets = AppWidgetManager.getInstance(host)
    private var voice = VoiceState()
    private var resumed = false
    private val permitted get() = Settings.canDrawOverlays(host)
    private val enabled get() = permitted && prefs.getBoolean("overlay", false)

    fun tools() = JSONObject().put("permission", permitted).put("overlay", enabled)
        .put("canPin", widgets.isRequestPinAppWidgetSupported).put("widgets", widgets.getAppWidgetIds(TownWidget.component(host)).size)

    fun pin(): JSONObject {
        val sent = widgets.isRequestPinAppWidgetSupported && widgets.requestPinAppWidget(TownWidget.component(host), null, null)
        return tools().put("hint", if (sent) "请在桌面确认添加幻想镇小组件。" else "长按桌面空白处，在「小组件」中选择「幻想镇 · 社区入口」。")
    }

    fun overlay(wanted: Boolean): JSONObject {
        if (wanted && !permitted) {
            host.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + host.packageName)))
            prefs.edit().putBoolean("requesting", true).apply()
            return tools().put("hint", "请在系统中允许幻想镇显示悬浮窗，然后返回。")
        }
        prefs.edit().putBoolean("requesting", false).putBoolean("overlay", wanted).apply()
        synchronize()
        event("town-tools", JSONObject())
        return tools()
    }

    fun snapshot(args: JSONObject) {
        voice = VoiceState(args.optString("room").take(90), args.optBoolean("muted"), args.optBoolean("deafened"),
            args.optBoolean("listenOnly"), args.optString("speaker").take(60), args.optBoolean("roomPage"))
        synchronize()
    }
    fun resetVoice() { voice = VoiceState(); TownVoiceOverlay.close(this) }
    fun resume() {
        resumed = true
        if (prefs.getBoolean("requesting", false) || !permitted)
            prefs.edit().putBoolean("overlay", permitted && prefs.getBoolean("requesting", false)).remove("requesting").apply()
        synchronize()
        event("town-tools", JSONObject())
    }
    fun pause() {
        resumed = false
        synchronize()
    }
    private fun synchronize() {
        if (!enabled || voice.room.isBlank()) { TownVoiceOverlay.close(this); return }
        TownVoiceOverlay.show(host, this, voice, host.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED), !(resumed && voice.roomPage))
    }
    fun command(action: String) {
        if (action == "hide") { overlay(false); return }
        if (!enabled || voice.room.isBlank()) return
        if (action == "open" || (action == "mute" && voice.listenOnly)) {
            TownWidget.open(host, "voice").send(); return
        }
        if (action == "mute" || action == "deafen")
            event("town-voice-control", JSONObject().put("command", action).put("room", voice.room))
    }
    fun close() { TownVoiceOverlay.close(this) }
}

internal data class VoiceState(val room: String = "", val muted: Boolean = true, val deafened: Boolean = false,
    val listenOnly: Boolean = true, val speaker: String = "", val roomPage: Boolean = false)
