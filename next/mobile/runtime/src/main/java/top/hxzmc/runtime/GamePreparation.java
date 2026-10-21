package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Independent metadata planner. Algorithms follow this project's PC minecraft/java-policy modules. */
public final class GamePreparation {
    public static final String MANIFEST="https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
    public final File root;
    private final RuntimeDownloads downloads;
    public GamePreparation(File root,RuntimeDownloads downloads) throws IOException {
        this.root=root.getAbsoluteFile();RuntimeFiles.noLinks(this.root);this.downloads=Objects.requireNonNull(downloads);
    }
    public static final class Context {
        public final File run,natives;
        public final String name,uuid,accessToken,userType,xuid,clientId;
        public final String osName,osArch,osVersion;
        public final int memoryMB,width,height;
        public final Map<String,Boolean> features;
        public Context(File run,File natives,String name,String uuid,String token,String userType,String xuid,String clientId,
                       int memoryMB,int width,int height,Map<String,Boolean> features) {
            this(run,natives,name,uuid,token,userType,xuid,clientId,memoryMB,width,height,features,"linux","aarch64",System.getProperty("os.version",""));
        }
        public Context(File run,File natives,String name,String uuid,String token,String userType,String xuid,String clientId,
                       int memoryMB,int width,int height,Map<String,Boolean> features,String osName,String osArch,String osVersion) {
            if(memoryMB<256||memoryMB>131072||width<1||height<1)throw new IllegalArgumentException("Invalid memory/window settings");
            this.run=run;this.natives=natives;this.name=Objects.requireNonNull(name);this.uuid=Objects.requireNonNull(uuid);
            accessToken=Objects.requireNonNull(token);this.userType=Objects.requireNonNull(userType);this.xuid=xuid==null?"":xuid;
            this.clientId=clientId==null?"":clientId;this.memoryMB=memoryMB;this.width=width;this.height=height;
            this.features=Collections.unmodifiableMap(new HashMap<>(features));this.osName=osName;this.osArch=osArch;this.osVersion=osVersion;
        }
    }
    public static final class InstallationState {
        public final boolean complete; public final List<String> problems;
        InstallationState(List<String> problems){complete=problems.isEmpty();this.problems=Collections.unmodifiableList(problems);}
    }
    /** Install a resolved HXZUP/manual profile under the requested stable instance id. */
    public String installGame(JSONObject requested,String targetId,Context context,EngineHost host,
                              EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        RuntimeFiles.id(targetId);String minecraft=requested.getString("gameVersion");RuntimeFiles.id(minecraft);
        File pending=RuntimeFiles.inside(root,"versions/"+targetId+"/.hxz-install-pending.json");
        RuntimeFiles.writeJson(pending,new JSONObject().put("request",requested));
        JSONObject vanilla=installVanilla(minecraft,context,cancel,progress),activated=new JSONObject().put("id",targetId).put("inheritsFrom",minecraft);
        JSONObject loader=requested.optJSONObject("loader");String type=loader==null?"":loader.optString("type",""),version=loader==null?"":loader.optString("version","");
        if(type.equals("vanilla"))type="";
        if(!type.isEmpty()&&targetId.equals(minecraft))throw new IOException("Loader instance id must differ from its vanilla parent");
        if(type.equals("fabric")||type.equals("quilt")) {
            if(version.isEmpty())version=latestStableLoader(minecraft,type,cancel,progress);
            activated=installLoaderProfile(minecraft,type,version,context,cancel,progress);activated.put("id",targetId);
        }else if(type.equals("forge")||type.equals("neoforge")) {
            if(version.isEmpty())throw new IOException("Forge/NeoForge installation requires a pinned loader version");
            RuntimeDownloads.FileSpec archive=InstallerPlan.artifact(root,minecraft,type,version,loader.optString("installerSha256",""));
            downloads.fetch(archive,cancel,progress);
            InstallerPlan.read(archive.file,root,minecraft,javaMajor(vanilla),context).execute(targetId,host,downloads,context,cancel,progress);
            activated=RuntimeFiles.json(versionFile(targetId));
            RuntimeFiles.writeJson(pending,new JSONObject().put("request",requested));
        }else if(!type.isEmpty())throw new IOException("Unsupported loader: "+type);
        if(targetId.equals(minecraft)&&type.isEmpty())activated=vanilla;
        if(requested.optBoolean("fabricAPI")) {
            if(!type.equals("fabric"))throw new IOException("Fabric API requires a Fabric profile");
            RuntimeDownloads.FileSpec api=installFabricApi(minecraft,context,cancel,progress);
            JSONArray extra=activated.optJSONArray("hxzInstallFiles");if(extra==null)extra=new JSONArray();
            String relative=root.toPath().toAbsolutePath().normalize().relativize(api.file.toPath().toAbsolutePath().normalize()).toString().replace('\\','/');
            extra.put(new JSONObject().put("path",relative).put("sha256",RuntimeFiles.hash(api.file,"SHA-256")).put("size",api.file.length()));activated.put("hxzInstallFiles",extra);
        }
        activated.put("hxzGameProfile",new JSONObject().put("gameVersion",minecraft).put("loader",new JSONObject().put("type",type).put("version",version)).put("fabricAPI",requested.optBoolean("fabricAPI")));
        cancel.check();File target=versionFile(targetId);RuntimeFiles.writeJson(target,activated);RuntimeDownloads.pin(target);Files.deleteIfExists(pending.toPath());
        InstallationState state=inspect(targetId,context);
        if(!state.complete){RuntimeFiles.writeJson(pending,new JSONObject().put("problems",new JSONArray(state.problems)));throw new IOException("Installation incomplete: "+state.problems);}
        return targetId;
    }
    private JSONArray metadataArray(String url,String name,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        File file=RuntimeFiles.inside(root,".hxz/metadata/"+name+".json");
        Files.deleteIfExists(new File(file.getPath()+".hxz-sha256").toPath());downloads.fetch(new RuntimeDownloads.FileSpec(file,url,"",-1),cancel,progress);
        if(file.length()>8*1024*1024)throw new IOException("Metadata array too large");return new JSONArray(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8));
    }
    public String latestStableLoader(String minecraft,String loader,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        RuntimeFiles.id(minecraft);if(!Arrays.asList("fabric","quilt").contains(loader))throw new IOException("Unsupported loader catalog");
        String base=loader.equals("fabric")?"https://meta.fabricmc.net/v2":"https://meta.quiltmc.org/v3";
        JSONArray records=metadataArray(base+"/versions/loader/"+minecraft,loader+"-"+minecraft+"-loaders",cancel,progress);
        String fallback=null;for(int i=0;i<records.length();i++) {
            JSONObject record=records.getJSONObject(i).getJSONObject("loader");String version=record.getString("version");RuntimeFiles.id(version);
            if(fallback==null)fallback=version;if(record.optBoolean("stable",loader.equals("quilt")))return version;
        }
        if(fallback==null)throw new IOException("No compatible loader found for "+minecraft);
        // Fabric's stable flag is authoritative; do not silently choose an experimental loader.
        throw new IOException("No stable loader found for "+minecraft);
    }
    public RuntimeDownloads.FileSpec installFabricApi(String minecraft,Context context,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        RuntimeFiles.id(minecraft);
        String query="?loaders="+URLEncoder.encode("[\"fabric\"]","UTF-8")+"&game_versions="+URLEncoder.encode(new JSONArray().put(minecraft).toString(),"UTF-8");
        JSONArray releases=metadataArray("https://api.modrinth.com/v2/project/fabric-api/version"+query,"fabric-api-"+minecraft,cancel,progress);
        JSONObject selected=null;for(int i=0;i<releases.length();i++) {
            JSONObject release=releases.getJSONObject(i);if(!"release".equals(release.optString("version_type")))continue;
            if(!contains(release.getJSONArray("game_versions"),minecraft)||!contains(release.getJSONArray("loaders"),"fabric"))continue;
            selected=release;break;
        }
        if(selected==null)throw new IOException("No compatible Fabric API release for "+minecraft);
        JSONArray files=selected.getJSONArray("files");JSONObject record=null;
        for(int i=0;i<files.length();i++)if(files.getJSONObject(i).optBoolean("primary")){if(record!=null)throw new IOException("Ambiguous Fabric API primary file");record=files.getJSONObject(i);}
        if(record==null&&files.length()==1)record=files.getJSONObject(0);if(record==null)throw new IOException("Fabric API primary file absent");
        String filename=record.getString("filename");if(!filename.matches("fabric-api-[A-Za-z0-9_.+\\-]+\\.jar"))throw new IOException("Invalid Fabric API filename");
        File target=RuntimeFiles.inside(context.run,"mods/"+filename);
        if(!target.toPath().toAbsolutePath().normalize().startsWith(root.toPath().toAbsolutePath().normalize()))throw new IOException("Mod directory must be under game root");
        RuntimeDownloads.FileSpec spec=new RuntimeDownloads.FileSpec(target,record.getString("url"),record.getJSONObject("hashes").getString("sha1"),record.getLong("size"));
        downloads.fetch(spec,cancel,progress);
        try(DirectoryStream<Path> old=Files.newDirectoryStream(target.getParentFile().toPath())) {
            for(Path entry:old)if(entry.getFileName().toString().matches("fabric-api-[A-Za-z0-9_.+\\-]+\\.jar")&&!entry.toFile().equals(target)) {
                cancel.check();RuntimeFiles.noLinks(entry.toFile());Files.delete(entry);Files.deleteIfExists(new File(entry.toString()+".hxz-sha256").toPath());
            }
        }
        return spec;
    }
    private static boolean contains(JSONArray values,String value)throws Exception {for(int i=0;i<values.length();i++)if(value.equals(values.getString(i)))return true;return false;}
    /** Never equates a version JSON with a complete installation. Hashes all required files. */
    public InstallationState inspect(String id,Context context) {
        List<String> problems=new ArrayList<>();
        try {
            File pending=RuntimeFiles.inside(root,"versions/"+id+"/.hxz-install-pending.json");
            if(pending.exists())problems.add("Installation transaction is pending");
            JSONObject metadata=readVersion(id);
            JSONObject index=assetIndex(metadata);
            for(RuntimeDownloads.FileSpec file:files(metadata,index,context))if(!file.valid())problems.add("Missing or corrupt: "+file.file);
            for(File file:metadataChain(id,new HashSet<>()))if(!new RuntimeDownloads.FileSpec(file,"","",-1).valid())problems.add("Unverified metadata: "+file);
            if(index!=null)verifyLegacyMaps(metadata,index,context,problems);
            javaMajor(metadata);
            if(metadata.optString("mainClass").isEmpty())problems.add("Missing main class");
        } catch(Exception e){problems.add(e.getMessage()==null?e.getClass().getSimpleName():e.getMessage());}
        return new InstallationState(problems);
    }
    public JSONObject installVanilla(String id,Context context,EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        RuntimeFiles.id(id);
        File catalog=RuntimeFiles.inside(root,".hxz/metadata/version_manifest_v2.json");
        // Manifest is mutable: refresh it, unlike immutable SHA-addressed version records.
        Files.deleteIfExists(new File(catalog.getPath()+".hxz-sha256").toPath());
        downloads.fetch(new RuntimeDownloads.FileSpec(catalog,MANIFEST,"",-1),cancel,progress);
        JSONArray versions=RuntimeFiles.json(catalog).getJSONArray("versions");JSONObject record=null;
        for(int i=0;i<versions.length();i++)if(id.equals(versions.getJSONObject(i).optString("id"))){record=versions.getJSONObject(i);break;}
        if(record==null)throw new IOException("Minecraft version absent from official manifest: "+id);
        File staged=RuntimeFiles.inside(root,".hxz/metadata/"+id+".json");
        downloads.fetch(new RuntimeDownloads.FileSpec(staged,record.getString("url"),record.getString("sha1"),-1),cancel,progress);
        JSONObject metadata=RuntimeFiles.json(staged);
        if(!id.equals(metadata.getString("id"))||metadata.has("inheritsFrom"))throw new IOException("Unexpected vanilla metadata identity");
        ensureFiles(metadata,context,cancel,progress);
        File target=versionFile(id);RuntimeFiles.writeJson(target,metadata);RuntimeDownloads.pin(target);
        return metadata;
    }
    public JSONObject installLoaderProfile(String minecraft,String loader,String version,Context context,
                                           EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        if(!Arrays.asList("fabric","quilt").contains(loader))throw new IOException("Use InstallerPlan for Forge/NeoForge");
        RuntimeFiles.id(minecraft);RuntimeFiles.id(version);
        String service=loader.equals("fabric")?"https://meta.fabricmc.net/v2":"https://meta.quiltmc.org/v3";
        String id=minecraft+"-"+loader+"-"+version;RuntimeFiles.id(id);
        File staged=RuntimeFiles.inside(root,".hxz/metadata/"+id+".json");
        downloads.fetch(new RuntimeDownloads.FileSpec(staged,service+"/versions/loader/"+minecraft+"/"+version+"/profile/json","",-1),cancel,progress);
        JSONObject extension=RuntimeFiles.json(staged);
        if(!minecraft.equals(extension.getString("inheritsFrom")))throw new IOException("Loader inherited game mismatch");
        extension.put("id",id);JSONObject merged=merge(readVersion(minecraft),extension);
        ensureFiles(merged,context,cancel,progress);
        File target=versionFile(id);RuntimeFiles.writeJson(target,extension);RuntimeDownloads.pin(target);return extension;
    }
    public LaunchPlan prepare(String id,Context context,EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        JSONObject metadata=readVersion(id); ensureFiles(metadata,context,cancel,progress);
        InstallationState state=inspect(id,context);if(!state.complete)throw new IOException("Installation incomplete: "+String.join("; ",state.problems));
        return launch(id,metadata,context);
    }
    public void ensureFiles(JSONObject metadata,Context context,EngineHost.Cancellation cancel,EngineHost.Progress progress) throws Exception {
        JSONObject asset=metadata.optJSONObject("assetIndex");JSONObject index=null;
        if(asset!=null) {
            RuntimeDownloads.FileSpec indexSpec=assetIndexSpec(asset);downloads.fetch(indexSpec,cancel,progress);index=RuntimeFiles.json(indexSpec.file);
        }
        List<RuntimeDownloads.FileSpec> required=files(metadata,index,context);
        required.sort((a,b)->Long.compare(b.size,a.size));
        downloads.fetchAll(required,cancel,progress);
        if(index!=null)mapLegacyAssets(metadata,index,context,cancel);
    }
    private File versionFile(String id)throws Exception {RuntimeFiles.id(id);return RuntimeFiles.inside(root,"versions/"+id+"/"+id+".json");}
    public JSONObject readVersion(String id)throws Exception{return readVersion(id,new HashSet<>());}
    private JSONObject readVersion(String id,Set<String> seen)throws Exception {
        if(seen.size()>=12||!seen.add(id))throw new IOException("Version inheritance cycle or depth exceeded");
        JSONObject value=RuntimeFiles.json(versionFile(id));
        if(!id.equals(value.optString("id")))throw new IOException("Version metadata identity mismatch");
        if(value.has("inheritsFrom")) {
            String parent=value.getString("inheritsFrom");JSONObject base=readVersion(parent,seen);
            // Inherited profiles use the vanilla jar unless explicitly overridden.
            if(!value.has("jar"))value.put("jar",base.optString("jar",parent));
            return merge(base,value);
        }
        return merge(new JSONObject(),value);
    }
    private List<File> metadataChain(String id,Set<String> seen)throws Exception {
        if(seen.size()>=12||!seen.add(id))throw new IOException("Version inheritance cycle");
        File file=versionFile(id);JSONObject value=RuntimeFiles.json(file);List<File> result=new ArrayList<>();result.add(file);
        if(value.has("inheritsFrom"))result.addAll(metadataChain(value.getString("inheritsFrom"),seen));return result;
    }
    public static JSONObject merge(JSONObject base,JSONObject extension)throws Exception {
        JSONObject result=new JSONObject(base.toString());
        for(Iterator<String> it=extension.keys();it.hasNext();) {String key=it.next();if(!key.equals("libraries")&&!key.equals("arguments"))result.put(key,extension.get(key));}
        LinkedHashMap<String,JSONObject> libraries=new LinkedHashMap<>();
        for(JSONObject source:Arrays.asList(base,extension)) {
            JSONArray entries=source.optJSONArray("libraries"); if(entries==null)continue;
            for(int i=0;i<entries.length();i++) {
                JSONObject library=entries.getJSONObject(i);String name=library.getString("name");RuntimeFiles.maven(name);
                String[] extensionParts=name.split("@",-1),p=extensionParts[0].split(":");
                String key=p[0]+":"+p[1]+":"+(p.length==4?p[3]:"")+"@"+(extensionParts.length==2?extensionParts[1]:"jar");libraries.put(key,new JSONObject(library.toString()));
            }
        }
        result.put("libraries",new JSONArray(libraries.values()));JSONObject arguments=new JSONObject();
        for(String kind:Arrays.asList("jvm","game")) {
            JSONArray combined=new JSONArray();for(JSONObject source:Arrays.asList(base,extension)) {
                JSONObject args=source.optJSONObject("arguments");JSONArray values=args==null?null:args.optJSONArray(kind);
                if(values!=null)for(int i=0;i<values.length();i++)combined.put(values.get(i));
            }arguments.put(kind,combined);
        }
        result.put("arguments",arguments);return result;
    }
    public static int javaMajor(JSONObject metadata)throws Exception {
        JSONObject java=metadata.optJSONObject("javaVersion");
        if(java!=null&&java.has("majorVersion")) {int major=java.getInt("majorVersion");if(major<8||major>99)throw new IOException("Invalid Java metadata");return major;}
        List<String> ids=new ArrayList<>();JSONArray patches=metadata.optJSONArray("patches");
        if(patches!=null)for(int i=0;i<patches.length();i++)if("game".equals(patches.getJSONObject(i).optString("id")))ids.add(patches.getJSONObject(i).optString("version"));
        for(String key:Arrays.asList("inheritsFrom","gameVersion","id"))ids.add(metadata.optString(key));
        JSONObject asset=metadata.optJSONObject("assetIndex");if(asset!=null)ids.add(asset.optString("id"));
        for(String id:ids) {
            if(id.matches("26\\.\\d+(?:[.-].*)?"))return 25;
            Matcher match=Pattern.compile("^1\\.(\\d+)(?:\\.(\\d+))?(?:-(?:pre|rc)\\d+)?$").matcher(id);
            if(match.matches()){int minor=Integer.parseInt(match.group(1)),patch=match.group(2)==null?0:Integer.parseInt(match.group(2));return minor>20||minor==20&&patch>=5?21:minor>=18?17:minor==17?16:8;}
        }
        throw new IOException("Java requirement absent and game version unknown");
    }
    public static boolean allowed(JSONArray rules,Context context)throws Exception {
        if(rules==null||rules.length()==0)return true;boolean result=false;
        for(int i=0;i<rules.length();i++) {
            JSONObject rule=rules.getJSONObject(i),os=rule.optJSONObject("os");boolean matches=true;
            if(os!=null) {
                if(os.has("name"))matches=os.getString("name").equals(context.osName);
                if(os.has("arch"))matches&=Pattern.compile(os.getString("arch")).matcher(context.osArch).find();
                if(os.has("version"))matches&=Pattern.compile(os.getString("version")).matcher(context.osVersion).find();
            }
            JSONObject features=rule.optJSONObject("features");
            if(features!=null)for(Iterator<String> it=features.keys();it.hasNext();) {String feature=it.next();matches&=Boolean.TRUE.equals(context.features.get(feature))==features.getBoolean(feature);}
            String action=rule.getString("action");if(!action.equals("allow")&&!action.equals("disallow"))throw new IOException("Unknown metadata rule action");
            if(matches)result=action.equals("allow");
        }return result;
    }
    private RuntimeDownloads.FileSpec assetIndexSpec(JSONObject asset)throws Exception {
        String id=asset.getString("id");RuntimeFiles.id(id);return spec(RuntimeFiles.inside(root,"assets/indexes/"+id+".json"),asset,"");
    }
    private JSONObject assetIndex(JSONObject metadata)throws Exception {
        JSONObject asset=metadata.optJSONObject("assetIndex");if(asset==null)return null;
        RuntimeDownloads.FileSpec file=assetIndexSpec(asset);if(!file.valid())throw new IOException("Missing/corrupt asset index");return RuntimeFiles.json(file.file);
    }
    private static RuntimeDownloads.FileSpec spec(File file,JSONObject record,String fallback)throws Exception {
        return new RuntimeDownloads.FileSpec(file,record.optString("url",fallback),record.optString("sha1",""),record.optLong("size",-1));
    }
    /** Android's native implementation comes from the verified engine module, never desktop classifiers. */
    public List<RuntimeDownloads.FileSpec> libraries(JSONObject metadata,Context context)throws Exception {
        List<RuntimeDownloads.FileSpec> result=new ArrayList<>();JSONArray libraries=metadata.optJSONArray("libraries");
        if(libraries!=null)for(int i=0;i<libraries.length();i++) {
            JSONObject library=libraries.getJSONObject(i);if(!allowed(library.optJSONArray("rules"),context))continue;
            String name=library.getString("name");String[] p=name.split("@",2)[0].split(":");
            if(p.length==4&&p[3].startsWith("natives-"))continue;
            JSONObject downloads=library.optJSONObject("downloads"),artifact=downloads==null?null:downloads.optJSONObject("artifact");
            if(downloads!=null&&artifact==null)continue;
            String path=artifact==null?RuntimeFiles.maven(name):artifact.optString("path",RuntimeFiles.maven(name));
            File file=RuntimeFiles.inside(root,"libraries/"+path);
            String repository=library.optString("url","https://libraries.minecraft.net/").replaceAll("/+$","");
            if(artifact==null)artifact=new JSONObject();result.add(spec(file,artifact,repository+"/"+path));
        }return result;
    }
    public List<RuntimeDownloads.FileSpec> files(JSONObject metadata,JSONObject index,Context context)throws Exception {
        LinkedHashMap<File,RuntimeDownloads.FileSpec> result=new LinkedHashMap<>();for(RuntimeDownloads.FileSpec lib:libraries(metadata,context))result.put(lib.file,lib);
        String jar=metadata.optString("jar",metadata.getString("id"));RuntimeFiles.id(jar);
        JSONObject dl=metadata.optJSONObject("downloads"),client=dl==null?null:dl.optJSONObject("client");
        if(client==null)throw new IOException("Client integrity metadata missing");
        RuntimeDownloads.FileSpec game=spec(RuntimeFiles.inside(root,"versions/"+jar+"/"+jar+".jar"),client,"");result.put(game.file,game);
        JSONObject asset=metadata.optJSONObject("assetIndex");if(asset!=null){RuntimeDownloads.FileSpec a=assetIndexSpec(asset);result.put(a.file,a);if(index==null)throw new IOException("Asset index required");}
        if(index!=null) {
            JSONObject objects=index.getJSONObject("objects");if(objects.length()>100000)throw new IOException("Asset limit exceeded");
            for(Iterator<String> it=objects.keys();it.hasNext();) {
                String name=it.next();RuntimeFiles.inside(root,"assets/virtual/validate/"+name);JSONObject object=objects.getJSONObject(name);
                String hash=object.getString("hash");long size=object.getLong("size");if(!hash.matches("[a-f0-9]{40}")||size<0)throw new IOException("Invalid asset hash/size");
                String path=hash.substring(0,2)+"/"+hash;File file=RuntimeFiles.inside(root,"assets/objects/"+path);
                RuntimeDownloads.FileSpec prior=result.get(file);if(prior!=null&&prior.size!=size)throw new IOException("Inconsistent asset sizes");
                result.put(file,new RuntimeDownloads.FileSpec(file,"https://resources.download.minecraft.net/"+path,hash,size));
            }
        }
        JSONObject logging=metadata.optJSONObject("logging"),log=logging==null?null:logging.optJSONObject("client"),logFile=log==null?null:log.optJSONObject("file");
        if(logFile!=null){String name=logFile.getString("id");RuntimeDownloads.FileSpec file=spec(RuntimeFiles.inside(root,"assets/log_configs/"+name),logFile,"");result.put(file.file,file);}
        JSONArray installed=metadata.optJSONArray("hxzInstallFiles");
        if(installed!=null)for(int i=0;i<installed.length();i++) {
            JSONObject record=installed.getJSONObject(i);File file=RuntimeFiles.inside(root,record.getString("path"));
            if(result.containsKey(file))continue;
            result.put(file,new RuntimeDownloads.FileSpec(file,"","",record.getString("sha256"),record.getLong("size")));
        }
        return new ArrayList<>(result.values());
    }
    private List<File> legacyRoots(JSONObject metadata,JSONObject index,Context context)throws Exception {
        List<File> result=new ArrayList<>();if(index.optBoolean("virtual"))result.add(RuntimeFiles.inside(root,"assets/virtual/"+metadata.getJSONObject("assetIndex").getString("id")));
        if(index.optBoolean("map_to_resources"))result.add(RuntimeFiles.inside(context.run,"resources"));return result;
    }
    private void mapLegacyAssets(JSONObject metadata,JSONObject index,Context context,EngineHost.Cancellation cancel)throws Exception {
        JSONObject objects=index.getJSONObject("objects");for(File targetRoot:legacyRoots(metadata,index,context))for(Iterator<String> it=objects.keys();it.hasNext();) {
            cancel.check();String name=it.next();JSONObject object=objects.getJSONObject(name);String hash=object.getString("hash");
            File target=RuntimeFiles.inside(targetRoot,name);RuntimeDownloads.FileSpec expected=new RuntimeDownloads.FileSpec(target,"",hash,object.getLong("size"));
            if(!expected.valid()){Files.createDirectories(target.getParentFile().toPath());Files.copy(RuntimeFiles.inside(root,"assets/objects/"+hash.substring(0,2)+"/"+hash).toPath(),target.toPath(),StandardCopyOption.REPLACE_EXISTING);}
        }
    }
    private void verifyLegacyMaps(JSONObject metadata,JSONObject index,Context context,List<String> problems)throws Exception {
        JSONObject objects=index.getJSONObject("objects");for(File targetRoot:legacyRoots(metadata,index,context))for(Iterator<String> it=objects.keys();it.hasNext();) {
            String name=it.next();JSONObject object=objects.getJSONObject(name);
            if(!new RuntimeDownloads.FileSpec(RuntimeFiles.inside(targetRoot,name),"",object.getString("hash"),object.getLong("size")).valid())problems.add("Missing/corrupt mapped asset: "+name);
        }
    }
    public LaunchPlan launch(String id,JSONObject metadata,Context context)throws Exception {
        RuntimeFiles.noLinks(context.run);RuntimeFiles.noLinks(context.natives);
        List<File> cp=new ArrayList<>();for(RuntimeDownloads.FileSpec library:libraries(metadata,context))cp.add(library.file);
        String jarId=metadata.optString("jar",metadata.getString("id"));File jar=RuntimeFiles.inside(root,"versions/"+jarId+"/"+jarId+".jar");cp.add(jar);
        cp=new ArrayList<>(new LinkedHashSet<>(cp));List<String> cpStrings=new ArrayList<>();for(File file:cp)cpStrings.add(file.getAbsolutePath());
        Map<String,String> vars=new HashMap<>();
        vars.put("auth_player_name",context.name);vars.put("auth_uuid",context.uuid);vars.put("auth_access_token",context.accessToken);vars.put("auth_session",context.accessToken);
        vars.put("user_type",context.userType);vars.put("user_properties","{}");vars.put("auth_xuid",context.xuid);vars.put("clientid",context.clientId);
        vars.put("version_name",id);vars.put("version_type",metadata.optString("type","release"));vars.put("primary_jar_name",jar.getName());
        vars.put("game_directory",context.run.getAbsolutePath());vars.put("assets_root",new File(root,"assets").getAbsolutePath());
        JSONObject asset=metadata.optJSONObject("assetIndex");String assetId=asset==null?metadata.optString("assets",""):asset.getString("id");
        vars.put("assets_index_name",assetId);vars.put("game_assets",new File(root,"assets/virtual/"+assetId).getAbsolutePath());
        vars.put("natives_directory",context.natives.getAbsolutePath());vars.put("library_directory",new File(root,"libraries").getAbsolutePath());
        vars.put("classpath",String.join(":",cpStrings));vars.put("classpath_separator",":");vars.put("launcher_name","HXZ");vars.put("launcher_version","0.8.4-dev");
        vars.put("resolution_width",String.valueOf(context.width));vars.put("resolution_height",String.valueOf(context.height));
        JSONObject arguments=metadata.optJSONObject("arguments");
        List<String> jvm=flatten(arguments==null?null:arguments.optJSONArray("jvm"),context,vars);
        if(!jvm.contains("-cp")&&!jvm.contains("-classpath")&&!jvm.contains("--class-path")){jvm.add("-cp");jvm.add(vars.get("classpath"));}
        if(jvm.stream().noneMatch(s->s.startsWith("-Djava.library.path=")))jvm.add("-Djava.library.path="+context.natives.getAbsolutePath());
        jvm.add(0,"-Xmx"+context.memoryMB+"M");jvm.add(1,"-Dfile.encoding=UTF-8");jvm.add(2,"-Dlog4j2.formatMsgNoLookups=true");
        JSONObject logging=metadata.optJSONObject("logging"),log=logging==null?null:logging.optJSONObject("client");
        if(log!=null&&log.has("argument")) {Map<String,String> logVars=new HashMap<>(vars);logVars.put("path",RuntimeFiles.inside(root,"assets/log_configs/"+log.getJSONObject("file").getString("id")).getAbsolutePath());jvm.add(replace(log.getString("argument"),logVars));}
        List<String> game=flatten(arguments==null?null:arguments.optJSONArray("game"),context,vars);
        if(game.isEmpty()&&metadata.has("minecraftArguments"))for(String value:tokens(metadata.getString("minecraftArguments")))game.add(replace(value,vars));
        return new LaunchPlan(id,javaMajor(metadata),context.run,new File(root,"assets"),context.natives,cp,metadata.getString("mainClass"),jvm,game);
    }
    private static List<String> flatten(JSONArray values,Context context,Map<String,String> vars)throws Exception {
        List<String> result=new ArrayList<>();if(values==null)return result;
        for(int i=0;i<values.length();i++) {
            Object value=values.get(i);if(value instanceof String)result.add(replace((String)value,vars));
            else {JSONObject entry=(JSONObject)value;if(!allowed(entry.optJSONArray("rules"),context))continue;Object actual=entry.get("value");
                if(actual instanceof JSONArray){JSONArray a=(JSONArray)actual;for(int n=0;n<a.length();n++)result.add(replace(a.getString(n),vars));}
                else if(actual instanceof String)result.add(replace((String)actual,vars));else throw new IOException("Invalid launch argument");}
        }return result;
    }
    public static String replace(String value,Map<String,String> vars)throws IOException {
        Matcher matcher=Pattern.compile("\\$\\{([^}]+)\\}").matcher(value);StringBuffer result=new StringBuffer();
        while(matcher.find()){String replacement=vars.get(matcher.group(1));if(replacement==null)throw new IOException("Unknown launch placeholder: "+matcher.group(1));matcher.appendReplacement(result,Matcher.quoteReplacement(replacement));}
        matcher.appendTail(result);return result.toString();
    }
    public static List<String> tokens(String input)throws IOException {
        List<String> result=new ArrayList<>();StringBuilder token=new StringBuilder();char quote=0;boolean started=false;
        for(int i=0;i<input.length();i++){char c=input.charAt(i);if(c=='\0'||c=='\n'||c=='\r')throw new IOException("Invalid argument character");
            if(c=='\''||c=='"'){if(quote==0){quote=c;started=true;}else if(quote==c)quote=0;else token.append(c);}
            else if(Character.isWhitespace(c)&&quote==0){if(started){result.add(token.toString());token.setLength(0);started=false;}}
            else {token.append(c);started=true;}}
        if(quote!=0)throw new IOException("Unterminated argument quote");if(started)result.add(token.toString());return result;
    }
}
