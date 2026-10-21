package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import java.util.regex.*;
import java.util.zip.*;

/** Forge/NeoForge install_profile planner, independent of desktop launcher implementations. */
public final class InstallerPlan {
    public final File installer,root,work;
    public final String minecraft;
    public final int javaMajor;
    public final List<Processor> processors;
    private final JSONObject profile,version;
    private final Map<String,String> variables;
    private final Map<String,File> extractions;
    private final List<RuntimeDownloads.FileSpec> libraries;
    private final String installerSha256;
    public static final class Processor {
        public final String jar;
        public final List<File> classpath;
        public final List<String> arguments;
        public final Map<File,String> outputs;
        public final List<File> generatedFiles;
        private Processor(String jar,List<File> cp,List<String> args,Map<File,String> outputs,List<File> generated) {
            this.jar=jar;classpath=Collections.unmodifiableList(cp);arguments=Collections.unmodifiableList(args);this.outputs=Collections.unmodifiableMap(outputs);
            generatedFiles=Collections.unmodifiableList(generated);
        }
    }
    private InstallerPlan(File installer,File root,File work,String minecraft,int javaMajor,JSONObject profile,JSONObject version,
                          Map<String,String> variables,Map<String,File> extractions,List<RuntimeDownloads.FileSpec> libraries,List<Processor> processors,String fingerprint) {
        this.installer=installer;this.root=root;this.work=work;this.minecraft=minecraft;this.javaMajor=javaMajor;
        this.profile=profile;this.version=version;this.variables=variables;this.extractions=extractions;this.libraries=libraries;
        this.processors=Collections.unmodifiableList(processors);
        installerSha256=fingerprint;
    }
    public JSONObject versionMetadata() throws Exception {return new JSONObject(version.toString());}
    public Map<String,String> data() {return Collections.unmodifiableMap(variables);}
    public List<RuntimeDownloads.FileSpec> dependencies() {return Collections.unmodifiableList(libraries);}
    public static RuntimeDownloads.FileSpec artifact(File root,String minecraft,String type,String loaderVersion,String sha256) throws Exception {
        RuntimeFiles.id(minecraft);RuntimeFiles.id(loaderVersion);String coordinate,repository;
        if(type.equals("forge")){coordinate="net.minecraftforge:forge:"+(loaderVersion.startsWith(minecraft+"-")?loaderVersion:minecraft+"-"+loaderVersion)+":installer";repository="https://maven.minecraftforge.net/";}
        else if(type.equals("neoforge")){coordinate="net.neoforged:neoforge:"+loaderVersion+":installer";repository="https://maven.neoforged.net/releases/";}
        else throw new IOException("Unsupported installer type");
        String path=RuntimeFiles.maven(coordinate);return new RuntimeDownloads.FileSpec(RuntimeFiles.inside(root,"libraries/"+path),repository+path,"",sha256,-1);
    }
    public static InstallerPlan read(File installer,File root,String minecraft,int javaMajor,GamePreparation.Context context) throws Exception {
        RuntimeFiles.id(minecraft);RuntimeFiles.noLinks(installer);RuntimeFiles.noLinks(root);
        String fingerprint=RuntimeFiles.hash(installer,"SHA-256");File work=RuntimeFiles.inside(root,".hxz/installers/"+fingerprint);
        try(JarFile archive=new JarFile(installer)) {
            JSONObject profile=json(archive,"install_profile.json");
            if(!minecraft.equals(profile.optString("minecraft")))throw new IOException("Installer Minecraft version mismatch");
            if(profile.has("versionInfo"))throw new IOException("Legacy Forge installer format is unsupported; no installation was marked complete");
            JSONObject version=json(archive,profile.optString("json","/version.json"));
            if(!minecraft.equals(version.optString("inheritsFrom",minecraft)))throw new IOException("Loader inheritance mismatch");
            Map<String,String> vars=new LinkedHashMap<>();Map<String,File> extractions=new LinkedHashMap<>();
            vars.put("SIDE","client");vars.put("MINECRAFT_VERSION",minecraft);vars.put("ROOT",root.getAbsolutePath());
            vars.put("INSTALLER",installer.getAbsolutePath());vars.put("LIBRARY_DIR",new File(root,"libraries").getAbsolutePath());
            vars.put("MINECRAFT_JAR",RuntimeFiles.inside(root,"versions/"+minecraft+"/"+minecraft+".jar").getAbsolutePath());
            JSONObject data=profile.optJSONObject("data");Map<String,String> raw=new LinkedHashMap<>();
            if(data!=null)for(Iterator<String> it=data.keys();it.hasNext();) {
                String key=it.next();if(vars.containsKey(key))throw new IOException("Installer overrides reserved variable: "+key);
                Object value=data.get(key);String client=value instanceof JSONObject?((JSONObject)value).optString("client",null):value instanceof String?(String)value:null;
                if(client==null)throw new IOException("Missing client data value: "+key);
                if(client.startsWith("/")) {
                    String entry=entryName(client);File target=RuntimeFiles.inside(work,"data/"+entry);
                    requireEntry(archive,entry,1L<<30);extractions.put(entry,target);vars.put(key,target.getAbsolutePath());
                }else raw.put(key,client);
            }
            for(String key:raw.keySet())resolveData(key,raw,vars,new HashSet<>(),root);
            GamePreparation preparation=new GamePreparation(root,new RuntimeDownloads());List<RuntimeDownloads.FileSpec> dependencies=preparation.libraries(profile,context);
            // Installer jars commonly bundle their own loader core under maven/.
            LinkedHashSet<String> embedded=new LinkedHashSet<>();JSONArray declared=profile.optJSONArray("libraries");
            if(declared!=null)for(int i=0;i<declared.length();i++)embedded.add(declared.getJSONObject(i).getString("name"));
            if(profile.has("path"))embedded.add(profile.getString("path"));
            for(String coordinate:embedded) {
                String path=RuntimeFiles.maven(coordinate),entry="maven/"+path;
                if(archive.getJarEntry(entry)!=null){requireEntry(archive,entry,1L<<30);extractions.put(entry,RuntimeFiles.inside(root,"libraries/"+path));}
            }
            JSONArray steps=profile.optJSONArray("processors");List<Processor> processors=new ArrayList<>();
            if(steps!=null) {
                if(steps.length()>100)throw new IOException("Installer processor count exceeded");
                for(int i=0;i<steps.length();i++) {
                    JSONObject step=steps.getJSONObject(i);JSONArray sides=step.optJSONArray("sides");
                    if(sides!=null) {boolean client=false;for(int s=0;s<sides.length();s++)client|="client".equals(sides.getString(s));if(!client)continue;}
                    String jar=step.getString("jar");File executable=RuntimeFiles.inside(root,"libraries/"+RuntimeFiles.maven(jar));List<File> cp=new ArrayList<>();cp.add(executable);
                    JSONArray classpath=step.optJSONArray("classpath");if(classpath!=null)for(int n=0;n<classpath.length();n++)cp.add(RuntimeFiles.inside(root,"libraries/"+RuntimeFiles.maven(classpath.getString(n))));
                    List<String> args=new ArrayList<>();JSONArray arguments=step.optJSONArray("args");if(arguments!=null)for(int n=0;n<arguments.length();n++)args.add(literal(arguments.getString(n),vars,root));
                    Map<File,String> outputs=new LinkedHashMap<>();JSONObject out=step.optJSONObject("outputs");
                    if(out!=null)for(Iterator<String> it=out.keys();it.hasNext();) {
                        String key=it.next();File file=confined(literal(key,vars,root),root,work);String hash=literal(out.getString(key),vars,root);
                        if(!hash.matches("(?i)[a-f0-9]{40}"))throw new IOException("Invalid processor output hash");outputs.put(file,hash);
                    }
                    List<File> generated=new ArrayList<>(outputs.keySet());
                    for(int n=0;n+1<args.size();n++)if(Arrays.asList("--output","--slim","--extra","--to").contains(args.get(n))) {
                        String output=args.get(n+1);if(!output.startsWith("--")&&!output.endsWith("/")&&!output.endsWith("\\")) {
                            File file=confined(output,root,work);if(!generated.contains(file))generated.add(file);
                        }
                    }
                    processors.add(new Processor(jar,new ArrayList<>(new LinkedHashSet<>(cp)),args,outputs,generated));
                }
            }
            return new InstallerPlan(installer,root,work,minecraft,javaMajor,profile,version,vars,extractions,dependencies,processors,fingerprint);
        }
    }
    /** On any failure the pending transaction remains; generated metadata is published last. */
    public String execute(String targetId,EngineHost host,RuntimeDownloads downloads,GamePreparation.Context context,
                          EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        RuntimeFiles.id(targetId);Objects.requireNonNull(host,"A real EngineHost is required");cancel.check();
        if(!installerSha256.equals(RuntimeFiles.hash(installer,"SHA-256")))throw new IOException("Installer archive changed after planning");
        File target=RuntimeFiles.inside(root,"versions/"+targetId+"/"+targetId+".json");
        File pending=RuntimeFiles.inside(root,"versions/"+targetId+"/.hxz-install-pending.json");
        RuntimeFiles.writeJson(pending,new JSONObject().put("installerSha256",RuntimeFiles.hash(installer,"SHA-256")).put("minecraft",minecraft));
        Files.createDirectories(work.toPath());
        try(JarFile archive=new JarFile(installer)) {
            for(Map.Entry<String,File> extraction:extractions.entrySet()){cancel.check();extract(archive,extraction.getKey(),extraction.getValue(),cancel);RuntimeDownloads.pin(extraction.getValue());}
        }
        List<RuntimeDownloads.FileSpec> downloadable=new ArrayList<>();for(RuntimeDownloads.FileSpec dependency:libraries)if(!dependency.url.isEmpty())downloadable.add(dependency);
        downloads.fetchAll(downloadable,cancel,progress);
        int index=0;Map<String,JSONObject> receipts=new LinkedHashMap<>();
        for(Processor processor:processors) {
            cancel.check();if(progress!=null)progress.update("installer",processor.jar,index,processors.size());
            boolean valid=!processor.outputs.isEmpty();
            for(Map.Entry<File,String> output:processor.outputs.entrySet())valid&=new RuntimeDownloads.FileSpec(output.getKey(),"",output.getValue(),-1).valid();
            if(!valid) {
                Map<String,String> options=options(processor.arguments);
                if("DOWNLOAD_MOJMAPS".equals(options.get("--task"))&&"client".equals(options.get("--side"))) {
                    String v=options.get("--version"),output=options.get("--output");
                    if(!minecraft.equals(v)||output==null)throw new IOException("Invalid mappings processor arguments");
                    JSONObject mappings=RuntimeFiles.json(RuntimeFiles.inside(root,"versions/"+minecraft+"/"+minecraft+".json")).getJSONObject("downloads").getJSONObject("client_mappings");
                    downloads.fetch(new RuntimeDownloads.FileSpec(confined(output,root,work),mappings.getString("url"),mappings.getString("sha1"),mappings.getLong("size")),cancel,progress);
                } else {
                    for(File dependency:processor.classpath) {RuntimeFiles.noLinks(dependency);if(!dependency.isFile())throw new IOException("Missing processor dependency: "+dependency);}
                    String main;
                    try(JarFile jar=new JarFile(processor.classpath.get(0))){Manifest manifest=jar.getManifest();main=manifest==null?null:manifest.getMainAttributes().getValue("Main-Class");}
                    if(main==null)throw new IOException("Processor has no Main-Class: "+processor.jar);
                    EngineHost.JavaJob job=new EngineHost.JavaJob(javaMajor,main,work,processor.classpath,
                            Arrays.asList("-Xmx512m","-Djava.awt.headless=true"),processor.arguments);
                    int exit=host.runJava(job,cancel,progress);cancel.check();
                    if(exit!=0)throw new IOException("Installer processor failed: "+processor.jar+" (exit "+exit+")");
                }
                for(Map.Entry<File,String> output:processor.outputs.entrySet())
                    if(!new RuntimeDownloads.FileSpec(output.getKey(),"",output.getValue(),-1).valid())throw new IOException("Processor output integrity mismatch: "+output.getKey());
            }
            for(File output:processor.generatedFiles) {
                RuntimeDownloads.pin(output);
                if(output.getName().endsWith(".jar"))try(JarFile generated=new JarFile(output)){if(!generated.entries().hasMoreElements())throw new IOException("Empty generated jar: "+output);}
                if(output.toPath().toAbsolutePath().normalize().startsWith(root.toPath().toAbsolutePath().normalize())) {
                    String relative=root.toPath().toAbsolutePath().normalize().relativize(output.toPath().toAbsolutePath().normalize()).toString().replace('\\','/');
                    receipts.put(relative,new JSONObject().put("path",relative).put("sha256",RuntimeFiles.hash(output,"SHA-256")).put("size",output.length()));
                }
            }index++;
        }
        // No-URL declarations are generated outputs. They are checked only after processors ran.
        for(RuntimeDownloads.FileSpec dependency:libraries) {
            if(!dependency.valid())throw new IOException("Installer dependency missing/corrupt after processors: "+dependency.file);
        }
        JSONObject activated=versionMetadata();activated.put("id",targetId);activated.put("inheritsFrom",minecraft);
        activated.put("hxzInstallFiles",new JSONArray(receipts.values()));
        GamePreparation preparation=new GamePreparation(root,downloads);
        JSONObject merged=GamePreparation.merge(preparation.readVersion(minecraft),activated);
        if(!activated.has("jar"))merged.put("jar",minecraft);
        preparation.ensureFiles(merged,context,cancel,progress);
        cancel.check();RuntimeFiles.writeJson(target,activated);RuntimeDownloads.pin(target);
        Files.delete(pending.toPath());
        GamePreparation.InstallationState state=preparation.inspect(targetId,context);
        if(!state.complete){RuntimeFiles.writeJson(pending,new JSONObject().put("error",String.join("; ",state.problems)));throw new IOException("Final installation verification failed: "+state.problems);}
        return targetId;
    }
    private static Map<String,String> options(List<String> args) {
        Map<String,String> result=new HashMap<>();for(int i=0;i+1<args.size();i++)if(args.get(i).startsWith("--")&&!args.get(i+1).startsWith("--"))result.put(args.get(i),args.get(i+1));return result;
    }
    private static String resolveData(String key,Map<String,String> raw,Map<String,String> vars,Set<String> resolving,File root)throws Exception {
        if(vars.containsKey(key))return vars.get(key);if(!resolving.add(key)||resolving.size()>64)throw new IOException("Cyclic installer data variable: "+key);
        String value=raw.get(key);if(value==null)throw new IOException("Unknown installer variable: "+key);
        Matcher matcher=Pattern.compile("\\{([^}]+)\\}").matcher(value);
        while(matcher.find())resolveData(matcher.group(1),raw,vars,resolving,root);
        value=literal(value,vars,root);vars.put(key,value);resolving.remove(key);return value;
    }
    public static String literal(String value,Map<String,String> vars,File root)throws Exception {
        if(value.startsWith("'")&&value.endsWith("'")&&value.length()>=2)return value.substring(1,value.length()-1);
        Matcher matcher=Pattern.compile("\\{([^}]+)\\}").matcher(value);StringBuffer result=new StringBuffer();
        while(matcher.find()){String replacement=vars.get(matcher.group(1));if(replacement==null)throw new IOException("Unknown installer variable: "+matcher.group(1));matcher.appendReplacement(result,Matcher.quoteReplacement(replacement));}
        matcher.appendTail(result);String text=result.toString();
        if(text.startsWith("[")&&text.endsWith("]"))return RuntimeFiles.inside(root,"libraries/"+RuntimeFiles.maven(text.substring(1,text.length()-1))).getAbsolutePath();
        return text;
    }
    private static File confined(String value,File root,File work)throws Exception {
        File file=new File(value);if(!file.isAbsolute())file=new File(work,value);file=file.getAbsoluteFile();RuntimeFiles.noLinks(file);
        Path path=file.toPath().normalize(),base=root.getCanonicalFile().toPath(),temp=work.getCanonicalFile().toPath();
        if(!path.startsWith(base)&&!path.startsWith(temp))throw new IOException("Processor output escapes instance root");
        if(path.equals(base)||path.equals(temp))throw new IOException("Processor output cannot replace directory root");return path.toFile();
    }
    private static String entryName(String name)throws IOException {
        String value=name.startsWith("/")?name.substring(1):name;
        if(value.isEmpty()||value.indexOf('\\')>=0||value.indexOf('\0')>=0)throw new IOException("Invalid archive path");
        for(String part:value.split("/",-1))if(part.isEmpty()||part.equals(".")||part.equals("..")||part.indexOf(':')>=0)throw new IOException("Invalid archive path");return value;
    }
    private static JarEntry requireEntry(JarFile archive,String name,long maximum)throws IOException {
        JarEntry entry=archive.getJarEntry(entryName(name));if(entry==null||entry.isDirectory()||entry.getSize()>maximum)throw new IOException("Missing/oversized installer entry: "+name);return entry;
    }
    private static JSONObject json(JarFile archive,String name)throws Exception {
        JarEntry entry=requireEntry(archive,entryName(name),8*1024*1024);ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        try(InputStream in=archive.getInputStream(entry)){byte[] buffer=new byte[16384];int n;while((n=in.read(buffer))!=-1){if(bytes.size()+n>8*1024*1024)throw new IOException("Installer metadata too large");bytes.write(buffer,0,n);}}
        return new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
    }
    private static void extract(JarFile archive,String entryName,File target,EngineHost.Cancellation cancel)throws Exception {
        JarEntry entry=requireEntry(archive,entryName,1L<<30);RuntimeFiles.noLinks(target);Files.createDirectories(target.getParentFile().toPath());
        File partial=File.createTempFile(".installer-",".tmp",target.getParentFile());
        try {
            try(InputStream in=archive.getInputStream(entry);OutputStream out=new FileOutputStream(partial)) {
                byte[] buffer=new byte[131072];long total=0;int n;while((n=in.read(buffer))!=-1){cancel.check();total+=n;if(total>1L<<30)throw new IOException("Installer entry exceeds limit");out.write(buffer,0,n);}
            }RuntimeFiles.replace(partial,target);
        } finally {Files.deleteIfExists(partial.toPath());}
    }
}
