package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.util.*;

final class IO {
    static final Gson JSON=new GsonBuilder().disableHtmlEscaping().create();
    static final long MAX_JSON=32L*1024*1024;
    static JsonObject read(Path path)throws IOException{
        if(Files.size(path)>MAX_JSON)throw new IOException("元数据超过大小限制: "+path.getFileName());
        try(Reader r=Files.newBufferedReader(path,StandardCharsets.UTF_8)){return JsonParser.parseReader(r).getAsJsonObject();}
        catch(JsonParseException|IllegalStateException e){throw new IOException("无法读取 JSON: "+path.getFileName(),e);}
    }
    static void write(Path path,JsonObject value)throws IOException{
        Files.createDirectories(path.getParent());Path temp=Files.createTempFile(path.getParent(),".metadata-",".tmp");
        try{try(Writer writer=new BufferedWriter(new OutputStreamWriter(new FilterOutputStream(Files.newOutputStream(temp)){
            private long count;
            private void add(int n)throws IOException{if(count+n>MAX_JSON)throw new IOException("元数据超过大小限制: "+path.getFileName());count+=n;}
            @Override public void write(int b)throws IOException{add(1);out.write(b);}
            @Override public void write(byte[] b,int off,int len)throws IOException{add(len);out.write(b,off,len);}
        },StandardCharsets.UTF_8))){JSON.toJson(value,writer);}catch(JsonIOException e){throw new IOException("无法写入元数据: "+path.getFileName(),e);}move(temp,path);}finally{Files.deleteIfExists(temp);}
    }
    static void move(Path source,Path target)throws IOException{
        Files.createDirectories(target.getParent());
        try{Files.move(source,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
        catch(AtomicMoveNotSupportedException e){Files.move(source,target,StandardCopyOption.REPLACE_EXISTING);}
    }
    static String hash(Path path)throws IOException{
        MessageDigest d=digest();byte[] b=new byte[128*1024];try(InputStream in=Files.newInputStream(path)){int n;while((n=in.read(b))!=-1)d.update(b,0,n);}return hex(d.digest());
    }
    static MessageDigest digest(){try{return MessageDigest.getInstance("SHA-1");}catch(NoSuchAlgorithmException e){throw new AssertionError(e);}}
    static String hex(byte[] b){StringBuilder s=new StringBuilder(b.length*2);for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v&255));return s.toString();}
    static String str(JsonObject o,String key,String fallback){JsonElement v=o.get(key);return v==null||v.isJsonNull()?fallback:v.getAsString();}
    static int integer(JsonObject o,String key,int fallback,int min,int max){try{return Math.max(min,Math.min(max,o.has(key)?o.get(key).getAsInt():fallback));}catch(RuntimeException e){return fallback;}}
    static boolean bool(JsonObject o,String key,boolean fallback){return o.has(key)?o.get(key).getAsBoolean():fallback;}
    static JsonObject object(JsonObject o,String key){return o.has(key)&&o.get(key).isJsonObject()?o.getAsJsonObject(key):new JsonObject();}
    static void noLinks(Path path)throws IOException{
        Path cur=path.toAbsolutePath().getRoot();
        for(Path part:path.toAbsolutePath()){cur=cur.resolve(part);if(Files.exists(cur,LinkOption.NOFOLLOW_LINKS)){
            if(Files.isSymbolicLink(cur)||!cur.toRealPath().equals(cur.toAbsolutePath().normalize()))throw new IOException("不允许链接或重定向路径: "+cur);
        }}
    }
    static Path map(Path updater,String mapped,int maxLevel)throws IOException{
        String[] parts=mapped.split("/",-1);
        if(parts.length<2||!parts[0].matches("0|[1-9][0-9]?"))throw new IOException("无效数字映射路径: "+mapped);
        int level=Integer.parseInt(parts[0]);if(level>maxLevel)throw new IOException("映射层级超出配置允许范围: "+mapped);
        Path root=updater;for(int i=0;i<level;i++){root=root.getParent();if(root==null)throw new IOException("映射超出文件系统根目录");}
        Path result=root;
        for(int i=1;i<parts.length;i++){
            String p=parts[i];if(p.isEmpty()||p.equals(".")||p.equals("..")||p.matches(".*[\\\\:\\x00<>\"|?*\\r\\n].*")||p.endsWith(".")||p.endsWith(" ")||p.matches("(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\\..*)?"))throw new IOException("不安全路径: "+mapped);
            result=result.resolve(p);
        }
        result=result.toAbsolutePath().normalize();noLinks(result);return result;
    }
}
