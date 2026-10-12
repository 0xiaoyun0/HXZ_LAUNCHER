package up.hxz;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/** FCL verified files use the same resumable transfer engine as the desktop installer. */
public final class AndroidDownloads {
    public interface Observer { void update(long completed, long total, int received); }
    private static final Network network = new Network(15, 5, 32);
    private static final ThreadLocal<Observer> observer = new ThreadLocal<>();
    private AndroidDownloads() {}
    static Observer currentObserver() { return observer.get(); }

    public static Path download(List<String> urls, Path cache, String sha1, Observer progress) throws Exception {
        Files.createDirectories(cache);
        observer.set(progress);
        try {
            List<String> sources=AndroidDownloadSources.expand(urls);
            if(sources.isEmpty())throw new IOException("此文件没有可用的下载地址");
            String label=Paths.get(new java.net.URI(sources.get(0)).getPath()).getFileName().toString();
            try{return network.race(sources, cache, sha1, -1, label);}
            catch(NetworkFailure failure){
                LinkedHashSet<String> hosts=new LinkedHashSet<>();for(String url:sources)hosts.add(new java.net.URI(url).getHost());
                throw new NetworkFailure(label+" 下载暂未完成。已配置来源："+String.join("、",hosts)+"。已下载文件会保留，请继续安装；单个节点超时不代表手机断网。",failure);
            }
        }
        finally { observer.remove(); }
    }
}
