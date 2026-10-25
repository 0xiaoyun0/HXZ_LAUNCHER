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
                case "maven.fabricmc.net":urls.add(bmcl+"/maven"+path);urls.add("https://repo.spongepowered.org/repository/fabricmc-proxy"+path);break;
                case "maven.minecraftforge.net":urls.add(bmcl+"/maven"+path);urls.add("https://repo.spongepowered.org/repository/forge-proxy"+path);break;
                case "maven.quiltmc.org":if(path.startsWith("/repository/release/"))urls.add("https://repo.spongepowered.org/repository/quiltmc/"+path.substring(20));break;
                case "maven.neoforged.net":if(path.startsWith("/releases/")){urls.add(bmcl+"/maven/"+path.substring(10));urls.add("https://repo.spongepowered.org/repository/neoforge-releases/"+path.substring(10));}break;
                case "meta.fabricmc.net":urls.add(bmcl+"/fabric-meta"+path);break;
                case "authlib-injector.yushi.moe":
                    java.util.regex.Matcher file=java.util.regex.Pattern.compile("^/artifact/\\d+/authlib-injector-(\\d+\\.\\d+\\.\\d+)\\.jar$").matcher(path);
                    if(file.matches()){String release="https://github.com/yushijinhun/authlib-injector/releases/download/v"+file.group(1)+"/authlib-injector-"+file.group(1)+".jar";urls.add(release);urls.add(bmcl+"/mirrors/authlib-injector"+path);urls.add("https://gh-proxy.com/"+release);urls.add("https://ghproxy.net/"+release);}break;
                case "cdn.modrinth.com":case "edge.forgecdn.net":case "mediafilez.forgecdn.net":urls.add("https://mod.mcimirror.top"+path);break;
                default:break;
            }
        }
        List<String> result=new ArrayList<>(urls);return result.size()>32?new ArrayList<>(result.subList(0,32)):result;
    }
    private static void addCentral(Set<String> urls,String path){
        urls.add("https://repo.maven.apache.org/maven2"+path);urls.add("https://repo1.maven.org/maven2"+path);
        urls.add("https://maven.aliyun.com/repository/public"+path);urls.add("https://repo.huaweicloud.com/repository/maven"+path);
        urls.add("https://mirrors.cloud.tencent.com/nexus/repository/maven-public"+path);
        urls.add("https://maven-central.storage-download.googleapis.com/maven2"+path);
        urls.add("https://maven-central-eu.storage-download.googleapis.com/maven2"+path);
        urls.add("https://maven-central-asia.storage-download.googleapis.com/maven2"+path);
        urls.add("https://repository.jboss.org/nexus/content/repositories/central"+path);
        urls.add("https://repo.eclipse.org/repository/maven-central"+path);
        urls.add("https://repo.spongepowered.org/repository/maven-central"+path);
        urls.add("https://repo.papermc.io/repository/maven-public"+path);
        urls.add("https://cache-redirector.jetbrains.com/repo.maven.apache.org/maven2"+path);
        urls.add("https://repository.mulesoft.org/nexus/content/repositories/public"+path);
        urls.add("https://mirrors.163.com/maven/repository/maven-public"+path);
        urls.add("https://repo.nju.edu.cn/maven"+path);
        urls.add("https://maven.proxy.ustclug.org/maven2"+path);
        urls.add("https://maven.reposilite.com/maven-central"+path);
    }
    public static List<URL> candidates(String preferred,String original) {
        boolean official=Boolean.parseBoolean(System.getProperty("hxz.launcher.official","true"));
        List<String> input=publicUri(original)==null?Collections.singletonList(original):official?Arrays.asList(original,preferred):Arrays.asList(preferred,original);
        List<URL> result=new ArrayList<>();
        for(String raw:expand(input))try{result.add(new URL(raw));}catch(MalformedURLException e){throw new IllegalArgumentException("下载地址无效",e);}
        return result;
    }
}
