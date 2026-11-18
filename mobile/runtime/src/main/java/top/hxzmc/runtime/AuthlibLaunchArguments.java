package top.hxzmc.runtime;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** FCL's authlib-injector client protocol: verified HTTPS metadata can be prefetched by the host. */
public final class AuthlibLaunchArguments {
    private AuthlibLaunchArguments() {}
    public static String checkedMetadata(String value)throws IOException {
        if(value==null||value.isEmpty())return "";
        if(value.getBytes(StandardCharsets.UTF_8).length>256*1024)throw new IOException("认证服务元数据过大");
        try {
            JSONObject data=new JSONObject(value);
            if(data.optJSONObject("meta")==null||data.optString("signaturePublickey").trim().isEmpty())throw new IOException("认证服务元数据不完整");
            return value;
        }catch(JSONException e){throw new IOException("认证服务元数据无效",e);}
    }
    public static List<String> forClient(File agent,String endpoint,String metadata)throws IOException {
        try {
            URI uri=new URI(endpoint);
            if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null)throw new IOException("认证服务地址必须是 HTTPS");
        }catch(java.net.URISyntaxException e){throw new IOException("认证服务地址无效",e);}
        List<String> result=new ArrayList<>();
        result.add("-javaagent:"+agent.getAbsolutePath()+"="+endpoint);
        result.add("-Dauthlibinjector.side=client");
        String checked=checkedMetadata(metadata);
        if(!checked.isEmpty())result.add("-Dauthlibinjector.yggdrasil.prefetched="+Base64.getEncoder().encodeToString(checked.getBytes(StandardCharsets.UTF_8)));
        return result;
    }
}
