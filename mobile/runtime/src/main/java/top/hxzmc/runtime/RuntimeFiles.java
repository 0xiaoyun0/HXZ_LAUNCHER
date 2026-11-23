package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;

/** Shared file confinement and integrity operations; no symlink traversal. */
public final class RuntimeFiles {
    private RuntimeFiles() {}
    public static File inside(File root, String relative) throws IOException {
        if(relative==null || relative.isEmpty() || relative.indexOf('\\')>=0 || relative.indexOf('\0')>=0
                || relative.startsWith("/") || relative.matches("^[A-Za-z]:.*")) throw new IOException("Invalid relative path");
        for(String part:relative.split("/",-1)) if(part.isEmpty() || part.equals(".") || part.equals("..") || part.indexOf(':')>=0)
            throw new IOException("Invalid path component: "+relative);
        File absolute=root.getAbsoluteFile(); File target=new File(absolute,relative);
        noLinks(absolute); noLinks(target);
        if(!target.getCanonicalPath().startsWith(absolute.getCanonicalPath()+File.separator)) throw new IOException("Path escapes root");
        return target;
    }
    public static void noLinks(File file) throws IOException {
        for(Path p=file.toPath().toAbsolutePath();p!=null;p=p.getParent())
            if(Files.isSymbolicLink(p)) throw new IOException("Symbolic link not permitted: "+p);
    }
    public static String hash(File file,String algorithm) throws Exception {
        noLinks(file); MessageDigest digest=MessageDigest.getInstance(algorithm);
        try(InputStream in=new FileInputStream(file)) { byte[] b=new byte[131072]; int n; while((n=in.read(b))!=-1) digest.update(b,0,n); }
        StringBuilder result=new StringBuilder(); for(byte b:digest.digest()) result.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
        return result.toString();
    }
    public static JSONObject json(File file) throws Exception {
        noLinks(file); if(!file.isFile() || file.length()>8*1024*1024) throw new IOException("Missing/oversized metadata: "+file);
        return new JSONObject(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8));
    }
    public static void writeJson(File file,JSONObject value) throws Exception {
        noLinks(file); Files.createDirectories(file.getParentFile().toPath());
        File temp=File.createTempFile(".metadata-",".tmp",file.getParentFile());
        try { Files.write(temp.toPath(),value.toString(2).getBytes(StandardCharsets.UTF_8)); replace(temp,file); }
        finally { Files.deleteIfExists(temp.toPath()); }
    }
    public static void replace(File from,File to) throws IOException {
        noLinks(to);
        try { Files.move(from.toPath(),to.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); }
        catch(AtomicMoveNotSupportedException e) { Files.move(from.toPath(),to.toPath(),StandardCopyOption.REPLACE_EXISTING); }
    }
    public static String maven(String name) throws IOException {
        String[] ext=name.split("@",-1); if(ext.length>2) throw new IOException("Invalid Maven coordinate");
        String suffix=ext.length==2?ext[1]:"jar"; String[] p=ext[0].split(":",-1);
        if(p.length<3 || p.length>4 || !suffix.matches("[A-Za-z0-9]+")) throw new IOException("Invalid Maven coordinate: "+name);
        for(String part:p) if(!part.matches("[A-Za-z0-9_.+\\-]+") || part.equals(".") || part.equals("..")) throw new IOException("Invalid Maven coordinate: "+name);
        return p[0].replace('.','/')+"/"+p[1]+"/"+p[2]+"/"+p[1]+"-"+p[2]+(p.length==4?"-"+p[3]:"")+"."+suffix;
    }
    public static void id(String id) throws IOException { if(id==null || !id.matches("[A-Za-z0-9_.+\\-]{1,100}") || id.equals(".") || id.equals("..")) throw new IOException("Invalid version id"); }
}
