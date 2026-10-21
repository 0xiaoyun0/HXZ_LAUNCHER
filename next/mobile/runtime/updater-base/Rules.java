package up.hxz;

import com.google.gson.*;
import java.util.*;

final class Rules {
    final JsonObject global,directories,files,policies;
    Rules(JsonObject data){JsonObject rules=IO.object(data,"rules");global=IO.object(rules,"global");directories=IO.object(rules,"directory");files=IO.object(rules,"file");policies=IO.object(data,"policies");}
    boolean modern(){return policies.has("global");}
    JsonObject policy(String path){JsonObject found=IO.object(policies,"global");int longest=0;for(Map.Entry<String,JsonElement> entry:IO.object(policies,"directory").entrySet()){String key=entry.getKey();if((path.startsWith(key)||(path+"/").equals(key))&&key.length()>longest){found=entry.getValue().getAsJsonObject();longest=key.length();}}JsonObject exact=IO.object(policies,"file");return exact.has(path)?exact.getAsJsonObject(path):found;}
    String directory(String path){String found=IO.str(global,"directory","permissive");int longest=0;for(Map.Entry<String,JsonElement> r:directories.entrySet()){String key=r.getKey();if((path.startsWith(key)||(path+"/").equals(key))&&key.length()>longest){found=IO.str(r.getValue().getAsJsonObject(),"behavior",found);longest=key.length();}}return found;}
    String file(String path,JsonObject entry){
        if(entry.has("action"))return entry.get("action").getAsString();
        if(files.has(path))return IO.str(files.getAsJsonObject(path),"behavior","check_and_overwrite");
        String behavior=directory(path);switch(behavior){case "strict":case "permissive":return IO.str(global,"file","check_and_overwrite");case "additive":return "add_if_missing";default:return behavior;}
    }
}
