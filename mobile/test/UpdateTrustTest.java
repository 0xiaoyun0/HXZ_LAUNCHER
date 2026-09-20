package top.hxzmc.community;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public final class UpdateTrustTest {
    interface Checked { void run() throws Exception; }
    static void rejects(Checked action) throws Exception { try{action.run();}catch(java.io.IOException expected){return;}throw new AssertionError("Unsafe metadata accepted"); }
    public static void main(String[] args) throws Exception{
        KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);KeyPair key=generator.generateKeyPair();
        byte[] payload="versionCode:40205".getBytes(StandardCharsets.UTF_8);Signature signer=Signature.getInstance("SHA256withRSA");signer.initSign(key.getPrivate());signer.update(payload);byte[] signature=signer.sign();
        if(!UpdateTrust.verify(payload,signature,key.getPublic()))throw new AssertionError("Valid signature rejected");
        payload[0]^=1;if(UpdateTrust.verify(payload,signature,key.getPublic()))throw new AssertionError("Tampered metadata accepted");
        String url="https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.4.2/HXZ-Community-Android-0.4.2-40204.apk",hash="a".repeat(64);
        UpdateTrust.metadata(url,1234,40204,hash);
        rejects(()->UpdateTrust.metadata(url.replace("github.com","evil.example"),1234,40204,hash));
        rejects(()->UpdateTrust.metadata(url+"?redirect=1",1234,40204,hash));
        rejects(()->UpdateTrust.metadata(url,65*1024*1024,40204,hash));
        rejects(()->UpdateTrust.metadata(url,1234,0,hash));
        rejects(()->UpdateTrust.metadata(url,1234,40204,"invalid"));
        Path file=Files.createTempFile("hxz-update-trust",".bin");
        try{Files.writeString(file,"abc");if(!UpdateTrust.sha256(file.toFile()).equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"))throw new AssertionError("Hash mismatch");}finally{Files.delete(file);}
        System.out.println("PASS: signed manifest, tamper rejection, repository URL restriction, size/version/hash bounds, streamed file digest");
    }
}
