package up.hxz;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.BooleanSupplier;

/** FCL verified files use the same resumable transfer engine as the desktop installer. */
public final class AndroidDownloads {
    public interface Observer { void update(long completed, long total, int received); }
    private static final Network network = new Network(15, 5, 32);
    private static final ThreadLocal<Observer> observer = new ThreadLocal<>();
    private static final ScheduledExecutorService cancellation = Executors.newSingleThreadScheduledExecutor(r -> {Thread thread=new Thread(r,"hxz-download-cancellation");thread.setDaemon(true);return thread;});
    private AndroidDownloads() {}
    static Observer currentObserver() { return observer.get(); }

    public static Path download(List<String> urls, Path cache, String sha1, Observer progress) throws Exception {
        return download(urls,cache,sha1,progress,()->false);
    }
    public static Path download(List<String> urls, Path cache, String sha1, Observer progress, BooleanSupplier cancelled) throws Exception {
        Files.createDirectories(cache);
        if(cancelled.getAsBoolean())throw new CancellationException("下载已取消");
        Thread owner=Thread.currentThread();Object guard=new Object();boolean[] closed={false};
        ScheduledFuture<?> watcher=cancellation.scheduleWithFixedDelay(()->{synchronized(guard){if(!closed[0]&&cancelled.getAsBoolean())network.cancelActive(owner);}},0,50,TimeUnit.MILLISECONDS);
        observer.set(progress);
        try {
            List<String> sources=AndroidDownloadSources.expand(urls);
            if(sources.isEmpty())throw new IOException("此文件没有可用的下载地址");
            String label=Paths.get(new java.net.URI(sources.get(0)).getPath()).getFileName().toString();
            try{Path ready=network.race(sources, cache, sha1, -1, label);if(cancelled.getAsBoolean()){Files.deleteIfExists(ready);throw new CancellationException("下载已取消");}return ready;}
            catch(NetworkFailure failure){
                LinkedHashSet<String> hosts=new LinkedHashSet<>();for(String url:sources)hosts.add(new java.net.URI(url).getHost());
                throw new NetworkFailure(label+" 下载暂未完成。已配置来源："+String.join("、",hosts)+"。已下载文件会保留，请继续安装；单个节点超时不代表手机断网。",failure);
            }
        } catch(Exception failure){if(cancelled.getAsBoolean())throw new CancellationException("下载已取消");throw failure;}
        finally { synchronized(guard){closed[0]=true;}watcher.cancel(false);observer.remove(); }
    }
}
