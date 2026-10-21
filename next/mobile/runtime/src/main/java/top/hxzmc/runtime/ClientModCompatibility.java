package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.channels.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.*;
import java.util.zip.*;

/** Independent, conservative client-only mod adjustment. Never loads mod classes.
 * Public callers cannot supply rules: only reviewed byte-identical built-in artifacts qualify. */
public final class ClientModCompatibility {
    private static final int LIMIT=4096, META_LIMIT=1024*1024;
    private static final Pattern ID=Pattern.compile("[a-z0-9_][a-z0-9_.-]{0,127}");
    public final File instance;
    private final File directory,stateFile;
    private final List<Rule> rules;

    /** Rules must be changed in source together with primary evidence and exact artifact hashes. */
    public ClientModCompatibility(File instance)throws IOException {this(instance,builtIns());}
    static List<Rule> builtIns() {
        String evidence="https://modrinth.com/mod/imblocker-original/version/";
        String reason="仅客户端的桌面输入法整合；其桌面 Linux IME 命令/GLFW X11 路径不适用于 Android，手机输入由宿主管理。此规则不声称该模组必然导致崩溃。";
        return Arrays.asList(new Rule("imblocker-neoforge-5.5.4","08c5581bda0ab0fbfdbb10c51102685b403f64b0e712517c4b2d918b2c83cea3",Collections.singleton("imblocker"),reason,evidence+"gom4UX66"),
                new Rule("imblocker-neoforge-5.6.1","fcdb1755d5729aabc194cbfec65fcb1233b780e44216b037684d3edd256a8289",Collections.singleton("imblocker"),reason,evidence+"JCFs4e8D"));
    }
    // Package-private injection exists only for protocol fixtures, never an app policy/JSON interface.
    ClientModCompatibility(File instance,List<Rule> rules)throws IOException {
        this.instance=instance.getAbsoluteFile();RuntimeFiles.noLinks(this.instance);
        directory=RuntimeFiles.inside(this.instance,".hxz/client-mods");stateFile=RuntimeFiles.inside(directory,"state.json");
        this.rules=Collections.unmodifiableList(new ArrayList<>(rules));
    }
    static final class Rule {
        final String id,sha256,reason,evidence;final Set<String> ids;
        Rule(String id,String sha256,Collection<String> ids,String reason,String evidence) {
            if(id==null||!id.matches("[a-z0-9_.-]{1,100}")||sha256==null||!sha256.matches("[a-f0-9]{64}")||ids.isEmpty()||reason==null||reason.isEmpty()||evidence==null||!evidence.startsWith("https://"))throw new IllegalArgumentException("Invalid reviewed client-only rule");
            this.id=id;this.sha256=sha256;this.ids=Collections.unmodifiableSet(new TreeSet<>(ids));this.reason=reason;this.evidence=evidence;
            for(String mod:ids)if(!ID.matcher(mod).matches())throw new IllegalArgumentException("Invalid mod id");
        }
    }
    public interface ReportListener {void onReport(Report report);}
    public static final class Finding {
        public final String relativePath,decision,reason,ruleId,evidence;
        Finding(String path,String decision,String reason,Rule rule){relativePath=path;this.decision=decision;this.reason=reason;ruleId=rule==null?"":rule.id;evidence=rule==null?"":rule.evidence;}
    }
    public static final class Report {
        public final List<Finding> findings;public final int inspected,disabled,eligible;
        Report(List<Finding> findings,int inspected,int disabled){this.findings=Collections.unmodifiableList(new ArrayList<>(findings));this.inspected=inspected;this.disabled=disabled;int planned=0;for(Finding finding:findings)if(finding.decision.equals("would-disable")||finding.decision.equals("disabled"))planned++;eligible=planned;}
        public String summary(){return disabled==0?"客户端模组预检完成，未自动禁用文件":"已隔离 "+disabled+" 个经核验的客户端专用不兼容模组，可恢复";}
        public JSONObject toJson()throws JSONException {JSONArray rows=new JSONArray();for(Finding finding:findings)rows.put(new JSONObject().put("path",finding.relativePath).put("decision",finding.decision).put("reason",finding.reason).put("rule",finding.ruleId).put("evidence",finding.evidence));return new JSONObject().put("schema",1).put("inspected",inspected).put("disabled",disabled).put("eligible",eligible).put("summary",summary()).put("findings",rows);}
    }
    /** Actual preserved bytes, keyed by their original instance-relative name for room fingerprints. */
    public static final class QuarantinedFile {
        public final File file;public final String relativePath,sha256,ruleId,reason;
        QuarantinedFile(File file,JSONObject row,Rule rule)throws JSONException {this.file=file;relativePath=row.getString("path");sha256=rule.sha256;ruleId=rule.id;reason=rule.reason;}
    }
    private static final class Mod {
        final File file;final String path;String sha;final Set<String> ids=new TreeSet<>(),depends=new TreeSet<>();
        boolean known,content,nested,server;String problem="";Rule rule;
        Mod(File file,String path,String sha){this.file=file;this.path=path;this.sha=sha;}
    }
    private final class Locked implements AutoCloseable {
        final FileChannel channel;final FileLock lock;
        Locked()throws Exception {
            RuntimeFiles.noLinks(directory);Files.createDirectories(directory.toPath());File file=RuntimeFiles.inside(directory,"operation.lock");
            channel=FileChannel.open(file.toPath(),StandardOpenOption.CREATE,StandardOpenOption.WRITE);
            FileLock acquired=null;
            try{acquired=channel.tryLock();if(acquired==null)throw new IOException("Client compatibility operation already running");}
            catch(Exception e){channel.close();throw new IOException("Client compatibility operation already running",e);}lock=acquired;
        }
        public void close()throws IOException {try{lock.release();}finally{channel.close();}}
    }
    /** Restore known originals before any HXZUP or offline pack hash checks, under a held private lock. */
    Session beforePreparation(EngineHost.Cancellation cancel)throws Exception {
        Locked held=new Locked();try {
            JSONObject state=readState();recover(state,cancel);restore(state,false,cancel);return new Session(held,state);
        }catch(Exception e){held.close();throw e;}
    }
    final class Session implements AutoCloseable {
        final Locked held;final JSONObject state;boolean finished;
        Session(Locked held,JSONObject state){this.held=held;this.state=state;}
        Report finish(EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
            if(finished)throw new IOException("Compatibility session already finished");Report report=apply(state,cancel,progress);finished=true;return report;
        }
        // Failed/cancelled preparation never returns a launch plan. Restored originals stay journalled;
        // the next preparation safely restores/rechecks them rather than hiding update transactions.
        public void close()throws IOException {held.close();}
    }
    public Report scanAndQuarantine(EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        try(Session session=beforePreparation(cancel)){return session.finish(cancel,progress);}
    }
    /** No directory creation, locks, state updates or file moves; safe for read-only pack audits. */
    public Report dryRun(EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        JSONObject state=readState();List<Mod> mods=inventory(cancel);Set<Mod> allowed=candidates(mods,state);List<Finding> findings=new ArrayList<>();
        for(Mod mod:mods){if(progress!=null)progress.update("compatibility",mod.path,findings.size(),mods.size());findings.add(new Finding(mod.path,allowed.contains(mod)?"would-disable":mod.known?"kept":"unknown",allowed.contains(mod)?mod.rule.reason:mod.known?"保留：无精确规则或存在内容/依赖风险":mod.problem,mod.rule));}return new Report(findings,mods.size(),0);
    }
    /** User restoration is persistent for these exact bytes until a different artifact is installed. */
    public Report restoreAll(EngineHost.Cancellation cancel)throws Exception {
        try(Locked ignored=new Locked()) {JSONObject state=readState();recover(state,cancel);restore(state,true,cancel);List<Finding> findings=new ArrayList<>();
            JSONArray rows=state.getJSONArray("entries");for(int i=0;i<rows.length();i++){JSONObject row=rows.getJSONObject(i);String status=row.getString("status");findings.add(new Finding(row.getString("path"),status,status.equals("conflict")?"恢复路径存在其他文件，保留原文件与备份":"用户选择保留该文件",matching(row.getString("sha256"))));}
            return new Report(findings,rows.length(),0);
        }
    }
    /** Read-only revalidation. Unknown disabled files, absent/corrupt originals, forged paths or old rules never supply a digest. */
    public List<QuarantinedFile> validatedQuarantine(EngineHost.Cancellation cancel)throws Exception {
        try(Locked ignored=new Locked()) {
            JSONObject state=readState();List<Mod> mods=inventory(cancel);List<JSONObject> quarantined=new ArrayList<>();
            JSONArray rows=state.getJSONArray("entries");for(int i=0;i<rows.length();i++) {cancel.check();JSONObject row=rows.getJSONObject(i);
                if(!row.getString("status").equals("quarantined"))continue;
                File original=original(row),backup=backup(row);if(Files.exists(original.toPath(),LinkOption.NOFOLLOW_LINKS)||!exact(backup,row,cancel))continue;
                Rule rule=matching(row.getString("sha256"));if(rule==null)continue;
                Mod mod=inspect(backup,row.getString("path"),cancel,row.getString("sha256"));if(!eligible(mod,rule))continue;mod.rule=rule;mods.add(mod);quarantined.add(row);
            }
            Set<Mod> candidates=candidates(mods,state);List<QuarantinedFile> result=new ArrayList<>();
            for(JSONObject row:quarantined)for(Mod mod:candidates)if(mod.path.equals(row.getString("path"))&&mod.sha.equals(row.getString("sha256")))result.add(new QuarantinedFile(backup(row),row,mod.rule));
            result.sort(Comparator.comparing(x->x.relativePath));return Collections.unmodifiableList(result);
        }
    }
    private JSONObject readState()throws Exception {
        if(!stateFile.exists())return new JSONObject().put("schema",1).put("entries",new JSONArray()).put("userRestored",new JSONArray());
        JSONObject state=RuntimeFiles.json(stateFile);if(state.optInt("schema")!=1)throw new IOException("Unknown client adjustment journal");
        JSONArray rows=state.getJSONArray("entries"),suppressed=state.getJSONArray("userRestored");if(rows.length()>LIMIT||suppressed.length()>LIMIT)throw new IOException("Client adjustment journal too large");
        Set<String> ids=new HashSet<>(),paths=new HashSet<>();for(int i=0;i<rows.length();i++) {
            JSONObject row=rows.getJSONObject(i);String id=row.getString("id"),sha=row.getString("sha256"),status=row.getString("status");
            if(!id.matches("[a-f0-9-]{36}")||!sha.matches("[a-f0-9]{64}")||row.getLong("size")<1||!Arrays.asList("moving","quarantined","restoring","restored","retired","conflict").contains(status)||!ids.add(id)||!paths.add(row.getString("path").toLowerCase(Locale.ROOT)))throw new IOException("Invalid client adjustment journal row");
            original(row);backup(row);
        }
        for(int i=0;i<suppressed.length();i++)if(!suppressed.getString(i).matches("[a-f0-9]{64}"))throw new IOException("Invalid user restore preference");return state;
    }
    private void save(JSONObject state)throws Exception {
        RuntimeFiles.noLinks(stateFile);Files.createDirectories(directory.toPath());File temp=File.createTempFile(".journal-",".tmp",directory);
        try {try(FileOutputStream out=new FileOutputStream(temp)){out.write(state.toString(2).getBytes(StandardCharsets.UTF_8));out.getFD().sync();}RuntimeFiles.replace(temp,stateFile);}
        finally{Files.deleteIfExists(temp.toPath());}
    }
    private File original(JSONObject row)throws Exception {
        String path=row.getString("path");if(!path.startsWith("mods/")||!path.toLowerCase(Locale.ROOT).endsWith(".jar")||path.substring(5).contains("/"))throw new IOException("Adjustment target is not a top-level mod JAR");return RuntimeFiles.inside(instance,path);
    }
    private File backup(JSONObject row)throws Exception {
        String expected="objects/"+row.getString("id")+"-"+row.getString("sha256")+".jar";
        if(!expected.equals(row.getString("backup")))throw new IOException("Adjustment backup path invalid");return RuntimeFiles.inside(directory,expected);
    }
    private static String hash(File file,EngineHost.Cancellation cancel)throws Exception {
        RuntimeFiles.noLinks(file);MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] bytes=new byte[65536];
        try(InputStream in=new FileInputStream(file)){int n;while((n=in.read(bytes))!=-1){cancel.check();digest.update(bytes,0,n);}}
        StringBuilder result=new StringBuilder();for(byte b:digest.digest())result.append(String.format(Locale.ROOT,"%02x",b&255));return result.toString();
    }
    private boolean exact(File file,JSONObject row,EngineHost.Cancellation cancel)throws Exception {RuntimeFiles.noLinks(file);return file.isFile()&&file.length()==row.getLong("size")&&hash(file,cancel).equals(row.getString("sha256"));}
    private void recover(JSONObject state,EngineHost.Cancellation cancel)throws Exception {
        JSONArray rows=state.getJSONArray("entries");boolean changed=false;
        for(int i=0;i<rows.length();i++) {cancel.check();JSONObject row=rows.getJSONObject(i);File source=original(row),target=backup(row);
            boolean a=Files.exists(source.toPath(),LinkOption.NOFOLLOW_LINKS),b=Files.exists(target.toPath(),LinkOption.NOFOLLOW_LINKS);
            if(!a&&!b){if(Arrays.asList("restored","retired").contains(row.getString("status"))){row.put("status","retired");changed=true;continue;}throw new IOException("Preserved client mod missing: "+row.getString("path"));}
            boolean validA=a&&exact(source,row,cancel),validB=b&&exact(target,row,cancel);
            String status;
            if(!a&&validB)status="quarantined";else if(validA&&!b)status="restored";
            else if(a&&b)status="conflict";
            else if(a&&!b&&row.getString("status").equals("restored"))status="restored"; // Updater/user replaced an active original, never touch new bytes.
            else throw new IOException("Preserved client mod corrupt: "+row.getString("path"));
            if(!status.equals(row.getString("status"))){row.put("status",status);changed=true;}
        }if(changed)save(state);
    }
    private void restore(JSONObject state,boolean user,EngineHost.Cancellation cancel)throws Exception {
        JSONArray rows=state.getJSONArray("entries"),preferences=state.getJSONArray("userRestored");Set<String> suppress=new HashSet<>();for(int i=0;i<preferences.length();i++)suppress.add(preferences.getString(i));
        for(int i=0;i<rows.length();i++) {cancel.check();JSONObject row=rows.getJSONObject(i);
            if(user&&suppress.add(row.getString("sha256"))){preferences.put(row.getString("sha256"));save(state);}
            if(!row.getString("status").equals("quarantined"))continue;
            File from=backup(row),to=original(row);if(!exact(from,row,cancel)||Files.exists(to.toPath(),LinkOption.NOFOLLOW_LINKS))throw new IOException("Cannot safely restore client mod");
            Files.createDirectories(to.getParentFile().toPath());row.put("status","restoring");save(state);cancel.check();move(from,to);row.put("status","restored");save(state);
        }
    }
    private static void move(File from,File to)throws Exception {
        RuntimeFiles.noLinks(from);RuntimeFiles.noLinks(to);if(Files.exists(to.toPath(),LinkOption.NOFOLLOW_LINKS))throw new IOException("Refusing to overwrite a client mod or backup");
        // Source and destination share the private instance filesystem. No replace/delete operation.
        Files.move(from.toPath(),to.toPath());
    }
    private Rule matching(String sha) {for(Rule rule:rules)if(rule.sha256.equals(sha))return rule;return null;}
    private static boolean eligible(Mod mod,Rule rule){return mod.known&&!mod.content&&!mod.nested&&!mod.server&&mod.sha.equals(rule.sha256)&&mod.ids.equals(rule.ids);}
    private List<Mod> inventory(EngineHost.Cancellation cancel)throws Exception {
        File folder=RuntimeFiles.inside(instance,"mods");if(!folder.exists())return new ArrayList<>();if(!folder.isDirectory())throw new IOException("mods is not a directory");
        File[] files=folder.listFiles();if(files==null||files.length>LIMIT)throw new IOException("Mod directory unavailable or too large");Arrays.sort(files,Comparator.comparing(File::getName));List<Mod> result=new ArrayList<>();
        for(File file:files) {cancel.check();if(!file.getName().toLowerCase(Locale.ROOT).endsWith(".jar"))continue;
            RuntimeFiles.noLinks(file);if(!file.isFile())throw new IOException("Mod JAR is not a regular file");result.add(inspect(file,"mods/"+file.getName(),cancel));}
        return result;
    }
    private Set<Mod> candidates(List<Mod> mods,JSONObject state)throws Exception {
        Set<String> suppress=new HashSet<>(),conflicts=new HashSet<>();JSONArray preferences=state.getJSONArray("userRestored"),rows=state.getJSONArray("entries");
        for(int i=0;i<preferences.length();i++)suppress.add(preferences.getString(i));for(int i=0;i<rows.length();i++)if(rows.getJSONObject(i).getString("status").equals("conflict"))conflicts.add(rows.getJSONObject(i).getString("path"));
        Map<String,Integer> counts=new HashMap<>();boolean unknown=false;
        for(Mod mod:mods){unknown|=!mod.known;for(String id:mod.ids)counts.put(id,counts.getOrDefault(id,0)+1);}
        Set<Mod> candidates=new LinkedHashSet<>();
        for(Mod mod:mods) {Rule rule=matching(mod.sha);mod.rule=rule;
            if(unknown||rule==null||!eligible(mod,rule)||suppress.contains(mod.sha)||conflicts.contains(mod.path))continue;
            boolean duplicate=false;for(String id:mod.ids)duplicate|=counts.get(id)>1;if(!duplicate)candidates.add(mod);
        }
        boolean changed;do {changed=false;for(Mod retained:mods)if(!candidates.contains(retained))for(Iterator<Mod> it=candidates.iterator();it.hasNext();) {
            Mod candidate=it.next();if(!Collections.disjoint(retained.depends,candidate.ids)){it.remove();changed=true;}
        }}while(changed);return candidates;
    }
    private Report apply(JSONObject state,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        List<Mod> mods=inventory(cancel);Set<Mod> allowed=candidates(mods,state);List<Finding> findings=new ArrayList<>();JSONArray rows=state.getJSONArray("entries");int disabled=0;
        for(Mod mod:mods) {cancel.check();if(progress!=null)progress.update("compatibility",mod.path,findings.size(),mods.size());
            if(!allowed.contains(mod)) {String why=!mod.known?mod.problem:mod.rule==null?"没有匹配的可信客户端专用规则":"内容、依赖、未知元数据或用户恢复选择使自动调整不安全";findings.add(new Finding(mod.path,mod.known?"kept":"unknown",why,mod.rule));continue;}
            JSONObject row=null;for(int i=0;i<rows.length();i++)if(rows.getJSONObject(i).getString("path").equals(mod.path)){row=rows.getJSONObject(i);break;}
            if(row==null) {if(rows.length()>=LIMIT)throw new IOException("Client adjustment journal full");String id=UUID.randomUUID().toString();row=new JSONObject().put("id",id).put("path",mod.path).put("backup","objects/"+id+"-"+mod.sha+".jar");rows.put(row);}
            // A new upstream artifact may reuse the same filename; old backups are never overwritten.
            if(row.has("sha256")&&!row.getString("sha256").equals(mod.sha)) {File old=backup(row);if(old.exists())throw new IOException("Previous client mod backup retained; cannot replace journal entry");row.put("backup","objects/"+row.getString("id")+"-"+mod.sha+".jar");}
            row.put("sha256",mod.sha).put("size",mod.file.length()).put("rule",mod.rule.id).put("reason",mod.rule.reason).put("evidence",mod.rule.evidence).put("status","moving");
            File target=backup(row);Files.createDirectories(target.getParentFile().toPath());save(state);cancel.check();if(!exact(mod.file,row,cancel))throw new IOException("Client mod changed during inspection");move(mod.file,target);row.put("status","quarantined");save(state);
            disabled++;findings.add(new Finding(mod.path,"disabled",mod.rule.reason,mod.rule));
        }
        if(progress!=null)progress.update("compatibility","客户端模组预检完成",mods.size(),mods.size());return new Report(findings,mods.size(),disabled);
    }
    private static byte[] entry(ZipFile zip,ZipEntry row)throws Exception {
        if(row==null)return null;if(row.getSize()<0||row.getSize()>META_LIMIT)throw new IOException("Oversized/unknown mod metadata");
        try(InputStream in=zip.getInputStream(row);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>META_LIMIT)throw new IOException("Mod metadata too large");out.write(b,0,n);}return out.toByteArray();}
    }
    private static void ids(JSONArray array,Set<String> target)throws Exception {if(array==null)return;for(int i=0;i<array.length();i++){String id=array.getString(i);if(!ID.matcher(id).matches())throw new IOException("Invalid mod identifier");target.add(id);}}
    private static void dependencies(JSONObject value,Set<String> target)throws Exception {if(value==null)return;for(Iterator<String> keys=value.keys();keys.hasNext();){String key=keys.next();if(!ID.matcher(key).matches())throw new IOException("Invalid mod dependency");target.add(key);}}
    private interface NestedReader {byte[] read(String name)throws Exception;}
    private static final class Budget {long expanded;void add(int count)throws IOException{expanded+=count;if(expanded>128L*1024*1024)throw new IOException("Nested archive expanded-byte budget exceeded");}}
    private static final Set<String> METADATA=new HashSet<>(Arrays.asList("fabric.mod.json","META-INF/neoforge.mods.toml","META-INF/mods.toml","META-INF/MANIFEST.MF","META-INF/jarjar/metadata.json"));
    private static byte[] bounded(InputStream in,int maximum,EngineHost.Cancellation cancel,Budget budget)throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){cancel.check();if(budget!=null)budget.add(n);if(out.size()+n>maximum)throw new IOException("Nested metadata/archive exceeds budget");out.write(buffer,0,n);}return out.toByteArray();
    }
    private static void metadata(Mod mod,Map<String,byte[]> data,boolean embedded,NestedReader reader,int depth,Budget budget,EngineHost.Cancellation cancel)throws Exception {
        LinkedHashSet<String> nested=new LinkedHashSet<>();boolean found=false;
        byte[] fabric=data.get("fabric.mod.json");
        if(fabric!=null) {
            JSONObject meta=new JSONObject(new String(fabric,StandardCharsets.UTF_8));String id=meta.getString("id");if(!ID.matcher(id).matches())throw new IOException("Invalid Fabric id");mod.ids.add(id);ids(meta.optJSONArray("provides"),mod.ids);
            if(meta.has("provides")&&!(meta.get("provides") instanceof JSONArray))throw new IOException("Unknown Fabric provides structure");
            String environment=meta.optString("environment","*");if(!Arrays.asList("*","client","server").contains(environment))throw new IOException("Unknown Fabric environment");mod.server|=environment.equals("server");
            for(String key:Arrays.asList("depends","recommends","suggests")){if(meta.has(key)&&!(meta.get(key) instanceof JSONObject))throw new IOException("Unknown Fabric dependency structure");dependencies(meta.optJSONObject(key),mod.depends);}
            if(meta.has("jars")){JSONArray jars=meta.getJSONArray("jars");if(jars.length()>256)throw new IOException("Too many Fabric nested jars");for(int i=0;i<jars.length();i++)nested.add(jars.getJSONObject(i).getString("file"));}found=true;
        }
        // Modern NeoForge declares its own metadata. A bundled legacy Forge template is not
        // loaded by that loader and may intentionally contain unexpanded ${mod_id} values.
        String toml=data.containsKey("META-INF/neoforge.mods.toml")?"META-INF/neoforge.mods.toml":"META-INF/mods.toml";
        if(data.containsKey(toml)){parseToml(mod,new String(data.get(toml),StandardCharsets.UTF_8));found=true;}
        if(data.containsKey("META-INF/jarjar/metadata.json")) {
            JSONArray jars=new JSONObject(new String(data.get("META-INF/jarjar/metadata.json"),StandardCharsets.UTF_8)).getJSONArray("jars");if(jars.length()>256)throw new IOException("Too many JarJar dependencies");
            for(int i=0;i<jars.length();i++)nested.add(jars.getJSONObject(i).getString("path"));
        }
        if(!found) {
            boolean library=embedded||!nested.isEmpty();
            if(data.containsKey("META-INF/MANIFEST.MF")){java.util.jar.Manifest manifest=new java.util.jar.Manifest(new ByteArrayInputStream(data.get("META-INF/MANIFEST.MF")));library|=Arrays.asList("LIBRARY","GAMELIBRARY","LANGPROVIDER").contains(manifest.getMainAttributes().getValue("FMLModType"));}
            if(!library)throw new IOException("No supported mod metadata");
        }
        mod.nested=!nested.isEmpty(); // Candidate rules cover the complete root artifact, never a bundle of additional mods/libraries.
        if(!nested.isEmpty()&&depth>=4)throw new IOException("Nested dependency depth exceeded");
        for(String name:nested) {
            cancel.check();if(name.startsWith("/")||name.contains("\\")||!name.endsWith(".jar"))throw new IOException("Unsafe nested jar path");for(String part:name.split("/",-1))if(part.isEmpty()||part.equals(".")||part.equals(".."))throw new IOException("Unsafe nested jar path");
            byte[] bytes=reader.read(name);if(bytes==null)throw new IOException("Declared nested JAR missing: "+name);
            Mod child=new Mod(mod.file,mod.path+"!"+name,"");nestedMetadata(child,bytes,depth+1,budget,cancel);
            mod.ids.addAll(child.ids);mod.depends.addAll(child.depends);mod.content|=child.content;mod.server|=child.server;
        }
        mod.known=true;
    }
    private static void nestedMetadata(Mod mod,byte[] bytes,int depth,Budget budget,EngineHost.Cancellation cancel)throws Exception {
        if(bytes.length<4||bytes[0]!='P'||bytes[1]!='K')throw new IOException("Invalid declared nested JAR");
        Map<String,byte[]> data=new HashMap<>(),jars=new HashMap<>();Set<String> names=new HashSet<>();int count=0;
        try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {ZipEntry row;byte[] buffer=new byte[8192];while((row=zip.getNextEntry())!=null) {
            cancel.check();String name=row.getName();if(++count>100000||!names.add(name))throw new IOException("Ambiguous nested JAR");
            if(name.startsWith("data/"))mod.content=true;
            if(METADATA.contains(name))data.put(name,bounded(zip,META_LIMIT,cancel,budget));
            else if(name.endsWith(".jar"))jars.put(name,bounded(zip,32*1024*1024,cancel,budget));
            else{int n;while((n=zip.read(buffer))!=-1){cancel.check();budget.add(n);}}
            zip.closeEntry();
        }}
        if(count==0)throw new IOException("Empty/invalid nested JAR");metadata(mod,data,true,jars::get,depth,budget,cancel);
    }
    private Mod inspect(File file,String path,EngineHost.Cancellation cancel)throws Exception {return inspect(file,path,cancel,null);}
    private Mod inspect(File file,String path,EngineHost.Cancellation cancel,String verifiedSha)throws Exception {
        Mod mod=new Mod(file,path,"");
        if(file.length()>256L*1024*1024){mod.problem="JAR 超过保守检查上限";return mod;}
        try(ZipFile zip=new ZipFile(file)) {
            int count=0;Set<String> names=new HashSet<>();Enumeration<? extends ZipEntry> entries=zip.entries();while(entries.hasMoreElements()) {
                cancel.check();String name=entries.nextElement().getName();if(++count>100000||!names.add(name))throw new IOException("Ambiguous/oversized mod archive");
                if(name.startsWith("data/"))mod.content=true;
            }
            Map<String,byte[]> data=new HashMap<>();for(String name:METADATA){byte[] value=entry(zip,zip.getEntry(name));if(value!=null)data.put(name,value);}
            Budget budget=new Budget();metadata(mod,data,false,name->{ZipEntry row=zip.getEntry(name);if(row==null)return null;if(row.getSize()<0||row.getSize()>32*1024*1024)throw new IOException("Nested JAR exceeds read budget");try(InputStream in=zip.getInputStream(row)){return bounded(in,32*1024*1024,cancel,budget);}},0,budget,cancel);
            if(!mod.known)mod.problem="无法可靠读取模组元数据；保留原件";
        }catch(java.util.concurrent.CancellationException e){throw e;}catch(Exception e){mod.known=false;String detail=String.valueOf(e.getMessage());mod.problem="模组元数据检查失败："+e.getClass().getSimpleName()+" "+detail.substring(0,Math.min(240,detail.length()));}
        if(mod.known&&!mod.content&&!mod.server&&!mod.nested)for(Rule rule:rules)if(rule.ids.equals(mod.ids)){mod.sha=verifiedSha==null?hash(file,cancel):verifiedSha;break;}
        return mod;
    }
    /** Small bounded TOML reader for mod identity/dependency data, not an execution engine.
     * Both array-of-tables and equivalent inline arrays are accepted. All declared dependency
     * ids are retained, including optional/incompatible ones, to err toward keeping a mod. */
    private static void parseToml(Mod mod,String text)throws Exception {
        Toml input=new Toml(text);List<String> section=Collections.emptyList();boolean declared=false,dependencyRow=false,needsId=false,hasId=false;
        while(input.more()) {
            if(input.peek()=='[') {
                if(needsId&&!hasId)throw new IOException("Missing modId in TOML identity/dependency row");
                section=input.header();dependencyRow=input.arrayHeader;
                needsId=section.equals(Collections.singletonList("mods"))||section.get(0).equals("dependencies")&&(dependencyRow||section.size()==2);hasId=false;continue;
            }
            List<String> key=input.key();Object value=input.value(0);input.endStatement();
            boolean dependency=!section.isEmpty()&&section.get(0).equals("dependencies");
            if(key.get(0).equals("dependencies")) {dependencyValue(value,mod.depends);continue;}
            if(section.isEmpty()&&key.size()==1&&key.get(0).equals("mods")) {
                if(!(value instanceof List))throw new IOException("Unknown inline mod structure");
                for(Object row:(List<?>)value){if(!(row instanceof Map))throw new IOException("Unknown inline mod entry");mod.ids.add(modId(((Map<?,?>)row).get("modId")));declared=true;}continue;
            }
            if(dependency) {
                if(section.size()==1&&!dependencyRow) {dependencyRows(value,mod.depends);continue;}
                if(key.size()==1&&key.get(0).equals("modId")){mod.depends.add(modId(value));hasId=true;}
                // Other properties of dependency tables (including mc-publish sub-tables)
                // contain tooling/version information, not additional mod identities.
            } else if(section.equals(Collections.singletonList("mods"))&&key.equals(Collections.singletonList("modId"))) {
                mod.ids.add(modId(value));declared=true;hasId=true;
            }
        }
        if(needsId&&!hasId)throw new IOException("Missing modId in TOML identity/dependency row");
        if(!declared)throw new IOException("No declared mod identity in TOML");mod.known=true;
    }
    private static String modId(Object value)throws IOException {
        if(!(value instanceof String)||!ID.matcher((String)value).matches())throw new IOException("Unsupported mod id value");return (String)value;
    }
    private static void dependencyRows(Object value,Set<String> ids)throws IOException {
        if(!(value instanceof List))throw new IOException("Unknown inline dependency rows");
        for(Object row:(List<?>)value){if(!(row instanceof Map))throw new IOException("Unknown inline dependency entry");ids.add(modId(((Map<?,?>)row).get("modId")));}
    }
    private static void dependencyValue(Object value,Set<String> ids)throws IOException {
        if(value instanceof List){dependencyRows(value,ids);return;}
        if(!(value instanceof Map))throw new IOException("Unknown inline dependency map");
        for(Object rows:((Map<?,?>)value).values())dependencyRows(rows,ids);
    }
    private static final class Bare {final String value;Bare(String value){this.value=value;}}
    private static final class Toml {
        final String text;int at,values;boolean arrayHeader;
        Toml(String text){this.text=text.startsWith("\uFEFF")?text.substring(1):text;}
        char peek(){return at<text.length()?text.charAt(at):'\0';}
        void skip(){while(at<text.length()){char c=peek();if(Character.isWhitespace(c)){at++;continue;}if(c=='#'){while(at<text.length()&&peek()!='\n')at++;continue;}break;}}
        boolean more(){skip();return at<text.length();}
        List<String> header()throws IOException {
            int end=text.indexOf('\n',at);if(end<0)end=text.length();String row=withoutComment(text.substring(at,end)).trim();at=end;
            boolean array=row.startsWith("[[");arrayHeader=array;String close=array?"]]":"]";if(!row.endsWith(close))throw new IOException("Malformed TOML table");
            String raw=row.substring(array?2:1,row.length()-close.length()).trim();List<String> path=path(raw);
            // Some released metadata serializes the entire dependency path as one quoted
            // key. Conservatively collecting those ids cannot hide a dependency.
            if(path.size()==1&&path.get(0).startsWith("dependencies."))path=Arrays.asList(path.get(0).split("\\."));
            return path;
        }
        List<String> key()throws IOException {
            int begin=at;char quote=0;boolean escaped=false;
            while(at<text.length()){char c=peek();if(escaped){escaped=false;at++;continue;}if(quote=='"'&&c=='\\'){escaped=true;at++;continue;}if(quote!=0){if(c==quote)quote=0;}else if(c=='"'||c=='\'')quote=c;else if(c=='='){String raw=text.substring(begin,at++).trim();return path(raw);}else if(c=='\n'||c=='#')break;at++;}
            throw new IOException("Malformed TOML assignment");
        }
        static List<String> path(String raw)throws IOException {
            Toml input=new Toml(raw);List<String> result=new ArrayList<>();while(input.more()) {
                String part;if(input.peek()=='"'||input.peek()=='\'')part=input.string();else {int begin=input.at;while(input.at<raw.length()&&input.peek()!='.'&&!Character.isWhitespace(input.peek()))input.at++;part=raw.substring(begin,input.at);if(!part.matches("[A-Za-z0-9_-]+"))throw new IOException("Unsupported TOML key");}
                if(part.isEmpty())throw new IOException("Empty TOML key");result.add(part);input.skip();if(input.at==raw.length())break;if(input.peek()!='.')throw new IOException("Malformed TOML key");input.at++;if(!input.more())throw new IOException("Trailing TOML key separator");
            }if(result.isEmpty())throw new IOException("Missing TOML key");return result;
        }
        Object value(int depth)throws IOException {
            if(depth>16||++values>100000)throw new IOException("TOML value budget exceeded");skip();char c=peek();
            if(c=='"'||c=='\'')return string();
            if(c=='['){at++;List<Object> result=new ArrayList<>();skip();while(peek()!=']'){if(at>=text.length())throw new IOException("Unclosed TOML array");result.add(value(depth+1));skip();if(peek()==']')break;if(peek()!=',')throw new IOException("Malformed TOML array");at++;skip();}at++;return result;}
            if(c=='{'){at++;Map<String,Object> result=new LinkedHashMap<>();skip();while(peek()!='}'){if(at>=text.length())throw new IOException("Unclosed TOML inline table");List<String> key=key();String name=String.join(".",key);Object value=value(depth+1);if(result.put(name,value)!=null)throw new IOException("Duplicate TOML inline key");skip();if(peek()=='}')break;if(peek()!=',')throw new IOException("Malformed TOML inline table");at++;skip();}at++;return result;}
            int begin=at;while(at<text.length()&&!Character.isWhitespace(peek())&&",]}#".indexOf(peek())<0)at++;if(at==begin)throw new IOException("Missing TOML value");return new Bare(text.substring(begin,at));
        }
        String string()throws IOException {
            char quote=peek();boolean triple=at+2<text.length()&&text.charAt(at+1)==quote&&text.charAt(at+2)==quote;at+=triple?3:1;StringBuilder out=new StringBuilder();
            if(triple&&peek()=='\r')at++;if(triple&&peek()=='\n')at++;
            while(at<text.length()) {
                char c=text.charAt(at++);
                if(c==quote){if(!triple)return out.toString();if(at+1<text.length()&&text.charAt(at)==quote&&text.charAt(at+1)==quote){at+=2;return out.toString();}out.append(c);continue;}
                if(!triple&&(c=='\n'||c=='\r'))throw new IOException("Newline in TOML string");
                if(quote=='"'&&c=='\\') {
                    if(at>=text.length())throw new IOException("Unclosed TOML escape");char e=text.charAt(at++);String escapes="btnfr\"\\";String decoded="\b\t\n\f\r\"\\";int index=escapes.indexOf(e);
                    if(index>=0)out.append(decoded.charAt(index));
                    else if(e=='u'||e=='U'){int count=e=='u'?4:8;if(at+count>text.length())throw new IOException("Incomplete Unicode escape");try{int cp=Integer.parseInt(text.substring(at,at+count),16);if(!Character.isValidCodePoint(cp)||cp>=0xD800&&cp<=0xDFFF)throw new IllegalArgumentException();out.appendCodePoint(cp);}catch(IllegalArgumentException bad){throw new IOException("Invalid Unicode escape");}at+=count;}
                    else if(triple&&Character.isWhitespace(e)){while(at<text.length()&&Character.isWhitespace(peek()))at++;}
                    else throw new IOException("Unsupported TOML escape");
                } else out.append(c);
            }throw new IOException("Unclosed TOML string");
        }
        void endStatement()throws IOException {while(at<text.length()&&(peek()==' '||peek()=='\t'||peek()=='\r'))at++;if(peek()=='#'){while(at<text.length()&&peek()!='\n')at++;}if(at<text.length()&&peek()!='\n')throw new IOException("Trailing TOML assignment data");}
    }
    private static String withoutComment(String line) {
        char quote=0;boolean escaped=false;for(int i=0;i<line.length();i++){char c=line.charAt(i);if(escaped){escaped=false;continue;}if(quote=='\"'&&c=='\\'){escaped=true;continue;}if(quote!=0){if(c==quote)quote=0;}else if(c=='\"'||c=='\'')quote=c;else if(c=='#')return line.substring(0,i);}return line;
    }
}
