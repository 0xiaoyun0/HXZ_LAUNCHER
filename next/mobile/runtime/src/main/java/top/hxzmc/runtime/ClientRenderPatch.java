package top.hxzmc.runtime;
import java.io.*;import java.nio.charset.StandardCharsets;import java.nio.file.*;import java.util.*;import java.util.zip.*;import org.json.*;

/** Local reversible edit of two shader-only mixins in one reviewed artifact.
 * No modified mod is shipped. Original bytes are restored before HXZUP checks. */
final class ClientRenderPatch {
    static final String NAME="hello_new_generation_core-0.0.34.jar",SHA="adcf85b72dcfed74ced81e754609f27b161b3ed55daac60ba689473dfe630c61",CONFIG="hello_new_generation_core.mixins.json";
    static final Set<String> MIXINS=new HashSet<>(Arrays.asList("createaeronautics.MixinAbstractLaserRenderer","createaeronautics.MixinClientBalloonEffectRenderer"));
    static final String REASON="保留整合包核心与全部玩法，仅在 Iris 不存在时停用两条引用 Iris API 的客户端光影特效补丁；原件已备份，更新检查前自动恢复。";
    final File target,directory,backup,journal,mods;
    ClientRenderPatch(File instance)throws IOException {
        mods=RuntimeFiles.inside(instance,"mods");target=RuntimeFiles.inside(mods,NAME);directory=RuntimeFiles.inside(instance,".hxz/client-render-patch");backup=RuntimeFiles.inside(directory,SHA+".jar");journal=RuntimeFiles.inside(directory,"state.json");
    }
    private JSONObject state()throws Exception {return journal.isFile()?RuntimeFiles.json(journal):new JSONObject();}
    private static String hash(File f)throws Exception {return RuntimeFiles.hash(f,"SHA-256");}
    void restore(EngineHost.Cancellation cancel,boolean user)throws Exception {
        cancel.check();JSONObject state=state();
        if(state.has("patchedSha")&&target.isFile()&&hash(target).equals(state.getString("patchedSha"))) {
            if(!backup.isFile()||!hash(backup).equals(SHA)||!validPatch(target,backup,cancel))throw new IOException("客户端特效适配备份校验失败，已保留现有文件，请修复整合包");copyAtomic(backup,target);
        }
        if(user&&journal.isFile()){state.put("userRestored",true);RuntimeFiles.writeJson(journal,state);}
    }
    String apply(EngineHost.Cancellation cancel)throws Exception {
        cancel.check();if(state().optBoolean("userRestored")||!target.isFile()||!hash(target).equals(SHA)||hasIris(cancel))return "";
        Files.createDirectories(directory.toPath());if(backup.exists()){if(!hash(backup).equals(SHA))throw new IOException("客户端特效适配原件备份不完整");}else copyAtomic(target,backup);
        File temp=File.createTempFile(".render-",".jar",directory);
        try{rewrite(backup,temp,cancel);if(!validPatch(temp,backup,cancel))throw new IOException("客户端特效适配输出校验失败");RuntimeFiles.writeJson(journal,new JSONObject().put("schema",1).put("originalSha",SHA).put("patchedSha",hash(temp)).put("userRestored",false));RuntimeFiles.replace(temp,target);return REASON;}
        finally{Files.deleteIfExists(temp.toPath());}
    }
    String originalDigest(File file,EngineHost.Cancellation cancel)throws Exception {
        if(!file.getName().equals(NAME)||!journal.isFile()||!backup.isFile()||!hash(backup).equals(SHA))return "";
        JSONObject state=state();return hash(file).equals(state.optString("patchedSha"))&&validPatch(file,backup,cancel)?SHA:"";
    }
    private boolean hasIris(EngineHost.Cancellation cancel)throws Exception {
        File[] jars=mods.listFiles(f->f.isFile()&&f.getName().endsWith(".jar"));if(jars==null)return false;
        for(File jar:jars){cancel.check();RuntimeFiles.noLinks(jar);try(ZipFile zip=new ZipFile(jar)){if(zip.getEntry("net/irisshaders/iris/api/v0/IrisApi.class")!=null)return true;}}return false;
    }
    private static byte[] config(byte[] original)throws Exception {
        JSONObject json=new JSONObject(new String(original,StandardCharsets.UTF_8));JSONArray old=json.getJSONArray("mixins"),kept=new JSONArray();int removed=0;
        for(int i=0;i<old.length();i++){String name=old.getString(i);if(MIXINS.contains(name))removed++;else kept.put(name);}if(removed!=2)throw new IOException("Reviewed shader mixins do not match");json.put("mixins",kept);return json.toString(2).getBytes(StandardCharsets.UTF_8);
    }
    private static byte[] read(ZipFile zip,ZipEntry entry)throws IOException {
        if(entry.getSize()<0||entry.getSize()>16*1024*1024)throw new IOException("Oversized client patch entry");
        try(InputStream in=zip.getInputStream(entry);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[32768];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>16*1024*1024)throw new IOException("Oversized client patch entry");out.write(buffer,0,count);}return out.toByteArray();}
    }
    static void rewrite(File original,File output,EngineHost.Cancellation cancel)throws Exception {
        try(ZipFile zip=new ZipFile(original);ZipOutputStream out=new ZipOutputStream(new FileOutputStream(output))){Enumeration<? extends ZipEntry> entries=zip.entries();int count=0;boolean patched=false;
            while(entries.hasMoreElements()){cancel.check();if(++count>10000)throw new IOException("Too many client patch entries");ZipEntry entry=entries.nextElement();String name=entry.getName();if(name.matches("(?i)META-INF/[^/]+\\.(SF|RSA|DSA|EC)"))throw new IOException("Signed mod cannot be patched");ZipEntry next=new ZipEntry(name);next.setTime(0);out.putNextEntry(next);
                if(!entry.isDirectory()){byte[] bytes=read(zip,entry);if(name.equals(CONFIG)){bytes=config(bytes);patched=true;}out.write(bytes);}out.closeEntry();}if(!patched)throw new IOException("Reviewed mixin configuration missing");
        }
    }
    static boolean validPatch(File patched,File original,EngineHost.Cancellation cancel)throws Exception {
        try(ZipFile from=new ZipFile(original);ZipFile to=new ZipFile(patched)){if(from.size()!=to.size()||from.size()>10000)return false;Set<String> seen=new HashSet<>();Enumeration<? extends ZipEntry> entries=to.entries();
            while(entries.hasMoreElements()){cancel.check();ZipEntry entry=entries.nextElement(),source=from.getEntry(entry.getName());if(!seen.add(entry.getName())||source==null||entry.isDirectory()!=source.isDirectory())return false;byte[] expected=read(from,source);if(entry.getName().equals(CONFIG))expected=config(expected);if(!Arrays.equals(expected,read(to,entry)))return false;}return seen.contains(CONFIG);
        }
    }
    private static void copyAtomic(File from,File to)throws IOException {
        RuntimeFiles.noLinks(from);RuntimeFiles.noLinks(to);Files.createDirectories(to.getParentFile().toPath());File temp=File.createTempFile(".copy-",".tmp",to.getParentFile());try{Files.copy(from.toPath(),temp.toPath(),StandardCopyOption.REPLACE_EXISTING);RuntimeFiles.replace(temp,to);}finally{Files.deleteIfExists(temp.toPath());}
    }
}
