package up.hxz;
import com.google.gson.*;
import java.nio.file.*;
import java.util.concurrent.*;
public class InstallerProgress {
 public static void main(String[] args)throws Exception {
  Path root=Paths.get(args[0]);JsonObject config=new JsonObject();config.addProperty("gameDir",root.toString());
  GameInstaller installer=new GameInstaller(root.resolve("versions/progress/updater"),config,new Network(5,0,32));
  JsonObject metadata=new JsonObject();JsonArray libs=new JsonArray();metadata.add("libraries",libs);
  for(int i=0;i<2;i++){JsonObject lib=new JsonObject(),downloads=new JsonObject(),artifact=new JsonObject();lib.addProperty("name","test:progress:"+i);artifact.addProperty("url",args[1]);artifact.addProperty("path","test/"+i+".jar");artifact.addProperty("size",65536);artifact.addProperty("sha1",args[2]);downloads.add("artifact",artifact);lib.add("downloads",downloads);libs.add(lib);}
  ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();
  try{installer.phase("正在校验与下载游戏依赖");timer.scheduleAtFixedRate(installer::report,0,100,TimeUnit.MILLISECONDS);installer.libraries(metadata);installer.report();}finally{timer.shutdownNow();}
 }
}
