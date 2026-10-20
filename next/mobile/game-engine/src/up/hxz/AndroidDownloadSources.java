package up.hxz;

import java.net.*;
import java.util.*;

/** Public, purpose-specific mirrors. No credentials, signed queries or guessed repositories. */
public final class AndroidDownloadSources {
    private AndroidDownloadSources() {}
    private static URI publicUri(String raw) {
        try {
            URI uri=new URI(raw);
            if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getPort()!=-1)return null;
            return uri;
        }catch(URISyntaxException e){return null;}
    }
    public static List<String> expand(List<String> input) {
        LinkedHashSet<String> urls=new LinkedHashSet<>(input);
        for(String raw:input){
            URI uri=publicUri(raw);if(uri==null)continue;
            String host=uri.getHost().toLowerCase(Locale.ROOT),path=uri.getRawPath(),bmcl="https://bmclapi2.bangbang93.com";
            switch(host){
                case "piston-meta.mojang.com":urls.add("https://launchermeta.mojang.com"+path);urls.add(bmcl+path);break;
                case "launchermeta.mojang.com":urls.add("https://piston-meta.mojang.com"+path);urls.add(bmcl+path);break;
                case "piston-data.mojang.com":urls.add("https://launcher.mojang.com"+path);urls.add(bmcl+path);break;
                case "launcher.mojang.com":urls.add("https://piston-data.mojang.com"+path);urls.add(bmcl+path);break;
                case "resources.download.minecraft.net":urls.add(bmcl+"/assets"+path);break;
                case "libraries.minecraft.net":
                    urls.add(bmcl+"/maven"+path);
                    addCentral(urls,path);break;
                case "repo.maven.apache.org":case "repo1.maven.org":
                    if(path.startsWith("/maven2/"))addCentral(urls,path.substring(7));break;
                case "maven.fabricmc.net":case "maven.minecraftforge.net":urls.add(bmcl+"/maven"+path);break;
                case "maven.neoforged.net":if(path.startsWith("/releases/"))urls.add(bmcl+"/maven/"+path.substring(10));break;
                case "meta.fabricmc.net":urls.add(bmcl+"/fabric-meta"+path);break;
                case "cdn.modrinth.com":case "edge.forgecdn.net":case "mediafilez.forgecdn.net":urls.add("https://mod.mcimirror.top"+path);break;
                default:break;
            }
        }
        List<String> result=new ArrayList<>(urls);return result.size()>12?new ArrayList<>(result.subList(0,12)):result;
    }
    private static void addCentral(Set<String> urls,String path){
        urls.add("https://repo.maven.apache.org/maven2"+path);urls.add("https://repo1.maven.org/maven2"+path);
        urls.add("https://maven.aliyun.com/repository/public"+path);urls.add("https://repo.huaweicloud.com/repository/maven"+path);
    }
    public static List<URL> candidates(String preferred,String original) {
        boolean official=Boolean.parseBoolean(System.getProperty("hxz.launcher.official","true"));
        List<String> input=publicUri(original)==null?Collections.singletonList(original):official?Arrays.asList(original,preferred):Arrays.asList(preferred,original);
        List<URL> result=new ArrayList<>();
        for(String raw:expand(input))try{result.add(new URL(raw));}catch(MalformedURLException e){throw new IllegalArgumentException("下载地址无效",e);}
        return result;
    }
}
