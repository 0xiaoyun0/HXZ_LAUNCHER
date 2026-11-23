import java.nio.file.*;
import java.security.*;
import java.util.*;
import java.io.File;

/** Sign the exact runtime JSON bytes using the community's original update certificate. */
class SignRuntimeModule {
    public static void main(String[] args) throws Exception {
        if(args.length!=2)throw new IllegalArgumentException("PAYLOAD_JSON OUTPUT_JSON required");
        byte[] payload=Files.readAllBytes(Path.of(args[0]));
        char[] password=System.getenv("HXZ_ANDROID_STORE_PASSWORD").toCharArray();
        KeyStore keys=KeyStore.getInstance(new File(System.getenv("HXZ_ANDROID_KEYSTORE")),password);
        PrivateKey key=(PrivateKey)keys.getKey("hxz-community",password);Arrays.fill(password,'\0');
        Signature signer=Signature.getInstance("SHA256withRSA");signer.initSign(key);signer.update(payload);byte[] signature=signer.sign();
        signer.initVerify(keys.getCertificate("hxz-community"));signer.update(payload);
        if(!signer.verify(signature))throw new GeneralSecurityException("Module signature self-check failed");
        String result="{\"payload\":\""+Base64.getEncoder().encodeToString(payload)+"\",\"signature\":\""+Base64.getEncoder().encodeToString(signature)+"\"}\n";
        Files.writeString(Path.of(args[1]),result);
        System.out.println("Signed application runtime module manifest");
    }
}
