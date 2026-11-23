import top.hxzmc.runtime.AuthlibLaunchArguments;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class AuthlibLaunchArgumentsTest {
    private static void check(boolean value,String reason){if(!value)throw new AssertionError(reason);}
    private static void rejects(String value)throws Exception{try{AuthlibLaunchArguments.checkedMetadata(value);throw new AssertionError("Invalid metadata accepted");}catch(IOException expected){}}
    public static void main(String[] args)throws Exception {
        File agent=new File("含中文的运行模块/authlib-injector.jar");String endpoint="https://skin.hxzmc.top/api/yggdrasil";
        String metadata="{\"meta\":{\"serverName\":\"幻想镇\"},\"signaturePublickey\":\"fixture-public-key\",\"skinDomains\":[\"skin.hxzmc.top\"]}";
        List<String> options=AuthlibLaunchArguments.forClient(agent,endpoint,metadata);
        check(options.size()==3&&options.get(0).equals("-javaagent:"+agent.getAbsolutePath()+"="+endpoint),"Agent or skin endpoint changed");
        check(options.get(1).equals("-Dauthlibinjector.side=client"),"FCL client-side mode missing");
        String decoded=new String(Base64.getDecoder().decode(options.get(2).split("=",2)[1]),StandardCharsets.UTF_8);
        check(metadata.equals(decoded),"Prefetch must preserve UTF-8 metadata bytes");
        check(AuthlibLaunchArguments.forClient(agent,endpoint,"").size()==2,"Unavailable prefetch must keep normal online agent verification");
        check(AuthlibLaunchArguments.checkedMetadata(null).isEmpty(),"Optional null metadata");
        rejects("<html>network error</html>");rejects("{}");rejects("{\"meta\":{},\"signaturePublickey\":\"\"}");
        rejects(String.join("",Collections.nCopies(262145,"a")));
        try{AuthlibLaunchArguments.forClient(agent,"http://skin.hxzmc.top",metadata);throw new AssertionError("TLS downgraded");}catch(IOException expected){}
        check(options.stream().noneMatch(s->s.contains("trustAll")||s.contains("disableHttps")),"Certificate validation bypassed");
        System.out.println("Authlib launch: 11 protocol checks passed; no live account/server test.");
    }
}
