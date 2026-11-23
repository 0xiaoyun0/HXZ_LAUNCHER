package top.hxzmc.community;

import java.io.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import okhttp3.*;
import org.json.*;

/** Bounded, native downloads; the WebView never receives arbitrary network access. */
final class MusicLibrary {
    private final CommunityApp app;
    MusicLibrary(CommunityApp app){this.app=app;}
    private String id(String value)throws IOException{if(!value.matches("[0-9]{1,18}"))throw new IOException("歌曲或歌单 ID 无效");return value;}
    private JSONObject json(String path)throws Exception{
        try(Response r=app.http.newCall(new Request.Builder().url("https://music.163.com/api/"+path).header("Referer","https://music.163.com/").build()).execute()){
            if(!r.isSuccessful())throw new IOException("网易云连接失败：HTTP "+r.code());
            JSONObject data=new JSONObject(new String(CommunityApp.bounded(r.body().byteStream(),4*1024*1024),StandardCharsets.UTF_8));
            if(data.optInt("code")!=200)throw new IOException("网易云暂时未提供数据，请稍后重试");return data;
        }
    }
    private JSONObject track(JSONObject song)throws Exception{
        JSONArray artists=song.optJSONArray("artists");if(artists==null)artists=song.optJSONArray("ar");StringBuilder names=new StringBuilder();
        if(artists!=null)for(int i=0;i<artists.length();i++){if(i>0)names.append(" / ");names.append(artists.getJSONObject(i).optString("name"));}
        String key=id(song.getString("id"));return CommunityApp.obj("id","netease:"+key,"netId",key,"title",song.optString("name","未命名歌曲"),"artist",names.toString(),"source","netease");
    }
    Object call(JSONObject input)throws Exception{
        String action=input.optString("action");
        if(action.startsWith("account."))return new NeteaseSession(app).call(input);
        if(action.equals("lyrics")){JSONObject r=json("song/lyric?id="+id(input.optString("id"))+"&lv=-1&tv=-1");return CommunityApp.obj("original",r.optJSONObject("lrc")==null?"":r.getJSONObject("lrc").optString("lyric"),"translation",r.optJSONObject("tlyric")==null?"":r.getJSONObject("tlyric").optString("lyric"));}

        if(action.equals("search")){String query=input.optString("query").trim();if(query.length()>200)query=query.substring(0,200);JSONObject response=json("search/get/web?s="+URLEncoder.encode(query,"UTF-8")+"&type=1&limit=25&offset=0");JSONArray songs=response.optJSONObject("result")==null?null:response.getJSONObject("result").optJSONArray("songs"),items=new JSONArray();if(songs!=null)for(int i=0;i<songs.length();i++)items.put(track(songs.getJSONObject(i)));return CommunityApp.obj("items",items);}
        if(action.equals("playlist")){
            String value=input.optString("link").trim();if(!value.matches("[0-9]{1,18}")){
                java.util.regex.Matcher matcher=java.util.regex.Pattern.compile("https?://(?:y\\.)?music\\.163\\.com/(?:#/)?playlist\\?[^\\s]*?\\bid=([0-9]{1,18})(?:[^0-9]|$)").matcher(value);
                if(!matcher.find())throw new IOException("请使用网易云公开歌单完整链接或歌单 ID");value=matcher.group(1);
            }
            JSONObject response=json("v6/playlist/detail?id="+id(value)+"&n=500&s=0"),list=response.optJSONObject("playlist");if(list==null)list=response.optJSONObject("result");if(list==null)throw new IOException("歌单不可读取，请确认已公开");
            JSONArray songs=list.optJSONArray("tracks"),ids=list.optJSONArray("trackIds"),items=new JSONArray();Map<String,JSONObject> known=new HashMap<>();if(songs!=null)for(int i=0;i<songs.length();i++)known.put(songs.getJSONObject(i).getString("id"),songs.getJSONObject(i));
            if(ids==null)ids=songs==null?new JSONArray():songs;
            for(int offset=0;offset<Math.min(500,ids.length());offset+=100){JSONArray missing=new JSONArray();for(int i=offset;i<Math.min(offset+100,Math.min(500,ids.length()));i++){String key=id(ids.getJSONObject(i).getString("id"));if(!known.containsKey(key))missing.put(key);}if(missing.length()>0){JSONArray details=json("song/detail/?ids="+URLEncoder.encode(missing.toString(),"UTF-8")).optJSONArray("songs");if(details!=null)for(int i=0;i<details.length();i++)known.put(details.getJSONObject(i).getString("id"),details.getJSONObject(i));}}
            for(int i=0;i<Math.min(500,ids.length());i++){JSONObject song=known.get(ids.getJSONObject(i).getString("id"));if(song!=null)items.put(track(song));}
            return CommunityApp.obj("name",list.optString("name","网易云歌单"),"items",items);
        }
        if(action.equals("remove")){String url=input.optString("url");if(url.matches("/media/[a-f0-9-]{36}\\.(mp3|flac|wav|ogg|opus|aac|m4a)"))new File(app.getFilesDir(),url.substring(1)).delete();return true;}
        if(!action.equals("prepare"))throw new IOException("不支持的音乐操作");
        String key=id(input.optString("id")),url="https://music.163.com/song/media/outer/url?id="+key+".mp3";
        File dir=new File(app.getFilesDir(),"media");dir.mkdirs();
        // Only cached online files are evicted. Imported files are never removed here.
        File[] cached=dir.listFiles((d,n)->n.startsWith("cloud-"));if(cached!=null){Arrays.sort(cached,Comparator.comparingLong(File::lastModified));long size=0;for(File f:cached)size+=f.length();for(File f:cached)if(size>150L*1024*1024){size-=f.length();f.delete();}}
        File target=new File(dir,"cloud-"+key+".mp3");if(target.isFile()&&target.length()>0){target.setLastModified(System.currentTimeMillis());return CommunityApp.obj("url","/media/"+target.getName());}
        String privateUrl=null;try{privateUrl=new NeteaseSession(app).audio(key);}catch(IOException e){if(!e.getMessage().contains("请先"))throw e;}
        if(privateUrl!=null)return CommunityApp.obj("url",privateUrl,"privateAudio",true);
        for(int turn=0;turn<6;turn++){
            HttpUrl address=HttpUrl.parse(url);if(address==null||!address.isHttps()||!(address.host().equals("music.163.com")||address.host().endsWith(".music.126.net")))throw new IOException("音频地址无效");
            try(Response r=app.http.newCall(new Request.Builder().url(address).header("Referer","https://music.163.com/").build()).execute()){
                if(r.code()>=300&&r.code()<400){String next=r.header("Location");HttpUrl redirect=next==null?null:address.resolve(next);if(redirect==null)throw new IOException("音频跳转无效");url=redirect.newBuilder().scheme("https").build().toString();continue;}
                if(!r.isSuccessful()||r.body()==null)throw new IOException("此曲目未提供外链，可能需要会员或存在版权限制");
                File temp=File.createTempFile("music-",".partial",dir);
                try(InputStream in=r.body().byteStream();OutputStream out=new FileOutputStream(temp)){
                    byte[] header=new byte[3];new DataInputStream(in).readFully(header);
                    if(!((header[0]=='I'&&header[1]=='D'&&header[2]=='3')||((header[0]&255)==255&&(header[1]&224)==224)))throw new IOException("网易云未返回可播放音频");
                    out.write(header);byte[] buffer=new byte[32768];long size=3;int n;
                    while((n=in.read(buffer))!=-1){size+=n;if(size>50L*1024*1024)throw new IOException("在线音频不能超过 50 MB");out.write(buffer,0,n);}if(size<16)throw new IOException("音频数据为空");
                }catch(Exception e){temp.delete();throw e;}
                if(!temp.renameTo(target)){temp.delete();throw new IOException("保存音频失败");}return CommunityApp.obj("url","/media/"+target.getName());
            }
        }
        throw new IOException("音频跳转次数过多");
    }
}
