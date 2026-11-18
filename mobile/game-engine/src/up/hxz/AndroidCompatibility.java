package up.hxz;

import com.google.gson.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.function.Consumer;
import java.util.regex.*;
import java.util.zip.*;

/** Exact-content rules, applied before downloads. No guesses from translated jar names. */
public final class AndroidCompatibility {
    private static volatile JsonObject catalog = new JsonObject();
    private static volatile Map<String, JsonObject> known = Collections.emptyMap();
    private static final ThreadLocal<Session> current = new ThreadLocal<>();
    public static synchronized void configure(InputStream source) throws IOException {
        try (Reader reader = new InputStreamReader(source, StandardCharsets.UTF_8)) {
            JsonObject next = JsonParser.parseReader(reader).getAsJsonObject();
            Map<String, JsonObject> records = new HashMap<>();
            for (JsonElement item : next.getAsJsonArray("files")) {
                JsonObject record = item.getAsJsonObject(); String hash = IO.str(record,"sha1","");
                if (!hash.matches("[0-9a-f]{40}")) throw new IOException("安卓适配规则校验失败");
                records.put(hash, record);
            }
            catalog = next; known = Collections.unmodifiableMap(records);
        }
    }
    public static Session open(Path root, String renderer, Consumer<String> progress) throws IOException {
        if (current.get() != null) throw new IOException("已有安卓适配检查正在运行");
        Session session = new Session(root,renderer,progress); current.set(session); return session;
    }
    static JsonArray filter(JsonArray entries) throws IOException {return current.get()==null?entries:current.get().filter(entries);}
    static void checkStaged(Path file, JsonObject entry) throws IOException {if(current.get()!=null)current.get().check(file,entry);}
    static boolean requiresRefresh(JsonObject old) {return current.get()!=null&&!current.get().revision().equals(IO.str(old,"androidCompatibility",""));}
    static void stamp(JsonObject version) {if(current.get()!=null)version.addProperty("androidCompatibility",current.get().revision());}
    static String localHash(Path file)throws IOException{return current.get()==null?IO.hash(file):current.get().hashes.hash(file);}

    public static final class Session implements AutoCloseable {
        private final Path root, folder;
        private final String renderer;
        private final Consumer<String> progress;
        private final AndroidModCache hashes;
        private final Map<String, JsonObject> skipped = new LinkedHashMap<>();
        private final Set<String> removedIds = new HashSet<>();
        private JsonArray source = new JsonArray();
        private Session(Path root, String renderer, Consumer<String> progress) throws IOException {
            this.root=root.toAbsolutePath().normalize();this.renderer=renderer;this.progress=progress;
            folder=this.root.resolve("updater/android-compatibility"); IO.noLinks(folder);Files.createDirectories(folder);
            hashes=new AndroidModCache(this.root);
            Path saved=folder.resolve("source-manifest.json");
            if(Files.isRegularFile(saved))filter(IO.read(saved).getAsJsonArray("files"));
        }
        String revision(){return IO.str(catalog,"revision","none")+":"+renderer;}
        public JsonArray filter(JsonArray entries) throws IOException {
            source=entries.deepCopy();skipped.clear();removedIds.clear();JsonArray kept=new JsonArray();
            for(JsonElement item:entries){JsonObject file=item.getAsJsonObject(),rule=rule(file);
                if(rule!=null){String path=IO.str(file,"path","");local(path);skipped.put(path,file);removedIds.addAll(strings(rule,"ids"));}
                else kept.add(file);
            }
            // Required dependencies are a stop, never a recursive deletion of gameplay mods.
            for(JsonElement item:kept){JsonObject file=item.getAsJsonObject(),meta=known.get(IO.str(file,"sha1",""));if(meta!=null)checkDependencies(IO.str(file,"path",""),strings(meta,"depends"));}
            checkLocalDependencies();
            for(Map.Entry<String,JsonObject> item:skipped.entrySet())backup(local(item.getKey()),item.getValue());
            JsonObject original=new JsonObject();original.add("files",source);IO.write(folder.resolve("source-manifest.json"),original);
            report();if(!skipped.isEmpty())progress.accept("安卓适配：跳过 "+skipped.size()+" 个不适用组件，保留服务器玩法模组");
            return kept;
        }
        private JsonObject rule(JsonObject file){
            if(!IO.str(file,"path","").matches("[13]/mods/[^/]+\\.jar"))return null;
            JsonObject rule=known.get(IO.str(file,"sha1","").toLowerCase(Locale.ROOT));
            if(rule==null||!"disable".equals(IO.str(rule,"action","")))return null;
            Set<String> renderers=strings(rule,"renderers");return renderers.isEmpty()||renderers.contains(renderer)?rule:null;
        }
        private Path local(String mapped)throws IOException{return IO.map(root.resolve("updater"),mapped,3);}
        private Path backupPath(JsonObject file)throws IOException{String hash=IO.str(file,"sha1","");if(!hash.matches("[a-f0-9]{40}"))throw new IOException("模组校验值无效");return folder.resolve(hash+".jar.disabled");}
        private void backup(Path local,JsonObject file)throws IOException{
            if(!Files.isRegularFile(local)||!IO.hash(local).equalsIgnoreCase(IO.str(file,"sha1","")))return;
            Path destination=backupPath(file);IO.noLinks(local);IO.noLinks(destination);
            if(!Files.isRegularFile(destination)){Path temp=Files.createTempFile(folder,"backup-",".part");try{Files.copy(local,temp,StandardCopyOption.REPLACE_EXISTING);IO.move(temp,destination);}finally{Files.deleteIfExists(temp);}}
        }
        private void checkDependencies(String file,Set<String> dependencies)throws IOException{
            Set<String> missing=new TreeSet<>(dependencies);missing.retainAll(removedIds);
            if(!missing.isEmpty())throw new IOException("安卓适配暂不能应用："+file+" 必须依赖 "+String.join("、",missing)+"。请管理员提供兼容版本；本次不会删除依赖或修改整合包。");
        }
        void check(Path file,JsonObject entry)throws IOException{
            if(file==null||removedIds.isEmpty()||!IO.str(entry,"path","").matches("[13]/mods/[^/]+\\.jar"))return;
            JsonObject metadata=known.get(IO.str(entry,"sha1",""));
            if(metadata!=null)checkDependencies(IO.str(entry,"path",""),strings(metadata,"depends"));
            else checkDependencies(IO.str(entry,"path",""),dependencies(file));
        }
        public void reconcile() throws IOException {
            checkLocalDependencies();
            for(Map.Entry<String,JsonObject> item:skipped.entrySet()){
                Path file=local(item.getKey());backup(file,item.getValue());
                if(Files.isRegularFile(file)&&IO.hash(file).equalsIgnoreCase(IO.str(item.getValue(),"sha1","")))Files.delete(file);
            }
            // Restore an unchanged, previously isolated file when its rule/renderer no longer applies.
            for(JsonElement item:source){JsonObject file=item.getAsJsonObject();if(rule(file)!=null||!IO.str(file,"path","").matches("[13]/mods/[^/]+\\.jar"))continue;
                Path destination=local(IO.str(file,"path","")),saved=backupPath(file);
                if(!Files.exists(destination)&&Files.isRegularFile(saved)&&IO.hash(saved).equalsIgnoreCase(IO.str(file,"sha1",""))){Files.createDirectories(destination.getParent());Files.copy(saved,destination);}
            }
            hashes.save();report();
        }
        private void checkLocalDependencies()throws IOException {
            if(removedIds.isEmpty())return;
            // Recheck local user-added jars as well; local caches never define permission to delete them.
            Path mods=root.resolve("mods");
            if(Files.isDirectory(mods))try(DirectoryStream<Path> files=Files.newDirectoryStream(mods,"*.jar")){
                for(Path file:files){IO.noLinks(file);String hash=hashes.hash(file);JsonObject meta=known.get(hash);
                    if(meta!=null&&"disable".equals(IO.str(meta,"action",""))&&(strings(meta,"renderers").isEmpty()||strings(meta,"renderers").contains(renderer)))continue;
                    checkDependencies(file.getFileName().toString(),meta!=null?strings(meta,"depends"):dependencies(file));
                }
            }
        }
        public boolean hasExact(String hash){for(JsonElement file:source)if(hash.equals(IO.str(file.getAsJsonObject(),"sha1","")))return true;return false;}
        private void report()throws IOException{
            JsonObject report=new JsonObject();report.addProperty("revision",revision());report.addProperty("renderer",renderer);JsonArray files=new JsonArray();
            for(Map.Entry<String,JsonObject> item:skipped.entrySet()){JsonObject file=item.getValue().deepCopy(),rule=rule(file);file.addProperty("reason",IO.str(rule,"reason",""));file.addProperty("backup",backupPath(file).getFileName().toString());files.add(file);}
            report.add("disabled",files);IO.write(folder.resolve("report.json"),report);
        }
        @Override public void close()throws IOException{try{hashes.save();}finally{current.remove();}}
    }
    private static Set<String> strings(JsonObject object,String field){Set<String> values=new HashSet<>();if(object!=null&&object.has(field))for(JsonElement e:object.getAsJsonArray(field))values.add(e.getAsString());return values;}

    /** Only used for unknown/user-added jars. Bounded descriptor reads, no extraction or code execution. */
    private static Set<String> dependencies(Path file)throws IOException{
        Set<String> result=new HashSet<>();try(ZipFile zip=new ZipFile(file.toFile())){
            for(String name:Arrays.asList("fabric.mod.json","META-INF/neoforge.mods.toml","META-INF/mods.toml")){
                ZipEntry entry=zip.getEntry(name);if(entry==null)continue;
                if(entry.getSize()>1024*1024)throw new IOException("模组描述过大："+file.getFileName());
                String text;try(InputStream in=zip.getInputStream(entry)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))>0){if(out.size()+n>1024*1024)throw new IOException("模组描述过大");out.write(bytes,0,n);}text=new String(out.toByteArray(),StandardCharsets.UTF_8);}
                if(name.endsWith(".json")){JsonObject meta=JsonParser.parseString(text).getAsJsonObject();if(meta.has("depends"))result.addAll(meta.getAsJsonObject("depends").keySet());}
                else {
                    // Read by table boundaries, not '[' inside version ranges.
                    String[] blocks=text.split("(?m)^\\s*\\[\\[");
                    for(String block:blocks)if(block.startsWith("dependencies.")){
                        Map<String,String> values=new HashMap<>();Matcher assignments=Pattern.compile("(?m)^\\s*(modId|type|mandatory|side)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|(true|false))").matcher(block);
                        while(assignments.find())values.put(assignments.group(1),assignments.group(2)!=null?assignments.group(2):assignments.group(3)!=null?assignments.group(3):assignments.group(4));
                        if(!"optional".equalsIgnoreCase(values.get("type"))&&!"incompatible".equalsIgnoreCase(values.get("type"))&&!"discouraged".equalsIgnoreCase(values.get("type"))&&!"false".equals(values.get("mandatory"))&&!"SERVER".equalsIgnoreCase(values.get("side"))&&values.containsKey("modId"))result.add(values.get("modId"));
                    }
                }
            }
        }catch(JsonParseException e){throw new IOException("模组描述损坏："+file.getFileName(),e);}return result;
    }
}
