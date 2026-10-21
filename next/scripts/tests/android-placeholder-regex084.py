"""Check preparation regexes with ICU (Android's regex family), then real Java call sites.

Windows provides ICU in icu.dll. Desktop java.util.regex alone accepts the
unescaped closing brace that Android rejects, so it is not a sufficient test.
This is a host regression check, not a physical Android/game test.
"""
import ctypes
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "mobile/runtime/src/main/java/top/hxzmc/runtime"
icu = ctypes.CDLL("icu.dll")
icu.uregex_open.argtypes = [ctypes.c_void_p, ctypes.c_int32, ctypes.c_uint32,
                           ctypes.c_void_p, ctypes.POINTER(ctypes.c_int32)]
icu.uregex_open.restype = ctypes.c_void_p
icu.uregex_close.argtypes = [ctypes.c_void_p]
icu.u_errorName.argtypes = [ctypes.c_int32]
icu.u_errorName.restype = ctypes.c_char_p

failures = []
count = 0
for name in ("InstallerPlan.java", "GamePreparation.java"):
    source = (SOURCES / name).read_text(encoding="utf-8")
    for match in re.finditer(r'Pattern\.compile\(("(?:\\.|[^"\\])*")\)', source):
        pattern = json.loads(match[1])
        data = pattern.encode("utf-16-le")
        buffer = ctypes.create_string_buffer(data)
        status = ctypes.c_int32(0)
        compiled = icu.uregex_open(buffer, len(data) // 2, 0, None, ctypes.byref(status))
        count += 1
        if status.value > 0:
            line = source.count("\n", 0, match.start()) + 1
            failures.append(f"{name}:{line}: {icu.u_errorName(status.value).decode()} {pattern}")
        if compiled:
            icu.uregex_close(compiled)
assert count >= 3, "Placeholder regex call sites were not checked"
if failures:
    raise SystemExit("ICU preparation regex failures:\n" + "\n".join(failures))
print(f"PASS {count} preparation regexes compile in ICU", flush=True)

harness = r'''
package top.hxzmc.runtime;
import java.io.*;import java.nio.file.*;import java.nio.charset.StandardCharsets;
import java.util.*;import java.util.jar.*;import org.json.*;
public class PlaceholderRegression {
 static void equal(Object actual,Object expected){if(!Objects.equals(actual,expected))throw new AssertionError(actual+" != "+expected);}
 static void entry(JarOutputStream out,String name,JSONObject json)throws Exception{
  out.putNextEntry(new JarEntry(name));out.write(json.toString().getBytes(StandardCharsets.UTF_8));out.closeEntry();
 }
 public static void main(String[] a)throws Exception{
  File root=new File(a[0]);Files.createDirectories(root.toPath());
  Map<String,String> vars=new HashMap<>();vars.put("ROOT",root.getAbsolutePath());vars.put("TOKEN","$1\\中文路径");
  equal(InstallerPlan.literal("{TOKEN}/{TOKEN}",vars,root),"$1\\中文路径/$1\\中文路径");
  equal(InstallerPlan.literal("'{TOKEN}'",vars,root),"{TOKEN}");
  equal(InstallerPlan.literal("--install",vars,root),"--install");
  equal(GamePreparation.replace("${TOKEN}/${TOKEN}",vars),"$1\\中文路径/$1\\中文路径");
  equal(GamePreparation.replace("--username",vars),"--username");
  try{InstallerPlan.literal("{MISSING}",vars,root);throw new AssertionError("missing installer data accepted");}catch(IOException expected){}
  try{GamePreparation.replace("${MISSING}",vars);throw new AssertionError("missing launch data accepted");}catch(IOException expected){}
  JSONObject data=new JSONObject().put("OUTPUT",new JSONObject().put("client","{FORWARD}/client.jar"))
   .put("FORWARD",new JSONObject().put("client","{ROOT}/generated"));
  JSONObject step=new JSONObject().put("jar","fixture:processor:1").put("args",new JSONArray().put("--output").put("{OUTPUT}"));
  JSONObject profile=new JSONObject().put("minecraft","1.21.1").put("json","/version.json").put("data",data)
   .put("libraries",new JSONArray()).put("processors",new JSONArray().put(step));
  File archive=new File(root,"installer.jar");
  try(JarOutputStream out=new JarOutputStream(new FileOutputStream(archive))){
   entry(out,"install_profile.json",profile);entry(out,"version.json",new JSONObject().put("id","fixture").put("inheritsFrom","1.21.1"));
  }
  GamePreparation.Context context=new GamePreparation.Context(root,root,"Test","uuid","token","msa","","",512,800,600,Collections.emptyMap());
  for(int retry=0;retry<2;retry++){
   InstallerPlan plan=InstallerPlan.read(archive,root,"1.21.1",21,context);
   equal(plan.data().get("OUTPUT"),root.getAbsolutePath()+"/generated/client.jar");
   equal(plan.processors.get(0).arguments,Arrays.asList("--output",root.getAbsolutePath()+"/generated/client.jar"));
  }
  System.out.println("PASS actual installer data/processor expansion, retry, launch placeholders, special characters and unknown-variable rejection");
 }
}
'''
folder = Path(tempfile.mkdtemp(prefix="placeholder-regex084-", dir=ROOT / ".runtime"))
source = folder / "PlaceholderRegression.java"
source.write_text(harness, encoding="utf-8")
java = Path(os.environ.get("JAVA_HOME", "C:/Program Files/Java/jdk-21")) / "bin"
json_jar = ROOT / ".runtime/review084/lobby/json.jar"
subprocess.run([str(java / "javac.exe"), "-encoding", "UTF-8", "--release", "8", "-cp", str(json_jar), "-d", str(folder),
                *map(str, SOURCES.glob("*.java")), str(source)], check=True)
subprocess.run([str(java / "java.exe"), "-cp", str(folder) + os.pathsep + str(json_jar),
                "top.hxzmc.runtime.PlaceholderRegression", str(folder / "game")], check=True)
