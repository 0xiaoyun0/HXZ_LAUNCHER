package top.hxzmc.runtime;

import java.util.Locale;

/** Explain recognizable runtime evidence. Never infer a mod removal from a crash alone. */
public final class GameFailureAdvice {
    private GameFailureAdvice() {}
    public static String explain(String evidence) {
        if(evidence==null)return "";
        String text=evidence.toLowerCase(Locale.ROOT);
        if(text.contains("icyllis.modernui")&&text.contains("ui recording context has not been created"))
            return "ModernUI 的界面绘制上下文创建失败。请更新社区应用后重新准备游戏，启动器会备份停用已核验的客户端界面组件，使用 Minecraft 原生界面；无需删除存档或重新下载整合包。若曾手动恢复此模组，请重新启用客户端兼容适配。";
        if((text.contains("could not find agent library instrument")||text.contains("cannot load runtime library"))
                &&(text.contains("libinstrument.so")||text.contains("libjli.so")))
            return "Java 的登录验证组件未能加载，这不是整合包或存档损坏。请更新社区应用后重试；若仍提示组件文件缺失，请在游戏运行模块中继续下载修复，并附当前诊断反馈。";
        if((text.contains("unsatisfiedlinkerror")||text.contains("dlopen failed")||text.contains("cannot load runtime library"))
                &&(text.contains("libfreetype.so")||text.contains("libfontmanager.so")||text.contains("libawt.so")||text.contains("libawt_headless.so")))
            return "Java 字体组件未能加载，这不是存档损坏。请更新社区应用后重试；若仍提示组件文件缺失，请在游戏运行模块中继续下载修复，并附当前诊断反馈。无需删除 ModernUI 或重新下载整个整合包。";
        if(text.contains("using pojavlauncher")&&text.contains("not supported")&&text.contains("sodium"))
            return "当前 Sodium 渲染模组不支持手机图形环境。请更新社区应用后重新准备游戏，启动器会备份并停用已核验的不兼容客户端渲染组件；无需删除存档或重新下载整个整合包。若手动恢复过这些模组，请在运行设置重新启用客户端兼容适配。";
        if(text.contains("shared frame descriptor is too small")||text.contains("android shared frame buffer size")||text.contains("shared frame buffer is too small"))
            return "启动器未能建立游戏画面通道。已下载文件和存档已保留，无需重新下载整合包；请更新社区应用后重试，仍失败时复制当前诊断反馈。";
        if(text.contains("outofmemoryerror")||text.contains("native memory allocation (malloc) failed")||text.contains("could not reserve enough space for")||text.contains("out of swap space"))
            return "游戏内存不足。请先关闭其他应用、降低视距和分辨率；不要把全部可用内存分给 Java。存档和已下载文件已保留。";
        if(text.contains("unsatisfiedlinkerror")&&(text.contains("x86")||text.contains("amd64")||text.contains("wrong elf")||text.contains("em_x86_64")||text.contains("e_machine")))
            return "某个模组或组件正在调用电脑架构的本地库，手机无法加载。请复制诊断定位该组件；不会自动删除服务器要求的模组。";
        if(text.contains("failed to create an opengl context")||text.contains("glfw error 65542")||text.contains("opengl version 3.2 or higher is required")||text.contains("failed to create osmesa"))
            return "当前图形驱动未能建立游戏画面。请在游戏运行设置更换渲染器并降低分辨率；若仍失败，请附诊断反馈设备型号。";
        if(text.contains("unsupportedclassversionerror"))
            return "游戏或模组要求更高的 Java 版本。请检查运行模块更新，并确认整合包版本匹配；重复下载整合包不能修复 Java 版本不匹配。";
        if(text.contains("failed to verify username")||text.contains("authentication servers are down")||text.contains("invalid session (try restarting your game"))
            return "服务器未能完成账号验证。请先确认社区当前角色已登录；若重新登录后仍失败，需要检查服务器的皮肤站认证连接。";
        if(text.contains("mismatched mod channel list")||text.contains("incompatible fml modded server")||text.contains("failed to synchronize registry data"))
            return "客户端与服务器的模组或注册数据不一致。请检查 HXZUP 更新并确认选中了正确服务器；不要删除内容模组来绕过检查。";
        return "";
    }
}
