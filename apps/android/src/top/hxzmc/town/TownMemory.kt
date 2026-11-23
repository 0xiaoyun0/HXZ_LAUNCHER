package top.hxzmc.town

import android.app.ActivityManager
import android.content.Context
import com.tungsten.fclcore.util.StringUtils
import org.json.JSONObject
import java.io.File

internal object TownMemory {
    private const val MiB=1024L*1024L
    private fun prefs(c:Context)=c.getSharedPreferences("town-instance-memory",Context.MODE_PRIVATE)
    private data class Memory(val ram:Long,val available:Long,val threshold:Long,val swap:Long,val freeSwap:Long,val low:Boolean)
    private fun read(c:Context):Memory {
        val info=ActivityManager.MemoryInfo()
        (c.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(info)
        var swap=0L;var free=0L
        runCatching { File("/proc/meminfo").useLines { lines -> lines.forEach { line ->
            if(line.startsWith("SwapTotal:")||line.startsWith("SwapFree:")){
                val value=line.substringAfter(':').trim().substringBefore(' ').toLongOrNull()?.div(1024)?:0
                if(line.startsWith("SwapTotal:"))swap=value else free=value
            }
        } } }
        return Memory(info.totalMem/MiB,info.availMem/MiB,info.threshold/MiB,swap,free,info.lowMemory)
    }
    private fun custom(args:List<String>)=args.any { it=="noXmx"||it.startsWith("-Xmx")||it.startsWith("-XX:MaxHeapSize=")||it.startsWith("-XX:MaxRAMPercentage=") }
    fun physicalMiB(c: Context): Long = read(c).ram
    fun status(c:Context,dir:File,javaArgs:String):JSONObject {
        val key=dir.canonicalPath;val mem=read(c);val p=prefs(c)
        val previous = p.getString("last:$key", null)?.let { runCatching { JSONObject(it) }.getOrNull() }
        return JSONObject().put("enabled",p.getBoolean("enabled:$key",false)).put("physicalMiB",mem.ram)
            .put("tier",if(p.getBoolean("large:$key",false)) "large" else "standard")
            .put("availableMiB",mem.available).put("swapMiB",mem.swap).put("freeSwapMiB",mem.freeSwap)
            .put("customHeap",custom(StringUtils.tokenize(javaArgs)))
            .put("last",previous?:JSONObject.NULL)
    }
    fun save(c:Context,dir:File,javaArgs:String,enabled:Boolean) {
        if(enabled){
            check(!custom(StringUtils.tokenize(javaArgs))) { "实例使用了自定义 JVM 堆参数。请先移除自定义堆上限，再启用虚拟内存预算。" }
            check(read(c).swap>0) { "系统没有报告可用的虚拟内存，请先检查手机的运存扩展设置。" }
        }
        check(prefs(c).edit().putBoolean("enabled:"+dir.canonicalPath,enabled).commit()) { "内存选项没有保存，请重试。" }
    }
    fun saveTier(c: Context, dir: File, tier: String) {
        check(tier == "standard" || tier == "large") { "请选择可用的预算档位。" }
        val key = dir.canonicalPath
        val preferences = prefs(c)
        check(preferences.getBoolean("enabled:$key", false)) { "请先开启虚拟内存预算。" }
        check(preferences.edit().putBoolean("large:$key", tier == "large").commit()) { "预算档位没有保存，请重试。" }
    }
    @JvmStatic fun launchBudget(c:Context,dir:File,base:Int,args:List<String>,target:TownJoin.Target):Int {
        val key=dir.canonicalPath;val p=prefs(c);val mem=read(c)
        val enabled=p.getBoolean("enabled:$key",false);val fixed=custom(args)
        val large=p.getBoolean("large:$key",false)
        val extra=TownMemoryBudget.extraMiB(enabled&&!fixed,large,base,mem.ram,mem.available,mem.threshold,mem.swap,mem.freeSwap,mem.low)
        val receipt=JSONObject().put("enabled",enabled).put("customHeap",fixed).put("baseMiB",base)
            .put("extraMiB",extra).put("limitMiB",base+extra).put("availableMiB",mem.available)
            .put("tier",if(large) "large" else "standard")
            .put("freeSwapMiB",mem.freeSwap).put("time",System.currentTimeMillis())
        target.memoryReceipt = key to receipt
        return base+extra
    }
    fun started(c: Context, target: TownJoin.Target) {
        target.memoryReceipt?.let { (key, receipt) -> prefs(c).edit().putString("last:$key", receipt.toString()).apply() }
    }
}
