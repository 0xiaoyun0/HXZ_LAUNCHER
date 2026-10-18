package top.hxzmc.community;

import java.io.*;
import java.util.UUID;
import org.json.JSONObject;

/** Bounded, sequential bridge transfer; the user chooses the final document location. */
final class AssetExport {
    private final File cache;
    private File file;
    private FileOutputStream output;
    private String token,name,mime;
    private int index;
    private long total,received,updated;
    AssetExport(File cache){this.cache=cache;}
    synchronized JSONObject accept(JSONObject input)throws Exception{
        if(file!=null&&System.currentTimeMillis()-updated>600000)close();
        String action=input.optString("action");
        if(action.equals("begin")){
            if(file!=null)throw new IOException("另一个素材正在导出");
            String type=input.optString("mime");long size=input.optLong("size");
            if(!type.matches("image/(png|jpeg|webp)|video/(mp4|webm)")||size<1||size>64L*1024*1024)throw new IOException("素材类型或大小无效");
            name=input.optString("name","素材").replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_");if(name.length()>120)name=name.substring(0,120);
            mime=type;total=size;received=0;index=0;token=UUID.randomUUID().toString();file=File.createTempFile("creation-",".partial",cache);output=new FileOutputStream(file);updated=System.currentTimeMillis();return CommunityApp.obj("id",token);
        }
        if(file==null||!input.optString("id").equals(token))throw new IOException("导出已结束，请重新导出");
        if(action.equals("abort")){close();return CommunityApp.obj("cancelled",true);}
        if(!action.equals("chunk"))throw new IOException("不支持的导出操作");
        String data=input.optString("data");if(input.optInt("index",-1)!=index||data.length()>262144||!data.matches("[A-Za-z0-9+/]+={0,2}"))throw new IOException("素材分段无效");
        byte[] bytes=android.util.Base64.decode(data,android.util.Base64.NO_WRAP);if(received+bytes.length>total)throw new IOException("素材大小发生变化");output.write(bytes);received+=bytes.length;index++;updated=System.currentTimeMillis();return CommunityApp.obj("received",received);
    }
    synchronized File finish(String id)throws Exception{
        if(file==null||!id.equals(token)||received!=total)throw new IOException("素材尚未完整传输");output.getFD().sync();output.close();output=null;File done=file;file=null;token=null;return done;
    }
    synchronized JSONObject info(){return CommunityApp.obj("filename",name,"mime",mime);}
    synchronized void close(){try{if(output!=null)output.close();}catch(IOException ignored){}output=null;if(file!=null)file.delete();file=null;token=null;}
}
