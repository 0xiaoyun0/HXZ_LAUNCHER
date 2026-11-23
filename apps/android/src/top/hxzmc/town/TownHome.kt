package top.hxzmc.town

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.view.View
import android.widget.TextView
import android.widget.Toast
import com.tungsten.fcl.R
import org.json.JSONArray

object TownHome {
    @JvmStatic fun bind(root: View) {
        val context = root.context
        val config = context.assets.open("town/server-presets.json").bufferedReader().use { JSONArray(it.readText()) }
        val servers = (0 until config.length()).map { config.getJSONObject(it) }
        root.findViewById<TextView>(R.id.title).text = "默认服务器"
        root.findViewById<TextView>(R.id.announcement).text = servers.joinToString("\n\n") { it.getString("name") + "\n" + it.getString("address") }
        root.findViewById<TextView>(R.id.date).apply {
            text = "进入游戏后可在「多人游戏」中选择服务器"
            isSingleLine = false
        }
        root.findViewById<TextView>(R.id.hide).apply {
            text = "复制服务器地址"
            setOnClickListener {
                AlertDialog.Builder(context).setTitle("选择服务器").setItems(servers.map { it.getString("name") }.toTypedArray()) { _, index ->
                    val address = servers[index].getString("address")
                    context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText(servers[index].getString("name"), address))
                    Toast.makeText(context, "服务器地址已复制", Toast.LENGTH_SHORT).show()
                }.setNegativeButton("取消", null).show()
            }
        }
        root.visibility = View.VISIBLE
    }
}
