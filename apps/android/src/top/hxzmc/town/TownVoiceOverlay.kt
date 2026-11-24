package top.hxzmc.town

import top.hxzmc.community.CommunityWidget as TownWidget

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.tungsten.fcl.R
import java.lang.ref.WeakReference
import kotlin.math.abs
import kotlin.math.roundToInt

class TownVoiceOverlay : Service() {
    companion object {
        private var owner = WeakReference<TownDeviceTools>(null)
        private var current: TownVoiceOverlay? = null
        private var state = VoiceState()
        private var panelVisible = true
        private var starting = false

        internal fun show(context: Context, host: TownDeviceTools, value: VoiceState, foreground: Boolean, visible: Boolean) {
            owner = WeakReference(host)
            state = value
            panelVisible = visible
            current?.takeUnless { it.stopping }?.let {
                if (it.listeningOnly != value.listenOnly && foreground) {
                    try { it.updateForeground() }
                    catch (_: SecurityException) { it.stopping = true; it.stopSelf(); return }
                }
                it.render()
                return
            }
            if (starting || !foreground) return
            starting = true
            try { context.startForegroundService(Intent(context, TownVoiceOverlay::class.java)) }
            catch (_: RuntimeException) {
                starting = false
                Toast.makeText(context, "无法显示语音控件，请回到语音房重试。", Toast.LENGTH_SHORT).show()
            }
        }

        internal fun close(host: TownDeviceTools) {
            if (owner.get() !== host) return
            owner.clear()
            state = VoiceState()
            current?.let { it.stopping = true; it.stopSelf() }
        }
    }

    private val manager by lazy { getSystemService(WindowManager::class.java) }
    private var listeningOnly = true
    private var stopping = false
    private var panel: LinearLayout? = null
    private lateinit var position: WindowManager.LayoutParams
    private lateinit var handle: TextView
    private lateinit var mute: ImageButton
    private lateinit var hearing: ImageButton
    private val accent = Color.rgb(181, 202, 255)
    private val quiet = Color.rgb(180, 187, 201)
    private fun dp(value: Int) = (resources.displayMetrics.density * value).roundToInt()
    private fun speakerWidth(): Int {
        val screen = resources.displayMetrics.widthPixels
        val buttonSpace = dp(3 * 48 + 8)
        return (screen / 4).coerceIn(dp(56), dp(112)).coerceAtMost((screen - buttonSpace).coerceAtLeast(1))
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        starting = false
        current = this
        stopping = false
        try {
            updateForeground()
            if (owner.get() == null || state.room.isBlank() || !Settings.canDrawOverlays(this)) stopSelf(startId)
            else { if (panel == null) attach(); render() }
        } catch (_: RuntimeException) {
            Toast.makeText(this, "悬浮窗暂时不可用，可回到语音房操作。", Toast.LENGTH_SHORT).show()
            stopSelf(startId)
        }
        return START_NOT_STICKY
    }

    private fun updateForeground() {
        val channel = "town-voice"
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(channel, "语音房悬浮控件", NotificationManager.IMPORTANCE_LOW))
        val note = Notification.Builder(this, channel).setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("幻想镇语音房").setContentText("点按返回语音房")
            .setOngoing(true).setContentIntent(TownWidget.open(this, "voice")).build()
        if (Build.VERSION.SDK_INT >= 30) {
            val mic = !state.listenOnly && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            startForeground(6204, note, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or
                (if (mic) ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else 0))
        } else startForeground(6204, note)
        listeningOnly = state.listenOnly
    }

    private fun attach() {
        val row = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(2), dp(4), dp(2))
            background = GradientDrawable().apply { setColor(Color.rgb(35, 44, 63)); cornerRadius = dp(16).toFloat() }
        }
        position = WindowManager.LayoutParams(-2, -2, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT)
        position.gravity = Gravity.TOP or Gravity.LEFT
        position.x = dp(8)
        position.y = dp(72)
        position.setTitle("幻想镇语音悬浮控件")
        handle = TextView(this).apply {
            minHeight = dp(48)
            gravity = Gravity.CENTER; textSize = 13f; setTextColor(Color.WHITE)
            setPadding(dp(6), 0, dp(6), 0)
            maxLines = 1; ellipsize = TextUtils.TruncateAt.END
            setOnClickListener { owner.get()?.command("open") }
        }
        row.addView(handle, LinearLayout.LayoutParams(speakerWidth(), LinearLayout.LayoutParams.WRAP_CONTENT))
        fun button(icon: Int, description: String, action: String): ImageButton {
            val b = ImageButton(this)
            b.background = RippleDrawable(ColorStateList.valueOf(0x405E74A8), null, null)
            b.setImageResource(icon)
            b.imageTintList = ColorStateList.valueOf(quiet)
            b.contentDescription = description
            b.setOnClickListener { owner.get()?.command(action) }
            row.addView(b, LinearLayout.LayoutParams(dp(48), dp(48)))
            return b
        }
        mute = button(R.drawable.town_mic, "麦克风", "mute")
        hearing = button(R.drawable.town_hearing, "听筒", "deafen")
        button(R.drawable.town_overlay_close, "关闭语音悬浮控件", "hide")
        var downX = 0f; var downY = 0f; var left = 0; var top = 0; var moved = false
        handle.setOnTouchListener { view, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; left = position.x; top = position.y; moved = false; true }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downX; val dy = event.rawY - downY
                    if (abs(dx) + abs(dy) > dp(6)) moved = true
                    if (moved) move(left + dx.roundToInt(), top + dy.roundToInt())
                    true
                }
                MotionEvent.ACTION_UP -> { if (!moved) view.performClick(); true }
                MotionEvent.ACTION_CANCEL -> true
                else -> false
            }
        }
        manager.addView(row, position)
        panel = row
    }

    private fun move(left: Int, top: Int) {
        val row = panel ?: return
        position.x = left.coerceIn(0, (resources.displayMetrics.widthPixels - row.width).coerceAtLeast(0))
        position.y = top.coerceIn(0, (resources.displayMetrics.heightPixels - row.height).coerceAtLeast(0))
        manager.updateViewLayout(row, position)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (::handle.isInitialized) handle.layoutParams = handle.layoutParams.apply { width = speakerWidth() }
        panel?.post { move(position.x, position.y) }
    }

    private fun render() {
        if (panel == null) return
        panel?.visibility = if (panelVisible) android.view.View.VISIBLE else android.view.View.GONE
        handle.text = state.speaker.ifBlank { "语音房" }
        handle.contentDescription = (if (state.speaker.isBlank()) "已加入语音房" else state.speaker + "正在说话") + "，可拖动或点按返回"
        mute.contentDescription = if (state.muted) "开启麦克风" else "静音麦克风"
        mute.setImageResource(if (state.muted) R.drawable.town_mic_off else R.drawable.town_mic)
        mute.imageTintList = ColorStateList.valueOf(if (state.muted) quiet else accent)
        hearing.contentDescription = if (state.deafened) "恢复听筒" else "静音听筒"
        hearing.setImageResource(if (state.deafened) R.drawable.town_hearing_off else R.drawable.town_hearing)
        hearing.imageTintList = ColorStateList.valueOf(if (state.deafened) quiet else accent)
    }

    override fun onDestroy() {
        panel?.let { if (it.isAttachedToWindow) manager.removeView(it) }
        panel = null
        if (current === this) current = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
