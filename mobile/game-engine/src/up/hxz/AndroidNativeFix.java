package up.hxz;

import java.io.*;
import java.nio.file.*;
import java.util.function.Consumer;

/** Pinned, bundled adapter for the exact server Sable build. Never remove the gameplay dependency. */
public final class AndroidNativeFix {
    public static final String SABLE="f3ba9a497122ba29d9e94ebe6f9a3a3aaa5fa756";
    private static final String PATCH="63f152391d2ba6a10071509544e4e679466c5c2e";
    public static void apply(Path root,InputStream bundled,Consumer<String> progress)throws IOException{
        Path mods=root.resolve("mods"),target=mods.resolve("hxz-android-sable-2.0.3.jar");boolean needed=false,other=false;
        try(InputStream source=bundled){
            if(Files.isDirectory(mods))try(DirectoryStream<Path> files=Files.newDirectoryStream(mods,"*.jar")){
                for(Path file:files){
                    if(!file.equals(target)){
                        IO.noLinks(file);String sha=AndroidCompatibility.localHash(file);
                        if(SABLE.equals(sha)&&SABLE.equals(IO.hash(file)))needed=true;
                        if(PATCH.equals(sha)&&PATCH.equals(IO.hash(file)))other=true;
                    }
                }
            }
            if(!needed||other){if(Files.isRegularFile(target)&&PATCH.equals(IO.hash(target)))Files.delete(target);return;}
            if(Files.isRegularFile(target)){if(PATCH.equals(IO.hash(target)))return;throw new IOException("Sable 安卓适配文件被手动修改，请移走 hxz-android-sable-2.0.3.jar 后重试");}
            progress.accept("正在适配航空学 · Sable 2.0.3 ARM64 物理库");Files.createDirectories(mods);IO.noLinks(target);
            Path temporary=Files.createTempFile(mods,"hxz-sable-",".part");
            try{Files.copy(source,temporary,StandardCopyOption.REPLACE_EXISTING);if(!PATCH.equals(IO.hash(temporary)))throw new IOException("内置安卓物理补丁校验失败，请重新安装运行组件");IO.move(temporary,target);}finally{Files.deleteIfExists(temporary);}
        }
    }
}
