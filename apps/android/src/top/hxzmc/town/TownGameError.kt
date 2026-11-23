package top.hxzmc.town

object TownGameError {
    fun graphicsCrash(report: String): Boolean {
        val frame = Regex("""(?im)^#\s*Problematic frame:[ \t]*\r?\n(?:#[ \t]*\r?\n)?#[ \t]*C\s+\[([\w./-]+)\+""")
            .find(report)?.groupValues?.get(1)?.substringAfterLast('/')?.lowercase() ?: return false
        return frame in setOf("libng_gl4es.so","libgl4es_114.so","libmobileglues.so","libglxshim.so","libgallium_dri.so") ||
            frame.startsWith("libgallium-") || frame.startsWith("vulkan.adreno")
    }
    fun describe(log: String, code: Int): String {
        val data = log.lowercase()
        return when {
            graphicsCrash(log) ->
                "图形渲染器在绘制游戏画面时崩溃。\n\n从社区打开游戏库，进入这个实例的设置，换用另一种图形渲染器后重试。"
            "failed to create window context" in data || "glfw error 65542" in data || "backend api: no context" in data ->
                "图形驱动没有建立游戏窗口。\n\n回到首页，打开此实例的设置，切换图形渲染器后重试。"
            "direct buffer memory" in data || "cannot reserve" in data && "direct buffer" in data ||
                "native memory allocation" in data && "failed" in data ->
                "游戏的原生内存分配失败。\n\n先使用手机画质、关闭其他占用运存的应用，再重试。若使用了加大档预算，可以切回标准档，为渲染留出空间。"
            "java.lang.outofmemoryerror" in data || "could not reserve enough space" in data ->
                "Java 游戏堆内存不足。\n\n可在游戏库的实例设置中启用按需加载模型。手机有空闲交换空间时，也可试用虚拟内存预算的加大档。"
            "no space left on device" in data || "enospc" in data ->
                "设备空间不足。\n\n先释放存储空间，再从首页重新启动。"
            "unsupportedclassversionerror" in data || "unsupported class file major version" in data ->
                "当前 Java 版本与游戏或模组不匹配。\n\n请从对应的社区服务器重新匹配实例。若仍然报错，请服主核对整合包要求的 Java 版本。"
            "incompatible mods" in data || "modresolutionexception" in data ->
                "模组版本或依赖冲突。\n\n打开诊断详情确认模组名称，再在实例管理中调整版本。"
            else -> "游戏意外退出（代码 $code）。\n\n可以打开诊断详情确认原因。反复出现时，把 Minecraft 版本、渲染器和错误片段交给管理员。"
        }
    }
}
