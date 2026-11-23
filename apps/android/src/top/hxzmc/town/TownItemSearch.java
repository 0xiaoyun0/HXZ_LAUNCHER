package top.hxzmc.town;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Changes the existing JEI index setting without serializing the rest of the player's INI file. */
public final class TownItemSearch {
    private static final Pattern SETTING = Pattern.compile(
            "(?m)^([ \\t]*lowMemorySlowSearchEnabled[ \\t]*=[ \\t]*)(true|false)(?=[ \\t]*(?:[#;]|\\r|\\n|$))");
    private final Path file;

    public TownItemSearch(File directory) throws IOException {
        Path root = directory.getCanonicalFile().toPath();
        file = root.resolve("config/jei/jei-client.ini");
        if (!file.equals(file.toFile().getCanonicalFile().toPath())) throw new IOException("JEI 配置路径已改变。");
    }

    private String read() throws IOException {
        if (!Files.isRegularFile(file) || Files.size(file) > 262144) return "";
        return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
    }

    public Boolean enabled() throws IOException {
        Matcher match = SETTING.matcher(read());
        if (!match.find()) return null;
        boolean value = Boolean.parseBoolean(match.group(2));
        return match.find() ? null : value;
    }

    public void save(boolean enabled) throws IOException {
        String before = read();
        Matcher match = SETTING.matcher(before);
        if (!match.find()) throw new IllegalStateException("这个实例未提供 JEI 低内存搜索选项。");
        String after = before.substring(0, match.start(2)) + enabled + before.substring(match.end(2));
        if (match.find()) throw new IllegalStateException("JEI 配置中有重复的搜索选项，请先核对实例配置。");
        if (after.equals(before)) return;
        Path temporary = Files.createTempFile(file.getParent(), ".town-jei-", ".tmp");
        try {
            Files.write(temporary, after.getBytes(StandardCharsets.UTF_8));
            if (!before.equals(read())) throw new IllegalStateException("游戏正在修改物品搜索配置，请退出游戏后重试。");
            try { Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException e) { Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temporary); }
    }
}
