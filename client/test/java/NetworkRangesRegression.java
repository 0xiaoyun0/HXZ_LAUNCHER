package up.hxz;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.*;

public final class NetworkRangesRegression {
 public static void main(String[] args)throws Exception{
  byte[] data=new byte[16*1024*1024];for(int i=0;i<data.length;i++)data[i]=(byte)(i%251);
  AtomicInteger ranged=new AtomicInteger(),full=new AtomicInteger();
  URL.setURLStreamHandlerFactory(p->p.equals("http")?new URLStreamHandler(){protected URLConnection openConnection(URL u){return new HttpURLConnection(u){
   int start=0,end=data.length-1;boolean range;
   public void connect(){}public void disconnect(){}public boolean usingProxy(){return false;}
   public int getResponseCode(){String header=getRequestProperty("Range");range=header!=null;if(range){String[] values=header.substring(6).split("-");start=Integer.parseInt(values[0]);end=Integer.parseInt(values[1]);}return range?206:200;}
   public String getHeaderField(String name){return name.equals("Content-Range")?"bytes "+start+"-"+end+"/"+data.length:null;}
   public long getContentLengthLong(){return end-start+1;}
   public InputStream getInputStream(){if(range)ranged.incrementAndGet();else full.incrementAndGet();return new ByteArrayInputStream(range&&u.getHost().equals("corrupt.invalid")?new byte[end-start+1]:Arrays.copyOfRange(data,start,end+1));}
  };}}:null);
  Path dir=Files.createTempDirectory(Paths.get(args[0]),"network-ranges-");String sha=IO.hex(IO.digest().digest(data));
  Path a=new Network(1,0,8).race(Arrays.asList("http://valid.invalid/file"),dir,sha,data.length);if(!Arrays.equals(data,Files.readAllBytes(a))||ranged.get()!=4||full.get()!=0)throw new AssertionError("Ranges not verified");Files.delete(a);
  Path b=new Network(1,0,8).race(Arrays.asList("http://corrupt.invalid/file"),dir,sha,data.length);if(!Arrays.equals(data,Files.readAllBytes(b))||full.get()!=1)throw new AssertionError("Corrupt merge not replaced");Files.delete(b);
  try(java.util.stream.Stream<Path> files=Files.list(dir)){if(files.findAny().isPresent())throw new AssertionError("Range staging remains");}Files.delete(dir);System.out.println("PASS four verified ranges and corrupt-merge fallback, no staging remains");
 }
}
