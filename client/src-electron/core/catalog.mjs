import { remoteJSON } from "./io.mjs";
import { getDownloadMode } from "./sources.mjs";
async function mavenVersions(minecraft, type) {
  const repository =
    type === "forge"
      ? "https://maven.minecraftforge.net/net/minecraftforge/forge/"
      : "https://maven.neoforged.net/releases/net/neoforged/neoforge/";
  const r = await fetch(repository + "maven-metadata.xml", {
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw Error("无法获取加载器版本");
  let size = 0;
  const chunks = [];
  for await (const chunk of r.body) {
    if ((size += chunk.length) > 4 * 1024 * 1024) throw Error("加载器清单过大");
    chunks.push(chunk);
  }
  const values = [
    ...Buffer.concat(chunks)
      .toString("utf8")
      .matchAll(/<version>([\w.+-]+)<\/version>/g)
  ].map(m => m[1]);
  return values
    .filter(v =>
      type === "forge"
        ? v.startsWith(minecraft + "-")
        : minecraft === "1.20.1"
          ? false
          : v.startsWith(minecraft.split(".").slice(1).join(".") + ".")
    )
    .map(v => ({
      version: type === "forge" ? v.slice(minecraft.length + 1) : v,
      stable: !v.includes("beta")
    }));
}
const cache = new Map();
export async function gameMetadata(id) {
  return cached("metadata:" + id, async () => {
    const manifest = await remoteJSON(
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
    );
    const item = manifest.versions.find(v => v.id === id);
    if (!item) throw Error("Minecraft 版本不存在");
    return remoteJSON(item.url);
  });
}
async function cached(key, fn) {
  const item = cache.get(key);
  if (item && Date.now() - item.time < 300000) return item.value;
  const value = await fn();
  if (cache.size > 50) cache.clear();
  cache.set(key, { time: Date.now(), value });
  return value;
}
export async function versions() {
  return cached("minecraft", async () => {
    const v = await remoteJSON(
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
    );
    return v.versions.map(x => ({
      id: x.id,
      type: x.type,
      releaseTime: x.releaseTime
    }));
  });
}
export async function loaders(minecraft, type) {
  if (!/^[\w.+-]{1,100}$/.test(minecraft)) throw Error("无效游戏版本");
  return cached(getDownloadMode() + ":" + type + ":" + minecraft, async () => {
    if (type === "fabric" || type === "quilt") {
      const r = await remoteJSON(
        (type === "fabric"
          ? "https://meta.fabricmc.net/v2"
          : "https://meta.quiltmc.org/v3") +
          "/versions/loader/" +
          minecraft
      );
      return r.map(v => ({
        version: v.loader.version,
        stable: v.loader.stable !== false
      }));
    }
    if (type === "forge" || type === "neoforge") {
      let list;
      try {
        if (getDownloadMode() === "official") throw Error("official");
        list = await remoteJSON(
          "https://bmclapi2.bangbang93.com/" +
            (type === "forge" ? "forge/minecraft/" : "neoforge/list/") +
            minecraft
        );
      } catch {
        list = await mavenVersions(minecraft, type);
      }
      return list
        .map(x => ({ version: x.version, stable: !x.version.includes("beta") }))
        .sort((a, b) =>
          b.version.localeCompare(a.version, undefined, { numeric: true })
        );
    }
    return [];
  });
}
export async function searchPacks(query, offset = 0) {
  return remoteJSON(
    "https://api.modrinth.com/v2/search?facets=" +
      encodeURIComponent('[["project_type:modpack"]]') +
      "&query=" +
      encodeURIComponent(String(query).slice(0, 100)) +
      "&limit=20&offset=" +
      Math.max(0, Math.min(Number(offset) || 0, 10000))
  );
}
export async function packVersions(id) {
  if (!/^[\w-]{1,100}$/.test(id)) throw Error("无效项目");
  return remoteJSON("https://api.modrinth.com/v2/project/" + id + "/version");
}
export async function searchMods(
  query,
  offset = 0,
  minecraft = "",
  loader = ""
) {
  const facets = [["project_type:mod"]];
  if (minecraft) facets.push(["versions:" + String(minecraft).slice(0, 40)]);
  if (loader && loader !== "原版")
    facets.push(["categories:" + String(loader).slice(0, 30)]);
  return remoteJSON(
    "https://api.modrinth.com/v2/search?facets=" +
      encodeURIComponent(JSON.stringify(facets)) +
      "&query=" +
      encodeURIComponent(String(query || "").slice(0, 100)) +
      "&limit=20&offset=" +
      Math.max(0, Math.min(Number(offset) || 0, 10000))
  );
}
export async function modVersions(id) {
  if (!/^[\w-]{1,100}$/.test(id)) throw Error("无效模组项目");
  return remoteJSON("https://api.modrinth.com/v2/project/" + id + "/version");
}
