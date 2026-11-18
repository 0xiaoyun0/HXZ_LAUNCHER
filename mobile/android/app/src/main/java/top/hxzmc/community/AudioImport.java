package top.hxzmc.community;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;

/** Streamed import of ordinary audio, NCM and legacy QMC v1; no account keys. */
final class AudioImport {
    static byte[] hex(String text){byte[] out=new byte[text.length()/2];for(int i=0;i<out.length;i++)out[i]=(byte)Integer.parseInt(text.substring(i*2,i*2+2),16);return out;}
    static byte[] decrypt(byte[] data,String key)throws Exception{Cipher cipher=Cipher.getInstance("AES/ECB/PKCS5Padding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(hex(key),"AES"));return cipher.doFinal(data);}
    static String format(byte[] b,int n){if(n<12)return "";String h=new String(b,0,12,StandardCharsets.ISO_8859_1);if(h.startsWith("fLaC"))return "flac";if(h.startsWith("OggS"))return "ogg";if(h.startsWith("RIFF")&&h.endsWith("WAVE"))return "wav";if(h.substring(4,8).equals("ftyp"))return "m4a";if((b[0]&255)==255&&(b[1]&246)==240)return "aac";if(h.startsWith("ID3")||(b[0]&255)==255&&(b[1]&224)==224)return "mp3";return "";}
    private static long number(RandomAccessFile f)throws IOException{return Integer.toUnsignedLong(Integer.reverseBytes(f.readInt()));}
    private static byte[] read(RandomAccessFile f,long length)throws IOException{if(length<0||length>2*1024*1024||length>f.length()-f.getFilePointer())throw new IOException("音频文件不完整");byte[] b=new byte[(int)length];f.readFully(b);return b;}
    private static final String[] ROWS={"4ad6ca9067f752","5e95239f13117e","47743d90aa3f51","c609d59ffa66f9","f3d6a190a0f7f0","1d95de9f8411f4","0e74bb90bc3f92","00095b9f6266a1"};
    static File convert(File input,File directory,String name)throws Exception{
        File target=null;try(RandomAccessFile in=new RandomAccessFile(input,"r")){
            if(in.length()<12||in.length()>50L*1024*1024)throw new IOException("音乐文件需在 12 字节至 50 MB 之间");byte[] head=read(in,12),mask=null;boolean qmc=false;String ext=format(head,12);
            if(new String(head,0,8,StandardCharsets.US_ASCII).equals("CTENFDAM")){
                in.seek(10);byte[] data=read(in,number(in));for(int i=0;i<data.length;i++)data[i]^=100;byte[] decoded=decrypt(data,"687a4852416d736f356b496e62617857");if(decoded.length<=17)throw new IOException("NCM 密钥不完整");byte[] key=Arrays.copyOfRange(decoded,17,decoded.length);int[] box=new int[256];for(int i=0;i<256;i++)box[i]=i;int j=0;for(int i=0;i<256;i++){j=(j+box[i]+(key[i%key.length]&255))&255;int value=box[i];box[i]=box[j];box[j]=value;}mask=new byte[256];for(int i=0;i<256;i++){int n=(i+1)&255;mask[i]=(byte)box[(box[n]+box[(box[n]+n)&255])&255];}
                read(in,number(in));in.seek(in.getFilePointer()+5);long space=number(in),size=number(in);if(size>space||space>16*1024*1024||in.getFilePointer()+space>=in.length())throw new IOException("NCM 封面数据损坏");in.seek(in.getFilePointer()+space);
            }else if(!ext.isEmpty())in.seek(0);
            else if(name.toLowerCase(Locale.ROOT).matches(".*\\.qmc(0|2|3|flac|ogg)$")){in.seek(0);qmc=true;mask=new byte[128];for(int i=0;i<8;i++){mask[i*16]=(byte)195;mask[i*16+8]=(byte)216;byte[] row=hex(ROWS[i]),reverse=hex(ROWS[7-i]);for(int k=0;k<7;k++){mask[i*16+k+1]=row[k];mask[i*16+9+k]=reverse[6-k];}}}
            else throw new IOException("无法识别此音频。新版 QQ 或汽水专有缓存请先导出 MP3 / FLAC 后导入");
            directory.mkdirs();byte[] buffer=new byte[65536];long offset=0;OutputStream out=null;
            try{int n;while((n=in.read(buffer))>0){if(mask!=null)for(int i=0;i<n;i++){long pos=offset+i;int index=qmc?(int)((pos>32767?pos%32767:pos)%128):(int)(pos&255);buffer[i]^=mask[index];}if(out==null){ext=format(buffer,n);if(ext.isEmpty())throw new IOException("未支持的加密版本或音频已损坏");target=new File(directory,UUID.randomUUID()+"."+ext);out=new FileOutputStream(target);}out.write(buffer,0,n);offset+=n;}if(out==null)throw new IOException("音频数据为空");}finally{if(out!=null)out.close();}
            return target;
        }catch(Exception e){if(target!=null)target.delete();throw e;}
    }
}
