import top.hxzmc.runtime.JavaRuntimeMetadata;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public final class JavaRuntimeMetadataTest {
    private static int checks;
    public static void main(String[] args)throws Exception {
        Path home=Files.createTempDirectory("hxz-java-release-");
        write(home,"JAVA_VERSION=\"21.0.1\"\nOS_ARCH=\"aarch64\"\n");JavaRuntimeMetadata.requireArm64(home.toFile(),21);checks++;
        rejects(home,25,"实际 Java 版本");
        write(home,"JAVA_VERSION=\"25-ea+13\"\r\nOS_ARCH=\"aarch64\"\r\n");JavaRuntimeMetadata.requireArm64(home.toFile(),25);checks++;
        write(home,"JAVA_VERSION=\"1.8.0_402\"\nOS_ARCH=\"aarch64\"\n");JavaRuntimeMetadata.requireArm64(home.toFile(),8);checks++;
        write(home,"JAVA_VERSION=\"21.0.1\"\nOS_ARCH=\"amd64\"\n");rejects(home,21,"ARM64");
        write(home,"JAVA_VERSION=\"21.0.1\"\n");rejects(home,21,"ARM64");
        write(home,"JAVA_VERSION=\"nonsense\"\nOS_ARCH=\"aarch64\"\n");rejects(home,21,"实际 Java 版本");
        write(home,"JAVA_VERSION=\"25\"\nJAVA_VERSION=\"21\"\nOS_ARCH=\"aarch64\"\n");rejects(home,21,"重复");
        try(RandomAccessFile file=new RandomAccessFile(home.resolve("release").toFile(),"rw")){file.setLength(65537);}rejects(home,21,"过大");
        Files.delete(home.resolve("release"));rejects(home,21,"缺少");
        for(String arg:args){File actual=new File(arg);JavaRuntimeMetadata.requireArm64(actual,Integer.parseInt(actual.getName()));checks++;}
        System.out.println("PASS Java runtime metadata "+checks+" checks (release files only; no native runtime execution)");
    }
    private static void write(Path home,String content)throws IOException {Files.write(home.resolve("release"),content.getBytes(StandardCharsets.UTF_8));}
    private static void rejects(Path home,int major,String expected)throws Exception {
        try{JavaRuntimeMetadata.requireArm64(home.toFile(),major);throw new AssertionError("Invalid release accepted");}
        catch(IOException failure){if(!failure.getMessage().contains(expected))throw new AssertionError("Unexpected validation reason");checks++;}
    }
}
