import org.concentus.*;
import java.nio.*;
import java.nio.file.*;

public final class CodecProbe {
    public static void main(String[] args) throws Exception {
        if(args[0].equals("encode")) {
            OpusEncoder encoder=new OpusEncoder(48000,1,OpusApplication.OPUS_APPLICATION_VOIP);
            encoder.setBitrate(24000);encoder.setComplexity(3);encoder.setUseDTX(true);
            short[] pcm=new short[960];byte[] encoded=new byte[4000];int count=0;
            for(int frame=0;frame<6;frame++){
                for(int n=0;n<960;n++)pcm[n]=(short)(9000*Math.sin(2*Math.PI*440*(frame*960+n)/48000));
                count=encoder.encode(pcm,0,960,encoded,0,4000);
            }
            byte[] packet=ByteBuffer.allocate(count+9).put((byte)1).putInt(42).putInt(1).put(encoded,0,count).array();
            Files.write(Path.of(args[1]),packet);
            System.out.println("Encoded 20ms Opus frame: "+count+" bytes");
        } else {
            byte[] packet=Files.readAllBytes(Path.of(args[1]));short[] pcm=new short[5760];
            int count=new OpusDecoder(48000,1).decode(packet,0,packet.length,pcm,0,5760,false);
            long energy=0;for(int n=0;n<count;n++)energy+=Math.abs(pcm[n]);
            if(count!=960||energy<1000)throw new AssertionError("Desktop Opus decode failed: "+count+" / "+energy);
            System.out.println("Desktop -> Android Opus: 960 samples, non-silent");
        }
    }
}
