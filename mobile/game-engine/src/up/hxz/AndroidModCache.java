package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.nio.file.*;

/** Metadata accelerator only. Downloads and native adapter activation still verify file contents. */
final class AndroidModCache {
    private final Path root, file;
    private JsonObject records = new JsonObject();
    AndroidModCache(Path root) throws IOException {
        this.root=root.toAbsolutePath().normalize();file=this.root.resolve("updater/android-compatibility/local-hashes.json");
        IO.noLinks(file);if(Files.isRegularFile(file))try{records=IO.read(file);}catch(Exception ignored){}
    }
    String hash(Path input)throws IOException {
        Path path=input.toAbsolutePath().normalize();IO.noLinks(path);
        if(!path.startsWith(root))throw new IOException("模组路径超出实例目录");
        String key=root.relativize(path).toString();long size=Files.size(path),modified=Files.getLastModifiedTime(path).toMillis();
        JsonObject old=records.has(key)&&records.get(key).isJsonObject()?records.getAsJsonObject(key):null;
        if(old!=null&&old.has("size")&&old.has("modified")&&old.get("size").getAsLong()==size&&old.get("modified").getAsLong()==modified){String hash=IO.str(old,"sha1","");if(hash.matches("[0-9a-f]{40}"))return hash;}
        String hash=IO.hash(path);JsonObject item=new JsonObject();item.addProperty("size",size);item.addProperty("modified",modified);item.addProperty("sha1",hash);records.add(key,item);return hash;
    }
    void save()throws IOException{IO.write(file,records);}
}
