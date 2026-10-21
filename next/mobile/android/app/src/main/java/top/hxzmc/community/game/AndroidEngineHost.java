package top.hxzmc.community.game;

import android.content.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import android.system.Os;
import android.system.OsConstants;
import top.hxzmc.runtime.EngineHost;
import top.hxzmc.runtime.RuntimeFiles;
import top.hxzmc.runtime.ProcessorProgress;

/** Installer JVMs are separate processes. Game JNI is reserved for the private game Activity. */
final class AndroidEngineHost implements EngineHost {
    static final class ProcessorFailure extends IOException {
        ProcessorFailure(int exit,String mainClass,String tail){super("游戏安装或更新处理器退出（代码 "+exit+"，入口 "+mainClass+"）\n"+tail);}
    }
    final Context context;final File module,logs,storage;
    private volatile File processorLog;
    private volatile String processorState="";
    AndroidEngineHost(Context context,File module)throws IOException {
        this.context=context;this.module=module;storage=AppPrivateStorage.resolve(context.getFilesDir());
        logs=RuntimeFiles.inside(storage,"minecraft/logs");if(!logs.isDirectory()&&!logs.mkdirs())throw new IOException("无法创建游戏日志目录");
    }
    File resource(String path)throws IOException {
        File file=new File(module,"app_runtime/"+path);String base=new File(module,"app_runtime").getCanonicalPath()+File.separator;
        if(!file.getCanonicalPath().startsWith(base)||!file.exists())throw new IOException("运行资源缺失："+path);return file;
    }
    File javaHome(int major)throws IOException {
        File home=resource("java/"+major);if(!new File(home,"lib/server/libjvm.so").isFile())throw new IOException("此游戏需要 Java "+major+"，当前模块尚未提供");
        long pageSize;try{pageSize=Os.sysconf(OsConstants._SC_PAGESIZE);}catch(Exception e){throw new IOException("无法检测设备内存页大小",e);}
        if(pageSize>4096){
            try(java.util.stream.Stream<Path> files=Files.walk(new File(home,"lib").toPath())){
                for(Path file:(Iterable<Path>)files.filter(p->p.toString().endsWith(".so"))::iterator)if(!elfSupportsPage(file,pageSize))
                    throw new IOException("此设备使用 "+(pageSize/1024)+" KiB 内存页，Java "+major+" 运行模块的 "+file.getFileName()+" 仅支持较小页大小。请更新运行模块后重试");
            }
        }
        return home;
    }
    private static boolean elfSupportsPage(Path file,long pageSize)throws IOException {
        try(RandomAccessFile in=new RandomAccessFile(file.toFile(),"r")){
            if(in.length()<64)return false;byte[] header=new byte[64];in.readFully(header);
            if(header[0]!=0x7f||header[1]!='E'||header[2]!='L'||header[3]!='F'||header[4]!=2||header[5]!=1)return false;
            ByteBuffer elf=ByteBuffer.wrap(header).order(ByteOrder.LITTLE_ENDIAN);
            if(Short.toUnsignedInt(elf.getShort(18))!=183)return false; // AArch64 ELF64.
            long offset=elf.getLong(32);int entrySize=Short.toUnsignedInt(elf.getShort(54)),count=Short.toUnsignedInt(elf.getShort(56));
            if(entrySize<56||count<1||count>4096||offset<64||offset>in.length()-((long)entrySize*count))return false;
            byte[] entry=new byte[56];boolean foundLoad=false;
            for(int i=0;i<count;i++){
                in.seek(offset+(long)i*entrySize);in.readFully(entry);ByteBuffer ph=ByteBuffer.wrap(entry).order(ByteOrder.LITTLE_ENDIAN);
                if(ph.getInt(0)!=1)continue;foundLoad=true;long fileOffset=ph.getLong(8),virtualAddress=ph.getLong(16),align=ph.getLong(48);
                if(fileOffset<0||virtualAddress<0||align<pageSize||fileOffset%pageSize!=virtualAddress%pageSize)return false;
            }
            return foundLoad;
        }
    }
    static void field(DataOutputStream out,String text)throws IOException {byte[] value=text.getBytes(StandardCharsets.UTF_8);if(value.length>1024*1024||text.indexOf('\0')>=0)throw new IOException("运行参数无效");out.writeInt(value.length);out.write(value);}
    File job(JavaJob job,List<String> extra,List<String> gameExtra)throws Exception {
        File home=javaHome(job.javaMajor);List<String> jvm=new ArrayList<>();boolean classpath=false;
        // JNI accepts --module-path=value; the java executable also accepts a separate following word.
        for(int i=0;i<job.jvmArguments.size();i++) {
            String arg=job.jvmArguments.get(i);
            if(Arrays.asList("-cp","-classpath","--class-path").contains(arg)) {
                if(++i>=job.jvmArguments.size())throw new IOException("缺少游戏类路径");jvm.add("-Djava.class.path="+job.jvmArguments.get(i));classpath=true;
            } else if(Arrays.asList("--module-path","-p","--add-modules","--add-opens","--add-exports","--add-reads","--patch-module","--limit-modules").contains(arg)) {
                if(++i>=job.jvmArguments.size())throw new IOException("缺少 Java 模块参数");jvm.add((arg.equals("-p")?"--module-path":arg)+"="+job.jvmArguments.get(i));
            } else jvm.add(arg);
        }
        if(!classpath&&!job.classpath.isEmpty()){List<String> paths=new ArrayList<>();for(File f:job.classpath)paths.add(f.getAbsolutePath());jvm.add("-Djava.class.path="+String.join(File.pathSeparator,paths));}
        jvm.add("-Djava.io.tmpdir="+context.getCacheDir().getAbsolutePath());jvm.addAll(extra);
        List<String> args=new ArrayList<>(job.arguments);args.addAll(gameExtra);
        File file=File.createTempFile("java-job-",".bin",context.getCacheDir());file.setReadable(false,false);file.setReadable(true,true);file.setWritable(false,false);file.setWritable(true,true);
        try(DataOutputStream out=new DataOutputStream(new FileOutputStream(file))){out.write("HXZJVM01".getBytes(StandardCharsets.US_ASCII));field(out,home.getCanonicalPath());field(out,job.workingDirectory.getCanonicalPath());field(out,job.mainClass);for(List<String> list:Arrays.asList(jvm,args)){field(out,Integer.toString(list.size()));for(String value:list)field(out,value);}}
        return file;
    }
    @Override public int runJava(JavaJob job,Cancellation cancel,Progress progress)throws Exception {
        cancel.check();File executable=new File(context.getApplicationInfo().nativeLibraryDir,"libhxz_jvm_exec.so");
        if(!executable.isFile()||!executable.canExecute())throw new IOException("安装处理器运行组件未完整打包，请更新社区应用");
        File request=job(job,Collections.emptyList(),Collections.emptyList()),log=new File(logs,"installer-"+System.currentTimeMillis()+".log");
        processorLog=log;processorState=job.mainClass;
        Process process=null;
        try {
            ProcessBuilder builder=new ProcessBuilder(executable.getAbsolutePath(),request.getAbsolutePath()).directory(job.workingDirectory).redirectErrorStream(true).redirectOutput(log);
            builder.environment().put("LD_LIBRARY_PATH",javaHome(job.javaMajor)+"/lib/server:"+javaHome(job.javaMajor)+"/lib:"+context.getApplicationInfo().nativeLibraryDir);
            builder.environment().put("TMPDIR",context.getCacheDir().getAbsolutePath());process=builder.start();
            ProcessorProgress status=new ProcessorProgress(job.mainClass,android.os.SystemClock.elapsedRealtime());
            ProcessorLogReader reader=new ProcessorLogReader(log);long lastReport=0;
            while(!process.waitFor(250,TimeUnit.MILLISECONDS)) {
                cancel.check();long now=android.os.SystemClock.elapsedRealtime();
                if(now-lastReport>=1000){reportProcessor(job,status,reader,now,progress);lastReport=now;}
                // No arbitrary timeout: mod loader processors can legitimately take minutes.
            }
            reportProcessor(job,status,reader,android.os.SystemClock.elapsedRealtime(),progress);
            int exit=process.exitValue();if(progress!=null)progress.update("processor-exit",job.mainClass,exit,0);
            if(exit!=0)throw new ProcessorFailure(exit,job.mainClass,tail(log));return exit;
        } finally {
            if(process!=null&&process.isAlive()){
                process.destroy();
                try{if(!process.waitFor(1,TimeUnit.SECONDS)){process.destroyForcibly();process.waitFor(2,TimeUnit.SECONDS);}}
                catch(InterruptedException interrupted){process.destroyForcibly();Thread.currentThread().interrupt();}
            }
            Files.deleteIfExists(request.toPath());
        }
    }
    private void reportProcessor(JavaJob job,ProcessorProgress status,ProcessorLogReader reader,long now,Progress progress){
        try{reader.read(status,now);}catch(IOException ignored){/* A log-read failure must not abort the installer. */}
        ProcessorProgress.Snapshot snapshot=status.snapshot(now);
        String message=snapshot.title+"\n"+snapshot.detail;
        processorState=job.mainClass+"\n"+message;
        if(progress!=null)progress.update("processor-progress",message,snapshot.completed,snapshot.total);
    }
    String processorDiagnostic(){
        File file=processorLog;if(file==null)return "";
        try{return processorState+"\n处理器日志:\n"+tail(file);}catch(IOException ignored){return processorState+"\n处理器日志暂不可读";}
    }
    /** Read bounded complete UTF-8 lines; never block on a still-running process pipe. */
    private static final class ProcessorLogReader {
        final File file;long offset;boolean oversized;
        final ByteArrayOutputStream line=new ByteArrayOutputStream();
        ProcessorLogReader(File file){this.file=file;}
        void read(ProcessorProgress status,long now)throws IOException {
            if(!file.isFile())return;
            try(RandomAccessFile in=new RandomAccessFile(file,"r")){
                if(in.length()<offset){offset=0;line.reset();oversized=false;}
                in.seek(offset);byte[] buffer=new byte[8192];int budget=262144,n;
                while(budget>0&&(n=in.read(buffer,0,Math.min(buffer.length,budget)))>0){
                    offset+=n;budget-=n;
                    for(int i=0;i<n;i++){
                        int b=buffer[i]&255;
                        if(b=='\n'){
                            if(!oversized)status.accept(new String(line.toByteArray(),StandardCharsets.UTF_8),now);
                            line.reset();oversized=false;
                        }else if(!oversized){if(line.size()<8192)line.write(b);else {line.reset();oversized=true;}}
                    }
                }
            }
        }
    }
    private static String tail(File file)throws IOException {
        try(RandomAccessFile in=new RandomAccessFile(file,"r")){long size=in.length();in.seek(Math.max(0,size-8192));byte[] bytes=new byte[(int)Math.min(8192,size)];in.readFully(bytes);return new String(bytes,StandardCharsets.UTF_8);}
    }
}
