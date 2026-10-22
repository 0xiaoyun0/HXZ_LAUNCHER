package top.hxzmc.runtime;

import java.util.*;

/** Heap ceiling only; Android decides which pages, if any, are swapped out. */
public final class GameMemoryBudget {
    private GameMemoryBudget() {}
    public static int select(long totalMiB,long availableMiB,long swapFreeMiB,int requestedMiB,boolean expanded,boolean modded) {
        long total=Math.max(512,totalMiB),available=Math.max(0,Math.min(total,availableMiB));
        long reserve=Math.max(768,Math.min(1536,total/8));
        // Swap is not extra RAM: zRAM itself consumes RAM. Count only a bounded
        // fraction of free swap, never the advertised storage expansion size.
        long allowance=expanded?Math.min(1024,Math.min(total/4,Math.max(0,swapFreeMiB)/2)):0;
        long ceiling=Math.max(512,Math.min(6144,Math.max(0,available-reserve)+allowance));
        long automatic=modded?Math.max(2048,Math.min(6144,total*45/100)):total>=6144?2048:total>=4096?1536:1024;
        return (int)Math.min(ceiling,requestedMiB>0?Math.max(512,requestedMiB):automatic);
    }
    public static EngineHost.JavaJob apply(EngineHost.JavaJob job,int heapMiB) {
        List<String> jvm=new ArrayList<>();
        for(String value:job.jvmArguments)if(!value.startsWith("-Xmx")&&!value.startsWith("-XX:MaxHeapSize="))jvm.add(value);
        jvm.add(0,"-Xmx"+Math.max(512,Math.min(6144,heapMiB))+"M");
        return new EngineHost.JavaJob(job.javaMajor,job.mainClass,job.workingDirectory,job.classpath,jvm,job.arguments);
    }
}
