package top.hxzmc.community.game;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.lang.Process;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;
import top.hxzmc.runtime.*;

/** HXZ's own game screen. ART owns input/surface; HotSpot lives in a native child process. */
public final class GameRuntimeActivity extends Activity implements SurfaceHolder.Callback {
    private final ExecutorService work=Executors.newSingleThreadExecutor();
    private final EngineHost.Cancellation cancellation=new EngineHost.Cancellation();
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final CountDownLatch surfaceReady=new CountDownLatch(1);
    private JSONObject request,options;private File root,run,log;private AndroidEngineHost host;private volatile String clientModDiagnostic="";
    private FrameLayout frame;private LinearLayout panel;private TextView heading,detail;private ProgressBar progress;private Button diagnosticButton;private File diagnosticLog;private volatile String lastDiagnosticPhase="",diagnosticText="";
    private SurfaceView surface;private GameControlsView controls;private volatile Process process;private volatile boolean playing,closing;
    private long lastProgress,roomLogOffset;private final ByteArrayOutputStream roomLogLine=new ByteArrayOutputStream();private final Set<String> secrets=ConcurrentHashMap.newKeySet();private volatile int surfacePixelWidth,surfacePixelHeight;private volatile boolean surfaceLive;private int renderWidth=1280,renderHeight=720,hostPort;private String accountId="";
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        try {
            request=new JSONObject(getIntent().getStringExtra("job"));if(request.optInt("protocol")!=1||Math.abs(System.currentTimeMillis()-request.getLong("created"))>300000)throw new IOException("游戏准备请求已过期，请返回社区重试");
            File module=new File(request.getString("runtimeRoot")).getCanonicalFile(),moduleBase=new File(getFilesDir(),"runtime-modules").getCanonicalFile();
            if(!module.toPath().startsWith(moduleBase.toPath())||module.equals(moduleBase))throw new IOException("运行模块位置无效");
            host=new AndroidEngineHost(this,module);options=request.optJSONObject("options");if(options==null)options=new JSONObject();
            android.content.SharedPreferences savedOptions=getSharedPreferences("hxz-game-controls",0);for(String key:Arrays.asList("controlSize","sensitivity","resolutionPercent"))if(!options.has(key)&&savedOptions.contains(key))options.put(key,savedOptions.getFloat(key,1));hostPort=options.optInt("hostLanPort");
            buildScreen();if(request.optBoolean("accountOnly")){settings();return;}
            root=new File(getFilesDir(),"minecraft/.minecraft");if(!root.isDirectory()&&!root.mkdirs())throw new IOException("无法创建游戏目录");
            work.execute(this::prepareAndPlay);
        }catch(Exception e){if(frame==null)buildScreen();failed(e);}
    }
    private int dp(float value){return (int)(value*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String value,int size,int color){TextView view=new TextView(this);view.setText(value);view.setTextColor(color);view.setTextSize(size);view.setLineSpacing(dp(3),1);return view;}
    private void buildScreen(){
        frame=new FrameLayout(this);frame.setBackgroundColor(0xfff3f5fa);setContentView(frame);
        surface=new SurfaceView(this);surface.getHolder().addCallback(this);frame.addView(surface,new FrameLayout.LayoutParams(-1,-1));
        controls=new GameControlsView(this);controls.setExitAction(this::leave);controls.setVisibility(View.GONE);frame.addView(controls,new FrameLayout.LayoutParams(-1,-1));
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(false);FrameLayout.LayoutParams sc=new FrameLayout.LayoutParams(Math.min(dp(680),getResources().getDisplayMetrics().widthPixels-dp(48)),-2,Gravity.CENTER);sc.setMargins(dp(24),dp(20),dp(24),dp(20));frame.addView(scroll,sc);
        panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setPadding(dp(24),dp(20),dp(24),dp(20));GradientDrawable background=new GradientDrawable();background.setColor(0xfffcfdff);background.setCornerRadius(dp(18));panel.setBackground(background);scroll.addView(panel);
        heading=text("准备进入世界",22,0xff263354);panel.addView(heading);detail=text("正在检查账号与游戏资源",14,0xff697592);LinearLayout.LayoutParams line=new LinearLayout.LayoutParams(-1,-2);line.topMargin=dp(14);panel.addView(detail,line);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setIndeterminate(true);LinearLayout.LayoutParams bar=new LinearLayout.LayoutParams(-1,dp(6));bar.topMargin=dp(20);bar.bottomMargin=dp(20);panel.addView(progress,bar);
        diagnosticButton=new Button(this);diagnosticButton.setText("复制技术诊断");diagnosticButton.setAllCaps(false);diagnosticButton.setVisibility(View.GONE);diagnosticButton.setOnClickListener(v->{((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("游戏诊断",diagnosticText));Toast.makeText(this,"诊断已复制，凭据与链接查询参数已隐藏",Toast.LENGTH_SHORT).show();});panel.addView(diagnosticButton,new LinearLayout.LayoutParams(-2,dp(48)));
        Button cancel=new Button(this);cancel.setText("返回社区");cancel.setTextColor(0xff5868bb);cancel.setAllCaps(false);cancel.setOnClickListener(v->leave());panel.addView(cancel,new LinearLayout.LayoutParams(-2,dp(48)));
    }
    private Bundle bridge(String method,Bundle input){return getContentResolver().call(Uri.parse("content://"+getPackageName()+".game-account"),method,null,input);}
    private JSONObject account()throws Exception{Bundle reply=bridge("selectedAccount",null);if(reply==null||!reply.containsKey("account"))throw new IOException(reply==null?"无法读取社区账号":reply.getString("message"));JSONObject account=new JSONObject(reply.getString("account"));JSONObject requested=request.optJSONObject("account");String uuid=account.getString("uuid");if(!accountId.isEmpty()&&!accountId.equals(uuid)||requested!=null&&!requested.getString("uuid").equals(uuid))throw new IOException("社区角色已切换，请重新启动游戏");accountId=uuid;for(String key:Arrays.asList("accessToken","clientToken")){String secret=account.optString(key);if(!secret.isEmpty())secrets.add(secret);}return account;}
    private int memory(){ActivityManager.MemoryInfo info=new ActivityManager.MemoryInfo();((ActivityManager)getSystemService(ACTIVITY_SERVICE)).getMemoryInfo(info);long available=info.availMem/1048576;int ceiling=(int)Math.max(512,Math.min(6144,available-768));int requested=options.optInt("memoryMB");return Math.min(ceiling,requested>0?Math.max(512,requested):(int)Math.max(512,Math.min(4096,available*.45)));}
    private void update(String phase,String item,long completed,long total){
        if(!phase.equals(lastDiagnosticPhase)){lastDiagnosticPhase=phase;recordDiagnosticPhase(phase);}
        long now=SystemClock.elapsedRealtime();if(now-lastProgress<150&&completed!=total)return;lastProgress=now;
        String title=phase.equals("download")?"正在下载游戏资源":phase.equals("compatibility")?"正在检查手机模组适配":phase.startsWith("processor")?"正在安装游戏加载器":phase.contains("update")?"正在同步整合包":"正在准备游戏";
        ui.post(()->{if(closing)return;heading.setText(title);detail.setText(item+(total>0?"\n"+completed+" / "+total:""));progress.setIndeterminate(total<=0);if(total>0){progress.setMax(1000);progress.setProgress((int)Math.min(1000,completed*1000L/total));}});
    }
    private void recordDiagnosticPhase(String phase){
        File file=diagnosticLog;if(file==null)return;
        try{if(file.length()<16384)Files.write(file.toPath(),(System.currentTimeMillis()+" "+phase.replaceAll("[^A-Za-z0-9_-]","")+"\n").getBytes(StandardCharsets.UTF_8),StandardOpenOption.CREATE,StandardOpenOption.APPEND);}catch(IOException ignored){}
    }
    private void prepareAndPlay(){
        File jobFile=null;
        try {
            diagnosticLog=new File(host.logs,"preparation-latest.log");Files.write(diagnosticLog.toPath(),new byte[0]);lastDiagnosticPhase="";
            JSONObject selected=request.getJSONObject("server");JSONArray presets=new JSONArray();for(ServerPresets.Preset p:ServerPresets.defaults())presets.put(p.id.equals(selected.getString("id"))?selected:p.json());
            ServerPresets.Preset preset=null;for(ServerPresets.Preset p:ServerPresets.read(presets))if(p.id.equals(selected.getString("id")))preset=p;if(preset==null)throw new IOException("未知默认服务器");
            JSONObject adjusted=preset.json();if(!preset.updateRequired)adjusted.put("autoUpdate",options.optBoolean("autoUpdate",true));adjusted.put("autoJoin",options.optBoolean("autoJoin",true));
            for(int i=0;i<presets.length();i++)if(presets.getJSONObject(i).getString("id").equals(preset.id))presets.put(i,adjusted);for(ServerPresets.Preset p:ServerPresets.read(presets))if(p.id.equals(selected.getString("id")))preset=p;
            run=new File(root,"versions/"+preset.id);if(!run.isDirectory()&&!run.mkdirs())throw new IOException("无法创建实例目录");
            JSONObject account=account(),rendererInfo=selectRenderer();if(!surfaceReady.await(15,TimeUnit.SECONDS)||!surfaceLive)throw new IOException("游戏画面尚未准备好，请返回后重试");cancellation.check();
            int width=surfacePixelWidth,height=surfacePixelHeight;if(width<1||height<1){width=getResources().getDisplayMetrics().widthPixels;height=getResources().getDisplayMetrics().heightPixels;}
            int longSide=Math.max(width,height),shortSide=Math.min(width,height);double requested=Math.max(.35,Math.min(1,options.optDouble("resolutionPercent",70)/100));
            double maximum=Math.min(1920.0/longSide,1080.0/shortSide),minimum=Math.max(640.0/longSide,360.0/shortSide);
            double scale=minimum<=maximum?Math.max(minimum,Math.min(requested,maximum)):maximum;
            renderWidth=Math.max(1,(int)Math.round(longSide*scale));renderHeight=Math.max(1,(int)Math.round(shortSide*scale));
            File nativeRoot=host.resource("lwjgl");GamePreparation.Context context=new GamePreparation.Context(run,nativeRoot,account.getString("name"),account.getString("uuid"),account.getString("accessToken"),"mojang","",account.getString("clientToken"),memory(),renderWidth,renderHeight,Collections.singletonMap("has_custom_resolution",true));
            RuntimeDownloads downloads=new RuntimeDownloads(Math.max(4,Math.min(32,options.optInt("concurrency",32))));
            ClientModCompatibility compatibility=new ClientModCompatibility(run);
            LaunchPlan plan=new ServerPreparation(root,downloads,host.resource("tools/updater-launcher.jar")).prepare(preset,context,host,cancellation,this::update,hostPort==0&&options.optString("joinServer").isEmpty(),compatibility,this::clientModReport);
            cancellation.check();account();defaults();
            JSONObject expected=request.optJSONObject("expectedGame");
            // A full pack fingerprint is only needed for player-hosted rooms, not ordinary server entry.
            if(hostPort>0||expected!=null){
                JSONObject gameDescription=describeGame(new GamePreparation(root,downloads).readVersion(preset.id),preset.id,compatibility);
                if(expected!=null)for(String key:Arrays.asList("minecraft","loader","loaderVersion","mods","modCount"))if(!String.valueOf(expected.opt(key)).equals(String.valueOf(gameDescription.opt(key))))throw new IOException("与房主的游戏版本或模组不一致，请更新到相同整合包后重试");
                if(hostPort>0){Bundle info=new Bundle();info.putInt("port",hostPort);info.putString("game",gameDescription.toString());bridge("roomState",info);}
            }
            String lwjgl=lwjgl(plan);File nativeLibs=host.resource("lwjgl/"+lwjgl);
            String rendererPath=rendererInfo.getString("library");if(!rendererPath.startsWith("app_runtime/renderers/"))throw new IOException("图形运行模块路径无效");File renderer=host.resource(rendererPath.substring("app_runtime/".length()));
            List<String> extra=new ArrayList<>(Arrays.asList("-Dorg.lwjgl.librarypath="+nativeLibs,"-Dorg.lwjgl.system.allocator=system","-Dorg.lwjgl.glfw.libname="+new File(getApplicationInfo().nativeLibraryDir,"libhxz_runtime.so"),"-Dorg.lwjgl.opengl.contextAPI=OSMesa","-Dorg.lwjgl.opengl.osmesa.libname="+renderer,"-Dorg.lwjgl.openal.libname="+host.resource("audio/libopenal.so"),"-javaagent:"+host.resource("tools/authlib-injector.jar")+"=https://skin.hxzmc.top/api/yggdrasil"));
            if(lwjgl.equals("3.3.3"))extra.add("-Dorg.lwjgl.opengl.libname="+renderer);
            if(lwjgl.equals("3.4.1"))extra.add("-Dorg.lwjgl.freetype.libname="+host.resource("lwjgl/3.4.1/libfreetype.so"));
            String jna=jna(plan);if(jna!=null){File dispatch=host.resource("jna/"+jna+"/libjnidispatch.so");if(!dispatch.isFile())throw new IOException("运行模块缺少此游戏需要的 JNA "+jna+"，请更新运行模块");extra.add("-Djna.boot.library.path="+dispatch.getParent());extra.add("-Djna.nosys=true");extra.add("-Djna.nounpack=true");}
            List<String> game=new ArrayList<>();String address=options.optString("joinServer");if(!address.isEmpty())game.addAll(Arrays.asList("--quickPlayMultiplayer",address));
            if(hostPort>0){extra.add("-javaagent:"+host.resource("tools/direct-lobby.jar"));touchRoomControl();}
            jobFile=host.job(freshJob(plan.javaJob(),account().getString("accessToken")),extra,game);log=new File(host.logs,"game-latest.log");Files.write(log.toPath(),new byte[0]);roomLogOffset=0;roomLogLine.reset();
            cancellation.check();
            String socket=new File(getCacheDir(),"game-"+android.os.Process.myPid()+".sock").getAbsolutePath();String error=NativeRuntime.start(socket,renderWidth,renderHeight);if(error!=null)throw new IOException(error);
            File executable=new File(getApplicationInfo().nativeLibraryDir,"libhxz_jvm_exec.so");if(!executable.canExecute())throw new IOException("游戏进程组件缺失，请更新社区应用");
            ProcessBuilder builder=new ProcessBuilder(executable.getAbsolutePath(),jobFile.getAbsolutePath(),socket,renderer.getAbsolutePath(),"osmesa").directory(run).redirectErrorStream(true).redirectOutput(log);
            builder.environment().put("LD_LIBRARY_PATH",renderer.getParent()+":"+nativeLibs+":"+host.resource("audio")+":"+host.javaHome(plan.javaMajor)+"/lib/server:"+host.javaHome(plan.javaMajor)+"/lib:"+getApplicationInfo().nativeLibraryDir);
            builder.environment().put("TMPDIR",getCacheDir().getAbsolutePath());builder.environment().put("GALLIUM_DRIVER",rendererInfo.getString("driver"));if(rendererInfo.getString("driver").equals("softpipe"))builder.environment().put("LIBGL_ALWAYS_SOFTWARE","1");process=builder.start();playing=true;
            ui.post(()->{((View)panel.getParent()).setVisibility(View.GONE);controls.configure(options.optInt("controlSize",100)/100f,(float)options.optDouble("sensitivity",1),renderWidth,renderHeight);controls.setVisibility(View.VISIBLE);});
            long lastRoom=0;while(!process.waitFor(250,TimeUnit.MILLISECONDS)){cancellation.check();if(hostPort>0&&SystemClock.elapsedRealtime()-lastRoom>2500){lastRoom=SystemClock.elapsedRealtime();touchRoomControl();}}
            int exit=process.exitValue();playing=false;if(exit!=0)throw new IOException("游戏退出（代码 "+exit+"）。安装进度和存档已保留，日志在游戏诊断中。\n"+logTail());ui.post(this::leave);
        }catch(Exception e){if(!closing)failed(e);}finally {playing=false;stopGame();if(jobFile!=null)try{Files.deleteIfExists(jobFile.toPath());}catch(IOException ignored){}roomExited();}
    }
    private static EngineHost.JavaJob freshJob(EngineHost.JavaJob original,String token)throws Exception {
        List<String> args=new ArrayList<>(original.arguments);boolean replaced=false;
        for(int i=0;i<args.size();i++){
            String value=args.get(i);if(value.equals("--accessToken")){
                if(i+1>=args.size())throw new IOException("游戏登录参数不完整");args.set(++i,token);replaced=true;
            }else if(value.startsWith("--accessToken=")){args.set(i,"--accessToken="+token);replaced=true;}
        }
        if(!replaced)throw new IOException("游戏缺少登录参数，请重新准备实例");
        return new EngineHost.JavaJob(original.javaMajor,original.mainClass,original.workingDirectory,original.classpath,original.jvmArguments,args);
    }
    private String lwjgl(LaunchPlan plan)throws IOException {String version=null;for(File file:plan.classpath){java.util.regex.Matcher match=java.util.regex.Pattern.compile("lwjgl-([0-9]+\\.[0-9]+\\.[0-9]+)(?:-unsafe)?\\.jar").matcher(file.getName());if(match.matches()){String found=match.group(1);if(version!=null&&!version.equals(found))throw new IOException("游戏存在互不兼容的 LWJGL 版本");version=found;}}if(!Arrays.asList("3.3.3","3.4.1").contains(version))throw new IOException("当前运行模块尚未适配图形接口 LWJGL "+version);return version;}
    private String jna(LaunchPlan plan)throws IOException {String version=null;for(File file:plan.classpath){java.util.regex.Matcher match=java.util.regex.Pattern.compile("jna-([0-9]+\\.[0-9]+\\.[0-9]+)\\.jar").matcher(file.getName());if(match.matches()){String found=match.group(1);if(version!=null&&!version.equals(found))throw new IOException("游戏存在互不兼容的 JNA 版本");version=found;}}if(version!=null&&!Arrays.asList("5.14.0","5.17.0").contains(version))throw new IOException("当前运行模块尚未适配系统接口 JNA "+version);return version;}
    private JSONObject selectRenderer()throws Exception {
        File file=new File(host.module,"module.json");if(!file.isFile()||file.length()>1024*1024)throw new IOException("运行模块清单无效");JSONObject metadata=new JSONObject(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8));JSONArray renderers=metadata.optJSONArray("renderers");
        if(renderers==null||renderers.length()==0)throw new IOException("此运行模块尚未包含可用的图形驱动，请更新运行模块");String selected=options.optString("renderer","auto");boolean vulkan=getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_VULKAN_HARDWARE_LEVEL);JSONObject fallback=null;
        for(int i=0;i<renderers.length();i++){JSONObject item=renderers.getJSONObject(i);if(!item.optString("kind").equals("osmesa")||!Arrays.asList("zink","softpipe").contains(item.optString("driver")))continue;if(item.optBoolean("requiresVulkan")&&!vulkan)continue;
            if(item.optString("id").equals(selected))return item;if(selected.equals("auto")&&(fallback==null||item.optString("driver").equals("zink")))fallback=item;
        }if(fallback!=null)return fallback;throw new IOException("当前设备不支持所选渲染器，请在运行设置中选择自动检测");
    }
    private void clientModReport(ClientModCompatibility.Report report) {
        StringBuilder summary=new StringBuilder(report.summary()).append('\n');
        for(ClientModCompatibility.Finding finding:report.findings)if(!finding.ruleId.isEmpty())summary.append(finding.relativePath).append(" · ").append(finding.decision).append(" · ").append(finding.reason).append('\n');
        clientModDiagnostic=summary.toString();
        try{RuntimeFiles.writeJson(RuntimeFiles.inside(run,".hxz/client-mods/report.json"),report.toJson());}catch(Exception e){clientModDiagnostic+="兼容性报告写入失败："+e.getClass().getSimpleName()+"\n";}
        if(report.disabled>0)ui.post(()->{if(!closing)Toast.makeText(this,"已停用 "+report.disabled+" 个手机不支持的客户端模组，原件已保留",Toast.LENGTH_LONG).show();});
    }
    private JSONObject describeGame(JSONObject metadata,String preset,ClientModCompatibility compatibility)throws Exception {
        JSONObject profile=metadata.getJSONObject("hxzGameProfile"),loader=profile.optJSONObject("loader");List<String> hashes=new ArrayList<>();File[] jars=new File(run,"mods").listFiles(f->f.isFile()&&f.getName().toLowerCase(Locale.ROOT).endsWith(".jar"));
        if(jars!=null){if(jars.length>10000)throw new IOException("实例模组数量异常");for(File jar:jars){cancellation.check();if(Files.isSymbolicLink(jar.toPath()))throw new IOException("模组路径不能为符号链接");java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(jar)){byte[] buffer=new byte[65536];int count;while((count=in.read(buffer))!=-1)digest.update(buffer,0,count);}hashes.add(hex(digest.digest()));}}
        // Match the installed pack, including preserved, byte-verified client-only adjustments.
        // Arbitrary disabled/removed JARs never contribute a fingerprint or bypass room checks.
        for(ClientModCompatibility.QuarantinedFile saved:compatibility.validatedQuarantine(cancellation))hashes.add(saved.sha256);
        Collections.sort(hashes);String mods=hashes.isEmpty()?"":hex(java.security.MessageDigest.getInstance("SHA-256").digest(String.join("\n",hashes).getBytes(StandardCharsets.UTF_8)));
        String loaderType=loader==null?"":loader.optString("type");if(loaderType.equals("vanilla"))loaderType="";
        return new JSONObject().put("minecraft",profile.getString("gameVersion")).put("loader",loaderType).put("loaderVersion",loader==null?"":loader.optString("version")).put("modCount",hashes.size()).put("mods",mods).put("preset",preset);
    }
    private static String hex(byte[] bytes){StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();}
    private void defaults()throws IOException {
        File file=new File(run,"options.txt");if(file.length()>1024*1024)throw new IOException("游戏设置文件过大，请在实例目录检查 options.txt");
        List<String> lines=file.isFile()?Files.readAllLines(file.toPath(),StandardCharsets.UTF_8):new ArrayList<>(Arrays.asList("lang:zh_cn","guiScale:2","maxFps:60","renderDistance:8","simulationDistance:6"));
        // This window backend implements desktop OpenGL through OSMesa, not a Vulkan game surface.
        // Minecraft 26.2's documented OpenGL preference avoids initializing its experimental Vulkan backend.
        lines.removeIf(line->line.startsWith("preferredGraphicsBackend:"));lines.add("preferredGraphicsBackend:\"opengl\"");
        Path pending=Files.createTempFile(run.toPath(),"options-",".tmp");try{Files.write(pending,lines,StandardCharsets.UTF_8);try{Files.move(pending,file.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(AtomicMoveNotSupportedException e){Files.move(pending,file.toPath(),StandardCopyOption.REPLACE_EXISTING);}}finally{Files.deleteIfExists(pending);}
    }
    private void touchRoomControl()throws Exception {
        Bundle input=new Bundle();input.putInt("port",hostPort);input.putBoolean("poll",true);Bundle reply=bridge("roomState",input);if(reply==null||!reply.getBoolean("active"))throw new IOException("联机房间已关闭，请返回大厅重建房间");
        File control=new File(run,".hxzl/direct-lobby.properties");if(!control.getParentFile().isDirectory()&&!control.getParentFile().mkdirs())throw new IOException("无法创建联机控制目录");
        Properties settings=new Properties();settings.setProperty("port",Integer.toString(hostPort));Path temporary=Files.createTempFile(control.getParentFile().toPath(),"direct-lobby-",".tmp");
        try{try(OutputStream out=Files.newOutputStream(temporary)){settings.store(out,"HXZ room heartbeat");}
            try{Files.move(temporary,control.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(AtomicMoveNotSupportedException e){Files.move(temporary,control.toPath(),StandardCopyOption.REPLACE_EXISTING);}
        }finally{Files.deleteIfExists(temporary);}
        readRoomSignals();
    }
    private void readRoomSignals()throws IOException {
        if(log==null||!log.isFile())return;
        try(RandomAccessFile file=new RandomAccessFile(log,"r")){
            if(file.length()<roomLogOffset){roomLogOffset=0;roomLogLine.reset();}
            file.seek(roomLogOffset);byte[] block=new byte[8192];int remaining=256*1024,n;
            while(remaining>0&&(n=file.read(block,0,Math.min(block.length,remaining)))>0){roomLogOffset+=n;remaining-=n;
                for(int i=0;i<n;i++){int value=block[i]&255;if(value=='\n'){readRoomSignalLine(new String(roomLogLine.toByteArray(),StandardCharsets.UTF_8));roomLogLine.reset();}
                    else if(roomLogLine.size()<8192)roomLogLine.write(value);else roomLogLine.reset();}
            }
        }
    }
    private void readRoomSignalLine(String line){int marker=line.indexOf("[HXZ-DIRECT] ");if(marker<0)return;String message=line.substring(marker+13).trim();
        Bundle input=new Bundle();input.putInt("port",hostPort);input.putBoolean("poll",false);
        if(message.equals("READY "+hostPort))input.putBoolean("ready",true);
        else if(message.equals("WAITING")){}
        else if(message.startsWith("ERROR "))input.putString("error",message.substring(6));
        else return;bridge("roomState",input);
    }
    private void roomExited(){if(hostPort<=0)return;try{if(run!=null)Files.deleteIfExists(new File(run,".hxzl/direct-lobby.properties").toPath());Bundle input=new Bundle();input.putInt("port",hostPort);input.putBoolean("exited",true);bridge("roomState",input);}catch(Exception ignored){}}
    private String logTail(){if(log==null)return "";try(RandomAccessFile file=new RandomAccessFile(log,"r")){file.seek(Math.max(0,file.length()-6000));byte[] bytes=new byte[(int)Math.min(6000,file.length())];file.readFully(bytes);return scrub(new String(bytes,StandardCharsets.UTF_8));}catch(Exception e){return "";}}
    private String scrub(String input){String value=input==null?"":input;JSONObject original=request==null?null:request.optJSONObject("account");if(original!=null)for(String key:Arrays.asList("accessToken","clientToken")){String secret=original.optString(key);if(!secret.isEmpty())value=value.replace(secret,"[已隐藏]");}
        for(String secret:secrets)if(!secret.isEmpty())value=value.replace(secret,"[已隐藏]");
        value=value.replaceAll("(?i)(https?://[^\\s?#]+)\\?[^\\s#]+","$1?[查询已隐藏]");
        value=value.replaceAll("(?i)(\\\"(?:accessToken|clientToken|token|password|secret)\\\"\\s*:\\s*\\\")[^\\\"]+","$1[已隐藏]");
        value=value.replaceAll("(?i)((?:accessToken|clientToken|authorization|password|secret|session|token)\\s*[=:]\\s*)[^\\s,;]+","$1[已隐藏]");
        return value.replaceAll("(?im)^.*(?:command\\s*line|vm arguments|jvm arguments|java_command|sun\\.java\\.command|--accessToken|-Dorg\\.lwjgl|-javaagent:).*$","[启动参数已隐藏]");
    }
    private String brief(Throwable error){StringBuilder evidence=new StringBuilder();for(Throwable current=error;current!=null&&evidence.length()<24576;current=current.getCause())evidence.append(current.getMessage()).append('\n');String advice=GameFailureAdvice.explain(evidence.toString());if(!advice.isEmpty())return advice;for(Throwable current=error;current!=null;current=current.getCause()){
        if(current instanceof AndroidEngineHost.ProcessorFailure)return "游戏安装或更新处理器失败。复制技术诊断可查看退出码和日志。";
        if(current instanceof java.net.UnknownHostException||current instanceof java.net.ConnectException||current instanceof java.net.SocketTimeoutException||current instanceof javax.net.ssl.SSLException)return "当前下载节点连接失败，请检查网络后重试；已下载内容会保留。";
        if(current instanceof FileNotFoundException||current instanceof NoSuchFileException)return "缺少运行资源或游戏文件，请检查安装状态后重试。";
        String message=current.getMessage();if(message==null)continue;String lower=message.toLowerCase(Locale.ROOT);
        if(lower.contains("下载节点")||lower.contains("http ")||lower.contains("download failed"))return "当前下载节点未提供所需资源或连接失败，请稍后重试。";
        if(lower.contains("missing")||lower.contains("not found")||lower.contains("资源缺失"))return "缺少运行资源或游戏文件，请检查安装状态后重试。";
        if(lower.contains("integrity")||lower.contains("checksum")||lower.contains("完整性")||lower.contains("散列"))return "资源校验失败，请重新下载或修复运行模块。";
    }String detail=scrub(error.getMessage());int newline=detail.indexOf('\n');if(newline>=0)detail=detail.substring(0,newline);return detail.length()>180?detail.substring(0,180)+"…":detail.isEmpty()?"游戏准备失败，请复制技术诊断查看原因。":detail;}
    private String technical(Throwable error){StringBuilder out=new StringBuilder("HXZ Android 游戏诊断\n");out.append(Build.MANUFACTURER).append(' ').append(Build.MODEL).append(" · Android ").append(Build.VERSION.RELEASE).append('\n');if(!clientModDiagnostic.isEmpty())out.append("客户端适配:\n").append(clientModDiagnostic);int depth=0;for(Throwable current=error;current!=null&&depth++<8;current=current.getCause())out.append(current.getClass().getSimpleName()).append(": ").append(current.getMessage()).append('\n');
        File file=diagnosticLog;if(file!=null&&file.isFile())try{byte[] bytes=Files.readAllBytes(file.toPath());out.append("准备阶段:\n").append(new String(bytes,0,Math.min(bytes.length,16384),StandardCharsets.UTF_8));}catch(IOException ignored){}
        String result=scrub(out.toString());return result.length()>24576?result.substring(0,24576):result;}
    private void failed(Exception error){String summary=brief(error),details=technical(error);ui.post(()->{if(closing)return;diagnosticText=details;playing=false;controls.setVisibility(View.GONE);((View)panel.getParent()).setVisibility(View.VISIBLE);heading.setText("暂时未能进入游戏");detail.setText(summary);progress.setVisibility(View.GONE);diagnosticButton.setVisibility(View.VISIBLE);});}
    private void settings(){try{JSONObject account=account();heading.setText("游戏运行设置");detail.setText("当前角色："+account.getString("name")+"\n角色与社区同步，无需再次导入。\n左侧移动，右侧拖动视角；支持键盘输入。调整自动保存，下次启动生效。");progress.setVisibility(View.GONE);slider("controlSize","触控按钮大小",70,150,100);slider("resolutionPercent","渲染分辨率",35,100,70);slider("sensitivity","视角灵敏度",25,200,100);}catch(Exception e){failed(e);}}
    private void slider(String key,String label,int minimum,int maximum,int initial){android.content.SharedPreferences prefs=getSharedPreferences("hxz-game-controls",0);float value=prefs.getFloat(key,key.equals("sensitivity")?1:initial);int current=key.equals("sensitivity")?Math.round(value*100):Math.round(value);TextView caption=text(label+" · "+current+"%",14,0xff394568);caption.setPadding(0,dp(14),0,0);panel.addView(caption,panel.getChildCount()-1);SeekBar seek=new SeekBar(this);seek.setMin(minimum);seek.setMax(maximum);seek.setProgress(current);panel.addView(seek,panel.getChildCount()-1,new LinearLayout.LayoutParams(-1,dp(44)));seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int n,boolean user){caption.setText(label+" · "+n+"%");if(user)prefs.edit().putFloat(key,key.equals("sensitivity")?n/100f:n).apply();}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});}
    private synchronized void stopGame(){
        NativeRuntime.stop();Process current=process;if(current==null||!current.isAlive())return;
        // Closing GLFW lets Minecraft flush world data. Force only after the bounded graceful wait.
        boolean interrupted=Thread.interrupted();try{if(!current.waitFor(20,TimeUnit.SECONDS)){current.destroy();if(!current.waitFor(3,TimeUnit.SECONDS))current.destroyForcibly();}}catch(InterruptedException e){current.destroy();Thread.currentThread().interrupt();}finally{if(interrupted)Thread.currentThread().interrupt();}
    }
    private void leave(){if(closing)return;closing=true;cancellation.cancel();if(controls!=null)controls.release();NativeRuntime.stop();heading.setText("正在退出游戏");detail.setText("正在等待游戏保存世界…");((View)panel.getParent()).setVisibility(View.VISIBLE);work.execute(()->{stopGame();roomExited();ui.post(()->{finish();ui.postDelayed(()->android.os.Process.killProcess(android.os.Process.myPid()),300);});});}
    @Override public void onBackPressed(){if(playing){NativeRuntime.event(1,256,0,1,0);NativeRuntime.event(1,256,0,0,0);}else leave();}
    @Override protected void onPause(){super.onPause();if(controls!=null)controls.release();NativeRuntime.event(6,0,0,0,0);}
    @Override protected void onResume(){super.onResume();NativeRuntime.event(6,1,0,0,0);}
    @Override protected void onDestroy(){cancellation.cancel();NativeRuntime.stop();work.shutdown();super.onDestroy();}
    @Override public void surfaceCreated(SurfaceHolder holder){android.graphics.Rect bounds=holder.getSurfaceFrame();surfacePixelWidth=bounds.width();surfacePixelHeight=bounds.height();surfaceLive=true;NativeRuntime.surface(holder.getSurface(),renderWidth,renderHeight);surfaceReady.countDown();}
    @Override public void surfaceChanged(SurfaceHolder holder,int format,int w,int h){surfacePixelWidth=w;surfacePixelHeight=h;surfaceLive=true;NativeRuntime.surface(holder.getSurface(),renderWidth,renderHeight);}
    @Override public void surfaceDestroyed(SurfaceHolder holder){surfaceLive=false;NativeRuntime.surface(null,0,0);}
    @Override public boolean dispatchKeyEvent(KeyEvent event){if(playing){int key=GameControlsView.glfwKey(event.getKeyCode());if(key!=-1){int action=event.getAction()==KeyEvent.ACTION_UP?0:event.getRepeatCount()>0?2:1;NativeRuntime.event(1,key,event.getScanCode(),action,(event.isShiftPressed()?1:0)|(event.isCtrlPressed()?2:0)|(event.isAltPressed()?4:0));if(action!=0&&event.getUnicodeChar()>0)NativeRuntime.event(5,event.getUnicodeChar(),0,0,0);return true;}}return super.dispatchKeyEvent(event);}
}
