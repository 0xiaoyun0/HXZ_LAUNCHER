package up.hxz;

import java.net.*;
import java.util.*;

/** Equivalent public Maven artifacts. Keep private/signed URLs out of mirror expansion. */
public final class AndroidDownloadSources {
    private AndroidDownloadSources() {}
    public static List<String> expand(List<String> input) {
        LinkedHashSet<String> urls=new LinkedHashSet<>(input);
        String artifact=null;
        for(String url:input){artifact=artifactPath(url);if(artifact!=null)break;}
        if(artifact!=null)for(String base:Arrays.asList(
                "https://repo.maven.apache.org/maven2/",
                "https://repo1.maven.org/maven2/",
                "https://maven.aliyun.com/repository/central/",
                "https://repo.huaweicloud.com/repository/maven/",
                "https://bmclapi2.bangbang93.com/maven/")){
            if(urls.size()>=12)break;
            urls.add(base+artifact);
        }
        return new ArrayList<>(urls);
    }
    public static List<URL> candidates(String preferred,String original) {
        List<URL> result=new ArrayList<>();
        for(String raw:expand(Arrays.asList(preferred,original)))try{result.add(new URL(raw));}catch(MalformedURLException e){throw new IllegalArgumentException("下载地址无效",e);}
        return result;
    }
    static String artifactPath(String raw) {
        try{
            URI uri=new URI(raw);
            if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getPort()!=-1&&uri.getPort()!=443)return null;
            String host=uri.getHost().toLowerCase(Locale.ROOT),prefix;
            switch(host){
                case "maven.neoforged.net":prefix="/releases/";break;
                case "repo.maven.apache.org":case "repo1.maven.org":prefix="/maven2/";break;
                case "maven.aliyun.com":prefix="/repository/central/";break;
                case "repo.huaweicloud.com":prefix="/repository/maven/";break;
                case "bmclapi2.bangbang93.com":prefix="/maven/";break;
                case "libraries.minecraft.net":case "maven.minecraftforge.net":case "maven.fabricmc.net":prefix="/";break;
                default:return null;
            }
            String path=uri.getRawPath();if(!path.startsWith(prefix))return null;path=path.substring(prefix.length());
            if(path.contains("..")||!path.matches("(?:[A-Za-z0-9_.$+\\-]+/){3,}[A-Za-z0-9_.$+\\-]+\\.(?:jar|zip)"))return null;
            return path;
        }catch(URISyntaxException e){return null;}
    }
}
