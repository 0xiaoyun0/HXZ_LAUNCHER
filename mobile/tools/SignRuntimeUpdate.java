import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.io.*;

/** Sign the packager's exact UTF-8 runtime payload with the community APK identity. */
class SignRuntimeUpdate {
    public static void main(String[] args) throws Exception {
        if(args.length!=2)throw new IllegalArgumentException("UNSIGNED_PAYLOAD OUTPUT_JSON required");
        byte[] payload=Files.readAllBytes(Path.of(args[0]));
        if(payload.length==0||payload.length>128*1024)throw new IOException("Unexpected runtime payload size");
        String json=new String(payload,StandardCharsets.UTF_8);
        if(!json.contains("\"android-runtime-module\"")||!json.contains("\"moduleSha256\"")||!json.contains("\"top.hxzmc.community\""))throw new IOException("Not a runtime module payload");
        char[] password=System.getenv("HXZ_ANDROID_STORE_PASSWORD").toCharArray();
        KeyStore keys;
        PrivateKey key;
        try {
            keys=KeyStore.getInstance(new File(System.getenv("HXZ_ANDROID_KEYSTORE")),password);
            key=(PrivateKey)keys.getKey("hxz-community",password);
        } finally {Arrays.fill(password,'\0');}
        Signature signing=Signature.getInstance("SHA256withRSA");signing.initSign(key);signing.update(payload);
        byte[] signature=signing.sign();signing.initVerify(keys.getCertificate("hxz-community"));signing.update(payload);
        if(!signing.verify(signature))throw new GeneralSecurityException("Runtime signature self-check failed");
        Files.writeString(Path.of(args[1]),"{\"payload\":\""+Base64.getEncoder().encodeToString(payload)+"\",\"signature\":\""+Base64.getEncoder().encodeToString(signature)+"\"}\n",StandardCharsets.UTF_8);
        System.out.println("Runtime manifest signed and verified with community APK identity");
    }
}
