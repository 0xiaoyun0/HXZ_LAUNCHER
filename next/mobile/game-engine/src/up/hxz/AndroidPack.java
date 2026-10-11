package up.hxz;
import com.google.gson.*;
import java.nio.file.*;
import java.util.*;
import java.io.*;
public final class AndroidPack {
    private static void valid(String raw)throws Exception{java.net.URI uri=new java.net.URI(raw);if(!Arrays.asList("https","http").contains(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getFragment()!=null||uri.getQuery()!=null)throw new IOException("更新地址无效");}
    public static JsonObject profile(List<String> urls)throws Exception{
        Network network=new Network(8,1,8);Exception last=null;
        for(String raw:urls){valid(raw);String base=raw.replaceAll("/+$","");try{JsonObject version=network.json(base+"/version.json",6);if(IO.bool(version,"maintenance",false))throw new IOException("整合包正在维护，首次安装请稍后再试");JsonObject game=network.json(base+"/game-profile.json",6);if(!game.has("gameVersion"))throw new IOException("尚未发布游戏配置");return game;}catch(Exception e){last=e;}}
        throw new IOException("暂时无法连接 HXZ UP，已安装的游戏可关闭自动更新后启动",last);
    }
    public static void update(Path root,List<String> urls,JsonObject game,java.util.function.Consumer<String> progress)throws Exception{
        Path dir=root.resolve("updater");Files.createDirectories(dir);JsonObject config=new JsonObject();JsonArray servers=new JsonArray();for(String url:urls){valid(url);servers.add(url);}config.add("servers",servers);config.addProperty("parallelDownloads",32);config.addProperty("retryCount",5);config.addProperty("showChangelog",false);config.addProperty("repairGameFiles",false);IO.write(dir.resolve("config.json"),config);IO.write(dir.resolve("portable.json"),game);
        Progress.output.set(progress);try{Updater.android(dir);}finally{Progress.output.remove();}
    }
    public static void fabricAPI(Path root,String version,java.util.function.Consumer<String> progress)throws Exception{
        progress.accept("正在准备 Fabric API");Network network=new Network(15,5,8);String query=java.net.URLEncoder.encode("[\""+version+"\"]","UTF-8");String url="https://api.modrinth.com/v2/project/fabric-api/version?game_versions="+query+"&loaders=%5B%22fabric%22%5D";
        JsonArray versions=versions(url,progress);
        if(versions.size()==0)throw new IOException("当前 Minecraft 版本暂时没有 Fabric API");JsonArray files=versions.get(0).getAsJsonObject().getAsJsonArray("files");JsonObject file=files.get(0).getAsJsonObject();for(JsonElement candidate:files)if(IO.bool(candidate.getAsJsonObject(),"primary",false)){file=candidate.getAsJsonObject();break;}String name=IO.str(file,"filename","");if(!name.matches("[A-Za-z0-9._+ -]+\\.jar"))throw new IOException("Fabric API 文件名无效");Path mods=root.resolve("mods"),cache=root.resolve(".hxz-fabric-download");Files.createDirectories(mods);Files.createDirectories(cache);String hash=file.getAsJsonObject("hashes").get("sha1").getAsString();Path target=mods.resolve(name);if(Files.isRegularFile(target)&&IO.hash(target).equals(hash))return;String address=file.get("url").getAsString();List<String> sources=new ArrayList<>();sources.add(address);java.net.URI remote=new java.net.URI(address);if("cdn.modrinth.com".equals(remote.getHost()))sources.add("https://mod.mcimirror.top"+remote.getRawPath());Path staged=network.race(sources,cache,hash,file.get("size").getAsLong(),name);IO.move(staged,target);
        Path marker=root.resolve(".hxz-fabric-api.json");if(Files.isRegularFile(marker)){String old=IO.str(IO.read(marker),"file","");if(!old.equals(name)&&old.matches("fabric-api-[A-Za-z0-9._+ -]+\\.jar"))Files.deleteIfExists(mods.resolve(old));}JsonObject meta=new JsonObject();meta.addProperty("file",name);IO.write(marker,meta);
    }
    private static JsonArray versions(String url,java.util.function.Consumer<String> progress)throws Exception{
        Exception last=null;
        for(String source:Arrays.asList(url,url.replace("https://api.modrinth.com","https://mod.mcimirror.top/modrinth")))for(int attempt=1;attempt<=5;attempt++){
            if(Thread.currentThread().isInterrupted())throw new InterruptedException("已取消");
            java.net.HttpURLConnection c=(java.net.HttpURLConnection)new java.net.URL(source).openConnection();c.setConnectTimeout(6000);c.setReadTimeout(6000);c.setRequestProperty("User-Agent","HXZ-Android/0.7.0 (skin.hxzmc.top)");
            try{int status=c.getResponseCode();if(status==404||status==410){last=new IOException("Fabric API 节点尚无此版本信息");break;}if(status<200||status>=300)throw new IOException("节点返回 HTTP "+status);
                try(InputStream in=c.getInputStream();ByteArrayOutputStream bytes=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(bytes.size()+n>4*1024*1024)throw new IOException("模组版本清单过大");bytes.write(buffer,0,n);}return JsonParser.parseString(bytes.toString("UTF-8")).getAsJsonArray();}
            }catch(Exception e){last=e;progress.accept("Fabric API 节点连接不畅 · "+new java.net.URI(source).getHost()+" · "+attempt+"/5");if(attempt<5)Thread.sleep(250L*attempt);}
            finally{c.disconnect();}
        }
        throw new IOException("Fabric API 版本信息暂不可用，已下载游戏文件仍会保留",last);
    }
}
