package top.hxzmc.runtime;
import java.io.*;import java.nio.file.*;import java.util.*;import java.util.zip.*;import org.json.*;
public final class ClientRenderPatchTest {
 static int checks;static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);checks++;}
 static File fixture(File root,File source,String name)throws Exception{File instance=new File(root,name),mods=new File(instance,"mods");mods.mkdirs();Files.copy(source.toPath(),new File(mods,ClientRenderPatch.NAME).toPath());return instance;}
 public static void main(String[] args)throws Exception {
  File source=new File(args[0]),root=new File(args[1]);root.mkdirs();EngineHost.Cancellation cancel=new EngineHost.Cancellation();
  check(RuntimeFiles.hash(source,"SHA-256").equals(ClientRenderPatch.SHA),"Reviewed artifact identity");
  File instance=fixture(root,source,"normal");ClientRenderPatch patch=new ClientRenderPatch(instance);
  check(!patch.apply(cancel).isEmpty(),"Exact core mod patched only when Iris absent");
  check(patch.target.isFile()&&patch.backup.isFile()&&ClientRenderPatch.validPatch(patch.target,source,cancel),"All code, gameplay and assets byte-identical; only two mixin references removed");
  try(ZipFile zip=new ZipFile(patch.target)){JSONObject config=new JSONObject(new String(zip.getInputStream(zip.getEntry(ClientRenderPatch.CONFIG)).readAllBytes(),"UTF-8"));check(config.getJSONArray("mixins").length()==27,"Keep the other 27 mixins");}
  check(patch.originalDigest(patch.target,cancel).equals(ClientRenderPatch.SHA),"Validated client-only edit retains cross-platform room identity");
  patch.restore(cancel,false);check(RuntimeFiles.hash(patch.target,"SHA-256").equals(ClientRenderPatch.SHA),"Original bytes restored before updater verification");
  patch.apply(cancel);patch.restore(cancel,true);check(patch.apply(cancel).isEmpty(),"Explicit user restoration persists");
  instance=fixture(root,source,"iris");patch=new ClientRenderPatch(instance);try(ZipOutputStream zip=new ZipOutputStream(new FileOutputStream(new File(instance,"mods/iris-fixture.jar")))){zip.putNextEntry(new ZipEntry("net/irisshaders/iris/api/v0/IrisApi.class"));zip.write(new byte[]{1});zip.closeEntry();}
  check(patch.apply(cancel).isEmpty()&&RuntimeFiles.hash(patch.target,"SHA-256").equals(ClientRenderPatch.SHA),"Active Iris keeps original shader integration");
  instance=fixture(root,source,"changed");patch=new ClientRenderPatch(instance);Files.write(patch.target.toPath(),new byte[]{1,2,3});check(patch.apply(cancel).isEmpty(),"Unknown/new artifact is never edited");
  instance=fixture(root,source,"tamper");patch=new ClientRenderPatch(instance);patch.apply(cancel);Files.write(patch.target.toPath(),new byte[]{4,5,6});check(patch.originalDigest(patch.target,cancel).isEmpty(),"Unknown content cannot borrow original fingerprint");patch.restore(cancel,false);check(Arrays.equals(Files.readAllBytes(patch.target.toPath()),new byte[]{4,5,6}),"Never overwrite changes or a newer updater file");
  instance=fixture(root,source,"cancel");patch=new ClientRenderPatch(instance);EngineHost.Cancellation stopped=new EngineHost.Cancellation();stopped.cancel();try{patch.apply(stopped);throw new AssertionError("Cancellation ignored");}catch(java.util.concurrent.CancellationException expected){checks++;}
  check(RuntimeFiles.hash(source,"SHA-256").equals(ClientRenderPatch.SHA),"Readonly source artifact unchanged");
  System.out.println("PASS exact client render patch "+checks+" checks, using reviewed local artifact");
 }
}
