package top.hxzmc.runtime;

import java.io.File;
import java.io.IOException;
import java.util.*;

/** Convert java-executable option tokens to the format accepted by JNI_CreateJavaVM. */
public final class JvmLaunchArguments {
    private JvmLaunchArguments() {}
    private static final Set<String> VALUE_OPTIONS=new HashSet<>(Arrays.asList(
        "--module-path","-p","--upgrade-module-path","--add-modules","--add-opens",
        "--add-exports","--add-reads","--patch-module","--limit-modules","--enable-native-access"));

    public static List<String> forJni(List<String> arguments,List<File> fallbackClasspath)throws IOException {
        List<String> result=new ArrayList<>();boolean classpath=false;
        for(int i=0;i<arguments.size();i++) {
            String arg=arguments.get(i);
            if(Arrays.asList("-cp","-classpath","--class-path").contains(arg)) {
                if(++i>=arguments.size())throw new IOException("缺少游戏类路径");
                result.add("-Djava.class.path="+arguments.get(i));classpath=true;
            } else if(arg.startsWith("--class-path=")) {
                result.add("-Djava.class.path="+arg.substring("--class-path=".length()));classpath=true;
            } else if(VALUE_OPTIONS.contains(arg)) {
                if(++i>=arguments.size())throw new IOException("缺少 Java 模块参数");
                result.add((arg.equals("-p")?"--module-path":arg)+"="+arguments.get(i));
            } else {
                if(arg.startsWith("-Djava.class.path="))classpath=true;
                result.add(arg);
            }
        }
        if(!classpath&&!fallbackClasspath.isEmpty()) {
            List<String> paths=new ArrayList<>();for(File file:fallbackClasspath)paths.add(file.getAbsolutePath());
            result.add("-Djava.class.path="+String.join(File.pathSeparator,paths));
        }
        return result;
    }
}
