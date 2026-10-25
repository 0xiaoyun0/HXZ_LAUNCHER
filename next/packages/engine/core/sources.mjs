let mode = "official";
export function getDownloadMode() {
  return mode;
}
export function setDownloadMode(value) {
  mode = value === "domestic" ? "domestic" : "official";
}
// These operators document Maven Central mirrors. They must never receive
// arbitrary Fabric/Forge/Quilt coordinates or credential-bearing requests.
export const CENTRAL_MIRRORS = Object.freeze([
  'https://maven.aliyun.com/repository/public',
  'https://repo.huaweicloud.com/repository/maven',
  'https://mirrors.cloud.tencent.com/nexus/repository/maven-public',
  'https://maven-central.storage-download.googleapis.com/maven2',
  'https://maven-central-eu.storage-download.googleapis.com/maven2',
  'https://maven-central-asia.storage-download.googleapis.com/maven2',
  'https://repository.jboss.org/nexus/content/repositories/central',
  'https://repo.eclipse.org/repository/maven-central',
  'https://repo.spongepowered.org/repository/maven-central',
  'https://repo.papermc.io/repository/maven-public',
  'https://cache-redirector.jetbrains.com/repo.maven.apache.org/maven2',
  'https://repository.mulesoft.org/nexus/content/repositories/public',
  'https://mirrors.163.com/maven/repository/maven-public',
  'https://repo.nju.edu.cn/maven',
  'https://maven.proxy.ustclug.org/maven2',
  'https://maven.reposilite.com/maven-central'
]);
export const RELEASE_MIRRORS = Object.freeze(['https://gh-proxy.com/','https://ghproxy.net/']);
export function downloadSources(raw) {
  const publicURL = new URL(raw);
  // Never copy credentials or a signed query to another operator.
  if(publicURL.protocol!=='https:' || publicURL.username || publicURL.password || publicURL.search || publicURL.hash || publicURL.port)return [raw];
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
        out.push(base+'/maven'+p);
        out.push('https://repo.maven.apache.org/maven2'+p,'https://repo1.maven.org/maven2'+p,...CENTRAL_MIRRORS.map(base=>base+p));
        break;
      case "repo.maven.apache.org":
      case "repo1.maven.org":
        if(u.pathname.startsWith('/maven2/'))out.push((u.hostname==='repo1.maven.org'?'https://repo.maven.apache.org':'https://repo1.maven.org')+p,...CENTRAL_MIRRORS.map(base=>base+p.slice(7)));
        break;
      case "authlib-injector.yushi.moe":
        // The publisher releases the same versioned JAR on GitHub. Do not
        // synthesize a release URL for latest.json or other API requests.
        {const file=u.pathname.match(/^\/artifact\/\d+\/authlib-injector-(\d+\.\d+\.\d+)\.jar$/);
        if(file){const github='https://github.com/yushijinhun/authlib-injector/releases/download/v'+file[1]+'/authlib-injector-'+file[1]+'.jar';out.push(github);out.push(base+'/mirrors/authlib-injector'+p,...RELEASE_MIRRORS.map(prefix=>prefix+github));break;}}
        // Keep the publisher's checksum metadata on its authoritative origin.
        break;
      case "maven.fabricmc.net":
        out.push(base + "/maven" + p,'https://repo.spongepowered.org/repository/fabricmc-proxy'+p);
        break;
      case "maven.minecraftforge.net":
        out.push(base + "/maven" + p,'https://repo.spongepowered.org/repository/forge-proxy'+p);
        break;
      case "maven.quiltmc.org":
        if(p.startsWith('/repository/release/'))out.push('https://repo.spongepowered.org/repository/quiltmc/'+p.slice('/repository/release/'.length));
        break;
      case "resources.download.minecraft.net":
        out.push(base + "/assets" + p);
        break;
      case "meta.fabricmc.net":
        out.push(base + "/fabric-meta" + p);
        break;
      case "maven.neoforged.net":
        if(p.startsWith('/releases/'))out.push(base + "/maven" + p.slice(9),'https://repo.spongepowered.org/repository/neoforge-releases'+p.slice(9));
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
