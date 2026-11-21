package top.hxzmc.town

import android.content.Context
import java.io.DataOutputStream
import java.io.File
import java.nio.file.Files

/** Minecraft reads its server list as an uncompressed, named NBT compound. */
object TownServers {
    fun prepare(context: Context, directory: File) {
        val marks = context.getSharedPreferences("town-server-presets", Context.MODE_PRIVATE)
        val key = directory.canonicalPath
        if (marks.contains(key)) return
        val target = File(directory, "servers.dat")
        if (!target.exists()) {
            directory.mkdirs()
            val tmp = File.createTempFile("town-servers-", ".tmp", directory)
            try {
                val presets = TownDirectory(context).listing()
                DataOutputStream(tmp.outputStream().buffered()).use { out ->
                    out.writeByte(10); out.writeUTF("")
                    out.writeByte(9); out.writeUTF("servers"); out.writeByte(10); out.writeInt(presets.length())
                    for (i in 0 until presets.length()) {
                        val item = presets.getJSONObject(i)
                        out.writeByte(8); out.writeUTF("name"); out.writeUTF(item.getString("name"))
                        out.writeByte(8); out.writeUTF("ip"); out.writeUTF(item.getString("address"))
                        out.writeByte(0)
                    }
                    out.writeByte(0)
                }
                try { Files.move(tmp.toPath(), target.toPath()) } catch (_: java.nio.file.FileAlreadyExistsException) { }
            } finally { tmp.delete() }
        }
        marks.edit().putBoolean(key, true).apply()
    }
}
