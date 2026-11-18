package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.nio.file.*;

/** A version JSON is not an installation receipt. Written only after the full task succeeds. */
public final class AndroidInstallState {
    private final Path receipt,descriptor,jar;
    private final String identity;
    public AndroidInstallState(Path root,String version,String identity)throws IOException{
        if(!version.matches("[A-Za-z0-9._-]+"))throw new IOException("实例版本标识无效");
        this.identity=identity;descriptor=root.resolve("versions/"+version+"/"+version+".json");jar=descriptor.resolveSibling(version+".jar");
        receipt=root.resolve("updater/install-"+version+".json");IO.noLinks(receipt);IO.noLinks(descriptor);IO.noLinks(jar);
    }
    public boolean complete(){
        try{if(!Files.isRegularFile(receipt)||!Files.isRegularFile(descriptor)||!Files.isRegularFile(jar))return false;
            JsonObject done=IO.read(receipt);return identity.equals(IO.str(done,"identity",""))&&IO.hash(descriptor).equals(IO.str(done,"descriptorSha1",""))&&Files.size(jar)>0&&Files.size(jar)==done.get("jarSize").getAsLong();
        }catch(Exception e){return false;}
    }
    public void begin()throws IOException{Files.deleteIfExists(receipt);}
    public void finish()throws IOException{
        if(!Files.isRegularFile(descriptor)||!Files.isRegularFile(jar)||Files.size(jar)==0)throw new IOException("游戏本体尚未完整安装，请继续安装");
        JsonObject done=new JsonObject();done.addProperty("identity",identity);done.addProperty("descriptorSha1",IO.hash(descriptor));done.addProperty("jarSize",Files.size(jar));IO.write(receipt,done);
    }
}
