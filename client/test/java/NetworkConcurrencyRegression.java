package up.hxz;
import com.google.gson.*;
import java.io.*;import java.net.*;import java.nio.file.*;import java.util.concurrent.*;import java.util.concurrent.atomic.*;
public final class NetworkConcurrencyRegression {
 static CountDownLatch wave;static AtomicInteger active=new AtomicInteger(),peak=new AtomicInteger();
 public static void main(String[] args)throws Exception {
  URL.setURLStreamHandlerFactory(protocol->protocol.equals("http")?new URLStreamHandler(){protected URLConnection openConnection(URL url){return new HttpURLConnection(url){
   public void connect(){}public void disconnect(){}public boolean usingProxy(){return false;}
   public int getResponseCode()throws IOException{int count=active.incrementAndGet();peak.accumulateAndGet(count,Math::max);wave.countDown();try{if(!wave.await(3,TimeUnit.SECONDS))throw new IOException("Configured concurrency was capped: "+peak.get());}catch(InterruptedException e){Thread.currentThread().interrupt();throw new InterruptedIOException();}finally{active.decrementAndGet();}return 200;}
   public long getContentLengthLong(){return 1;}public InputStream getInputStream(){return new ByteArrayInputStream(new byte[]{42});}
  };}}:null);
  for(int limit:new int[]{64,128}){
   Path root=Files.createTempDirectory(Paths.get(args[0]),"java-parallel-");JsonObject config=new JsonObject();config.addProperty("gameDir",root.toString());if(limit!=64)config.addProperty("parallelDownloads",limit);
   GameInstaller installer=new GameInstaller(root.resolve("versions/fixture/updater"),config,new Network(1,0,8));
   JsonObject metadata=new JsonObject();JsonArray libraries=new JsonArray();String hash=IO.hex(IO.digest().digest(new byte[]{42}));
   for(int i=0;i<limit;i++){JsonObject lib=new JsonObject(),downloads=new JsonObject(),artifact=new JsonObject();lib.addProperty("name","test:resource"+i+":1");artifact.addProperty("url","http://fixture.invalid/resource"+i);artifact.addProperty("sha1",hash);artifact.addProperty("size",1);artifact.addProperty("path","test/resource"+i+".jar");downloads.add("artifact",artifact);lib.add("downloads",downloads);libraries.add(lib);}metadata.add("libraries",libraries);
   wave=new CountDownLatch(limit);active.set(0);peak.set(0);installer.libraries(metadata);if(peak.get()!=limit)throw new AssertionError("Actual parallelism "+peak.get()+" != "+limit);
   System.out.println("PASS actual Java library downloads: "+limit+" concurrent requests"+(limit==64?" (default)":""));
  }
 }
}
