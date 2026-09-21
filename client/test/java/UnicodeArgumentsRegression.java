package up.hxz;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
public final class UnicodeArgumentsRegression {
 public static void main(String[] args)throws Exception{
  String expected="你好-新蒸程-1.7.2 幻想镇版";
  Path base=Paths.get(LauncherInstall.pathArgument(args[0]));
  if(!base.getFileName().toString().equals(expected))throw new AssertionError("Unicode argument corrupted");
  String content=new String(Files.readAllBytes(base.resolve("配置.json")),StandardCharsets.UTF_8);
  if(!content.contains("幻想镇"))throw new AssertionError("Unicode filesystem path corrupted");
  System.out.println("Unicode arguments and filesystem OK");
 }
}
