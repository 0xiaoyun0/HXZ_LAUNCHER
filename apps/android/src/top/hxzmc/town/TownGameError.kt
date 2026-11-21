package top.hxzmc.town

object TownGameError {
    fun describe(log: String, code: Int): String {
        val data = log.lowercase()
        return when {
            "failed to create window context" in data || "glfw error 65542" in data || "backend api: no context" in data ->
                "图形驱动没有建立游戏窗口。\n\n回到首页，打开此实例的设置，切换图形渲染器后重试。"
            "outofmemoryerror" in data || "could not reserve enough space" in data ->
                "Java 未能分配游戏内存。\n\n关闭其他应用，在实例设置中检查分配值，再次启动。"
            "no space left on device" in data || "enospc" in data ->
                "设备空间不足。\n\n先释放存储空间，再从首页重新启动。"
            "unsupportedclassversionerror" in data || "unsupported class file major version" in data ->
                "当前 Java 版本与游戏或模组不匹配。\n\n在实例设置中选择游戏要求的 Java 版本后重试。"
            "incompatible mods" in data || "modresolutionexception" in data ->
                "模组版本或依赖冲突。\n\n打开诊断详情确认模组名称，再在实例管理中调整版本。"
            else -> "游戏意外退出（代码 $code）。\n\n可以打开诊断详情确认原因。反复出现时，把 Minecraft 版本、渲染器和错误片段交给管理员。"
        }
    }
}
