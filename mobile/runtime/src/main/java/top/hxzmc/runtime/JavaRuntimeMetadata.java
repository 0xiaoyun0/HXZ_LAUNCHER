package top.hxzmc.runtime;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

/** Fail before native loading when a runtime directory contains the wrong Java or CPU build. */
public final class JavaRuntimeMetadata {
    private JavaRuntimeMetadata() {}
    public static void requireArm64(File home,int expectedMajor)throws IOException {
        Path base=home.toPath().toRealPath(),release=base.resolve("release");
        if(Files.isSymbolicLink(release)||!Files.isRegularFile(release,LinkOption.NOFOLLOW_LINKS))throw new IOException("Java 运行模块缺少版本信息，请更新运行模块");
        ByteArrayOutputStream data=new ByteArrayOutputStream();
        try(InputStream input=Files.newInputStream(release)) {
            byte[] buffer=new byte[4096];int count;
            while((count=input.read(buffer))!=-1){if(data.size()+count>65536)throw new IOException("Java 运行模块版本信息过大");data.write(buffer,0,count);}
        }
        Map<String,String> values=new HashMap<>();
        for(String line:new String(data.toByteArray(),StandardCharsets.UTF_8).split("\\r?\\n")) {
            int equals=line.indexOf('=');if(equals<0)continue;
            String key=line.substring(0,equals).trim();if(!key.equals("JAVA_VERSION")&&!key.equals("OS_ARCH"))continue;
            String value=line.substring(equals+1).trim();
            if(value.length()>=2&&value.startsWith("\"")&&value.endsWith("\""))value=value.substring(1,value.length()-1);
            if(values.put(key,value)!=null)throw new IOException("Java 运行模块版本信息重复");
        }
        Matcher version=Pattern.compile("^(?:1\\.)?([0-9]{1,2})(?:[.+_-].*)?$").matcher(values.getOrDefault("JAVA_VERSION",""));
        if(!version.matches()||Integer.parseInt(version.group(1))!=expectedMajor)throw new IOException("此游戏需要 Java "+expectedMajor+"，运行模块的实际 Java 版本不匹配，请更新运行模块");
        if(!"aarch64".equals(values.get("OS_ARCH")))throw new IOException("Java 运行模块不是手机所需的 ARM64 架构，请更新运行模块");
    }
}
