package top.hxzmc.community;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.zip.*;
import org.json.*;

/** Verified runtime assets only. No APK installation or Android class loading. */
final class GameRuntimeStore {
    static final long LIMIT=1024L*1024*1024;
    static String sha(File file)throws Exception{
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)digest.update(b,0,n);}
        StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();
    }
    static String sha(byte[] bytes)throws Exception{MessageDigest digest=MessageDigest.getInstance("SHA-256");digest.update(bytes);StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();}
    /** Android app-data ancestors may be system aliases. Only the managed module itself must not be a link. */
    static File activationRoot(File parent,File stored)throws IOException{
        if(!stored.isAbsolute()||Files.isSymbolicLink(stored.toPath()))throw new IOException("运行模块目录无效");
        File base=parent.getCanonicalFile(),root=stored.getCanonicalFile();
        if(!base.equals(root.getParentFile())||!root.getName().matches("[0-9]+-[a-f0-9]{16}"))throw new IOException("运行模块目录不在应用资源目录内");
        return root;
    }
    static String safe(String name)throws IOException{
        if(name==null||name.length()>240||!name.matches("[A-Za-z0-9_./+-]+")||name.startsWith("/")||Arrays.asList(name.split("/",-1)).stream().anyMatch(p->p.equals("..")||p.equals(".")||p.isEmpty()))throw new IOException("运行资源路径无效");
        if(!name.equals("module.json")&&!name.startsWith("app_runtime/"))throw new IOException("运行资源包含不允许的内容");
        return name;
    }
    static void remove(File folder,File parent)throws IOException{
        Path target=folder.getCanonicalFile().toPath(),base=parent.getCanonicalFile().toPath();
        if(target.equals(base)||!target.startsWith(base))throw new IOException("资源清理路径无效");
        if(!Files.exists(target,LinkOption.NOFOLLOW_LINKS))return;
        if(Files.isSymbolicLink(folder.toPath()))throw new IOException("资源路径不能是链接");
        try(java.util.stream.Stream<Path> files=Files.walk(target)){for(Path p:(Iterable<Path>)files.sorted(Comparator.reverseOrder())::iterator){if(Files.isSymbolicLink(p))throw new IOException("资源目录中存在链接");p.toFile().setWritable(true,true);Files.delete(p);}}
    }
    static byte[] metadataBytes(File zip)throws Exception{
        try(ZipFile archive=new ZipFile(zip)){ZipEntry entry=archive.getEntry("module.json");if(entry==null||entry.getSize()<1||entry.getSize()>1024*1024)throw new IOException("运行模块缺少有效清单");try(InputStream in=archive.getInputStream(entry)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>1024*1024)throw new IOException("运行资源清单过大");out.write(b,0,n);}return out.toByteArray();}}
    }
    static JSONObject metadata(File zip)throws Exception{return new JSONObject(new String(metadataBytes(zip),StandardCharsets.UTF_8));}
    static File extract(File zip,File parent,JSONObject outer,BooleanSupplier cancelled)throws Exception{
        if(!parent.isDirectory()&&!parent.mkdirs())throw new IOException("无法创建运行资源目录");
        try(java.nio.channels.FileChannel channel=java.nio.channels.FileChannel.open(new File(parent,".extract.lock").toPath(),StandardOpenOption.CREATE,StandardOpenOption.WRITE);java.nio.channels.FileLock lock=channel.lock()){
            File[] stale=parent.listFiles(f->f.isDirectory()&&f.getName().matches("pending-[a-f0-9-]{36}"));
            if(stale!=null)for(File folder:stale)remove(folder,parent);
            return extractLocked(zip,parent,outer,cancelled);
        }
    }
    private static File extractLocked(File zip,File parent,JSONObject outer,BooleanSupplier cancelled)throws Exception{
        if(zip.length()!=outer.getLong("size")||!sha(zip).equals(outer.getString("sha256")))throw new IOException("运行资源校验失败，请重新下载");
        byte[] moduleBytes=metadataBytes(zip);if(!outer.getString("moduleSha256").matches("[a-f0-9]{64}")||!sha(moduleBytes).equals(outer.getString("moduleSha256")))throw new IOException("运行模块清单与签名不匹配");
        JSONObject metadata=new JSONObject(new String(moduleBytes,StandardCharsets.UTF_8));
        if(metadata.optInt("schema")!=1||!metadata.optString("kind").equals("hxz-runtime-assets")||metadata.optInt("interfaceVersion")!=1||!metadata.optString("abi").equals("arm64-v8a"))throw new IOException("运行资源与当前应用不兼容");
        JSONArray rows=metadata.getJSONArray("files");if(rows.length()<1||rows.length()>2000)throw new IOException("运行资源清单数量异常");
        Map<String,JSONObject> expected=new HashMap<>();Set<String> folded=new HashSet<>();long total=0;
        for(int i=0;i<rows.length();i++){JSONObject row=rows.getJSONObject(i);String name=safe(row.getString("path"));long size=row.getLong("size");if(!name.startsWith("app_runtime/")||size<0||size>LIMIT||!row.getString("sha256").matches("[a-f0-9]{64}")||expected.put(name,row)!=null||!folded.add(name.toLowerCase(Locale.ROOT))||(total+=size)>LIMIT)throw new IOException("运行资源清单无效");}
        if(!parent.isDirectory()&&!parent.mkdirs())throw new IOException("无法创建运行资源目录");
        File staging=new File(parent,"pending-"+UUID.randomUUID()),ready=new File(parent,outer.getLong("versionCode")+"-"+outer.getString("sha256").substring(0,16));
        if(ready.exists()&&validDeep(ready,outer))return ready;
        if(parent.getUsableSpace()<total+32L*1024*1024)throw new IOException("存储空间不足，请为运行资源留出更多空间");
        if(!staging.mkdir())throw new IOException("无法准备运行资源目录");
        try(ZipFile archive=new ZipFile(zip)){
            Set<String> seen=new HashSet<>();Enumeration<? extends ZipEntry> entries=archive.entries();long bytes=0;
            while(entries.hasMoreElements()){
                if(cancelled.getAsBoolean())throw new InterruptedIOException("已暂停");ZipEntry entry=entries.nextElement();String name=entry.getName();
                if(entry.isDirectory()){String directory=name.endsWith("/")?name.substring(0,name.length()-1):name;if(!directory.equals("app_runtime"))safe(directory);continue;}
                safe(name);if(!seen.add(name.toLowerCase(Locale.ROOT)))throw new IOException("运行资源路径重复");
                if(name.equals("module.json"))continue;JSONObject row=expected.remove(name);if(row==null)throw new IOException("运行模块包含清单外文件");
                File file=new File(staging,name);if(!file.getCanonicalPath().startsWith(staging.getCanonicalPath()+File.separator))throw new IOException("运行资源越界");
                if(!file.getParentFile().isDirectory()&&!file.getParentFile().mkdirs())throw new IOException("无法创建资源子目录");
                long written=0;try(InputStream in=archive.getInputStream(entry);OutputStream out=new FileOutputStream(file)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){if(cancelled.getAsBoolean())throw new InterruptedIOException("已暂停");written+=n;bytes+=n;if(written>row.getLong("size")||bytes>LIMIT)throw new IOException("运行资源大小超出清单");out.write(b,0,n);}}
                if(written!=row.getLong("size")||!sha(file).equals(row.getString("sha256")))throw new IOException("运行资源文件校验失败");
                if(!file.setReadOnly())throw new IOException("无法保护已校验的运行资源");
            }
            if(!expected.isEmpty())throw new IOException("运行资源包不完整");
            Files.write(new File(staging,"module.json").toPath(),moduleBytes);
            if(!new File(staging,"module.json").setReadOnly())throw new IOException("无法保护运行模块清单");
            Files.write(new File(staging,"verified.json").toPath(),outer.toString().getBytes(StandardCharsets.UTF_8));
            File previous=null;
            if(ready.exists()){
                if(validDeep(ready,outer)){remove(staging,parent);return ready;}
                activationRoot(parent,ready);
                previous=new File(parent,"pending-"+UUID.randomUUID());
                if(!ready.renameTo(previous))throw new IOException("无法替换损坏的运行资源，请退出游戏后重试");
            }
            if(!staging.renameTo(ready)){
                if(previous!=null&&!previous.renameTo(ready))throw new IOException("运行资源替换中断，已保留原目录，下次重试会重新准备");
                throw new IOException("无法保存已校验的运行资源");
            }
            // A failed cleanup must not turn a successful activation into a failed installation.
            if(previous!=null)try{remove(previous,parent);}catch(IOException ignored){}
            return ready;
        }finally{if(staging.exists())remove(staging,parent);}
    }
    private static boolean noLinks(File dir,String relative){Path at=dir.toPath();if(Files.isSymbolicLink(at))return false;
        for(String segment:relative.split("/")){at=at.resolve(segment);if(Files.isSymbolicLink(at))return false;}return true;
    }
    private static JSONObject checkedMetadata(File dir,JSONObject outer)throws Exception{
        if(!noLinks(dir,"module.json")||!noLinks(dir,"verified.json"))throw new IOException("运行模块目录包含链接");
        byte[] bytes=Files.readAllBytes(new File(dir,"module.json").toPath());String moduleHash=outer.getString("moduleSha256");
        if(bytes.length<1||bytes.length>1024*1024||!moduleHash.matches("[a-f0-9]{64}")||!sha(bytes).equals(moduleHash))throw new IOException("运行模块清单与签名不匹配");
        JSONObject saved=new JSONObject(new String(Files.readAllBytes(new File(dir,"verified.json").toPath()),StandardCharsets.UTF_8));
        if(!saved.getString("sha256").equals(outer.getString("sha256"))||saved.getLong("versionCode")!=outer.getLong("versionCode"))throw new IOException("运行模块激活记录不匹配");
        return new JSONObject(new String(bytes,StandardCharsets.UTF_8));
    }
    static void requireValid(File dir,JSONObject outer,boolean deep)throws Exception{
        JSONObject metadata=checkedMetadata(dir,outer);JSONArray files=metadata.getJSONArray("files");if(files.length()<1||files.length()>2000)throw new IOException("运行资源清单数量异常");
        for(int i=0;i<files.length();i++){JSONObject row=files.getJSONObject(i);String name=safe(row.getString("path"));File file=new File(dir,name);
            if(!noLinks(dir,name))throw new IOException("运行资源包含链接："+name);
            if(!file.isFile())throw new IOException("运行资源缺失："+name);
            if(file.length()!=row.getLong("size")||(deep&&!sha(file).equals(row.getString("sha256"))))throw new IOException("运行资源损坏："+name);}
    }
    private static boolean valid(File dir,JSONObject outer,boolean deep){try{requireValid(dir,outer,deep);return true;}catch(Exception e){return false;}}
    static boolean valid(File dir,JSONObject outer){return valid(dir,outer,false);}
    /** Full integrity check for activation and launch, never for frequent status polling. */
    static boolean validDeep(File dir,JSONObject outer){return valid(dir,outer,true);}
}
