package top.hxzmc.runtime;
import java.io.File;import java.util.*;
public final class GameMemoryBudgetTest {
 static int checks;
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);checks++;}
 public static void main(String[] args){
  // Switching the feature off must retain the pre-switch automatic RAM budget.
  for(long available : new long[]{2048,4096,6144,8192}) {
   int before=(int)Math.max(512,Math.min(4096,available*45/100));
   int off=GameMemoryBudget.select(12288,available,16384,0,false,true);
   check(off<=before,"Disabled expansion inflated automatic heap: available="+available+" before="+before+" after="+off);
  }
  int physical=GameMemoryBudget.select(7366,2764,5341,0,false,true),expanded=GameMemoryBudget.select(7366,2764,5341,0,true,true);
  check(physical==1243,"Leave measured RAM for Android/native graphics");
  check(expanded==2267&&expanded>physical,"Opt-in swap adds at most 1 GiB on the reproduced tablet");
  check(GameMemoryBudget.select(7366,2764,0,0,true,true)==physical,"No swap cannot invent expansion capacity");
  check(GameMemoryBudget.select(7366,2764,200,0,true,true)==physical+100,"Only half of actual free swap is counted");
  check(GameMemoryBudget.select(7366,2764,20000,0,false,true)==physical,"Switch off ignores even abundant swap");
  check(GameMemoryBudget.select(3072,2048,20000,6144,true,true)==2048,"Swap allowance cannot exceed one quarter of physical memory");
  check(GameMemoryBudget.select(3072,1024,2048,6144,true,true)<=1280,"Low-end device cannot allocate the requested 6 GB blindly");
  check(GameMemoryBudget.select(16384,12000,20000,8192,true,true)==6144,"Absolute game heap ceiling");
  check(GameMemoryBudget.select(16384,12000,20000,0,true,true)==5120,"Automatic expansion adds at most 1 GiB to the 4 GiB baseline");
  check(GameMemoryBudget.select(16384,12000,20000,0,true,false)==2048,"Vanilla retains a modest heap");
  check(GameMemoryBudget.select(7366,2764,5341,1024,true,true)==1024,"Respect lower explicit memory setting");
  check(GameMemoryBudget.select(0,-1,-1,-1,true,true)==512,"Malformed counters remain bounded");
  for(long total:new long[]{1024,3072,7366,12288,16384})for(long available:new long[]{512,1024,2048,4096,8192}) {
   long measured=Math.min(total,available);
   int off=GameMemoryBudget.select(total,measured,0,0,false,true);
   int on=GameMemoryBudget.select(total,measured,16384,0,true,true);
   int offAgain=GameMemoryBudget.select(total,measured,16384,0,false,true);
   check(offAgain==off,"OFF ignores swap after an ON launch");
   check(off<=Math.max(512,Math.min(4096,measured*45/100)),"No expansion of the baseline while disabled");
   check(on>=off&&on-off<=1024,"Opt-in increment is explicit and bounded");
  }
  EngineHost.JavaJob old=new EngineHost.JavaJob(21,"fixture.Main",new File("."),Collections.emptyList(),Arrays.asList("-Xmx1200M","-Dfixture=true","-XX:MaxHeapSize=1024m"),Arrays.asList("--accessToken","fixture-token"));
  EngineHost.JavaJob next=GameMemoryBudget.apply(old,expanded);
  check(next.jvmArguments.equals(Arrays.asList("-Xmx2267M","-Dfixture=true")),"Replace stale pre-installation heap without duplicate maxima");
  check(next.arguments.equals(old.arguments)&&next.classpath.equals(old.classpath)&&old.jvmArguments.size()==3,"Preserve immutable auth arguments and installation plan");
  EngineHost.JavaJob offAgain=GameMemoryBudget.apply(next,physical);
  check(offAgain.jvmArguments.equals(Arrays.asList("-Xmx1243M","-Dfixture=true")),"ON then OFF replaces the expanded JVM maximum");
  System.out.println("PASS game memory budget "+checks+" checks");
 }
}
