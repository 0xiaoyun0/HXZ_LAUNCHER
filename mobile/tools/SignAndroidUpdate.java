import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.io.*;

/** java SignAndroidUpdate.java APK VERSION_CODE VERSION_NAME RELEASE_URL NOTES_FILE OUTPUT_JSON */
class SignAndroidUpdate {
    static String quote(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\r","\\r").replace("\n","\\n").replace("\t","\\t")+"\"";}
    public static void main(String[] args) throws Exception{
        if(args.length!=6)throw new IllegalArgumentException("APK VERSION_CODE VERSION_NAME RELEASE_URL NOTES_FILE OUTPUT_JSON required");
        char[] password=System.getenv("HXZ_ANDROID_STORE_PASSWORD").toCharArray();KeyStore keys=KeyStore.getInstance(new File(System.getenv("HXZ_ANDROID_KEYSTORE")),password);
        PrivateKey key=(PrivateKey)keys.getKey("hxz-community",password);Arrays.fill(password,'\0');
        MessageDigest hash=MessageDigest.getInstance("SHA-256");Path apk=Path.of(args[0]);
        try(InputStream in=Files.newInputStream(apk)){byte[] buf=new byte[32768];int n;while((n=in.read(buf))!=-1)hash.update(buf,0,n);}
        String digest=HexFormat.of().formatHex(hash.digest());
        String payload="{\"versionCode\":"+Long.parseLong(args[1])+",\"versionName\":"+quote(args[2])+",\"minSdk\":29,\"size\":"+Files.size(apk)+",\"sha256\":"+quote(digest)+",\"url\":"+quote(args[3])+",\"notes\":"+quote(Files.readString(Path.of(args[4])))+"}";
        byte[] data=payload.getBytes(StandardCharsets.UTF_8);Signature signing=Signature.getInstance("SHA256withRSA");signing.initSign(key);signing.update(data);byte[] signature=signing.sign();
        signing.initVerify(keys.getCertificate("hxz-community"));signing.update(data);if(!signing.verify(signature))throw new GeneralSecurityException("Signature self-check failed");
        Files.writeString(Path.of(args[5]),"{\"payload\":\""+Base64.getEncoder().encodeToString(data)+"\",\"signature\":\""+Base64.getEncoder().encodeToString(signature)+"\"}\n",StandardCharsets.UTF_8);
        System.out.println("Signed Android manifest: build "+args[1]+", SHA-256 "+digest);
    }
}
