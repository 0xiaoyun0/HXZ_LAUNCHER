package top.hxzmc.runtime;

import java.util.*;

/** resolv.conf for the Android OpenJDK JNDI/SRV resolver (not a replacement for TLS or game transport). */
public final class GameDnsConfiguration {
    private GameDnsConfiguration() {}
    public static String render(Collection<String> systemServers, boolean china) {
        LinkedHashSet<String> servers=new LinkedHashSet<>();
        if(systemServers!=null)for(String value:systemServers)if(ipv4(value))servers.add(value);
        // Match FCL's workaround: JNDI's resolv.conf parser does not accept raw IPv6 nameservers.
        // This does not disable IPv6 game connections or discard AAAA records.
        servers.add(china?"223.5.5.5":"1.1.1.1");servers.add(china?"119.29.29.29":"1.0.0.1");
        StringBuilder out=new StringBuilder();for(String value:servers)out.append("nameserver ").append(value).append('\n');
        return out.toString();
    }
    private static boolean ipv4(String value) {
        if(value==null||!value.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))return false;
        for(String part:value.split("\\."))if(Integer.parseInt(part)>255)return false;
        return !value.equals("0.0.0.0")&&!value.equals("255.255.255.255");
    }
}
