package com.tungsten.fcl.hxz;

import okhttp3.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;

/** Authentication always remains on the skin site's HTTPS origin, never download mirrors. */
public final class HxzSkinNetwork {
    private static final String ROOT = "https://skin.hxzmc.top/api/yggdrasil/";
    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(7, TimeUnit.SECONDS).readTimeout(12, TimeUnit.SECONDS)
            .callTimeout(25, TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false)
            .dns(host -> {
                List<InetAddress> addresses = new ArrayList<>(Dns.SYSTEM.lookup(host));
                addresses.sort(Comparator.comparingInt(a -> a instanceof Inet4Address ? 0 : 1));
                return addresses;
            }).build();
    private HxzSkinNetwork() {}
    public static String canonicalServer(String raw) {
        try {
            URI uri = URI.create(raw.contains("://") ? raw : "https://" + raw);
            if ("skin.hxzmc.top".equalsIgnoreCase(uri.getHost()) && uri.getUserInfo() == null
                    && uri.getQuery() == null && uri.getFragment() == null && (uri.getPort() == -1 || uri.getPort() == 443)
                    && Arrays.asList("", "/", "/user", "/user/", "/api/yggdrasil", "/api/yggdrasil/").contains(uri.getPath())) return ROOT;
        } catch (IllegalArgumentException ignored) {}
        return raw;
    }
    public static boolean supports(String raw) {
        try { URL url = new URL(raw);return url.getProtocol().equals("https") && url.getHost().equalsIgnoreCase("skin.hxzmc.top")
                && (url.getPort() == -1 || url.getPort() == 443) && url.getUserInfo() == null && url.getQuery() == null
                && url.getRef() == null && url.getPath().startsWith("/api/yggdrasil/"); }
        catch (MalformedURLException e) { return false; }
    }
    public static String request(String url, String body) throws IOException {
        if (!supports(url)) throw new IOException("皮肤站认证地址无效，请使用幻想镇社区账号导入");
        Request.Builder request = new Request.Builder().url(url).header("Accept", "application/json");
        if (body != null) request.post(RequestBody.create(MediaType.get("application/json; charset=utf-8"), body));
        try (Response response = HTTP.newCall(request.build()).execute()) {
            if (response.isRedirect()) throw new IOException("皮肤站认证接口返回了跳转，请核对服务器反向代理的认证路径");
            if (response.code() >= 500 || response.code() == 404 || response.code() == 429)
                throw new IOException("皮肤站认证接口 HTTP " + response.code() + "，请稍后重试或联系管理员");
            if (response.body() == null) return "";
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream in = response.body().byteStream()) {
                byte[] block = new byte[8192];int n;
                while ((n = in.read(block)) != -1) { if (bytes.size() + n > 1048576) throw new IOException("皮肤站认证响应过大");bytes.write(block,0,n); }
            }
            String value = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            if (value.trim().startsWith("<")) throw new IOException("认证地址返回了网页，请确认使用 /api/yggdrasil/ 接口");
            if (!response.isSuccessful()) {
                boolean structured = false;
                try { structured = com.google.gson.JsonParser.parseString(value).getAsJsonObject().has("error"); } catch (RuntimeException ignored) {}
                if (!structured) throw new IOException("皮肤站认证接口 HTTP " + response.code());
            }
            // Keep Yggdrasil's structured 400/401/403 errors for its normal login handling.
            return value;
        } catch (javax.net.ssl.SSLException e) {
            throw new IOException("皮肤站 HTTPS 验证失败，请检查设备日期、网络拦截或服务器证书", e);
        } catch (UnknownHostException e) {
            throw new IOException("无法解析皮肤站域名，请切换网络或检查私人 DNS", e);
        } catch (SocketTimeoutException e) {
            throw new IOException("连接皮肤站超时，已尝试可用 IP 路线；请切换网络后重试", e);
        }
    }
}
