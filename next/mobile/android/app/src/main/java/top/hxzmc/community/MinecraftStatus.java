package top.hxzmc.community;

import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** A bounded native fallback independent of the community service's DNS. */
public final class MinecraftStatus {
    private static void varint(OutputStream out,int value)throws IOException{do{int b=value&127;value>>>=7;if(value!=0)b|=128;out.write(b);}while(value!=0);}
    private static int readVar(InputStream in)throws IOException{int value=0;for(int i=0;i<5;i++){int b=in.read();if(b<0)throw new EOFException("状态连接提前关闭");value|=(b&127)<<(i*7);if((b&128)==0)return value;}throw new IOException("状态协议无效");}
    private static JSONObject query(String alias,int port)throws Exception{
        long start=System.currentTimeMillis();
        try(Socket socket=new Socket()){
            socket.connect(new InetSocketAddress("ipv4.hxzmc.top",port),3500);socket.setSoTimeout(3500);
            ByteArrayOutputStream packet=new ByteArrayOutputStream();packet.write(0);varint(packet,-1);byte[] host=alias.getBytes(StandardCharsets.UTF_8);varint(packet,host.length);packet.write(host);packet.write(25565>>8);packet.write(25565&255);packet.write(1);
            OutputStream out=socket.getOutputStream();varint(out,packet.size());packet.writeTo(out);out.write(new byte[]{1,0});out.flush();
            InputStream in=socket.getInputStream();int size=readVar(in);if(size<3||size>262144)throw new IOException("状态数据超过限制");byte[] bytes=new byte[size];new DataInputStream(in).readFully(bytes);ByteArrayInputStream frame=new ByteArrayInputStream(bytes);
            if(readVar(frame)!=0)throw new IOException("未返回游戏状态");int length=readVar(frame);if(length!=frame.available())throw new IOException("状态数据长度不匹配");byte[] json=new byte[length];new DataInputStream(frame).readFully(json);JSONObject raw=new JSONObject(new String(json,StandardCharsets.UTF_8)),players=raw.getJSONObject("players");
            int count=players.getInt("online"),max=players.getInt("max");if(count<0||max<0)throw new IOException("在线人数无效");JSONArray sample=players.optJSONArray("sample"),names=new JSONArray();
            if(sample!=null)for(int i=0;i<Math.min(1000,sample.length());i++){JSONObject p=sample.optJSONObject(i);if(p!=null)names.put(new JSONObject().put("id",p.optString("id")).put("name",p.optString("name")));}
            return new JSONObject().put("available",true).put("online",count).put("max",max).put("players",names).put("sample",true).put("source","android-direct").put("observed",System.currentTimeMillis()).put("latency",System.currentTimeMillis()-start);
        }
    }
    public static JSONObject all()throws Exception{
        String[] ids={"survival","mod-1","mod-2"},names={"原版生存群组","模组一服","模组二服"},aliases={"s1.hxzmc.top","s2.hxzmc.top","s3.hxzmc.top"};int[] ports={19999,19998,25599};
        ExecutorService pool=Executors.newFixedThreadPool(3);List<Future<JSONObject>> results=new ArrayList<>();
        try{for(int i=0;i<3;i++){final int n=i;results.add(pool.submit(()->{JSONObject v;try{v=query(aliases[n],ports[n]);}catch(Exception e){v=new JSONObject().put("available",false).put("error",e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage()));}return v.put("id",ids[n]).put("name",names[n]).put("address",aliases[n]).put("enabled",true);}));}
            JSONArray items=new JSONArray();for(Future<JSONObject> result:results)items.put(result.get(10,TimeUnit.SECONDS));return new JSONObject().put("items",items).put("at",System.currentTimeMillis()).put("protocol",2);
        }finally{pool.shutdownNow();}
    }
}
