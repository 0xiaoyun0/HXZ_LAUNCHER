package top.hxzmc.town

import android.content.Context
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File

/** Only the video options chosen for this instance participate in apply/restore. */
internal class TownMobileGraphics(context: Context, directory: File) {
    private val root = directory.canonicalFile
    private val prefs = context.getSharedPreferences("town-mobile-graphics", Context.MODE_PRIVATE)
    private val key = root.path
    private val options = mapOf("renderDistance" to "5", "simulationDistance" to "5", "mipmapLevels" to "0",
        "biomeBlendRadius" to "0", "entityDistanceScaling" to "0.5", "maxFps" to "30")
    private val rules = mapOf("options.txt" to options, "config/iris.properties" to mapOf("enableShaders" to "false"))
    val mode: String get() = prefs.getString("mode:$key", "").orEmpty()

    private fun file(relative: String): File = File(root,relative).also {
        check(it.canonicalFile.toPath().startsWith(root.toPath()) && it.canonicalFile==it.absoluteFile) { "实例的画质配置路径已改变。" }
    }
    private fun read(file: File): String {
        if (!file.exists()) return ""
        check(file.isFile && file.length() <= 2*1024*1024) { "实例的画质配置无法读取。" }
        return AtomicFile(file).openRead().bufferedReader(Charsets.UTF_8).use { it.readText() }
    }
    private fun pattern(field:String, sep:String) = Regex("(?m)^"+Regex.escape(field+sep)+"([^\r\n]*)")
    private fun patch(text:String,field:String,sep:String,value:String?):String {
        val pattern=pattern(field,sep)
        if(value==null)return Regex("(?m)^"+Regex.escape(field+sep)+"[^\r\n]*(?:\r?\n|$)").replace(text,"")
        if(pattern.containsMatchIn(text))return pattern.replace(text){ field+sep+value }
        val eol=if("\r\n" in text)"\r\n" else "\n"
        return text+(if(text.isEmpty()||text.endsWith('\n'))"" else eol)+field+sep+value+eol
    }
    private fun write(file:File,text:String) {
        check(file.parentFile?.isDirectory==true || file.parentFile?.mkdirs()==true) { "无法写入实例画质配置。" }
        val target=AtomicFile(file)
        val out=target.startWrite()
        try { out.write(text.toByteArray(Charsets.UTF_8));target.finishWrite(out) }
        catch(e:Exception){target.failWrite(out);throw e}
    }
    fun select(mobile:Boolean) {
        val snapshotKey="backup:$key"
        if (mobile && mode == "mobile") return
        val receipt=prefs.getString(snapshotKey,null)?.let(::JSONObject) ?: JSONObject()
        if(mobile && !prefs.contains(snapshotKey)){
            for((relative,fields) in rules) {
                val f=file(relative)
                if(relative!="options.txt"&&!f.isFile)continue
                val sep=if(relative=="options.txt")":" else "="
                val text=read(f)
                val entry=JSONObject()
                for((field,limit) in fields){
                    val old=pattern(field,sep).findAll(text).lastOrNull()?.groupValues?.get(1)
                    val kept=if(old?.toDoubleOrNull()!=null&&limit.toDoubleOrNull()!=null&&old.toDouble()<=limit.toDouble())old else limit
                    entry.put(field,JSONObject().put("before",old?:JSONObject.NULL).put("after",kept))
                }
                receipt.put(relative,entry)
            }
            check(prefs.edit().putString(snapshotKey,receipt.toString()).putString("mode:$key","applying").commit()) { "无法保存原画质设置。" }
        }
        if (!mobile && prefs.contains(snapshotKey)) {
            check(prefs.edit().putString("mode:$key", "restoring").commit()) { "无法准备恢复实例画质。" }
        }
        for((relative,_) in rules){
            val entry=receipt.optJSONObject(relative)?:continue
            val f=file(relative);val old=read(f);var next=old
            val sep=if(relative=="options.txt")":" else "="
            for(field in entry.keys()){
                val pair=entry.getJSONObject(field)
                val applied=pair.getString("after")
                if(mobile)next=patch(next,field,sep,applied)
                else if(pattern(field,sep).findAll(next).lastOrNull()?.groupValues?.get(1)==applied)
                    next=patch(next,field,sep,if(pair.isNull("before"))null else pair.getString("before"))
            }
            if(next!=old)write(f,next)
        }
        val editor=prefs.edit().putString("mode:$key",if(mobile)"mobile" else "original")
        if(!mobile)editor.remove(snapshotKey)
        check(editor.commit()) { "无法保存这个实例的画质选择。" }
    }
}
