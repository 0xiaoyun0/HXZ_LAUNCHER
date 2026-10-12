package up.hxz;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/** FCL verified files use the same resumable transfer engine as the desktop installer. */
public final class AndroidDownloads {
    public interface Observer { void update(long completed, long total, int received); }
    private static final Network network = new Network(15, 5, 32);
    private static final ThreadLocal<Observer> observer = new ThreadLocal<>();
    private AndroidDownloads() {}
    static Observer currentObserver() { return observer.get(); }

    public static Path download(List<String> urls, Path cache, String sha1, Observer progress) throws Exception {
        Files.createDirectories(cache);
        observer.set(progress);
        try { return network.race(urls, cache, sha1, -1, Paths.get(new java.net.URI(urls.get(0)).getPath()).getFileName().toString()); }
        finally { observer.remove(); }
    }
}
