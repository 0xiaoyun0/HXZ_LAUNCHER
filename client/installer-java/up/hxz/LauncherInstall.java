package up.hxz;
import com.google.gson.*;
import java.nio.file.*;
public final class LauncherInstall {
 public static void main(String[] args)throws Exception {
  System.setProperty("java.awt.headless","true");
  if(args.length!=3)throw new IllegalArgumentException("installer directory, request and settings required");
  Path updater=Paths.get(args[0]).toAbsolutePath().normalize();
  JsonObject profile=IO.read(Paths.get(args[1])),config=IO.read(Paths.get(args[2]));
  GameInstaller installer=new GameInstaller(updater,config,new Network(30,3,IO.integer(config,"parallelDownloads",64,2,128)));
  installer.progress(message->System.out.println("[安装] "+message));
  java.util.concurrent.ScheduledExecutorService meter=java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
  meter.scheduleAtFixedRate(installer::report,0,250,java.util.concurrent.TimeUnit.MILLISECONDS);
  try {
  installer.install(profile);
  IO.noLinks(installer.installedJar);IO.noLinks(installer.installedJson);
  Files.copy(installer.activationJar(),installer.installedJar,StandardCopyOption.REPLACE_EXISTING);
  IO.write(installer.installedJson,IO.read(installer.activationJson()));
  installer.phase("游戏与加载器安装完成");
  installer.count(1,1,"步骤");installer.report();
  } finally {meter.shutdownNow();}
 }
}
