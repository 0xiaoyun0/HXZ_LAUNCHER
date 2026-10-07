package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.jar.*;
import java.util.regex.*;
import java.util.zip.*;

/** Executes the installer-declared client processors in isolated child JVMs. */
final class ForgeInstaller {
    private final GameInstaller owner;
    ForgeInstaller(GameInstaller owner){this.owner=owner;}
    String install(String minecraft,String type,String version)throws Exception{
        owner.phase("正在准备 "+type+" "+version+" 安装器");
        String coordinate=type.equals("forge")?"net.minecraftforge:forge:"+(version.startsWith(minecraft+"-")?version:minecraft+"-"+version)+":installer":"net.neoforged:neoforge:"+version+":installer";
        String repository=type.equals("forge")?"https://maven.minecraftforge.net/":"https://maven.neoforged.net/releases/";
        Path installer=owner.resolve("libraries/"+GameInstaller.maven(coordinate));JsonObject source=new JsonObject();source.addProperty("url",repository+GameInstaller.maven(coordinate));owner.download(source,installer);
        return installArchive(installer,minecraft,type,version);
    }
    String installArchive(Path installer,String minecraft,String type,String version)throws Exception{
        Path work=Files.createTempDirectory(owner.temp,"processor-");
        try(JarFile jar=new JarFile(installer.toFile())){
            JsonObject profile=json(jar,"install_profile.json");
            if(!minecraft.equals(IO.str(profile,"minecraft",minecraft)))throw new IOException("安装器的 Minecraft 版本与配置不匹配");
            JsonObject launch;
            if(profile.has("versionInfo")){
                // Legacy Forge bundles its universal artifact instead of declaring processors.
                launch=profile.getAsJsonObject("versionInfo");JsonObject install=IO.object(profile,"install");String file=IO.str(install,"filePath","");
                if(file.isEmpty())throw new IOException("旧版 Forge 安装器缺少核心文件");
                extract(jar,file,owner.resolve("libraries/"+GameInstaller.maven(IO.str(install,"path",""))));
            }else{
                launch=json(jar,IO.str(profile,"json","/version.json"));
                if(profile.has("libraries")){
                    for(JsonElement item:profile.getAsJsonArray("libraries")){String path=GameInstaller.maven(IO.str(item.getAsJsonObject(),"name",""));if(jar.getJarEntry("maven/"+path)!=null)extract(jar,"maven/"+path,owner.resolve("libraries/"+path));}
                }
                if(!IO.str(profile,"path","").isEmpty()){String path=GameInstaller.maven(IO.str(profile,"path",""));if(jar.getJarEntry("maven/"+path)!=null)extract(jar,"maven/"+path,owner.resolve("libraries/"+path));}
                owner.phase("正在校验与下载加载器依赖");owner.libraries(profile);
                Map<String,String> vars=new HashMap<>();
                Path client=work.resolve("minecraft.jar");Files.copy(owner.resolve("versions/"+minecraft+"/"+minecraft+".jar"),client);
                vars.put("SIDE","client");vars.put("MINECRAFT_JAR",client.toString());vars.put("MINECRAFT_VERSION",minecraft);vars.put("ROOT",owner.game.toString());vars.put("INSTALLER",installer.toString());vars.put("LIBRARY_DIR",owner.game.resolve("libraries").toString());
                for(Map.Entry<String,JsonElement> item:IO.object(profile,"data").entrySet()){
                    String value=item.getValue().isJsonObject()?IO.str(item.getValue().getAsJsonObject(),"client",""):item.getValue().getAsString();
                    if(value.startsWith("/")){Path extracted=work.resolve("data-"+vars.size());extract(jar,value,extracted);value=extracted.toString();}
                    else value=literal(value,vars);
                    vars.put(item.getKey(),value);
                }
                JsonArray processors=profile.has("processors")?profile.getAsJsonArray("processors"):new JsonArray();if(processors.size()>100)throw new IOException("安装步骤数量超过限制");
                List<JsonObject> clientProcessors=new ArrayList<>();
                for(JsonElement element:processors){JsonObject processor=element.getAsJsonObject();if(processor.has("sides")){boolean clientSide=false;for(JsonElement side:processor.getAsJsonArray("sides"))if("client".equals(side.getAsString()))clientSide=true;if(!clientSide)continue;}clientProcessors.add(processor);}
                for(int i=0;i<clientProcessors.size();i++){process(clientProcessors.get(i),vars,work,i+1,clientProcessors.size());owner.count(1,1,"步骤");owner.report();}
            }
            if(!minecraft.equals(IO.str(launch,"inheritsFrom",minecraft)))throw new IOException("生成版本的继承关系不正确");
            owner.phase("正在校验加载器运行依赖");owner.libraries(launch);
            owner.verifyLibraries(launch);
            String id=minecraft+"-"+type+"-"+version;launch.addProperty("id",id);launch.addProperty("inheritsFrom",minecraft);
            IO.write(owner.resolve("versions/"+id+"/"+id+".json"),launch);return id;
        }finally{Updater.deleteTree(work);}
    }
    private void process(JsonObject processor,Map<String,String> vars,Path work,int step,int total)throws Exception{
        // Official installers otherwise perform their own unmirrored network request in this step.
        Map<String,String> options=new HashMap<>();
        if(processor.has("args")){JsonArray args=processor.getAsJsonArray("args");for(int i=0;i+1<args.size();i++){String key=args.get(i).getAsString();if(key.startsWith("--")){String value=args.get(i+1).getAsString();if(!value.startsWith("--"))options.put(key,literal(value,vars));}}}
        owner.phase("加载器处理 "+step+"/"+total+" · "+IO.str(processor,"jar","安装步骤")+(options.containsKey("--task")?" · "+options.get("--task"):""));
        if("DOWNLOAD_MOJMAPS".equals(options.get("--task"))&&"client".equals(options.get("--side"))){
            String version=options.get("--version"),output=options.get("--output");if(version==null||output==null)throw new IOException("映射下载步骤缺少参数");
            owner.downloadMappings(version,Paths.get(output));return;
        }
        Map<Path,String> outputs=new LinkedHashMap<>();boolean valid=true;
        for(Map.Entry<String,JsonElement> out:IO.object(processor,"outputs").entrySet()){
            Path path=Paths.get(literal(out.getKey(),vars)).toAbsolutePath().normalize();
            if(!path.startsWith(owner.game)&&!path.startsWith(work))throw new IOException("安装器输出路径越界");IO.noLinks(path);
            String hash=literal(out.getValue().getAsString(),vars);if(!hash.matches("[a-fA-F0-9]{40}"))throw new IOException("无效的安装产物哈希");outputs.put(path,hash);
            if(!Files.isRegularFile(path)||!IO.hash(path).equalsIgnoreCase(hash))valid=false;
        }
        if(!outputs.isEmpty()&&valid)return;
        Path executable=owner.resolve("libraries/"+GameInstaller.maven(IO.str(processor,"jar","")));String main;
        try(JarFile jar=new JarFile(executable.toFile())){if(jar.getManifest()==null)throw new IOException("处理器缺少入口");main=jar.getManifest().getMainAttributes().getValue("Main-Class");}
        if(main==null)throw new IOException("处理器缺少 Main-Class");
        List<String> cp=new ArrayList<>();cp.add(executable.toString());if(processor.has("classpath"))for(JsonElement lib:processor.getAsJsonArray("classpath")){Path path=owner.resolve("libraries/"+GameInstaller.maven(lib.getAsString()));if(!Files.isRegularFile(path))throw new IOException("缺少处理器依赖: "+path);cp.add(path.toString());}
        List<String> command=new ArrayList<>();command.add(Paths.get(System.getProperty("java.home"),"bin",GameInstaller.osName().equals("windows")?"java.exe":"java").toString());command.add("-Xmx512m");command.add("-Djava.awt.headless=true");command.add("-cp");command.add(String.join(File.pathSeparator,cp));command.add(main);
        if(processor.has("args"))for(JsonElement arg:processor.getAsJsonArray("args"))command.add(literal(arg.getAsString(),vars));
        runCommand(command,work);
        for(Map.Entry<Path,String> output:outputs.entrySet()){IO.noLinks(output.getKey());if(!Files.isRegularFile(output.getKey())||!IO.hash(output.getKey()).equalsIgnoreCase(output.getValue()))throw new IOException("安装产物校验失败: "+output.getKey());}
    }
    static void runCommand(List<String> command,Path work)throws Exception{
        Path log=work.resolve("processor.log");Process child=new ProcessBuilder(command).directory(work.toFile()).redirectErrorStream(true).start();
        // Drain continuously with a cap; large processor logs cannot fill heap or block the child.
        ExecutorService drain=Executors.newSingleThreadExecutor();Future<?> drained=drain.submit(()->{try(InputStream in=child.getInputStream();OutputStream out=Files.newOutputStream(log)){byte[] buffer=new byte[16384];long written=0;int n;while((n=in.read(buffer))!=-1){int save=(int)Math.min(n,Math.max(0,2*1024*1024-written));if(save>0){out.write(buffer,0,save);written+=save;}}}catch(IOException e){throw new UncheckedIOException(e);}});
        try{if(!child.waitFor(10,TimeUnit.MINUTES)){child.destroyForcibly();throw new IOException("加载器安装步骤超时");}drained.get(10,TimeUnit.SECONDS);if(child.exitValue()!=0)throw new IOException("加载器安装失败，退出码 "+child.exitValue()+"\n"+new String(Files.readAllBytes(log),StandardCharsets.UTF_8));}
        finally{if(child.isAlive())child.destroyForcibly();drain.shutdownNow();}
    }
    private String literal(String text,Map<String,String> vars)throws IOException{
        if(text.startsWith("[")&&text.endsWith("]"))return owner.resolve("libraries/"+GameInstaller.maven(text.substring(1,text.length()-1))).toString();
        if(text.startsWith("'")&&text.endsWith("'"))return text.substring(1,text.length()-1);
        Matcher matcher=Pattern.compile("\\{([^}]+)\\}").matcher(text);StringBuffer result=new StringBuffer();while(matcher.find()){String value=vars.get(matcher.group(1));if(value==null)throw new IOException("未知安装变量: "+matcher.group(1));matcher.appendReplacement(result,Matcher.quoteReplacement(value));}matcher.appendTail(result);return result.toString();
    }
    private static JsonObject json(JarFile jar,String name)throws IOException{
        JarEntry entry=jar.getJarEntry(name.replaceFirst("^/",""));if(entry==null||entry.getSize()>IO.MAX_JSON)throw new IOException("无效安装元数据: "+name);
        try(Reader reader=new InputStreamReader(jar.getInputStream(entry),StandardCharsets.UTF_8)){return JsonParser.parseReader(reader).getAsJsonObject();}catch(RuntimeException e){throw new IOException("安装元数据解析失败",e);}
    }
    static void extract(JarFile jar,String name,Path target)throws IOException{
        JarEntry entry=jar.getJarEntry(name.replaceFirst("^/",""));if(entry==null||entry.isDirectory()||entry.getSize()>1L<<30)throw new IOException("安装器缺少文件或文件过大: "+name);IO.noLinks(target);Files.createDirectories(target.getParent());Path temp=Files.createTempFile(target.getParent(),".installer-",".tmp");
        try{try(InputStream in=jar.getInputStream(entry);OutputStream out=Files.newOutputStream(temp)){byte[] buffer=new byte[131072];long total=0;int n;while((n=in.read(buffer))!=-1){total+=n;if(total>1L<<30)throw new IOException("安装器解压文件过大");out.write(buffer,0,n);}}IO.move(temp,target);}finally{Files.deleteIfExists(temp);}
    }
}
