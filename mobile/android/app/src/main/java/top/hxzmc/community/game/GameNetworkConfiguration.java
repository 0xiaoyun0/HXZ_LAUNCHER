package top.hxzmc.community.game;

import android.content.Context;
import android.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import top.hxzmc.runtime.GameDnsConfiguration;

/** Uses the active Android network's DNS before public fallbacks, as FCL's SystemDns does. */
final class GameNetworkConfiguration {
    static List<String> arguments(Context context, File directory) throws IOException {
        List<String> dns=new ArrayList<>();
        try {
            ConnectivityManager manager=context.getSystemService(ConnectivityManager.class);
            Network network=manager==null?null:manager.getActiveNetwork();
            LinkProperties link=network==null?null:manager.getLinkProperties(network);
            if(link!=null)for(java.net.InetAddress address:link.getDnsServers())dns.add(address.getHostAddress());
        }catch(RuntimeException ignored){/* Public fallback remains available without network metadata. */}
        if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("无法创建游戏网络配置目录");
        File config=new File(directory,"resolv.conf");
        Path pending=Files.createTempFile(directory.toPath(),"dns-",".tmp");
        try {
            Files.write(pending,GameDnsConfiguration.render(dns,"CN".equalsIgnoreCase(Locale.getDefault().getCountry())).getBytes(StandardCharsets.US_ASCII));
            Files.move(pending,config.toPath(),StandardCopyOption.REPLACE_EXISTING);
        }finally{Files.deleteIfExists(pending);}
        return Arrays.asList("-Dext.net.resolvPath="+config.getAbsolutePath(),
                "-Djava.net.preferIPv6Addresses=false","-Dsun.net.client.defaultConnectTimeout=15000",
                "-Dsun.net.client.defaultReadTimeout=20000","-Dcom.sun.jndi.dns.timeout.initial=2000",
                "-Dcom.sun.jndi.dns.timeout.retries=1");
    }
}
