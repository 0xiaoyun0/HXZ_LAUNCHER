package up.hxz;
import com.google.gson.*;
import java.util.*;

/** Desktop mappings are projected into one private Android game root. */
final class AndroidPaths {
    static boolean supported(String path){
        if(!path.startsWith("1/")&&!path.startsWith("3/"))return false;
        String first=path.substring(2).split("/",-1)[0];
        return !Arrays.asList("libraries","assets","versions","saves","screenshots","updater","hxz-game-profile.json").contains(first)&&!first.startsWith(".hxz-");
    }
    static JsonArray manifest(JsonArray entries){
        Set<String> local=new HashSet<>();
        for(JsonElement item:entries){String path=IO.str(item.getAsJsonObject(),"path","");if(path.startsWith("1/")&&supported(path))local.add(path.substring(2));}
        JsonArray result=new JsonArray();
        for(JsonElement item:entries){String path=IO.str(item.getAsJsonObject(),"path","");if(supported(path)&&(!path.startsWith("3/")||!local.contains(path.substring(2))))result.add(item);}
        return result;
    }
    static JsonObject rules(JsonObject input){
        JsonObject result=input.deepCopy();
        for(String format:Arrays.asList("rules","policies"))for(String kind:Arrays.asList("directory","file")){
            JsonObject entries=IO.object(IO.object(result,format),kind);
            for(String key:new ArrayList<>(entries.keySet()))if(!supported(key))entries.remove(key);
        }
        return result;
    }
}
