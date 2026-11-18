package com.tungsten.fcl.hxz;

import android.app.ActivityManager;
import android.content.Context;
import com.tungsten.fcl.setting.VersionSetting;
import com.tungsten.fclcore.util.StringUtils;
import java.io.IOException;
import java.util.function.Consumer;

/** Budget Java together with native rendering; Xmx alone is not the process footprint. */
final class HxzMemory {
    static void configure(Context context, VersionSetting setting, int requested,
                          boolean modpack, boolean zink, Consumer<String> progress) throws IOException {
        ActivityManager manager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) throw new IOException("暂时无法读取设备内存，请重新打开运行组件后继续。");
        ActivityManager.MemoryInfo memory = new ActivityManager.MemoryInfo();
        manager.getMemoryInfo(memory);
        int total = (int) (memory.totalMem / 1048576L);
        int available = (int) (memory.availMem / 1048576L);
        if (total <= 0 || available <= 0) throw new IOException("暂时无法读取可用内存，游戏文件已保留，请稍后重试。");

        // Native allocations, textures and Android's low-memory threshold are outside Java's heap.
        int nativeReserve = zink ? 1536 : modpack ? 1280 : 768;
        int systemReserve = (int) Math.max(512, (memory.threshold + 1048575L) / 1048576L);
        int reserve = nativeReserve + systemReserve;
        int minimum = modpack ? 2048 : 1024;
        int tier = total < 3500 ? 1024 : total < 5500 ? 1536 : total < 7000 ? 2048
                : total < 10500 ? 2560 : total < 14500 ? 4096 : 6144;
        int cap = Math.min(tier, Math.min(total / 2, available - reserve));
        cap = Math.max(0, cap / 128 * 128);
        if (memory.lowMemory || cap < minimum) {
            throw new IOException("当前可用内存 " + available + " MB，暂不适合启动"
                    + (modpack ? "此大型模组包" : "此游戏") + "。\n至少需要约 " + (minimum + reserve)
                    + " MB 可用内存（包含系统与图形预留）。请关闭其他应用后重试；若仍不足，请选择更轻量的整合包。已下载文件无需重装。");
        }
        // Explicit heap flags otherwise override VersionSetting inside FCL's command builder.
        for (String arg : StringUtils.tokenize(setting.getJavaArgs())) {
            if (arg.startsWith("-Xmx") || arg.startsWith("-Xms")
                    || arg.startsWith("-XX:MaxHeapSize=") || arg.startsWith("-XX:InitialHeapSize=")
                    || arg.equals("-XX:+AlwaysPreTouch")) {
                throw new IOException("高级 JVM 参数中的 " + arg + " 会覆盖手机内存保护。请移除该参数，使用社区运行设置的「内存分配」调整。");
            }
        }
        int heap = requested <= 0 ? cap : Math.min(cap, Math.max(minimum, requested));
        setting.setAutoMemory(false);
        setting.setMaxMemory(heap);
        if (!setting.getJavaArgs().contains("-XX:ActiveProcessorCount=")) {
            int workers = Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors()));
            setting.setJavaArgs((setting.getJavaArgs() + " -XX:ActiveProcessorCount=" + workers).trim());
        }
        progress.accept("内存：设备 " + total + " MB · 可用 " + available + " MB · Java " + heap
                + " MB · 系统与图形预留 " + reserve + " MB");
        if (requested > 0 && requested != heap) progress.accept("已将手动内存调整为 " + heap + " MB，避免超出当前设备预算");
    }
}
