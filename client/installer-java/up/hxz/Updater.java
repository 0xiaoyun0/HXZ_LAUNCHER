package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.lang.instrument.Instrumentation;
import java.net.URLEncoder;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/** Synchronizes before JVM main. Files are staged first, then applied with rollback backups. */
public final class Updater {
    private Path dir,cache,own;
    private JsonObject config;
    private Network network;
    private Progress ui;
    private int levels;
    private boolean forceMode=Boolean.getBoolean("hxz.updater.force"),retryPending;
    private final Set<String> skippedPaths=new HashSet<>();
    private final List<String> warnings=new ArrayList<>();
    private final List<String> serverAttempts=new ArrayList<>();
    private String selectedServer="尚未连接";
    public static void premain(String args,Instrumentation instrumentation)throws Exception{new Updater().run();}
    public static void main(String[] args)throws Exception{new Updater().run();}
    private void run()throws Exception{
        own=Paths.get(Updater.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toAbsolutePath();
        dir=Paths.get(System.getProperty("hxz.updater.dir",own.getParent().toString())).toAbsolutePath().normalize();
        cache=dir.resolve(".updater");IO.noLinks(cache);Files.createDirectories(cache);
        try(FileChannel lockChannel=FileChannel.open(cache.resolve("update.lock"),StandardOpenOption.CREATE,StandardOpenOption.WRITE)){
            FileLock lock=lockChannel.tryLock();if(lock==null)throw new IOException("另一个游戏实例正在更新，请稍后启动");
            try{
                config=IO.read(dir.resolve("config.json"));levels=IO.integer(config,"maxParentLevels",5,0,99);
                network=new Network(IO.integer(config,"downloadTimeout",30,5,1800),IO.integer(config,"retryCount",3,0,5),IO.integer(config,"parallelDownloads",64,8,128));
                ui=new Progress(config,network);ui.show("正在连接更新服务");if(!ui.platformMessage().isEmpty())log(ui.platformMessage());
                recover();cleanTemporaryDirectories();
                try{update();}catch(Exception failure){
                    if(!forceMode&&!networkFailure(failure)&&!Files.exists(cache.resolve("transaction.json"))&&ui.confirmForce(report(failure))){
                        forceMode=true;warnings.add("已由用户选择强制继续；以下列出未完成项目。");ui.show("正在尽可能完成更新");serverAttempts.clear();update();
                    }else throw failure;
                }
                cleanupOld();
            }finally{lock.release();}
        }catch(Exception e){
            StringWriter trace=new StringWriter();e.printStackTrace(new PrintWriter(trace));String report="HXZ UP · 更新失败\n时间: "+Instant.now()+"\nJava: "+System.getProperty("java.version")+"\nOS: "+System.getProperty("os.name")+"\n客户端: "+(own==null?"未知":own.getFileName())+"\n更新器目录: "+dir+"\n选中服务: "+selectedServer+"\n服务地址状态:\n"+String.join("\n",serverAttempts)+"\n\n"+trace;
            log(report);System.setProperty("hxz.error.shown","true");if(ui!=null)ui.error(report);else System.err.println(report);throw e;
        }
    }
    private JsonObject local(String name)throws IOException{Path p=cache.resolve(name);return Files.exists(p)?IO.read(p):new JsonObject();}
    private void update()throws Exception{
        try{updateOnce();}catch(Exception failure){
            // A server entering maintenance during a transfer is a pause, not a broken pack.
            if(selectedServer.startsWith("http")&&!Files.exists(cache.resolve("transaction.json"))){
                try{if(IO.bool(network.json(selectedServer+"/version.json"),"maintenance",false)){log("整合包进入维护，已跳过更新，保留当前文件");ui.close();return;}}catch(IOException ignored){}
            }
            throw failure;
        }
    }
    private void updateOnce()throws Exception{
        JsonObject old=local("local-manifest.json"),oldVersion=local("local-version.json");
        JsonArray servers=config.getAsJsonArray("servers");if(servers==null||servers.size()==0||servers.size()>16)throw new IOException("servers 需要 1–16 个服务地址");
        String base=null;JsonObject version=null,manifest=null;List<String> failures=new ArrayList<>();
        for(int i=0;i<servers.size();i++)serverAttempts.add("["+(i+1)+"] "+servers.get(i).getAsString()+" → 未尝试");
        for(int serverIndex=0;serverIndex<servers.size();serverIndex++){String candidate=servers.get(serverIndex).getAsString().replaceAll("/+$","");try{
            JsonObject remote=network.json(candidate+"/version.json");String id=IO.str(remote,"version","");if(id.isEmpty())throw new IOException("缺少版本标识");
            if(IO.bool(remote,"maintenance",false)){selectedServer=candidate;log("整合包正在维护，跳过本次更新，使用现有本地文件");ui.close();return;}
            if(!id.equals(IO.str(oldVersion,"version",""))||!old.has("files")||IO.bool(config,"repairGameFiles",false))manifest=network.json(candidate+"/manifest.json?version="+encode(id));
            base=candidate;version=remote;selectedServer=candidate;serverAttempts.set(serverIndex,"["+(serverIndex+1)+"] "+candidate+" → 已连接（基准服务）");break;
        }catch(Exception e){String failure=candidate+" → "+e.getMessage();failures.add(failure);serverAttempts.set(serverIndex,"["+(serverIndex+1)+"] "+failure);}}
        if(base==null){if(old.has("files")&&!Files.exists(cache.resolve("transaction.json"))){log("服务暂时不可达，使用本地缓存\n"+String.join("\n",failures));ui.close();return;}throw new NetworkFailure("首次启动必须连接更新服务\n"+String.join("\n",failures));}
        String id=IO.str(version,"version","");String suffix="?version="+encode(id);
        if(manifest==null){if(!Files.exists(cache.resolve("local-changelog.json"))){try{IO.write(cache.resolve("local-changelog.json"),network.json(base+"/changelog.json"+suffix));}catch(IOException e){log("日志暂不可用: "+e);}}ui.close();return;}
        JsonArray entries=manifest.getAsJsonArray("files");if(entries==null||entries.size()>100000)throw new IOException("无效或过大的清单");
        Rules rules=new Rules(network.json(base+"/action.json"+suffix));
        Map<String,JsonObject> previous=new HashMap<>();if(old.has("files"))for(JsonElement e:old.getAsJsonArray("files")){JsonObject f=e.getAsJsonObject();previous.put(f.get("path").getAsString(),f);}
        List<Change> changes=new ArrayList<>();Set<Path> targets=new HashSet<>();Set<String> paths=new HashSet<>();Map<String,JsonObject> newEntries=new LinkedHashMap<>();
        for(JsonElement e:entries){JsonObject file=e.getAsJsonObject();String path=IO.str(file,"path","");try{Path target=target(path);if(!targets.add(target))throw new IOException("多个清单路径映射到同一文件: "+path);paths.add(path);newEntries.put(path,file);
            String action=rules.file(path,file);String hash=IO.str(file,"sha1","");long size=file.has("fileSize")?file.get("fileSize").getAsLong():-1;
            if(action.equals("force_delete")){changes.add(new Change(path,target,null));continue;}
            if(!hash.matches("[a-fA-F0-9]{40}")||size<0||size>8L*1024*1024*1024)throw new IOException("无效的文件校验信息: "+path);
            boolean exists=Files.isRegularFile(target,LinkOption.NOFOLLOW_LINKS);if(Files.exists(target)&&!exists)throw new IOException("目标不是普通文件: "+target);
            if(rules.modern()&&!exists&&!IO.bool(rules.policy(path),"missing",true))continue;
            boolean download;
            switch(action){
                case "check_and_overwrite":download=!exists||Files.size(target)!=size||!IO.hash(target).equalsIgnoreCase(hash);break;
                case "force_overwrite":download=true;break;
                case "add_if_missing":download=!exists;break;
                case "skip_if_modified":download=!exists||(previous.containsKey(path)&&IO.hash(target).equalsIgnoreCase(IO.str(previous.get(path),"sha1",""))&&!hash.equalsIgnoreCase(IO.str(previous.get(path),"sha1","")));break;
                default:throw new IOException("未知文件行为: "+action);
            }
            if(download)changes.add(new Change(path,target,file));
            }catch(IOException|RuntimeException failure){if(!skipLocal(path,failure))throw failure;}
        }
        if(!rules.modern())for(Map.Entry<String,JsonElement> entry:rules.files.entrySet())if("force_delete".equals(IO.str(entry.getValue().getAsJsonObject(),"behavior",""))&&!paths.contains(entry.getKey())){Path p=target(entry.getKey());if(!targets.add(p))throw new IOException("删除规则与清单映射到同一文件: "+entry.getKey());changes.add(new Change(entry.getKey(),p,null));}
        if(rules.modern())policyChanges(rules,previous,paths,targets,changes);else strictChanges(rules,paths,targets,changes);
        for(Path destination:targets)for(Path parent=destination.getParent();parent!=null;parent=parent.getParent())if(targets.contains(parent))throw new IOException("清单同时将父路径和子路径作为文件: "+destination);
        for(Change change:changes)if(change.file!=null){
            Path ready=change.target.resolveSibling(change.target.getFileName()+".new");IO.noLinks(ready);
            if(targets.contains(ready)||Files.exists(ready)){IOException failure=new FileSystemException(ready.toString(),null,"更新暂存路径已被占用");skipLocal(change.path,failure);}
        }
        changes.removeIf(c->skippedPaths.contains(c.path));
        Path stage=Files.createTempDirectory(cache,"stage-");
        int concurrency=IO.integer(config,"parallelDownloads",64,8,128);ExecutorService workers=Executors.newFixedThreadPool(concurrency);CompletionService<Change> completed=new ExecutorCompletionService<>(workers);
        List<Change> downloads=new ArrayList<>();for(Change c:changes)if(c.file!=null)downloads.add(c);final String server=base;
        long plannedBytes=0;for(Change c:downloads)plannedBytes+=c.file.get("fileSize").getAsLong();ui.begin(plannedBytes,downloads.size());
        int next=0,done=0,running=0;boolean stagedAll=false;Set<String> optionalFailures=new HashSet<>();
        try{
            while(done<downloads.size()){
                while(next<downloads.size()&&running<concurrency){Change c=downloads.get(next++);completed.submit(()->{try{List<String> urls=new ArrayList<>();if(c.file.has("downloads"))for(JsonElement u:c.file.getAsJsonArray("downloads"))urls.add(u.getAsString());urls.add(server+"/"+encodePath(c.path)+suffix);c.staged=network.race(urls,stage,c.file.get("sha1").getAsString(),c.file.get("fileSize").getAsLong(),c.path);}catch(Exception e){c.failure=e;}return c;});running++;}
                try{Change c=completed.take().get();done++;running--;if(c.failure!=null){String behavior=rules.file(c.path,c.file);String detail=c.path+" · "+c.file.get("fileSize")+" bytes · SHA1 "+c.file.get("sha1")+"\n"+c.failure;if(c.path.toLowerCase(Locale.ROOT).endsWith(".jar")||behavior.equals("check_and_overwrite")||behavior.equals("force_overwrite"))throw new NetworkFailure("关键文件下载失败，原文件尚未更改\n"+detail,c.failure);optionalFailures.add(c.path);changes.remove(c);warnings.add("非关键文件暂未更新: "+detail);}ui.progress(done,downloads.size(),c.path);}
                catch(ExecutionException e){throw new NetworkFailure("文件下载失败，原文件尚未更改",e.getCause());}
            }
            stagedAll=true;
        }finally{workers.shutdownNow();if(!workers.awaitTermination(1900,TimeUnit.SECONDS))throw new IOException("文件下载线程无法退出");if(!stagedAll)deleteTree(stage);}
        try{
            JsonObject game=network.json(base+"/game-profile.json"+suffix);
            if(!IO.str(game,"gameVersion","").isEmpty()){
                ui.phase("正在准备游戏版本与加载器");
                try{GameInstaller installer=new GameInstaller(dir,config,network);installer.progress(ui::phase);
                JsonObject previousGame=local("local-game-profile.json");
                String installed;
                if(installer.reusable(game,previousGame,config)){
                    installed=IO.str(previousGame,"installedVersion","");ui.phase("已复用安装完成的游戏版本 · "+installed);
                }else {
                    installed=installer.install(game);
                    String name=dir.getParent().getFileName().toString();
                    Change jarChange=new Change("1/"+name+".jar",installer.installedJar,null);jarChange.staged=installer.activationJar();jarChange.game=true;
                    Change jsonChange=new Change("1/"+name+".json",installer.installedJson,null);jsonChange.staged=installer.activationJson();jsonChange.game=true;
                    if(targets.contains(jarChange.target)||targets.contains(jsonChange.target))throw new IOException("游戏版本文件同时出现在整合包清单，请只选择一种更新方式");
                    changes.add(jarChange);changes.add(jsonChange);
                }
                installer.recordInstallation(game,installed);
                ui.gameVersion(installed);
                log("已准备更新当前游戏目录，下次启动原条目生效: "+installed);
                }catch(Exception failure){
                    if(networkFailure(failure)||!skipLocal("游戏版本与加载器",failure))throw failure;
                    changes.removeIf(c->c.game);retryPending=true;game=local("local-game-profile.json");
                }
            }
            JsonObject logs;
            try{logs=network.json(base+"/changelog.json"+suffix);}catch(IOException e){logs=local("local-changelog.json");warnings.add(e.getMessage());}
            version.addProperty("updatedAt",Instant.now().toString());
            if(!optionalFailures.isEmpty()){
                // Preserve the old per-file baseline and retry incomplete optional files next launch.
                JsonArray retained=new JsonArray();for(JsonElement e:manifest.getAsJsonArray("files")){String path=IO.str(e.getAsJsonObject(),"path","");if(!optionalFailures.contains(path))retained.add(e);else if(previous.containsKey(path))retained.add(previous.get(path));}manifest.add("files",retained);
                version.addProperty("version",IO.str(oldVersion,"version",""));version.addProperty("pendingVersion",id);
            }
            stageMetadata(changes,stage,"local-manifest.json",manifest);
            stageMetadata(changes,stage,"local-changelog.json",logs);
            stageMetadata(changes,stage,"local-game-profile.json",game);
            stageMetadata(changes,stage,"local-version.json",version);
            JsonObject beforeCommit=network.json(base+"/version.json");
            if(IO.bool(beforeCommit,"maintenance",false)||!id.equals(IO.str(beforeCommit,"version","")))throw new IOException("服务正在维护或版本已变更，本次暂存文件未应用，请下次启动重试");
            Path backupDirectory=apply(changes);
            Files.deleteIfExists(cache.resolve("transaction.json"));
            Files.deleteIfExists(cache.resolve("transaction-agent"));
            deleteTree(backupDirectory);
            for(String warning:warnings)log(warning);
            if(warnings.isEmpty())ui.complete(logs);else ui.summary("已尽可能完成更新\n推荐将以下报告发送给管理员。未完成项目将在下次启动重试。\n\n"+String.join("\n\n",warnings));log("更新完成: "+id+", "+(downloads.size()-optionalFailures.size())+" 个下载文件");
        }catch(Exception e){recover();throw e;}finally{deleteTree(stage);}
    }
    private static void validateConnectionConfig(JsonObject value)throws IOException{
        JsonArray servers=value.has("servers")&&value.get("servers").isJsonArray()?value.getAsJsonArray("servers"):null;
        if(servers==null||servers.size()==0||servers.size()>16)throw new IOException("下发配置缺少 1–16 个连接地址，已保留原配置");
        for(JsonElement item:servers){String raw=item.getAsString();try{java.net.URI uri=new java.net.URI(raw);if(!Arrays.asList("http","https").contains(uri.getScheme())||uri.getHost()==null)throw new Exception();}catch(Exception e){throw new IOException("下发配置含无效服务地址，已保留原配置");}}
    }
    private String report(Exception failure){StringWriter out=new StringWriter();failure.printStackTrace(new PrintWriter(out));return "HXZ UP · 更新未完成\n更新器目录: "+dir+"\n选中服务: "+selectedServer+"\n\n"+out;}
    private boolean skipLocal(String path,Exception failure){
        if(networkFailure(failure))return false;
        boolean occupied=false;for(Throwable e=failure;e!=null;e=e.getCause())if(e instanceof FileSystemException||e instanceof OverlappingFileLockException)occupied=true;
        if(!occupied&&!forceMode)return false;
        skippedPaths.add(path);retryPending=true;
        if(warnings.size()<500)warnings.add((occupied?"文件占用或访问受限，已跳过: ":"强制模式已跳过: ")+path+"\n"+failure);
        return true;
    }
    private static boolean networkFailure(Throwable failure){
        for(Throwable e=failure;e!=null;e=e.getCause())if(e instanceof NetworkFailure||e instanceof java.net.SocketException||e instanceof java.net.SocketTimeoutException||e instanceof java.net.UnknownHostException||e instanceof javax.net.ssl.SSLException)return true;
        return failure instanceof InterruptedException||failure instanceof java.util.concurrent.CancellationException;
    }
    private void rewritePendingMetadata(List<Change> changes)throws IOException{
        if(!retryPending&&skippedPaths.isEmpty())return;
        JsonObject old=local("local-manifest.json"),oldVersion=local("local-version.json");Map<String,JsonObject> previous=new LinkedHashMap<>();
        if(old.has("files"))for(JsonElement e:old.getAsJsonArray("files"))previous.put(IO.str(e.getAsJsonObject(),"path",""),e.getAsJsonObject());
        for(Change c:changes){
            if(c.path.equals("local-manifest.json")){
                JsonObject manifest=IO.read(c.staged);JsonArray retained=new JsonArray();Set<String> seen=new HashSet<>();
                for(JsonElement e:manifest.getAsJsonArray("files")){String path=IO.str(e.getAsJsonObject(),"path","");seen.add(path);if(!skippedPaths.contains(path))retained.add(e);else if(previous.containsKey(path))retained.add(previous.get(path));}
                for(String path:skippedPaths)if(!seen.contains(path)&&previous.containsKey(path))retained.add(previous.get(path));
                manifest.add("files",retained);IO.write(c.staged,manifest);
            }else if(c.path.equals("local-version.json")){JsonObject version=IO.read(c.staged);version.addProperty("pendingVersion",IO.str(version,"version",""));version.addProperty("version",IO.str(oldVersion,"version",""));IO.write(c.staged,version);}
        }
    }
    private Path target(String path)throws IOException{Path p=IO.map(dir,path,levels);if(p.startsWith(cache))throw new IOException("清单不能覆盖更新器内部文件: "+path);return p;}
    private boolean protectedFile(Path p){return p.startsWith(cache)||p.equals(own)||p.equals(dir.resolve("config.json"))||p.equals(dir.resolve("launcher-agent.jar"));}
    private void policyChanges(Rules rules,Map<String,JsonObject> previous,Set<String> manifestPaths,Set<Path> targets,List<Change> changes)throws IOException{
        for(Map.Entry<String,JsonElement> entry:IO.object(rules.policies,"file").entrySet()){
            String path=entry.getKey();if(manifestPaths.contains(path)||!"delete".equals(IO.str(entry.getValue().getAsJsonObject(),"existing","")))continue;
            try{Path p=target(path);if(!targets.add(p))throw new IOException("删除规则存在重复映射: "+path);changes.add(new Change(path,p,null));}catch(IOException failure){if(!skipLocal(path,failure))throw failure;}
        }
        for(Map.Entry<String,JsonObject> entry:previous.entrySet()){
            String path=entry.getKey();try{if(manifestPaths.contains(path))continue;Path p=IO.map(dir,path,levels);if(protectedFile(p)||targets.contains(p)||!Files.exists(p,LinkOption.NOFOLLOW_LINKS))continue;
            String removed=IO.str(rules.policy(path),"removed","keep");
            if("delete".equals(removed)||("delete_unmodified".equals(removed)&&Files.isRegularFile(p,LinkOption.NOFOLLOW_LINKS)&&IO.hash(p).equalsIgnoreCase(IO.str(entry.getValue(),"sha1","")))){IO.noLinks(p);targets.add(p);changes.add(new Change(path,p,null));}
            }catch(IOException failure){if(!skipLocal(path,failure))throw failure;}
        }
        Set<String> candidates=new TreeSet<>();Set<String> known=new HashSet<>(manifestPaths);known.addAll(previous.keySet());
        for(String path:known){String root=path.substring(0,path.indexOf('/'))+"/";if("delete".equals(IO.str(rules.policy(root),"extra","keep")))candidates.add(root);}
        for(String path:IO.object(rules.policies,"directory").keySet())if("delete".equals(IO.str(rules.policy(path),"extra","keep")))candidates.add(path);
        // Collapse covered roots; a nested delete below a keep boundary is scanned separately.
        List<String> roots=new ArrayList<>();for(String candidate:candidates){boolean covered=false;for(String parent:roots)if(candidate.startsWith(parent)){covered=true;for(String boundary:IO.object(rules.policies,"directory").keySet())if(boundary.length()>parent.length()&&boundary.length()<candidate.length()&&boundary.startsWith(parent)&&candidate.startsWith(boundary)&&!"delete".equals(IO.str(rules.policy(boundary),"extra","keep")))covered=false;if(covered)break;}if(!covered)roots.add(candidate);}
        final int[] visited={0};
        for(String mapped:roots){Path root=IO.map(dir,mapped+".hxz-probe",levels).getParent();if(!Files.isDirectory(root,LinkOption.NOFOLLOW_LINKS))continue;
            int scanStart=changes.size();try{Files.walkFileTree(root,new SimpleFileVisitor<Path>(){
                @Override public FileVisitResult visitFileFailed(Path p,IOException failure)throws IOException{if(skipLocal(mapped+root.relativize(p).toString().replace('\\','/'),failure))return FileVisitResult.CONTINUE;throw failure;}
                @Override public FileVisitResult preVisitDirectory(Path p,BasicFileAttributes attributes)throws IOException{String rel=mapped+root.relativize(p).toString().replace('\\','/');if(protectedFile(p)||!"delete".equals(IO.str(rules.policy(rel),"extra","keep")))return FileVisitResult.SKIP_SUBTREE;IO.noLinks(p);if(++visited[0]>200000)throw new IOException("清理扫描超过 200000 项，请缩小范围: "+mapped);return FileVisitResult.CONTINUE;}
                @Override public FileVisitResult visitFile(Path p,BasicFileAttributes attributes)throws IOException{String rel=mapped+root.relativize(p).toString().replace('\\','/');if(++visited[0]>200000)throw new IOException("清理扫描超过 200000 项，请缩小范围: "+mapped);if(!protectedFile(p)&&!known.contains(rel)&&!targets.contains(p)&&"delete".equals(IO.str(rules.policy(rel),"extra","keep"))){IO.noLinks(p);targets.add(p);changes.add(new Change(rel,p,null));}return FileVisitResult.CONTINUE;}
            });}catch(IOException failure){if(!skipLocal(mapped,failure))throw failure;while(changes.size()>scanStart){Change discarded=changes.remove(changes.size()-1);targets.remove(discarded.target);}}
        }
    }
    private void strictChanges(Rules rules,Set<String> manifestPaths,Set<Path> targets,List<Change> changes)throws IOException{
        // A parent mapping authorizes writes to listed files, not a walk of the entire parent tree.
        Set<String> candidates=new TreeSet<>();
        for(String p:manifestPaths){String root=p.substring(0,p.indexOf('/'))+"/";if("strict".equals(rules.directory(root)))candidates.add(root);}
        for(String p:rules.directories.keySet())if("strict".equals(rules.directory(p)))candidates.add(p);
        List<String> roots=new ArrayList<>();
        for(String candidate:candidates){
            boolean covered=false;
            for(String parent:roots)if(candidate.startsWith(parent)){
                covered=true;
                // A permissive boundary is pruned by its parent walk; a nested strict rule needs its own walk.
                for(String boundary:rules.directories.keySet())if(boundary.length()>parent.length()&&boundary.length()<candidate.length()&&boundary.startsWith(parent)&&candidate.startsWith(boundary)&&!"strict".equals(rules.directory(boundary))){covered=false;break;}
                if(covered)break;
            }
            if(!covered)roots.add(candidate);
        }
        final int[] visited={0};
        for(String mapped:roots){Path root=IO.map(dir,mapped+".hxz-probe",levels).getParent();if(!Files.isDirectory(root,LinkOption.NOFOLLOW_LINKS))continue;
            int scanStart=changes.size();try{Files.walkFileTree(root,new SimpleFileVisitor<Path>(){
                @Override public FileVisitResult visitFileFailed(Path p,IOException failure)throws IOException{if(skipLocal(mapped+root.relativize(p).toString().replace('\\','/'),failure))return FileVisitResult.CONTINUE;throw failure;}
                @Override public FileVisitResult preVisitDirectory(Path d,BasicFileAttributes attrs)throws IOException{
                    String rel=mapped+root.relativize(d).toString().replace('\\','/');
                    if(d.equals(cache)||!"strict".equals(rules.directory(rel)))return FileVisitResult.SKIP_SUBTREE;
                    IO.noLinks(d);if(++visited[0]>200000)throw new IOException("严格同步目录扫描超过 200000 项: "+mapped+"，请缩小 strict 规则的目录范围");return FileVisitResult.CONTINUE;
                }
                @Override public FileVisitResult visitFile(Path p,BasicFileAttributes attrs)throws IOException{String rel=mapped+root.relativize(p).toString().replace('\\','/');if(++visited[0]>200000)throw new IOException("严格同步目录扫描超过 200000 项: "+mapped+"，请缩小 strict 规则的目录范围");if("strict".equals(rules.directory(rel))&&!manifestPaths.contains(rel)&&!rules.files.has(rel)&&!targets.contains(p)&&!p.equals(own)&&!p.equals(dir.resolve("launcher-agent.jar"))&&!p.equals(dir.resolve("config.json"))&&!p.startsWith(cache)){IO.noLinks(p);targets.add(p);changes.add(new Change(rel,p,null));}return FileVisitResult.CONTINUE;}
            });}catch(IOException failure){if(!skipLocal(mapped,failure))throw failure;while(changes.size()>scanStart){Change discarded=changes.remove(changes.size()-1);targets.remove(discarded.target);}}
        }
    }
    private void stageMetadata(List<Change> changes,Path stage,String name,JsonObject value)throws IOException{
        Path staged=stage.resolve(name);IO.write(staged,value);Change c=new Change(name,cache.resolve(name),null);c.staged=staged;changes.add(c);
    }
    private Path apply(List<Change> changes)throws IOException{
        Set<Path> destinations=new HashSet<>();for(Change c:changes)destinations.add(c.target);
        for(Change c:changes)if(c.staged!=null&&destinations.contains(c.target.resolveSibling(c.target.getFileName()+".new")))throw new IOException("更新目标与暂存路径冲突: "+c.target);
        boolean gameReadyConflict=false;
        for(Change c:changes)if(c.game&&Files.exists(c.target.resolveSibling(c.target.getFileName()+".new"))){skipLocal(c.path,new FileSystemException(c.target.toString(),null,"游戏版本暂存路径已占用，保留原游戏版本"));gameReadyConflict=true;}
        if(gameReadyConflict){changes.removeIf(c->c.game);for(Change c:changes)if(c.path.equals("local-game-profile.json"))IO.write(c.staged,local("local-game-profile.json"));}
        // The launcher must not run an uncommitted new updater to roll itself back.
        Path marker=cache.resolve("transaction-agent");IO.noLinks(marker);Path markerTemp=Files.createTempFile(cache,".agent-",".tmp");
        try{Files.write(markerTemp,own.getFileName().toString().getBytes(StandardCharsets.UTF_8));IO.move(markerTemp,marker);}finally{Files.deleteIfExists(markerTemp);}
        Path backups=Files.createTempDirectory(cache,"backup-");JsonObject journal=new JsonObject();JsonArray operations=new JsonArray();
        for(int i=0;i<changes.size();i++){Change c=changes.get(i);JsonObject op=new JsonObject();op.addProperty("target",c.target.toString());op.addProperty("backup",backups.resolve(Integer.toString(i)).toString());op.addProperty("existed",Files.exists(c.target));if(c.staged!=null){Path ready=c.target.resolveSibling(c.target.getFileName()+".new");IO.noLinks(ready);if(Files.exists(ready))throw new IOException("临时目标已存在，请保留或移走后重试: "+ready);op.addProperty("ready",ready.toString());}operations.add(op);}journal.add("operations",operations);IO.write(cache.resolve("transaction.json"),journal);
        boolean metadataPrepared=false,gameSkipped=false;
        for(int i=0;i<changes.size();i++){
            Change c=changes.get(i);JsonObject op=operations.get(i).getAsJsonObject();
            if(c.target.startsWith(cache)&&!metadataPrepared){rewritePendingMetadata(changes);metadataPrepared=true;}
            if(c.game&&gameSkipped){op.addProperty("skipped",true);IO.write(cache.resolve("transaction.json"),journal);continue;}
            try{
                IO.noLinks(c.target);
                if(c.target.equals(own)||c.target.equals(dir.resolve("launcher-agent.jar")))throw new FileSystemException(c.target.toString(),null,"当前程序文件正在使用；请通过更高版本文件名下发更新器");
                if(c.staged==null&&c.target.equals(dir.resolve("config.json")))throw new FileSystemException(c.target.toString(),null,"跳过删除连接配置，保留下一次更新入口；允许下发新配置替换");
                if(c.staged!=null&&c.target.equals(dir.resolve("config.json")))validateConnectionConfig(IO.read(c.staged));
                if(Files.exists(c.target)){
                    if(!Files.isRegularFile(c.target))throw new IOException("不能替换非文件目标: "+c.target);
                    Path partial=backups.resolve(i+".writing");Files.copy(c.target,partial,StandardCopyOption.REPLACE_EXISTING);IO.move(partial,backups.resolve(Integer.toString(i)));
                }
                if(c.staged==null)Files.deleteIfExists(c.target);
                else {Path ready=c.target.resolveSibling(c.target.getFileName()+".new");IO.noLinks(ready);Files.createDirectories(ready.getParent());Files.copy(c.staged,ready,StandardCopyOption.REPLACE_EXISTING);IO.move(ready,c.target);}
            }catch(IOException failure){
                if(c.target.startsWith(cache)||!skipLocal(c.path,failure))throw failure;
                if(c.game){
                    // A version JSON and its client JAR form one activation group.
                    for(int j=i-1;j>=0;j--)if(changes.get(j).game){JsonObject prior=operations.get(j).getAsJsonObject();Path saved=Paths.get(prior.get("backup").getAsString());if(Files.exists(saved))IO.move(saved,changes.get(j).target);else if(!prior.get("existed").getAsBoolean())Files.deleteIfExists(changes.get(j).target);prior.addProperty("skipped",true);}
                    gameSkipped=true;retryPending=true;
                    for(Change meta:changes)if(meta.path.equals("local-game-profile.json"))IO.write(meta.staged,local("local-game-profile.json"));
                }
                op.addProperty("skipped",true);IO.write(cache.resolve("transaction.json"),journal);
                if(op.has("ready"))try{Files.deleteIfExists(Paths.get(op.get("ready").getAsString()));}catch(IOException ignored){}
            }
        }
        return backups;
    }
    private void recover()throws IOException{
        Path journal=cache.resolve("transaction.json");if(!Files.exists(journal))return;JsonArray ops;
        try{
            ops=IO.read(journal).getAsJsonArray("operations");if(ops==null||ops.size()>200004)throw new IOException("无效恢复记录数量");
            Path root=dir;for(int i=0;i<levels&&root.getParent()!=null;i++)root=root.getParent();
            Set<Path> targets=new HashSet<>(),readyPaths=new HashSet<>(),backupPaths=new HashSet<>();
            Set<String> metadata=new HashSet<>(Arrays.asList("local-manifest.json","local-version.json","local-changelog.json","local-game-profile.json"));
            // Validate the entire journal before restoring any file.
            for(JsonElement value:ops){JsonObject op=value.getAsJsonObject();Path dest=Paths.get(op.get("target").getAsString()),backup=Paths.get(op.get("backup").getAsString());
                if(!dest.isAbsolute()||!dest.equals(dest.normalize())||!dest.startsWith(root)||dest.equals(root)||!targets.add(dest))throw new IOException("恢复目标路径无效");
                if(dest.startsWith(cache)&&!(dest.getParent().equals(cache)&&metadata.contains(dest.getFileName().toString())))throw new IOException("恢复目标不能覆盖内部文件");
                Path parent=backup.getParent();if(!backup.isAbsolute()||!backup.equals(backup.normalize())||parent==null||!cache.equals(parent.getParent())||!parent.getFileName().toString().startsWith("backup-")||!backup.getFileName().toString().matches("[0-9]+"))throw new IOException("恢复备份路径无效");
                if(!op.get("existed").isJsonPrimitive()||!op.getAsJsonPrimitive("existed").isBoolean())throw new IOException("恢复记录缺少原状态");
                if(!backupPaths.add(backup))throw new IOException("恢复备份路径重复");IO.noLinks(dest);IO.noLinks(backup);
                if(op.has("ready")){Path ready=Paths.get(op.get("ready").getAsString());if(!ready.equals(dest.resolveSibling(dest.getFileName()+".new")))throw new IOException("恢复临时路径无效");IO.noLinks(ready);readyPaths.add(ready);}
            }
            if(!Collections.disjoint(targets,readyPaths))throw new IOException("恢复目标与暂存路径冲突");
        }catch(RuntimeException e){throw new IOException("更新恢复记录损坏",e);}
        for(int i=ops.size()-1;i>=0;i--){JsonObject op=ops.get(i).getAsJsonObject();if(IO.bool(op,"skipped",false))continue;Path dest=Paths.get(op.get("target").getAsString()),backup=Paths.get(op.get("backup").getAsString());IO.noLinks(dest);if(Files.exists(backup))IO.move(backup,dest);else if(!op.get("existed").getAsBoolean())Files.deleteIfExists(dest);if(op.has("ready"))Files.deleteIfExists(Paths.get(op.get("ready").getAsString()));}
        Files.deleteIfExists(journal);Files.deleteIfExists(cache.resolve("transaction-agent"));log("已恢复中断前的文件状态");
    }
    private void cleanupOld()throws IOException{
        String name=own.getFileName().toString();if(!name.matches("updater-\\d+\\.\\d+\\.\\d+\\.jar"))return;
        String[] current=name.substring(8,name.length()-4).split("\\.");
        try(DirectoryStream<Path> stream=Files.newDirectoryStream(dir,"updater-*.jar")){for(Path p:stream){String n=p.getFileName().toString();if(!n.matches("updater-\\d+\\.\\d+\\.\\d+\\.jar"))continue;String[] other=n.substring(8,n.length()-4).split("\\.");for(int i=0;i<3;i++){int compare=new java.math.BigInteger(other[i]).compareTo(new java.math.BigInteger(current[i]));if(compare<0){try{Files.deleteIfExists(p);}catch(IOException e){log("旧更新器稍后清理: "+p);}break;}if(compare>0)break;}}}
    }
    private void cleanTemporaryDirectories()throws IOException{
        try(DirectoryStream<Path> entries=Files.newDirectoryStream(cache)){for(Path p:entries){String name=p.getFileName().toString();if(name.startsWith("stage-")||name.startsWith("backup-")){IO.noLinks(p);deleteTree(p);}}}
    }
    private void log(String text){System.out.println("[HXZ UP] "+text);try{Path log=cache.resolve("update.log");if(Files.exists(log)&&Files.size(log)>2*1024*1024)Files.move(log,cache.resolve("update.previous.log"),StandardCopyOption.REPLACE_EXISTING);Files.write(log,(Instant.now()+" "+text+"\n").getBytes(StandardCharsets.UTF_8),StandardOpenOption.CREATE,StandardOpenOption.APPEND);}catch(IOException ignored){}}
    static String encode(String s)throws UnsupportedEncodingException{return URLEncoder.encode(s,"UTF-8").replace("+","%20");}
    static String encodePath(String path)throws UnsupportedEncodingException{StringBuilder b=new StringBuilder();for(String p:path.split("/")){if(b.length()>0)b.append('/');b.append(encode(p));}return b.toString();}
    static void deleteTree(Path path)throws IOException{if(!Files.exists(path))return;Files.walkFileTree(path,new SimpleFileVisitor<Path>(){public FileVisitResult visitFile(Path p,BasicFileAttributes a)throws IOException{Files.delete(p);return FileVisitResult.CONTINUE;}public FileVisitResult postVisitDirectory(Path p,IOException e)throws IOException{if(e!=null)throw e;Files.delete(p);return FileVisitResult.CONTINUE;}});}
    private static final class Change{final String path;final Path target;final JsonObject file;Path staged;Exception failure;boolean game;Change(String path,Path target,JsonObject file){this.path=path;this.target=target;this.file=file;}}
}
