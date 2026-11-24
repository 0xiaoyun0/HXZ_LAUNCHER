import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

class SignUpdateIndex {
    public static void main(String[] args) throws Exception {
        var storePass = System.getenv("HXZ_ANDROID_STORE_PASSWORD").toCharArray();
        var keyPass = System.getenv("HXZ_ANDROID_KEY_PASSWORD").toCharArray();
        try {
            var store = KeyStore.getInstance(new File(System.getenv("HXZ_ANDROID_STORE")), storePass);
            var alias = System.getenv("HXZ_ANDROID_KEY_ALIAS");
            var cert = store.getCertificate(alias);
            var fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(cert.getEncoded()));
            if (!fingerprint.equals(args[2])) throw new IllegalArgumentException("Unexpected Android release certificate");
            var payload = Files.readAllBytes(Path.of(args[0]));
            if (payload.length > 16384) throw new IllegalArgumentException("Update index too large");
            var signer = Signature.getInstance("SHA256withRSA");
            signer.initSign((PrivateKey) store.getKey(alias, keyPass));
            signer.update(payload);
            var b64 = Base64.getEncoder();
            Files.writeString(Path.of(args[1]), "{\"payload\":\"" + b64.encodeToString(payload) +
                "\",\"signature\":\"" + b64.encodeToString(signer.sign()) +
                "\",\"certificate\":\"" + b64.encodeToString(cert.getEncoded()) + "\"}\n");
        } finally {
            Arrays.fill(storePass, '\0');
            Arrays.fill(keyPass, '\0');
        }
    }
}
