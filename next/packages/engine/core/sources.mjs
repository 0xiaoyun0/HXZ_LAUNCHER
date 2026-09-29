let mode = "domestic";
export function getDownloadMode() {
  return mode;
}
export function setDownloadMode(value) {
  mode = value === "official" ? "official" : "domestic";
}
export function downloadSources(raw) {
  const u = new URL(raw),
    out = [],
    base = "https://bmclapi2.bangbang93.com",
    p = u.pathname + u.search;
  if (mode === "domestic")
    switch (u.hostname) {
      case "piston-meta.mojang.com":
      case "piston-data.mojang.com":
      case "launchermeta.mojang.com":
      case "launcher.mojang.com":
        out.push(base + p);
        break;
      case "libraries.minecraft.net":
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
  out.push(raw);
  return [...new Set(out)];
}
