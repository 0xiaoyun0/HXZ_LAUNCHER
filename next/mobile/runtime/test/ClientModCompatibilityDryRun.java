package top.hxzmc.runtime;
import org.json.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
/** Read-only installed-pack audit. Writes evidence exclusively to the separate output argument. */
public final class ClientModCompatibilityDryRun {
    static SortedMap<String,String> snapshot(File folder)throws Exception {
        SortedMap<String,String> result=new TreeMap<>();try(java.util.stream.Stream<Path> files=Files.walk(folder.toPath())) {
            for(Path p:(Iterable<Path>)files::iterator)result.put(folder.toPath().relativize(p).toString(),Files.size(p)+":"+Files.getLastModifiedTime(p).toMillis());
        }return result;
    }
    public static void main(String[] args)throws Exception {
        File output=new File(args[0]);JSONArray packs=new JSONArray();
        for(int i=1;i<args.length;i++) {
            File folder=new File(args[i]).getAbsoluteFile(),mods=new File(folder,"mods"),state=new File(folder,".hxz/client-mods");SortedMap<String,String> before=snapshot(mods);boolean hadState=state.exists();long start=System.nanoTime();
            ClientModCompatibility.Report report=new ClientModCompatibility(folder).dryRun(new EngineHost.Cancellation(),null);
            if(!before.equals(snapshot(mods))||hadState!=state.exists())throw new AssertionError("Read-only audit mutated pack");
            JSONObject pack=report.toJson().put("instance",folder.getName()).put("elapsedMillis",(System.nanoTime()-start)/1000000).put("modFilesUnchanged",true).put("stateDirectoryUnchanged",true);packs.put(pack);
            System.out.println(new JSONObject().put("instance",folder.getName()).put("inspected",report.inspected).put("eligible",report.eligible).put("unknown",report.findings.stream().filter(x->x.decision.equals("unknown")).count()).put("elapsedMillis",pack.getLong("elapsedMillis")).toString());
        }
        RuntimeFiles.writeJson(output,new JSONObject().put("scope","Read-only desktop pack metadata audit; no Android device or mod execution, no file movement").put("packs",packs));
    }
}
