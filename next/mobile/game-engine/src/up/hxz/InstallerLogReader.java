package up.hxz;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Bounded incremental UTF-8 reader; does not reread a growing multi-MB log twice a second. */
public final class InstallerLogReader {
    private long offset;
    private final ByteArrayOutputStream pending = new ByteArrayOutputStream();
    public synchronized List<String> read(File file, boolean flush) throws IOException {
        if (!file.isFile()) return Collections.emptyList();
        if (file.length() < offset) {offset = 0; pending.reset();}
        List<String> lines = new ArrayList<>();
        try (RandomAccessFile input = new RandomAccessFile(file, "r")) {
            input.seek(offset);
            byte[] bytes = new byte[8192]; int n; int consumed = 0;
            while (consumed < 256 * 1024 && (n = input.read(bytes, 0, Math.min(bytes.length, 256 * 1024 - consumed))) > 0) {
                offset += n; consumed += n;
                for (int i=0;i<n;i++) {
                    if (bytes[i] == '\n') {
                        lines.add(new String(pending.toByteArray(), StandardCharsets.UTF_8).replaceAll("\r$", "")); pending.reset();
                    } else if (pending.size() < 32768) pending.write(bytes[i]);
                }
            }
        }
        if (flush && pending.size() > 0) {lines.add(new String(pending.toByteArray(), StandardCharsets.UTF_8)); pending.reset();}
        return lines;
    }
}
