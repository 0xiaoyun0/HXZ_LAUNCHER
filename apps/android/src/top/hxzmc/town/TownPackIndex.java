package top.hxzmc.town;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Translates the publisher's fresh-install rules into an FCL-readable Modrinth pack. */
public final class TownPackIndex {
    private TownPackIndex() {}

    public static JSONObject build(String name, String publisher, String revision, JSONObject profile,
                                   JSONObject manifest, JSONObject actions) throws Exception {
        URI origin = new URI(publisher);
        require("https".equals(origin.getScheme()) && origin.getHost() != null && origin.getUserInfo() == null
            && origin.getRawQuery() == null && origin.getRawFragment() == null, "整合包发布地址无效。");
        require(revision.matches("[A-Za-z0-9._-]{1,120}"), "整合包版本号无效。");
        JSONObject dependencies = new JSONObject().put("minecraft", profile.getString("version"));
        String loader = profile.optString("loader"), build = profile.optString("loaderVersion");
        if (!loader.isEmpty() && !loader.equals("vanilla")) {
            require(Arrays.asList("quilt","fabric","forge","neoforge").contains(loader) && !build.isEmpty(), "整合包缺少加载器版本。");
            dependencies.put(loader.equals("fabric") || loader.equals("quilt") ? loader + "-loader" : loader, build);
        }
        JSONObject rules = actions.optJSONObject("rules"), policies = actions.optJSONObject("policies");
        // Non-default per-path rules can express deletions. Only translate supported immutable fresh installs.
        for (JSONObject section : new JSONObject[]{rules, policies}) {
            if (section == null) continue;
            for (String key : new String[]{"directory","file"}) {
                JSONObject overrides = section.optJSONObject(key);
                require(overrides == null || overrides.length() == 0, "这个整合包使用了特殊安装规则，请导入服主提供的整合包。");
            }
        }
        JSONObject policy = policies == null ? null : policies.optJSONObject("global");
        require(policy == null || policy.optBoolean("missing", true), "这个整合包不支持全新安装，请导入服主提供的整合包。");
        JSONObject defaults = rules == null ? null : rules.optJSONObject("global");
        String action = defaults == null ? "check_and_overwrite" : defaults.optString("file","check_and_overwrite");
        JSONArray files = new JSONArray(), rows = manifest.getJSONArray("files");
        require(rows.length() <= 30000, "整合包清单过大。");
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.getJSONObject(i);
            String path = row.getString("path"), behavior = row.optString("action", action);
            // HXZUP level zero belongs to the desktop launcher. FCL supplies the phone's runtime.
            if (path.startsWith("0/")) continue;
            if ("force_delete".equals(behavior)) continue;
            require(Arrays.asList("check_and_overwrite","force_overwrite","add_if_missing","skip_if_modified").contains(behavior), "整合包包含未知文件规则。");
            require(path.startsWith("1/") && path.length() <= 1024, "整合包包含不支持的安装目录。");
            String local = path.substring(2);
            for (String part : local.split("/", -1))
                require(!part.isEmpty() && !part.equals(".") && !part.equals("..") && !part.matches(".*[\\\\:\\p{Cntrl}].*"), "整合包中的文件路径无效。");
            require(Arrays.asList("mods","config","kubejs","resourcepacks","shaderpacks","defaultconfigs","scripts","ldlib2","options.txt").contains(local.split("/",2)[0])
                && seen.add(local.toLowerCase(Locale.ROOT)), "整合包包含重复或不支持的游戏文件。");
            long bytes = row.getLong("fileSize");
            String sha = row.getString("sha1").toLowerCase(Locale.ROOT);
            require(bytes >= 0 && bytes <= Integer.MAX_VALUE && sha.matches("[0-9a-f]{40}"), "整合包文件缺少校验信息。");
            String remote = publisher + new URI(null,null,"/"+path,null).toASCIIString() + "?version=" + revision;
            files.put(new JSONObject().put("path",local).put("fileSize",bytes)
                .put("hashes",new JSONObject().put("sha1",sha)).put("downloads",new JSONArray().put(remote)));
        }
        return new JSONObject().put("game","minecraft").put("formatVersion",1).put("versionId",revision)
            .put("name",name).put("files",files).put("dependencies",dependencies);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
