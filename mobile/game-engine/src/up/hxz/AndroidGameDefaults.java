package up.hxz;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** First-launch mobile defaults. Preserve originals, then leave later player choices alone. */
public final class AndroidGameDefaults {
    public static boolean apply(Path root) throws IOException {
        Path backup=root.resolve("updater/android-settings"),receipt=backup.resolve("mobile-defaults-v1.txt");
        if(Files.isRegularFile(receipt))return false;
        Files.createDirectories(backup);
        Map<String,String> options=new LinkedHashMap<>();
        options.put("renderDistance","6");options.put("simulationDistance","4");
        options.put("maxFps","60");options.put("mipmapLevels","2");
        edit(root.resolve("options.txt"),backup.resolve("options.txt.original"),options,':');
        Path iris=root.resolve("config/iris.properties");
        if(Files.isRegularFile(iris))edit(iris,backup.resolve("iris.properties.original"),Collections.singletonMap("enableShaders","false"),'=');
        Files.write(receipt,Collections.singletonList("Applied mobile defaults once; original files are beside this receipt."),StandardCharsets.UTF_8);
        return true;
    }
    private static void edit(Path file,Path backup,Map<String,String> values,char separator)throws IOException{
        List<String> lines=Files.isRegularFile(file)?Files.readAllLines(file,StandardCharsets.UTF_8):new ArrayList<>();
        if(Files.isRegularFile(file)&&!Files.exists(backup))Files.copy(file,backup);
        Set<String> seen=new HashSet<>();List<String> result=new ArrayList<>();
        for(String line:lines){int split=line.indexOf(separator);String key=split<0?"":line.substring(0,split).trim();
            if(values.containsKey(key)){if(seen.add(key))result.add(key+separator+values.get(key));}else result.add(line);}
        for(Map.Entry<String,String> entry:values.entrySet())if(seen.add(entry.getKey()))result.add(entry.getKey()+separator+entry.getValue());
        Files.createDirectories(file.getParent());Path temp=Files.createTempFile(file.getParent(),"mobile-defaults-",".tmp");
        try{Files.write(temp,result,StandardCharsets.UTF_8);Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}
    }
}
