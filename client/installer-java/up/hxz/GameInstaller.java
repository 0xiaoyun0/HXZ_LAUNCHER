package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Installs version metadata and shared libraries without replacing this JVM's classpath. */
final class GameInstaller {
    final Path game, temp;
    private final Network network;
    private final JsonObject mirrors;
    private final int concurrency;
    private final Path runDirectory;
    final Path instance, installedJson, installedJar;
    private final Path versionWorkspace;
    private String preparedVersion;
    private java.util.function.Consumer<String> progress=message->{};
    void progress(java.util.function.Consumer<String> listener){progress=listener;}
    private String stage="准备安装";
    private long stageReceived=0, workDone=0, workTotal=0;
    private String workUnit="项";
    private final Map<Path,String> active=new ConcurrentHashMap<>();
    synchronized void phase(String message){stage=message;workDone=0;workTotal=0;stageReceived=network.received.get();progress.accept(message);report();}
    synchronized void count(long done,long total,String unit){workDone=done;workTotal=total;workUnit=unit;}
    synchronized void report(){
        JsonObject value=new JsonObject();value.addProperty("phase",stage);value.addProperty("completed",workDone);value.addProperty("total",workTotal);value.addProperty("unit",workUnit);
        value.addProperty("received",Math.max(0,network.received.get()-stageReceived));
        JsonArray files=new JsonArray();for(String file:active.values()){if(files.size()>=8)break;files.add(file);}value.add("activeFiles",files);
        System.out.println("HXZ_PROGRESS\t"+value);
    }
    // A completed installation can be reused across ordinary pack publishes. A repair request
    // bypasses this shortcut and rechecks all assets through the normal installation pipeline.
    boolean reusable(JsonObject requested,JsonObject previous,JsonObject config)throws IOException{
        if(IO.bool(config,"repairGameFiles",false)||!IO.str(requested,"gameVersion","").equals(IO.str(previous,"gameVersion",""))||!IO.object(requested,"loader").equals(IO.object(previous,"loader")))return false;
        if(!game.toString().equals(IO.str(previous,"gameDirectory",""))||!runDirectory.toString().equals(IO.str(previous,"gameRunDirectory","")))return false;
        if(!instance.toString().equals(IO.str(previous,"instanceDirectory","")))return false;
        if(!Files.isRegularFile(installedJson)||!Files.isRegularFile(installedJar))return false;
        if(!IO.hash(installedJson).equals(IO.str(previous,"installedMetadataHash",""))||!IO.hash(installedJar).equals(IO.str(previous,"installedJarHash","")))return false;
        try{verifyLibraries(IO.read(installedJson));return true;}catch(IOException|RuntimeException failure){return false;}
    }
    void recordInstallation(JsonObject profile,String installed)throws IOException{
        profile.addProperty("installedVersion",instance.getFileName().toString());
        profile.addProperty("gameDirectory",game.toString());profile.addProperty("gameRunDirectory",runDirectory.toString());
        profile.addProperty("instanceDirectory",instance.toString());
        profile.addProperty("installedMetadataHash",IO.hash(preparedVersion==null?installedJson:activationJson()));
        profile.addProperty("installedJarHash",IO.hash(preparedVersion==null?installedJar:activationJar()));
    }
    Path activationJar()throws IOException{return resolve("versions/"+preparedVersion+"/"+preparedVersion+".jar");}
    Path activationJson(){return temp.resolve("instance-ready.json");}
    private void prepareActivation(JsonObject profile,JsonObject vanilla,String generated)throws IOException{
        JsonObject launch=vanilla.deepCopy();
        JsonObject loader=IO.object(profile,"loader");String type=IO.str(loader,"type","");
        JsonObject extension=generated.equals(preparedVersion)?null:IO.read(resolve("versions/"+generated+"/"+generated+".json"));
        if(extension!=null)mergeLaunch(launch,extension);
        String name=instance.getFileName().toString();
        launch.addProperty("id",name);launch.addProperty("jar",name);launch.remove("inheritsFrom");
        // Keep the launcher's patch model consistent with the flattened launch metadata.
        JsonArray patches=new JsonArray();JsonObject gamePatch=vanilla.deepCopy();
        gamePatch.addProperty("id","game");gamePatch.addProperty("version",preparedVersion);gamePatch.addProperty("priority",0);patches.add(gamePatch);
        if(extension!=null){JsonObject patch=extension.deepCopy();patch.addProperty("id",type);patch.addProperty("version",IO.str(loader,"version",""));patch.addProperty("priority",30000);patches.add(patch);}
        launch.add("patches",patches);launch.addProperty("root",true);
        IO.write(activationJson(),launch);
    }
    private static void mergeLaunch(JsonObject base,JsonObject extension){
        JsonObject arguments=IO.object(base,"arguments").deepCopy();
        for(Map.Entry<String,JsonElement> e:IO.object(extension,"arguments").entrySet()){
            JsonArray combined=arguments.has(e.getKey())?arguments.getAsJsonArray(e.getKey()).deepCopy():new JsonArray();
            for(JsonElement value:e.getValue().getAsJsonArray())combined.add(value.deepCopy());arguments.add(e.getKey(),combined);
        }
        Map<String,JsonObject> libraries=new LinkedHashMap<>();
        for(JsonObject source:Arrays.asList(base,extension))if(source.has("libraries"))for(JsonElement e:source.getAsJsonArray("libraries")){
            JsonObject lib=e.getAsJsonObject();String[] name=IO.str(lib,"name","").split(":");
            String key=name.length<2?lib.toString():name[0]+":"+name[1]+(name.length>3?":"+name[3]:"");libraries.put(key,lib.deepCopy());
        }
        for(Map.Entry<String,JsonElement> e:extension.entrySet())if(!Arrays.asList("arguments","libraries","inheritsFrom","id","jar").contains(e.getKey()))base.add(e.getKey(),e.getValue().deepCopy());
        base.add("arguments",arguments);JsonArray merged=new JsonArray();for(JsonObject lib:libraries.values())merged.add(lib);base.add("libraries",merged);
    }
    GameInstaller(Path updater,JsonObject config,Network network)throws IOException{
        String configured=IO.str(config,"gameDir","");
        Path root=updater;
        if(configured.isEmpty()){
            Path versionParent=updater.getParent()==null?null:updater.getParent().getParent();
            if(versionParent==null||versionParent.getFileName()==null||!"versions".equals(versionParent.getFileName().toString()))throw new IOException("无法定位游戏目录：请将更新器放到 .minecraft/versions/<整合包>/updater，或在 config.json 配置 gameDir");
            for(int i=0;i<3;i++){root=root.getParent();if(root==null)throw new IOException("无法定位 .minecraft，请配置 gameDir");}
        }
        else {root=Paths.get(configured);if(!root.isAbsolute())root=updater.resolve(root);}
        game=root.toAbsolutePath().normalize();IO.noLinks(game);Files.createDirectories(game);
        String run=IO.str(config,"gameRunDir","");
        instance=updater.getParent();
        if(instance==null || instance.getFileName()==null)throw new IOException("无法定位当前游戏目录");
        installedJson=instance.resolve(instance.getFileName()+".json");installedJar=instance.resolve(instance.getFileName()+".jar");
        runDirectory=run.isEmpty()?instance:game.resolve(run).toAbsolutePath().normalize();
        if(!runDirectory.startsWith(game))throw new IOException("游戏运行目录必须位于 gameDir 内");
        IO.noLinks(runDirectory);
        temp=updater.resolve(".updater/game-downloads");IO.noLinks(temp);Files.createDirectories(temp);
        versionWorkspace=temp.resolve("versions");IO.noLinks(versionWorkspace);Files.createDirectories(versionWorkspace);
        this.network=network;mirrors=IO.object(config,"mirrorUrls");concurrency=IO.integer(config,"parallelDownloads",64,2,128);
    }
    String install(JsonObject profile)throws Exception{
        String gameVersion=IO.str(profile,"gameVersion","");if(gameVersion.isEmpty())return "";
        validateVersion(gameVersion);JsonObject loader=IO.object(profile,"loader");String type=IO.str(loader,"type",""),version=IO.str(loader,"version","");
        if(!type.isEmpty())validateVersion(version);
        phase("正在读取 Minecraft "+gameVersion+" 版本信息");
        preparedVersion=gameVersion;
        JsonObject vanilla=vanilla(gameVersion);
        String id=gameVersion;
        if(type.equals("fabric")||type.equals("quilt")){
            phase("正在安装 "+type+" "+version);
            String url=(type.equals("fabric")?"https://meta.fabricmc.net/v2":"https://meta.quiltmc.org/v3")+"/versions/loader/"+gameVersion+"/"+version+"/profile/json";
            JsonObject loaded=metadata(url);id=gameVersion+"-"+type+"-"+version;
            if(!IO.str(loaded,"inheritsFrom",gameVersion).equals(gameVersion))throw new IOException("加载器与游戏版本不匹配");
            loaded.addProperty("id",id);loaded.addProperty("inheritsFrom",gameVersion);
            libraries(loaded);IO.write(resolve("versions/"+id+"/"+id+".json"),loaded);
        }else if(type.equals("forge")||type.equals("neoforge")){
            id=new ForgeInstaller(this).install(gameVersion,type,version);
        }else if(type.equals("optifine")){
            id=new OptiFineInstaller(this).install(gameVersion,version,vanilla);
        }else if(!type.isEmpty()){
            throw new IOException("尚未实现此加载器的安装: "+type);
        }
        prepareActivation(profile,vanilla,id);
        phase("当前游戏已准备更新 · "+instance.getFileName());
        return instance.getFileName().toString();
    }
    private JsonObject vanilla(String version)throws Exception{
        JsonObject list=metadata("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
        JsonObject entry=null;for(JsonElement e:list.getAsJsonArray("versions")){JsonObject candidate=e.getAsJsonObject();if(version.equals(IO.str(candidate,"id",""))){entry=candidate;break;}}
        if(entry==null)throw new IOException("找不到 Minecraft 版本 "+version);
        Path versionFile=resolve("versions/"+version+"/"+version+".json");
        // Keep launchable metadata unpublished until its client and libraries are available.
        Path staged=network.race(sources(entry.get("url").getAsString()),temp,IO.str(entry,"sha1",null),-1);
        JsonObject metadata;
        try{metadata=IO.read(staged);}finally{Files.deleteIfExists(staged);}
        if(!version.equals(IO.str(metadata,"id","")))throw new IOException("游戏版本元数据不匹配");
        JsonObject client=IO.object(IO.object(metadata,"downloads"),"client");if(!client.has("url"))throw new IOException("游戏版本没有客户端下载地址");
        phase("正在准备 Minecraft "+version+" 游戏本体");
        Path vanillaJar=resolve("versions/"+version+"/"+version+".jar");
        if(Files.isRegularFile(installedJar)&&IO.hash(installedJar).equalsIgnoreCase(IO.str(client,"sha1",""))){Files.createDirectories(vanillaJar.getParent());Files.copy(installedJar,vanillaJar,StandardCopyOption.REPLACE_EXISTING);}
        else download(client,vanillaJar);
        phase("正在校验与下载游戏依赖");libraries(metadata);
        if(metadata.has("assetIndex")){
            JsonObject asset=metadata.getAsJsonObject("assetIndex");String assetID=IO.str(asset,"id",version);validateVersion(assetID);
            phase("正在读取游戏资源清单");
            Path assetFile=resolve("assets/indexes/"+assetID+".json");download(asset,assetFile);
            JsonObject assetIndex=IO.read(assetFile);JsonObject objects=IO.object(assetIndex,"objects");if(objects.size()>100000)throw new IOException("资源数量超过限制");
            boolean virtual=IO.bool(assetIndex,"virtual",false),resources=IO.bool(assetIndex,"map_to_resources",false);
            if(virtual||resources){
                validateAssetTargets(objects,game.resolve("assets/virtual").resolve(assetID));
                if(resources)validateAssetTargets(objects,runDirectory.resolve("resources"));
            }
            Map<String,Long> declaredSizes=new HashMap<>();
            for(Map.Entry<String,JsonElement> item:objects.entrySet()){
                assetPath(game.resolve("assets/virtual").resolve(assetID),item.getKey());
                JsonObject record=item.getValue().getAsJsonObject();String hash=IO.str(record,"hash","");
                long size=record.has("size")?record.get("size").getAsLong():-1;
                if(!hash.matches("[a-f0-9]{40}")||size<0||size>8L*1024*1024*1024)throw new IOException("无效资源校验信息: "+item.getKey());
                Long previous=declaredSizes.put(hash,size);if(previous!=null&&previous.longValue()!=size)throw new IOException("相同资源哈希声明了不同大小");
            }
            // The validated size index already deduplicates content; do not allocate a second hash set
            // or submit no-op workers for logical aliases of the same asset.
            phase("正在校验与下载游戏资源 · "+declaredSizes.size()+" 项");
            parallel(declaredSizes.entrySet(),item->{
                String hash=item.getKey();
                JsonObject source=new JsonObject();source.addProperty("url","https://resources.download.minecraft.net/"+hash.substring(0,2)+"/"+hash);source.addProperty("sha1",hash);source.addProperty("size",item.getValue());download(source,resolve("assets/objects/"+hash.substring(0,2)+"/"+hash));
            });
            declaredSizes.clear();
            if(virtual||resources){
                phase("正在映射旧版游戏资源");
                Path virtualRoot=resolve("assets/virtual/"+assetID);
                parallel(objects.entrySet(),item->{
                    JsonObject record=item.getValue().getAsJsonObject();String hash=record.get("hash").getAsString();
                    Path original=resolve("assets/objects/"+hash.substring(0,2)+"/"+hash);
                    copyAsset(original,assetPath(virtualRoot,item.getKey()),hash);
                    if(resources)copyAsset(original,assetPath(runDirectory.resolve("resources"),item.getKey()),hash);
                });
            }
        }
        IO.write(versionFile,metadata);return metadata;
    }
    private static Path assetPath(Path root,String name)throws IOException{
        if(name.length()>2048)throw new IOException("资源路径过长");
        return IO.map(root,"0/"+name,0);
    }
    // Reject aliases and file/directory conflicts before workers write any legacy resource copies.
    private static void validateAssetTargets(JsonObject objects,Path root)throws IOException{
        Set<Path> targets=new HashSet<>();
        for(String name:objects.keySet()){
            Path target=assetPath(root,name);
            if(!targets.add(target))throw new IOException("资源路径映射重复: "+name);
            if(Files.exists(target)&&!Files.isRegularFile(target))throw new IOException("资源目标不是普通文件: "+target);
        }
        for(Path target:targets){
            for(Path parent=target.getParent();parent!=null&&parent.startsWith(root);parent=parent.getParent()){
                if(targets.contains(parent))throw new IOException("资源文件与目录路径冲突: "+parent);
                if(Files.exists(parent)&&!Files.isDirectory(parent))throw new IOException("资源父路径不是目录: "+parent);
            }
        }
    }
    private static void copyAsset(Path original,Path target,String hash)throws IOException{
        IO.noLinks(target);
        if(Files.isRegularFile(target)&&Files.size(target)==Files.size(original)&&IO.hash(target).equalsIgnoreCase(hash))return;
        if(Files.exists(target)&&!Files.isRegularFile(target))throw new IOException("资源目标不是普通文件: "+target);
        Files.createDirectories(target.getParent());
        Path staged=Files.createTempFile(target.getParent(),".hxz-asset-",".tmp");
        try{Files.copy(original,staged,StandardCopyOption.REPLACE_EXISTING);IO.noLinks(target);IO.move(staged,target);}
        finally{Files.deleteIfExists(staged);}
    }
    void libraries(JsonObject metadata)throws Exception{
        if(!metadata.has("libraries"))return;JsonArray libraries=metadata.getAsJsonArray("libraries");if(libraries.size()>10000)throw new IOException("依赖数量超过限制");
        List<JsonElement> selected=new ArrayList<>();for(JsonElement item:libraries)if(allowed(item.getAsJsonObject()))selected.add(item);
        parallel(selected,item->{JsonObject lib=item.getAsJsonObject();
            JsonObject downloads=IO.object(lib,"downloads"),artifact=IO.object(downloads,"artifact");
            if(artifact.has("url")&&!IO.str(artifact,"url","").isEmpty()){
                String path=IO.str(artifact,"path",maven(IO.str(lib,"name","")));download(artifact,resolve("libraries/"+path));
            }else if(!lib.has("downloads")){
                String path=maven(IO.str(lib,"name",""));String base=IO.str(lib,"url","https://libraries.minecraft.net/");JsonObject source=new JsonObject();source.addProperty("url",base.replaceAll("/+$","")+"/"+path);download(source,resolve("libraries/"+path));
            }
            JsonObject natives=IO.object(lib,"natives");String os=osName();if(natives.has(os)){
                String classifier=natives.get(os).getAsString().replace("${arch}",System.getProperty("os.arch").contains("64")?"64":"32");JsonObject nativeFile=IO.object(IO.object(downloads,"classifiers"),classifier);
                if(nativeFile.has("url"))download(nativeFile,resolve("libraries/"+IO.str(nativeFile,"path",maven(IO.str(lib,"name","")+":"+classifier))));
            }
        });
    }
    @FunctionalInterface private interface Operation<T>{void run(T value)throws Exception;}
    // Only at most concurrency jobs exist at once, even for asset indexes with 100,000 entries.
    private <T> void parallel(Iterable<T> values,Operation<T> operation)throws Exception{
        int total=values instanceof Collection?((Collection<?>)values).size():0;
        count(0,total,"项");report();long done=0;
        ExecutorService workers=Executors.newFixedThreadPool(concurrency);CompletionService<Void> completed=new ExecutorCompletionService<>(workers);Iterator<T> iterator=values.iterator();int running=0;
        try{
            while(iterator.hasNext()||running>0){
                while(iterator.hasNext()&&running<concurrency){T item=iterator.next();completed.submit(()->{operation.run(item);return null;});running++;}
                try{completed.take().get();running--;count(++done,total,"项");if(done==total)report();}catch(ExecutionException e){Throwable cause=e.getCause();if(cause instanceof Exception)throw (Exception)cause;throw new IOException("下载工作线程失败",cause);}
            }
        }finally{workers.shutdownNow();if(!workers.awaitTermination(45,TimeUnit.SECONDS))throw new IOException("游戏文件下载线程未正常退出");}
    }
    private boolean allowed(JsonObject library){
        String name=IO.str(library,"name","").split("@",2)[0],arch=System.getProperty("os.arch");
        java.util.regex.Matcher nativeId=java.util.regex.Pattern.compile(":natives-(windows|linux|macos|osx)(?:-(arm64|aarch64|x86_64|x64|x86|arm32))?$").matcher(name);
        if(nativeId.find()){
            String nativeOs=nativeId.group(1).equals("macos")?"osx":nativeId.group(1);
            String suffix=nativeId.group(2), actual=(arch.equals("aarch64")||arch.equals("arm64"))?"arm64":arch.contains("64")?"x64":arch.startsWith("arm")?"arm":"x86";
            String expected=suffix==null?"x64":(suffix.equals("arm64")||suffix.equals("aarch64"))?"arm64":suffix.equals("x86")?"x86":suffix.equals("arm32")?"arm":"x64";
            if(!nativeOs.equals(osName())||!actual.equals(expected))return false;
        }
        if(!library.has("rules"))return true;boolean allowed=false;
        for(JsonElement entry:library.getAsJsonArray("rules")){JsonObject rule=entry.getAsJsonObject(),os=IO.object(rule,"os");boolean matches=true;
            if(os.has("name"))matches=osName().equals(os.get("name").getAsString());
            if(os.has("arch"))matches&=System.getProperty("os.arch").matches(os.get("arch").getAsString());
            if(os.has("version"))matches&=System.getProperty("os.version").matches(os.get("version").getAsString());
            if(rule.has("features"))matches=false;
            if(matches)allowed="allow".equals(IO.str(rule,"action","disallow"));
        }return allowed;
    }
    static String osName(){String os=System.getProperty("os.name","").toLowerCase(Locale.ROOT);return os.contains("win")?"windows":os.contains("mac")?"osx":"linux";}
    static String maven(String coordinate)throws IOException{
        String[] extension=coordinate.split("@",-1);String[] parts=extension[0].split(":",-1);if(parts.length<3||parts.length>4)throw new IOException("无效 Maven 坐标: "+coordinate);
        for(String p:parts)validateVersion(p);String ext=extension.length>1?extension[1]:"jar";validateVersion(ext);
        return parts[0].replace('.','/')+"/"+parts[1]+"/"+parts[2]+"/"+parts[1]+"-"+parts[2]+(parts.length==4?"-"+parts[3]:"")+"."+ext;
    }
    String page(String url)throws IOException{
        IOException failure=new IOException("无法读取官方下载页面");
        for(String candidate:sources(url))try{return network.text(candidate,2*1024*1024);}catch(IOException e){failure.addSuppressed(e);}
        throw failure;
    }
    void download(JsonObject source,Path target)throws Exception{
        String file=game.relativize(target.toAbsolutePath().normalize()).toString();
        active.put(target,file);
        try{downloadFile(source,target);}catch(Exception e){throw new IOException(file+": "+e.getMessage(),e);}finally{active.remove(target);}
    }
    private void downloadFile(JsonObject source,Path target)throws Exception{
        String hash=IO.str(source,"sha1",null);long size=source.has("size")?source.get("size").getAsLong():-1;
        IO.noLinks(target);
        if(hash!=null&&!hash.matches("[a-fA-F0-9]{40}"))throw new IOException("无效依赖校验值");
        if(size < -1 || size > 8L*1024*1024*1024)throw new IOException("无效依赖大小");
        String url=source.get("url").getAsString();
        Path receipt=null;
        if(hash==null){
            String key=IO.hex(IO.digest().digest(target.toAbsolutePath().normalize().toString().getBytes(StandardCharsets.UTF_8)));
            receipt=temp.getParent().resolve("game-receipts/"+key+".json");IO.noLinks(receipt);
        }
        if(Files.isRegularFile(target)&&(size<0||Files.size(target)==size)){
            if(hash!=null&&IO.hash(target).equalsIgnoreCase(hash))return;
            // A local receipt detects subsequent corruption; it is not an upstream signature.
            if(receipt!=null&&Files.isRegularFile(receipt))try{
                JsonObject record=IO.read(receipt);
                if(url.equals(IO.str(record,"url",""))&&Files.size(target)==record.get("size").getAsLong()&&IO.hash(target).equals(IO.str(record,"sha1","")))return;
            }catch(IOException|RuntimeException ignored){}
        }
        Path downloaded=network.race(sources(url),temp,hash,size);
        try{
            JsonObject record=null;if(receipt!=null){record=new JsonObject();record.addProperty("url",url);record.addProperty("sha1",IO.hash(downloaded));record.addProperty("size",Files.size(downloaded));}
            IO.noLinks(target);IO.move(downloaded,target);
            if(receipt!=null){IO.noLinks(receipt);IO.write(receipt,record);}
        }finally{Files.deleteIfExists(downloaded);}
    }
    void downloadMappings(String version,Path output)throws Exception{
        validateVersion(version);Path normalized=output.toAbsolutePath().normalize();
        if(!normalized.startsWith(game))throw new IOException("映射文件输出路径越界");IO.noLinks(normalized);
        JsonObject metadata=IO.read(resolve("versions/"+version+"/"+version+".json"));
        JsonObject mappings=IO.object(IO.object(metadata,"downloads"),"client_mappings");
        if(!mappings.has("url")||!mappings.has("sha1"))throw new IOException("游戏版本缺少客户端映射下载信息");
        download(mappings,normalized);
    }
    void verifyLibraries(JsonObject metadata)throws IOException{
        if(!metadata.has("libraries"))return;
        for(JsonElement value:metadata.getAsJsonArray("libraries")){
            JsonObject lib=value.getAsJsonObject();if(!allowed(lib))continue;
            JsonObject artifact=IO.object(IO.object(lib,"downloads"),"artifact");
            if(lib.has("downloads")&&!IO.object(lib,"downloads").has("artifact"))continue;
            Path file=resolve("libraries/"+IO.str(artifact,"path",maven(IO.str(lib,"name",""))));
            if(!Files.isRegularFile(file)||Files.size(file)==0)throw new IOException("加载器依赖未生成: "+file);
            if(artifact.has("sha1")&&!IO.hash(file).equalsIgnoreCase(artifact.get("sha1").getAsString()))throw new IOException("加载器依赖校验失败: "+file);
        }
    }
    private JsonObject metadata(String raw)throws IOException{
        return network.jsonSources(sources(raw),temp,"游戏版本信息",raw.endsWith("/profile/json")?"libraries":"versions");
    }
    private List<String> sources(String raw)throws MalformedURLException{
        List<String> result=new ArrayList<>();URL url=new URL(raw);
        // Optional URL-prefix overrides make controlled mirrors and isolated installer tests possible.
        for(Map.Entry<String,JsonElement> override:mirrors.entrySet())if(raw.startsWith(override.getKey()))result.add(override.getValue().getAsString()+raw.substring(override.getKey().length()));
        if(!result.isEmpty())return result;
        if(Boolean.getBoolean("hxz.launcher.official")){result.add(raw);return result;}String path=url.getFile();String mirror="https://bmclapi2.bangbang93.com";
        switch(url.getHost()){
            case "piston-meta.mojang.com":case "piston-data.mojang.com":case "launchermeta.mojang.com":case "launcher.mojang.com":result.add(mirror+path);break;
            case "libraries.minecraft.net":result.add(mirror+"/maven"+path);break;
            case "resources.download.minecraft.net":result.add(mirror+"/assets"+path);break;
            case "meta.fabricmc.net":result.add(mirror+"/fabric-meta"+path);break;
            case "maven.fabricmc.net":case "maven.minecraftforge.net":result.add(mirror+"/maven"+path);break;
            case "maven.neoforged.net":if(path.startsWith("/releases/"))result.add(mirror+"/maven/"+path.substring("/releases/".length()));break;
            default:break;
        }result.add(raw);return result;
    }
    Path resolve(String relative)throws IOException{
        if(relative.startsWith("/")||relative.contains("\\")||relative.contains(":"))throw new IOException("无效安装路径");Path target=(relative.startsWith("versions/")?versionWorkspace.resolve(relative.substring(9)):game.resolve(relative)).normalize();if(!target.startsWith(game)||target.equals(game))throw new IOException("安装路径越界");IO.noLinks(target);return target;
    }
    private static void validateVersion(String value)throws IOException{if(!value.matches("[a-zA-Z0-9_.+\\-]{1,150}")||value.equals(".")||value.equals(".."))throw new IOException("无效版本或依赖名称: "+value);}
}
