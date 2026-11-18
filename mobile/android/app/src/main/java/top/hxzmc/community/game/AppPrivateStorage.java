package top.hxzmc.community.game;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/** Resolve only the trusted files directory supplied by Android Context, before appending resource paths. */
final class AppPrivateStorage {
    private AppPrivateStorage() {}
    static File resolve(File contextFilesDirectory)throws IOException {
        File physical=contextFilesDirectory.toPath().toRealPath().toFile();
        if(!Files.isDirectory(physical.toPath()))throw new IOException("应用数据目录不可用");
        return physical;
    }
}
