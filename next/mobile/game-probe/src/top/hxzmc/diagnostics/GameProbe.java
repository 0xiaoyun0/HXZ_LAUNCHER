package top.hxzmc.diagnostics;

import java.io.*;
import java.lang.instrument.Instrumentation;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Runs inside HotSpot, never Android ART. Captures stacks only when the player requests them. */
public final class GameProbe {
    public static void premain(String ignored, Instrumentation instrumentation) {
        String location=System.getProperty("hxz.diagnosticDir","");if(location.isEmpty())return;
        final Path directory=Paths.get(location),request=directory.resolve("thread-request"),result=directory.resolve("threads.txt");
        Thread watcher=new Thread(()->{
            while(true)try {
                Thread.sleep(1000);
                if(!Files.isRegularFile(request)||Files.size(request)>80)continue;
                String nonce=new String(Files.readAllBytes(request),StandardCharsets.US_ASCII).trim();Files.deleteIfExists(request);
                if(!nonce.matches("[a-zA-Z0-9-]{16,64}"))continue;
                StringBuilder out=new StringBuilder(nonce).append('\n');
                for(int sample=1;sample<=2;sample++){
                    Runtime runtime=Runtime.getRuntime();out.append("JVM 线程快照 ").append(sample).append(" · ").append(System.currentTimeMillis()).append("\n堆内存 MiB: used=").append((runtime.totalMemory()-runtime.freeMemory())/1048576).append(" max=").append(runtime.maxMemory()/1048576).append('\n');
                    List<Map.Entry<Thread,StackTraceElement[]>> entries=new ArrayList<>(Thread.getAllStackTraces().entrySet());
                    entries.sort(Comparator.comparing(e->e.getKey().getName()));int count=0;
                    for(Map.Entry<Thread,StackTraceElement[]> entry:entries){if(count++>=100||out.length()>100000)break;Thread thread=entry.getKey();out.append('"').append(thread.getName()).append("\" ").append(thread.getState()).append('\n');StackTraceElement[] stack=entry.getValue();for(int i=0;i<Math.min(24,stack.length);i++)out.append("  at ").append(stack[i]).append('\n');}
                    if(sample==1)Thread.sleep(800);
                }
                Path temporary=Files.createTempFile(directory,"threads-",".tmp");
                try{Files.write(temporary,out.toString().getBytes(StandardCharsets.UTF_8));Files.move(temporary,result,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temporary);}
            }catch(InterruptedException ended){return;}catch(Exception ignoredFailure){/* Diagnostic failure must never stop the game. */}
        },"HXZ on-demand diagnostics");watcher.setDaemon(true);watcher.start();
    }
}
