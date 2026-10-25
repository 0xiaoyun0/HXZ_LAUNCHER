package up.hxz;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;

/** Pure install policy shared by Forge and NeoForge; never probe random JREs. */
public final class InstallerRuntime {
    private InstallerRuntime() {}

    public static int forGame(String minecraft) {
        if (minecraft == null) return 8;
        String[] parts = minecraft.split("[.\\-]");
        try {
            int first = Integer.parseInt(parts[0]);
            if (first >= 26) return 25;
            if (first != 1 || parts.length < 2) return 8;
            int minor = Integer.parseInt(parts[1]);
            int patch = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
            if (minor > 20 || (minor == 20 && patch >= 5)) return 21;
            if (minor >= 17) return 17;
        } catch (NumberFormatException ignored) {}
        return 8;
    }

    public static int select(String minecraft, Path processorJar) throws IOException {
        int required = forGame(minecraft);
        try (JarFile jar = new JarFile(processorJar.toFile())) {
            if (jar.getManifest() == null) throw new IOException("安装处理器没有清单");
            String main = jar.getManifest().getMainAttributes().getValue(Attributes.Name.MAIN_CLASS);
            if (main == null) throw new IOException("安装处理器没有入口");
            JarEntry entry = jar.getJarEntry(main.replace('.', '/') + ".class");
            if (entry == null) throw new IOException("安装处理器入口不存在");
            try (DataInputStream in = new DataInputStream(jar.getInputStream(entry))) {
                if (in.readInt() != 0xcafebabe) throw new IOException("安装处理器入口损坏");
                in.readUnsignedShort();
                required = Math.max(required, in.readUnsignedShort() - 44);
            }
        }
        for (int installed : new int[]{8, 17, 21, 25}) if (installed >= required) return installed;
        throw new IOException("安装处理器需要 Java " + required + "，请更新游戏运行组件");
    }

    public static int heapMB(long availableBytes) {
        // The game is not running yet. Leave room for Android, the UI and native mappings.
        return (int)Math.max(384, Math.min(2048, availableBytes / 1048576 / 3));
    }

    public static List<String> arguments(List<String> original, int java, long availableBytes, int cores) {
        List<String> args = new ArrayList<>();
        args.add("-Xms128m");
        args.add("-Xmx" + heapMB(availableBytes) + "m");
        if (java >= 17) args.add("-XX:ActiveProcessorCount=" + Math.max(1, Math.min(4, cores)));
        args.addAll(original);
        return args;
    }
}
