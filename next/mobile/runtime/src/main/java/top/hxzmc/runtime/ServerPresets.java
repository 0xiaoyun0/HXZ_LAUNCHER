package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.net.*;
import java.util.*;

/** Java equivalent of server/shared/server-presets.mjs; server remains authoritative. */
public final class ServerPresets {
    private ServerPresets() {}
    public static final List<String> IDS=Collections.unmodifiableList(Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2"));
    public static final class Preset {
        public final String id,group,name,version,loader,loaderVersion,address,profileSource,packageUrl,packageSha256;
        public final List<String> updateUrls;
        public final boolean enabled,autoUpdate,updateRequired,autoJoin,fabricAPI;
        private final JSONObject source;
        private Preset(JSONObject source)throws Exception {
            this.source=source;id=source.getString("id");group=source.getString("group");name=source.getString("name");version=source.getString("version");loader=source.getString("loader");
            loaderVersion=source.getString("loaderVersion");address=source.getString("address");profileSource=source.getString("profileSource");
            packageUrl=source.getString("packageUrl");packageSha256=source.getString("packageSha256");
            enabled=source.getBoolean("enabled");autoUpdate=source.getBoolean("autoUpdate");updateRequired=source.getBoolean("updateRequired");autoJoin=source.getBoolean("autoJoin");fabricAPI=source.getBoolean("fabricAPI");
            List<String> urls=new ArrayList<>();JSONArray a=source.getJSONArray("updateUrls");for(int i=0;i<a.length();i++)urls.add(a.getString(i));updateUrls=Collections.unmodifiableList(urls);
        }
        public JSONObject json()throws Exception{return new JSONObject(source.toString());}
        public JSONObject manualGameProfile()throws Exception {
            if(!profileSource.equals("manual"))throw new IOException("Game profile must come from selected update source or package");
            return new JSONObject().put("gameVersion",version).put("loader",new JSONObject().put("type",loader).put("version",loaderVersion)).put("fabricAPI",fabricAPI);
        }
    }
    public static List<Preset> defaults()throws Exception {
        JSONArray result=new JSONArray();String[] names={"原版生存群组服","模组一服","模组二服"},groups={"survival","mod-1","mod-2"},paths={"original","modv1","modv2"};
        for(int i=0;i<3;i++)result.put(new JSONObject().put("id",IDS.get(i)).put("group",groups[i]).put("name",names[i])
                .put("version",i==0?"26.2":"").put("loader",i==0?"fabric":"").put("loaderVersion","").put("address",i==0?"s1.hxzmc.top":"")
                .put("profileSource",i==0?"manual":"hxzup").put("updateUrls",new JSONArray().put("https://hxzup.1szt.com/"+paths[i]))
                .put("fabricAPI",i==0).put("autoUpdate",true).put("updateRequired",false).put("autoJoin",true).put("enabled",true).put("packageUrl","").put("packageSha256",""));
        return read(result);
    }
    public static List<Preset> read(JSONObject response)throws Exception {return read(response.getJSONArray("servers"));}
    public static List<Preset> read(JSONArray input)throws Exception {
        if(input.length()!=3)throw new IOException("Exactly three server presets are required");List<Preset> result=new ArrayList<>();Set<String> used=new HashSet<>();
        for(String id:IDS) {
            JSONObject found=null;
            for(int i=0;i<input.length();i++)if(id.equals(input.getJSONObject(i).optString("id"))){if(found!=null)throw new IOException("Duplicate preset");found=input.getJSONObject(i);}
            if(found==null||!used.add(id))throw new IOException("Missing preset: "+id);JSONObject value=new JSONObject().put("id",id).put("group",id.equals("HXZ-survival")?"survival":id.equals("HXZ-mod-1")?"mod-1":"mod-2");
            for(String key:Arrays.asList("name","version","loader","loaderVersion","address","profileSource","packageUrl","packageSha256")) {
                Object raw=found.get(key);if(!(raw instanceof String)||((String)raw).length()>2048)throw new IOException("Invalid preset field: "+key);value.put(key,((String)raw).trim());
            }
            String name=value.getString("name"),loader=value.getString("loader"),source=value.getString("profileSource"),address=value.getString("address");
            if(name.isEmpty()||name.length()>50||!Arrays.asList("manual","hxzup","package").contains(source)||!Arrays.asList("","fabric","quilt","forge","neoforge").contains(loader))throw new IOException("Invalid preset identity/loader/source");
            for(String key:Arrays.asList("version","loaderVersion"))if(!value.getString(key).isEmpty())RuntimeFiles.id(value.getString(key));
            if(!address.isEmpty()&&!address.matches("(?i)(?:[a-z0-9][a-z0-9.-]*|\\[[0-9a-f:]+])(?::\\d{1,5})?"))throw new IOException("Invalid server address");
            JSONArray urls=found.getJSONArray("updateUrls");if(urls.length()>16)throw new IOException("Too many update URLs");LinkedHashSet<String> normalized=new LinkedHashSet<>();
            for(int i=0;i<urls.length();i++)normalized.add(updateUrl(urls.getString(i)));value.put("updateUrls",new JSONArray(normalized));
            if(!value.getString("packageUrl").isEmpty())value.put("packageUrl",updateUrl(value.getString("packageUrl")));
            String digest=value.getString("packageSha256");if(!digest.isEmpty()&&!digest.matches("(?i)[a-f0-9]{64}"))throw new IOException("Invalid package SHA256");
            if(source.equals("package")&&(value.getString("packageUrl").isEmpty()||digest.isEmpty()))throw new IOException("Package requires URL and digest");
            if(source.equals("hxzup")&&normalized.isEmpty())throw new IOException("HXZUP source requires update URL");
            if(source.equals("manual")&&value.getString("version").isEmpty())throw new IOException("Manual source requires Minecraft version");
            for(String key:Arrays.asList("fabricAPI","autoUpdate","updateRequired","autoJoin","enabled"))value.put(key,Boolean.TRUE.equals(found.opt(key)));
            if(value.getBoolean("fabricAPI")&&!loader.equals("fabric"))throw new IOException("Fabric API requires Fabric");
            if(value.getBoolean("updateRequired")&&normalized.isEmpty())throw new IOException("Required update needs update URL");
            result.add(new Preset(value));
        }return Collections.unmodifiableList(result);
    }
    public static String updateUrl(String value)throws Exception {
        if(value==null||value.trim().isEmpty()||value.length()>2048)throw new IOException("Invalid update URL");
        URI uri=new URI(RuntimeDownloads.url(value.trim()));if(uri.getRawQuery()!=null)throw new IOException("Update base cannot contain query");
        return uri.toASCIIString().replaceAll("/+$","");
    }
}
