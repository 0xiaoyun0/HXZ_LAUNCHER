package up.hxz;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Isolated replay of an unreachable NeoForge Maven endpoint; no public network calls. */
public final class AndroidMavenFallbackCheck {
    private static final byte[] BODY="verified-nashorn-fixture".getBytes(StandardCharsets.UTF_8);
    private static final List<String> attempts=new ArrayList<>();
    private static final String PATH="org/openjdk/nashorn/nashorn-core/15.4/nashorn-core-15.4.jar";
    public static void main(String[] args)throws Exception {
        System.setProperty("hxz.download.retryMillis","1");
        URL.setURLStreamHandlerFactory(protocol->protocol.equals("https")||protocol.equals("http")?new URLStreamHandler(){
            protected URLConnection openConnection(URL url){return new HttpURLConnection(url){
                public void connect(){}public void disconnect(){}public boolean usingProxy(){return false;}
                public int getResponseCode()throws IOException{attempts.add(url.getHost());if(url.getHost().equals("maven.neoforged.net"))throw new SocketTimeoutException("failed to connect to maven.neoforged.net IPv6 after 6000ms");if(url.getHost().equals("repo.maven.apache.org")&&url.getPath().equals("/maven2/"+PATH))return 200;return 404;}
                public long getContentLengthLong(){return BODY.length;}
                public InputStream getInputStream(){return new ByteArrayInputStream(BODY);}
            };}
        }:null);
        Path downloaded=AndroidDownloads.download(Collections.singletonList("https://maven.neoforged.net/releases/"+PATH),Paths.get(args[0]),IO.hex(IO.digest().digest(BODY)),null);
        if(!Arrays.equals(BODY,Files.readAllBytes(downloaded)))throw new AssertionError("Fallback file changed");
        if(!attempts.contains("repo.maven.apache.org"))throw new AssertionError("Missing verified Maven Central fallback");
        if(Collections.frequency(attempts,"maven.neoforged.net")>5)throw new AssertionError("Did not leave failed source after five attempts");
        System.out.println("PASS original IPv6 timeout -> Maven Central -> identical verified library; "+attempts.size()+" attempts");
    }
}
