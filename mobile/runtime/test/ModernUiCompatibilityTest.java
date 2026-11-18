package top.hxzmc.runtime;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** Real reviewed ModernUI bytes in an isolated instance; never executes mod code. */
public final class ModernUiCompatibilityTest {
    private static void require(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args)throws Exception {
        File source=new File(args[0]);
        require(RuntimeFiles.hash(source,"SHA-256").equals("258623778012daad6fdd8793add3324b970df62a07c477697c43fe85deef1db6"),"Unexpected ModernUI fixture");
        Path root=Files.createTempDirectory(new File(args[1]).toPath(),"modernui-");
        File original=RuntimeFiles.inside(root.toFile(),"mods/现代化 UI.jar");Files.createDirectories(original.getParentFile().toPath());Files.copy(source.toPath(),original.toPath());
        ClientModCompatibility compat=new ClientModCompatibility(root.toFile());EngineHost.Cancellation cancel=new EngineHost.Cancellation();
        require(compat.dryRun(cancel,null).eligible==1,"80415 leaves ModernUI UI recording context startup blocker active");
        require(compat.scanAndQuarantine(cancel,null).disabled==1&&!original.exists(),"Reviewed ModernUI remains active");
        require(compat.validatedQuarantine(cancel).size()==1,"Preserved bytes unavailable to room identity");
        try(ClientModCompatibility.Session session=compat.beforePreparation(cancel)){
            require(original.isFile()&&RuntimeFiles.hash(original,"SHA-256").equals(RuntimeFiles.hash(source,"SHA-256")),"HXZUP cannot validate exact original");
            session.finish(cancel,null);
        }
        require(!original.exists()&&compat.validatedQuarantine(cancel).size()==1,"HXZUP re-enabled incompatible UI");
        compat.restoreAll(cancel);require(original.isFile()&&compat.scanAndQuarantine(cancel,null).disabled==0,"User restoration not respected");
        // A gameplay mod requiring the UI library must be kept as a dependency group.
        Path dependent=Files.createTempDirectory(new File(args[1]).toPath(),"modernui-required-");
        File required=RuntimeFiles.inside(dependent.toFile(),"mods/ui.jar");Files.createDirectories(required.getParentFile().toPath());Files.copy(source.toPath(),required.toPath());
        try(ZipOutputStream zip=new ZipOutputStream(new FileOutputStream(RuntimeFiles.inside(dependent.toFile(),"mods/consumer.jar")))){
            zip.putNextEntry(new ZipEntry("META-INF/neoforge.mods.toml"));
            zip.write("modLoader='javafml'\n[[mods]]\nmodId='content'\n[[dependencies.content]]\nmodId='modernui'\ntype='required'\n".getBytes(StandardCharsets.UTF_8));zip.closeEntry();
        }
        require(new ClientModCompatibility(dependent.toFile()).dryRun(cancel,null).eligible==0,"Retained gameplay dependency broken");
        System.out.println("PASS ModernUI: exact artifact, reversible isolation, HXZUP restore/re-isolate, room identity, user restore, required-dependency protection. No device rendering test.");
    }
}
