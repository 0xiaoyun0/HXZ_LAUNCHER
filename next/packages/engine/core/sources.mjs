let mode = "official";
export function getDownloadMode() {
  return mode;
}
export function setDownloadMode(value) {
  mode = value === "domestic" ? "domestic" : "official";
}
export function downloadSources(raw) {
  const u = new URL(raw),
    out = [],
    base = "https://bmclapi2.bangbang93.com",
    p = u.pathname + u.search;
  switch (u.hostname) {
      case "piston-meta.mojang.com":
      case "piston-data.mojang.com":
      case "launchermeta.mojang.com":
      case "launcher.mojang.com":
        if(u.hostname==='piston-data.mojang.com')out.push('https://launcher.mojang.com'+p);
        if(u.hostname==='launcher.mojang.com')out.push('https://piston-data.mojang.com'+p);
        if(u.hostname==='piston-meta.mojang.com')out.push('https://launchermeta.mojang.com'+p);
        out.push(base + p);
        break;
      case "libraries.minecraft.net":
        out.push(base+'/libraries'+p);
        out.push('https://repo.maven.apache.org/maven2'+p,'https://maven.aliyun.com/repository/public'+p,'https://repo.huaweicloud.com/repository/maven'+p);
        break;
      case "repo.maven.apache.org":
      case "repo1.maven.org":
        if(u.pathname.startsWith('/maven2/'))out.push('https://maven.aliyun.com/repository/public'+p.slice(7),'https://repo.huaweicloud.com/repository/maven'+p.slice(7));
        break;
      case "maven.fabricmc.net":
      case "maven.minecraftforge.net":
        out.push(base + "/maven" + p);
        break;
      case "resources.download.minecraft.net":
        out.push(base + "/assets" + p);
        break;
      case "meta.fabricmc.net":
        out.push(base + "/fabric-meta" + p);
        break;
      case "maven.neoforged.net":
        out.push(base + "/maven" + p.replace(/^\/releases/, ""));
        break;
      case "api.modrinth.com":
        out.push("https://mod.mcimirror.top/modrinth" + p);
        break;
      case "cdn.modrinth.com":
      case "edge.forgecdn.net":
      case "mediafilez.forgecdn.net":
        out.push("https://mod.mcimirror.top" + p);
        break;
    }
  if(mode==='official')out.unshift(raw);else out.push(raw);
  return [...new Set(out)];
}
