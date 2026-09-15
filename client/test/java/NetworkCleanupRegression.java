package up.hxz;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public final class NetworkCleanupRegression {
 static final CountDownLatch started=new CountDownLatch(1),release=new CountDownLatch(1);
 static final AtomicInteger stalledRequests=new AtomicInteger(), retries=new AtomicInteger();
 static final byte[] CONTENT="verified asset".getBytes(java.nio.charset.StandardCharsets.UTF_8);
 public static void main(String[] args)throws Exception {
  if(args.length>1&&args[1].equals("real")){
   Path dir=Files.createTempDirectory(Paths.get(args[0]),"real-asset-");
   String hash="923654dec2bcc9ff88bb6c4ffd99fcffaa9b4c2a";
   Path file=new Network(10,1,2).race(Arrays.asList("https://bmclapi2.bangbang93.com/assets/92/"+hash,"https://resources.download.minecraft.net/92/"+hash),dir,hash,-1);
   System.out.println("PASS actual reported asset SHA1 verified, bytes="+Files.size(file));Files.delete(file);return;
  }
  URL.setURLStreamHandlerFactory(protocol->protocol.equals("http")?new URLStreamHandler(){protected URLConnection openConnection(URL url){return new HttpURLConnection(url){
   public void connect(){} public boolean usingProxy(){return false;} public void disconnect(){}
   public int getResponseCode()throws IOException {
    if(url.getHost().equals("stalled.invalid")) {stalledRequests.incrementAndGet();started.countDown();boolean interrupted=false;while(true)try{release.await();break;}catch(InterruptedException e){interrupted=true;}if(interrupted)Thread.currentThread().interrupt();}
    else if(url.getHost().equals("fast.invalid"))try{started.await(200,TimeUnit.MILLISECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException(e);}
    if(url.getHost().equals("retry.invalid")&&retries.incrementAndGet()==1)return 503;
    return 200;
   }
   public long getContentLengthLong(){return CONTENT.length;}
   public InputStream getInputStream(){if(url.getHost().equals("cancel.invalid"))return new InputStream(){public int read(){Thread.currentThread().interrupt();return 1;}};
    return new ByteArrayInputStream(url.getHost().equals("corrupt.invalid")?new byte[CONTENT.length]:CONTENT);}
  };}}:null);
  Path dir=Files.createTempDirectory(Paths.get(args[0]),"network-cleanup-");
  try {
   String sha=IO.hex(IO.digest().digest(CONTENT));long start=System.nanoTime();
   Path file=new Network(1,0,2).race(args.length>1?Arrays.asList("http://fast.invalid/asset"):Arrays.asList("http://fast.invalid/asset","http://stalled.invalid/asset"),dir,sha,CONTENT.length);
   if(!Arrays.equals(Files.readAllBytes(file),CONTENT))throw new AssertionError("Verified winner lost");
   long millis=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start);
   if(millis>3000)throw new AssertionError("Completed asset blocked on unused mirror: "+millis);
   Files.delete(file);try(java.util.stream.Stream<Path> files=Files.list(dir)){if(files.findAny().isPresent())throw new AssertionError("Orphan partial files");}
   Path retried=new Network(1,1,2).race(Arrays.asList("http://retry.invalid/asset"),dir,sha,CONTENT.length);
   if(retries.get()!=2)throw new AssertionError("Transient error not retried");Files.delete(retried);
   Path fallback=new Network(1,0,2).race(Arrays.asList("http://corrupt.invalid/asset","http://fast.invalid/asset"),dir,sha,CONTENT.length);Files.delete(fallback);
   try{new Network(1,3,2).race(Arrays.asList("http://cancel.invalid/asset"),dir,sha,CONTENT.length);throw new AssertionError("Cancellation ignored");}
   catch(InterruptedIOException expected){if(!Thread.interrupted())throw new AssertionError("Lost interrupt");}
   try(java.util.stream.Stream<Path> files=Files.list(dir)){if(files.findAny().isPresent())throw new AssertionError("Failed source left partial file");}
   System.out.println("PASS retry, hash fallback and cancellation cleanup");
   System.out.println("PASS verified asset returns without waiting for unusable mirror; no partial files ("+millis+"ms)");
  } finally {release.countDown();}
 }
}
