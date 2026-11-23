package com.tungsten.fcl.hxz;

import android.content.Context;
import com.tungsten.fcl.FCLApp;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/** Asset seam: installed runtime data belongs to this application, never another APK. */
public final class HxzRuntimeAssets {
    public static final String PREFERENCES = "hxz-runtime-module";
    public static final String ROOT_KEY = "root";
    private HxzRuntimeAssets() {}

    private static String normalize(String path) throws IOException {
        String relative = path.replace('\\', '/');
        if (relative.startsWith("/assets/")) relative = relative.substring(8);
        if (relative.startsWith("/") || relative.contains("../") || relative.equals(".."))
            throw new IOException("运行模块路径无效");
        return relative;
    }

    private static File moduleFile(Context context, String path) throws IOException {
        String rootValue = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(ROOT_KEY, "");
        if (rootValue.isEmpty()) throw new IOException("请先在社区内下载并校验游戏运行模块");
        File root = new File(rootValue).getCanonicalFile();
        // The host activates only a completely verified immutable generation in filesDir.
        File privateRoot = context.getFilesDir().getCanonicalFile();
        if (!root.getPath().startsWith(privateRoot.getPath() + File.separator))
            throw new IOException("运行模块必须位于应用私有目录");
        File file = new File(root, path).getCanonicalFile();
        if (!file.getPath().startsWith(root.getPath() + File.separator)) throw new IOException("运行模块路径越界");
        return file;
    }

    public static InputStream open(Context context, String path) throws IOException {
        String relative = normalize(path);
        if (context.getPackageName().equals("top.hxzmc.community") && relative.startsWith("app_runtime/"))
            return new FileInputStream(moduleFile(context, relative));
        return context.getAssets().open(relative);
    }

    public static InputStream open(String path) throws IOException { return open(FCLApp.getAppContext(), path); }

    public static String[] list(Context context, String path) throws IOException {
        String relative = normalize(path);
        if (context.getPackageName().equals("top.hxzmc.community") && (relative.equals("app_runtime") || relative.startsWith("app_runtime/"))) {
            File file = moduleFile(context, relative);
            if (file.isFile()) return new String[0];
            String[] names = file.list();
            if (names == null) throw new IOException("运行模块文件缺失：" + relative);
            java.util.Arrays.sort(names);
            return names;
        }
        return context.getAssets().list(relative);
    }
}
