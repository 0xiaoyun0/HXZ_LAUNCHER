package top.hxzmc.community;

import java.io.*;
import java.security.*;
import java.util.Locale;

/** Pure Java verification shared by the Android updater and release checks. */
public final class UpdateTrust {
    public static boolean verify(byte[] payload,byte[] signature,PublicKey key) throws GeneralSecurityException{
        Signature verifier=Signature.getInstance("SHA256withRSA");verifier.initVerify(key);verifier.update(payload);return verifier.verify(signature);
    }
    public static void metadata(String url,long size,long versionCode,String hash) throws IOException{
        if(!url.matches("https://github\\.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\\.apk"))throw new IOException("更新地址无效");
        if(versionCode<1||size<1||size>64*1024*1024||!hash.matches("[a-fA-F0-9]{64}"))throw new IOException("更新信息不完整");
    }
    public static String sha256(File file) throws IOException,GeneralSecurityException{
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)){byte[] buffer=new byte[32768];int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}
        StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",b));return hex.toString();
    }
}
