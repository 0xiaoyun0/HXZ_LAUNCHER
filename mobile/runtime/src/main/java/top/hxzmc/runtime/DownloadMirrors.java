package top.hxzmc.runtime;

import java.net.*;
import java.util.*;

/** Same-file routes maintained by this project's PC installer and download-node audit. */
public final class DownloadMirrors implements RuntimeDownloads.Mirrors {
    private static final String BMCL="https://bmclapi2.bangbang93.com";
    @Override public List<String> alternatives(String official)throws Exception {
        URI uri=new URI(official);List<String> result=new ArrayList<>();
        // Origin-issued queries and non-default endpoints are never sent to another operator.
        if(!"https".equals(uri.getScheme())||uri.getRawUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getPort()!=-1)return result;
        String path=uri.getRawPath();switch(uri.getHost()) {
            case "piston-meta.mojang.com":result.add("https://launchermeta.mojang.com"+path);result.add(BMCL+path);break;
            case "launchermeta.mojang.com":result.add("https://piston-meta.mojang.com"+path);result.add(BMCL+path);break;
            case "piston-data.mojang.com":result.add("https://launcher.mojang.com"+path);result.add(BMCL+path);break;
            case "launcher.mojang.com":result.add("https://piston-data.mojang.com"+path);result.add(BMCL+path);break;
            case "resources.download.minecraft.net":result.add(BMCL+"/assets"+path);break;
            case "libraries.minecraft.net":result.add(BMCL+"/maven"+path);central(result,path);break;
            case "repo.maven.apache.org":case "repo1.maven.org":if(path.startsWith("/maven2/"))central(result,path.substring(7));break;
            case "meta.fabricmc.net":result.add(BMCL+"/fabric-meta"+path);break;
            case "maven.fabricmc.net":result.add(BMCL+"/maven"+path);result.add("https://repo.spongepowered.org/repository/fabricmc-proxy"+path);break;
            case "maven.minecraftforge.net":result.add(BMCL+"/maven"+path);result.add("https://repo.spongepowered.org/repository/forge-proxy"+path);break;
            case "maven.neoforged.net":if(path.startsWith("/releases/")){result.add(BMCL+"/maven/"+path.substring(10));result.add("https://repo.spongepowered.org/repository/neoforge-releases/"+path.substring(10));}break;
            case "maven.quiltmc.org":if(path.startsWith("/repository/release/"))result.add("https://repo.spongepowered.org/repository/quiltmc/"+path.substring(20));break;
            default:break;
        }
        result.remove(official);return new ArrayList<>(new LinkedHashSet<>(result));
    }
    private static void central(List<String> result,String path) {
        for(String base:Arrays.asList("https://repo.maven.apache.org/maven2","https://repo1.maven.org/maven2",
                "https://maven.aliyun.com/repository/public","https://repo.huaweicloud.com/repository/maven",
                "https://mirrors.cloud.tencent.com/nexus/repository/maven-public",
                "https://maven-central.storage-download.googleapis.com/maven2","https://maven-central-eu.storage-download.googleapis.com/maven2",
                "https://maven-central-asia.storage-download.googleapis.com/maven2","https://repository.jboss.org/nexus/content/repositories/central",
                "https://repo.eclipse.org/repository/maven-central","https://repo.spongepowered.org/repository/maven-central",
                "https://repo.papermc.io/repository/maven-public","https://cache-redirector.jetbrains.com/repo.maven.apache.org/maven2",
                "https://repository.mulesoft.org/nexus/content/repositories/public","https://mirrors.163.com/maven/repository/maven-public",
                "https://repo.nju.edu.cn/maven","https://maven.proxy.ustclug.org/maven2","https://maven.reposilite.com/maven-central"))result.add(base+path);
    }
}
