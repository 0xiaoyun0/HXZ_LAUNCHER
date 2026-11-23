package top.hxzmc.community;
import java.nio.file.*;
import java.io.*;
import java.util.*;
public final class AudioImportProbe {
 public static void main(String[] args)throws Exception{
  File root=new File(args[0]);byte[] original=Files.readAllBytes(new File(root,"中文音乐.wav").toPath());
  for(String name:new String[]{"中文音乐.wav","测试.ncm","测试.qmc0"}){File result=AudioImport.convert(new File(root,name),new File(root,"android-media"),name);if(!Arrays.equals(original,Files.readAllBytes(result.toPath())))throw new AssertionError(name);}
  for(String name:new String[]{"bad.mflac","坏.ncm"}){boolean rejected=false;try{AudioImport.convert(new File(root,name),new File(root,"android-media"),name);}catch(Exception expected){rejected=true;}if(!rejected)throw new AssertionError("Corrupt file accepted");}
  System.out.println("PASS Android streamed WAV/NCM/QMC imports match original audio, bad files rejected");
 }
}
