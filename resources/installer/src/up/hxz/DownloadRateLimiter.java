package up.hxz;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Shared, interruptible byte budget for every HXZUP/installer worker in one JVM. */
final class DownloadRateLimiter {
    private long rate=Long.getLong("hxz.download.limitBytes",0L),updated=System.nanoTime(),lastRead;
    private double credit;
    private final Path config;
    private final ArrayDeque<Ticket> queue=new ArrayDeque<>();
    private static final class Ticket {long remaining;Ticket(long bytes){remaining=bytes;}}
    DownloadRateLimiter(){
        Path path=null;try{String raw=System.getProperty("hxz.download.limitFile64","");if(!raw.isEmpty())path=Paths.get(new String(Base64.getDecoder().decode(raw),StandardCharsets.UTF_8));}catch(Exception ignored){}
        config=path;rate=Math.max(0,Math.min(268435456L,rate));credit=rate*.1;
    }
    private void refresh(){
        long now=System.nanoTime();if(config==null||now-lastRead<500000000L)return;lastRead=now;
        try{if(Files.size(config)>1024)return;long next=IO.read(config).get("bytesPerSecond").getAsLong();next=Math.max(0,Math.min(268435456L,next));if(next!=rate){rate=next;credit=rate*.1;updated=now;notifyAll();}}catch(Exception ignored){}
    }
    synchronized long consume(int bytes,BooleanSupplier cancelled)throws InterruptedIOException{
        refresh();if(rate==0)return 0;
        long start=System.nanoTime();Ticket ticket=new Ticket(bytes);queue.add(ticket);
        try{
            while(ticket.remaining>0){
                if(Thread.currentThread().isInterrupted()||cancelled.getAsBoolean())throw new InterruptedIOException("下载已取消");
                refresh();if(rate==0)break;
                long now=System.nanoTime();credit=Math.min(rate*.1,credit+(now-updated)*rate/1000000000.0);updated=now;
                if(queue.peek()==ticket){long take=Math.min(ticket.remaining,(long)credit);ticket.remaining-=take;credit-=take;if(ticket.remaining==0)break;}
                try{wait(25);}catch(InterruptedException e){Thread.currentThread().interrupt();throw new InterruptedIOException("下载已取消");}
            }
        }finally{queue.remove(ticket);notifyAll();}
        return System.nanoTime()-start;
    }
}
