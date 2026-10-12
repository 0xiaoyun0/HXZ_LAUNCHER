import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const source=process.argv[2];if(!source)throw Error('Pass a clean, pinned FCL checkout');
const java=path.join(source,'FCL/src/main/java');
async function edit(file,fn){const p=path.join(source,file),s=await fs.readFile(p,'utf8');await fs.writeFile(p,fn(s));}
await fs.cp(path.join(here,'src'),java,{recursive:true});
const out=path.join(java,'up/hxz');
for(const file of ['Network.java','DownloadRateLimiter.java'])await fs.copyFile(path.join(root,'resources/installer/src/up/hxz',file),path.join(out,file));
for(const file of ['IO.java','Rules.java'])await fs.copyFile(path.join(here,'updater-base',file),path.join(out,file));
let u=await fs.readFile(path.join(root,'resources/installer/src/up/hxz/Updater.java'),'utf8');
u=u.replace('import java.lang.instrument.Instrumentation;','').replace('private final boolean managed=Boolean.getBoolean("hxz.launcher.managed");','private final boolean managed=true;');
u=u.replace(/    public static void premain[\s\S]*?    private void run\(\)throws Exception\{[\s\S]*?        cache=dir.resolve/, '    public static void android(Path directory)throws Exception { Updater updater=new Updater();updater.dir=directory.toRealPath();updater.own=updater.dir.resolve("android-engine");updater.run(); }\n    private void run()throws Exception{\n        cache=dir.resolve');
u=u.replace('levels=portable==null?IO.integer(config,"maxParentLevels",5,0,99):1;','levels=3;');
u=u.replace(/            if\(portable==null&&!IO.str\(game,[\s\S]*?            JsonObject logs;/,'            JsonObject logs;');
u=u.replace('if(mapped.matches("0/(?:updater-[^/]+\\\\.jar|launcher-agent\\\\.jar|portable\\\\.json)"))','if(mapped.startsWith("0/")||mapped.startsWith("2/")||mapped.matches("3/(?:libraries|assets|versions)(?:/.*)?"))');
u=u.replace('if(p.startsWith(cache))','if(protectedFile(p))');
u=u.replace('private boolean protectedFile(Path p){return ', 'private boolean protectedFile(Path p){Path root=dir.getParent();if(p.startsWith(root.resolve("libraries"))||p.startsWith(root.resolve("assets"))||p.startsWith(root.resolve("versions"))||p.startsWith(root.resolve(".hxz-desktop-versions"))||p.startsWith(root.resolve("saves"))||p.startsWith(root.resolve("screenshots"))||p.equals(root.resolve("hxz-game-profile.json"))||p.equals(root.resolve(".hxz-fabric-api.json")))return true;return ');
u=u.replace('if(d.equals(cache)||','if(protectedFile(d)||').replace('&&!p.equals(own)&&!p.equals(dir.resolve("launcher-agent.jar"))&&!p.equals(dir.resolve("config.json"))&&!p.startsWith(cache)', '&&!protectedFile(p)');
u=u.replace('!IO.str(expected,"version","").equals(IO.str(actual,"version",""))','(!IO.str(actual,"version","").isEmpty()&&!IO.str(expected,"version","").equals(IO.str(actual,"version","")))');
u=u.replace('服务端已更换 Minecraft 或加载器版本。请在当前启动器中安装对应版本并重新导入最新导出包，再执行 HXZUP；本次未替换文件。','服务器游戏配置在安装期间发生变化，请返回社区重新安装；本次未替换文件。');
u=(function adapt(s){
 s=s.replace(/            JsonArray filtered=new JsonArray\(\);\s*for\(JsonElement e:entries\)\{[^\n]+\}\s*entries=filtered;manifest.add\("files",filtered\);/, '            entries=AndroidPaths.manifest(entries);manifest.add("files",entries);');
 s=s.replace('new Rules(network.json(base+"/action.json"+suffix,8))','new Rules(AndroidPaths.rules(network.json(base+"/action.json"+suffix,8)))');
 s=s.replace('Path root=dir.getParent();if(p.startsWith(root.resolve("libraries"))','Path root=dir.getParent();if(p.startsWith(dir)||p.startsWith(root.resolve(".hxz-fabric-download"))||p.startsWith(root.resolve("libraries"))');
 return s;
})(u);
if(u.includes('GameInstaller')||u.includes('Instrumentation'))throw Error('Desktop updater dependency left in Android source');
await fs.writeFile(path.join(out,'Updater.java'),u);
let io=await fs.readFile(path.join(out,'IO.java'),'utf8');
io=io.replace('Path root=updater;for(int i=0;i<level;i++){root=root.getParent();if(root==null)throw new IOException("映射超出文件系统根目录");}', 'if(level!=1&&level!=3)throw new IOException("手机只同步实例与共享游戏内容: "+mapped);Path root=updater.getParent();');
// Android /storage/emulated aliases are resolved before the updater starts. Child symlinks remain rejected.
io=io.replace('Files.isSymbolicLink(cur)||!cur.toRealPath().equals(cur.toAbsolutePath().normalize())','Files.isSymbolicLink(cur)&&!cur.toString().matches("/(?:sdcard|storage/emulated|data/user/0)(?:/)?")');
await fs.writeFile(path.join(out,'IO.java'),io);
await edit('FCL/src/main/AndroidManifest.xml',s=>s.replace('android:allowBackup="true"','android:allowBackup="false"').replace('    <application','    <permission android:name="top.hxzmc.permission.GAME_ENGINE" android:protectionLevel="signature" />\n    <application').replace('        <activity','        <activity android:name="com.tungsten.fcl.hxz.HxzBridgeActivity" android:exported="true" android:permission="top.hxzmc.permission.GAME_ENGINE" android:excludeFromRecents="true" />\n        <activity'));
await edit('FCL/src/main/java/com/tungsten/fcl/activity/MainActivity.kt',s=>s.replace('UpdateChecker.getInstance().checkAuto(this@MainActivity).start()','// HXZ uses its own signed component update feed.').replace('                setupVersionDisplay()','                setupVersionDisplay()\n                com.tungsten.fcl.hxz.HxzRunner.consume(this@MainActivity)').replace('        super.onNewIntent(intent)','        super.onNewIntent(intent)\n        if (_uiManager != null) com.tungsten.fcl.hxz.HxzRunner.consume(this)'));
await edit('FCL/src/main/java/com/tungsten/fcl/activity/SplashActivity.kt',s=>s.replace('        if (hasPermission()) {','        if (true) { // HXZ keeps game data in app-owned storage.'));
await edit('FCL/src/main/java/com/tungsten/fclauncher/utils/FCLPath.java',s=>s.replace('public static String SHARED_COMMON_DIR = Environment.getExternalStorageDirectory().getAbsolutePath() + "/FCL/.minecraft";','public static String SHARED_COMMON_DIR;').replaceAll('Environment.getExternalStorageDirectory().getAbsolutePath() + "/FCL/', 'context.getExternalFilesDir(null).getAbsolutePath() + "/').replace('        PRIVATE_COMMON_DIR =','        SHARED_COMMON_DIR = new File(externalFilesDir, ".minecraft").getAbsolutePath();\n        PRIVATE_COMMON_DIR ='));
for(const entry of await fs.readdir(path.join(source,'FCL/src/main/res'),{withFileTypes:true}))if(entry.isDirectory()&&entry.name.startsWith('values')){const file=path.join(source,'FCL/src/main/res',entry.name,'strings.xml');try{let s=await fs.readFile(file,'utf8');s=s.replace(/(<string name="app_name">)[^<]+/, '$1HXZ 游戏运行引擎');await fs.writeFile(file,s);}catch(e){if(e.code!=='ENOENT')throw e;}}
console.log('HXZ Android bridge and transactional pack updater installed');
// Second-stage changes are idempotent and also available for maintaining an existing fork.
const {execFileSync}=await import('node:child_process');
execFileSync(process.execPath,[path.join(here,'apply-adaptation.mjs'),source],{stdio:'inherit',windowsHide:true});
