package top.hxzmc.diagnostics;

import java.lang.instrument.Instrumentation;
import java.lang.management.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Runs in the game's HotSpot VM. No continuous profiling or automatic game termination. */
public final class GameProbe {
    private static final int SAMPLE_BYTES=56000,MAX_THREADS=100;
    public static void premain(String ignored, Instrumentation instrumentation) {
        String location=System.getProperty("hxz.diagnosticDir","");if(location.isEmpty())return;
        final Path directory=Paths.get(location),request=directory.resolve("thread-request"),result=directory.resolve("threads.txt");
        Thread watcher=new Thread(()->{
            while(true)try {
                Thread.sleep(1000);
                if(!Files.isRegularFile(request)||Files.size(request)>80)continue;
                String[] requested=new String(Files.readAllBytes(request),StandardCharsets.US_ASCII).trim().split("\\n",-1);Files.deleteIfExists(request);
                String nonce=requested[0].trim();
                if(!nonce.matches("[a-zA-Z0-9-]{16,64}"))continue;
                StringBuilder out=new StringBuilder(nonce).append('\n');
                // Only inspect a loader after the host has observed its broken-state log. Never initialize it ourselves.
                if(requested.length==2&&requested[1].equals("loader-errors"))out.append(loaderErrors(instrumentation));
                for(int sample=1;sample<=2;sample++){
                    out.append(snapshot(sample));
                    if(sample==1)Thread.sleep(800);
                }
                Path temporary=Files.createTempFile(directory,"threads-",".tmp");
                try{Files.write(temporary,out.toString().getBytes(StandardCharsets.UTF_8));Files.move(temporary,result,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temporary);}
            }catch(InterruptedException ended){return;}catch(Exception|LinkageError ignoredFailure){/* Diagnostics must never stop the game. */}
        },"HXZ on-demand diagnostics");watcher.setDaemon(true);watcher.start();
    }

    private static String loaderErrors(Instrumentation instrumentation) {
        try {
            Class<?> loader=null;
            for(Class<?> type:instrumentation.getAllLoadedClasses())if(type.getName().equals("net.neoforged.fml.ModLoader")){loader=type;break;}
            if(loader==null)return "";
            Object value=loader.getMethod("getLoadingErrors").invoke(null);if(!(value instanceof List))return "";
            StringBuilder out=new StringBuilder();int count=0;
            for(Object issue:(List<?>)value){
                if(issue==null||count++>=6||out.length()>4000)break;
                if(out.length()==0)out.append("模组加载错误（加载器保留的原始原因）:\n");
                Class<?> type=issue.getClass();out.append(count).append(". ").append(evidenceLine(String.valueOf(type.getMethod("translationKey").invoke(issue)),220)).append('\n');
                Object mod=type.getMethod("affectedMod").invoke(issue);
                if(mod!=null)try{Class<?> api=loader.getClassLoader().loadClass("net.neoforged.neoforgespi.language.IModInfo");out.append("  模组: ").append(evidenceLine(String.valueOf(api.getMethod("getModId").invoke(mod)),180)).append('\n');}catch(ReflectiveOperationException ignored){}
                Object path=type.getMethod("affectedPath").invoke(issue);if(path instanceof Path)out.append("  文件: ").append(evidenceLine(path.toString(),350)).append('\n');
                Object args=type.getMethod("translationArgs").invoke(issue);
                if(args instanceof List){int argCount=0;for(Object arg:(List<?>)args){if(argCount++>=8)break;if(arg instanceof String||arg instanceof Number)out.append("  参数: ").append(evidenceLine(String.valueOf(arg),300)).append('\n');}}
                Object cause=type.getMethod("cause").invoke(issue);Set<Throwable> seen=Collections.newSetFromMap(new IdentityHashMap<Throwable,Boolean>());int depth=0;
                while(cause instanceof Throwable&&seen.add((Throwable)cause)&&depth++<6&&out.length()<5000){
                    Throwable error=(Throwable)cause;out.append("  Caused by: ").append(evidenceLine(error.toString(),480)).append('\n');
                    StackTraceElement[] frames=error.getStackTrace();for(int i=0;i<Math.min(3,frames.length);i++)out.append("    at ").append(clean(frames[i].toString(),220)).append('\n');cause=error.getCause();
                }
            }
            // Bound this independently of the two 56 KB thread snapshots and the host's 140 KB reader.
            return out.length()>6000?out.substring(0,out.lastIndexOf("\n",5999)+1)+"\n":out.append('\n').toString();
        }catch(ReflectiveOperationException|RuntimeException|LinkageError unavailable){return "模组加载错误记录暂不可读；请保留启动日志。\n\n";}
    }

    private static String evidenceLine(String value,int limit){if(value==null)return "";return value.length()>limit?"[内容过长，整行省略]":clean(value,limit);}

    private static String snapshot(int sample) {
        List<Entry> entries=new ArrayList<>();
        for(Map.Entry<Thread,StackTraceElement[]> item:Thread.getAllStackTraces().entrySet())entries.add(new Entry(item.getKey(),item.getValue()));
        Map<Long,ThreadInfo> info=new HashMap<>();Set<Long> deadlocked=new HashSet<>();String management="锁与 CPU 信息暂不可用";ThreadMXBean bean=null;
        try {
            bean=ManagementFactory.getThreadMXBean();
            for(ThreadInfo value:bean.dumpAllThreads(false,false))if(value!=null)info.put(value.getThreadId(),value);
            long[] cycle=bean.isSynchronizerUsageSupported()?bean.findDeadlockedThreads():bean.findMonitorDeadlockedThreads();
            if(cycle!=null)for(long id:cycle)deadlocked.add(id);
            management=deadlocked.isEmpty()?"JVM 未检测到 Java 锁循环；不能排除原生调用或其他等待":"JVM 检测到 Java 锁循环，线程 ID: "+deadlocked;
        }catch(RuntimeException|LinkageError unavailable){bean=null;}
        final Set<Long> important=new HashSet<>(deadlocked);
        for(Entry entry:entries)if(entry.rank()<=1)important.add(entry.id);
        // Keep owners of locks awaited by key threads, even when their names are ordinary worker names.
        for(int depth=0;depth<4;depth++)for(Entry entry:entries)if(important.contains(entry.id)){ThreadInfo value=info.get(entry.id);if(value!=null&&value.getLockOwnerId()>0)important.add(value.getLockOwnerId());}
        entries.sort(Comparator.comparingInt((Entry entry)->entry.name.equals("Render thread")?0:entry.name.equals("main")?1:deadlocked.contains(entry.id)?2:important.contains(entry.id)?3:entry.rank()+4).thenComparing(entry->entry.name).thenComparingLong(entry->entry.id));
        Runtime runtime=Runtime.getRuntime();StringBuilder out=new StringBuilder("JVM 线程快照 ").append(sample).append(" · ").append(System.currentTimeMillis()).append('\n');
        out.append("堆内存 MiB: used=").append((runtime.totalMemory()-runtime.freeMemory())/1048576).append(" max=").append(runtime.maxMemory()/1048576).append('\n');
        out.append("线程总数: ").append(entries.size()).append(" · 关键线程优先；两次停在同处不等同于死锁\n").append(management).append('\n');
        int bytes=out.toString().getBytes(StandardCharsets.UTF_8).length,count=0;
        for(Entry entry:entries) {
            if(count>=MAX_THREADS)break;
            StringBuilder block=new StringBuilder("\"").append(clean(entry.name,160)).append("\" #").append(entry.id).append(' ').append(entry.state).append('\n');
            ThreadInfo value=info.get(entry.id);
            if(value!=null){
                if(value.getLockName()!=null)block.append("  等待锁: ").append(clean(value.getLockName(),180)).append('\n');
                if(value.getLockOwnerId()>0)block.append("  锁持有者: \"").append(clean(value.getLockOwnerName(),160)).append("\" #").append(value.getLockOwnerId()).append('\n');
                if(value.isInNative())block.append("  位于原生调用\n");
            }
            if(bean!=null)try{if(bean.isThreadCpuTimeSupported()&&bean.isThreadCpuTimeEnabled()){long cpu=bean.getThreadCpuTime(entry.id);if(cpu>=0)block.append("  累计 CPU ms: ").append(cpu/1000000).append('\n');}}catch(RuntimeException ignored){}
            int frames=Math.min(important.contains(entry.id)||entry.rank()<=2?40:12,entry.stack.length);
            for(int i=0;i<frames;i++)block.append("  at ").append(clean(entry.stack[i].toString(),400)).append('\n');
            if(entry.stack.length>frames)block.append("  …其余 ").append(entry.stack.length-frames).append(" 帧省略\n");
            String text=block.toString();int size=text.getBytes(StandardCharsets.UTF_8).length;
            if(bytes+size>SAMPLE_BYTES)break;
            out.append(text);bytes+=size;count++;
        }
        out.append("本次快照已记录 ").append(count).append('/').append(entries.size()).append(" 个线程，普通线程按字节上限省略\n\n");
        return out.toString();
    }

    private static String clean(String value,int limit){if(value==null)return "";String safe=value.replace('\n',' ').replace('\r',' ').replace('\t',' ');return safe.length()<=limit?safe:safe.substring(0,limit)+"…";}
    private static final class Entry {
        final long id;final String name;final Thread.State state;final StackTraceElement[] stack;
        Entry(Thread thread,StackTraceElement[] stack){id=thread.getId();name=thread.getName();state=thread.getState();this.stack=stack;}
        int rank(){
            String lower=name.toLowerCase(Locale.ROOT);
            if(lower.equals("render thread")||lower.equals("main"))return 0;
            if(lower.contains("modload")||lower.contains("mod load")||lower.contains("mod-loading")||lower.contains("modloading")||lower.contains("loading-worker"))return 1;
            if(state==Thread.State.BLOCKED)return 2;
            for(StackTraceElement frame:stack){String type=frame.getClassName();if(type.startsWith("net.neoforged.fml.")||type.startsWith("net.minecraftforge.fml.")||type.startsWith("org.spongepowered.asm.mixin.")||frame.getMethodName().equals("<clinit>"))return 2;}
            return state==Thread.State.RUNNABLE&&!name.startsWith("HXZ ")?3:8;
        }
    }
}
