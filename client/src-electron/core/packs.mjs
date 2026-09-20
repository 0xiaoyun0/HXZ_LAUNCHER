import { normalizeDownloadConcurrency } from "./download-settings.mjs";
import { fileProgress } from "./progress.mjs";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import {
  inside,
  noLinks,
  json,
  writeJSON,
  download,
  parallel,
  endpoint,
  exists,
  remoteJSON
} from "./io.mjs";
async function archive(file, visit) {
  const zip = await new Promise((resolve, reject) =>
    yauzl.open(file, { lazyEntries: true, validateEntrySizes: true }, (e, z) =>
      e ? reject(e) : resolve(z)
    )
  );
  let count = 0,
    total = 0;
  try {
    await new Promise((resolve, reject) => {
      zip.on("error", reject);
      zip.on("end", resolve);
      zip.on("entry", entry => {
        (async () => {
          if (
            ++count > 100000 ||
            (total += entry.uncompressedSize) > 16 * 1024 ** 3
          )
            throw Error("整合包超过文件数量或解压大小限制");
          if (entry.generalPurposeBitFlag & 1) throw Error("不支持加密整合包");
          if (((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000)
            throw Error("整合包不能包含链接");
          inside(path.resolve("."), entry.fileName);
          const open = () =>
            new Promise((ok, fail) =>
              zip.openReadStream(entry, (e, s) => (e ? fail(e) : ok(s)))
            );
          await visit(entry, open);
          zip.readEntry();
        })().catch(reject);
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
}
async function entryJSON(entry, open) {
  if (entry.uncompressedSize > 16 * 1024 * 1024) throw Error("整合包清单过大");
  const chunks = [];
  for await (const c of await open()) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function safeRelative(value) {
  if (
    typeof value !== "string" ||
    !value ||
    Array.from(value).some(c => c.charCodeAt(0) < 32) ||
    value
      .split("/")
      .some(
        x =>
          !x ||
          x === "." ||
          x === ".." ||
          /[. ]$/.test(x) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(x)
      )
  )
    throw Error("整合包包含无效路径");
  inside(path.resolve("."), value);
  return value;
}
export async function inspectPack(file) {
  if (
    !path.isAbsolute(file) ||
    !/\.(mrpack|zip|modpack|pack|instance)$/i.test(file)
  )
    throw Error("请选择支持的 Minecraft 整合包文件");
  await noLinks(file);
  const entries = new Map(),
    manifests = [];
  await archive(file, async (entry, open) => {
    const name = entry.fileName;
    if (entries.has(name.toLowerCase())) throw Error("压缩包包含重复文件项");
    entries.set(name.toLowerCase(), name);
    if (
      /(^|\/)(modrinth.index.json|manifest.json|mmc-pack.json)$/i.test(name)
    ) {
      if (manifests.length >= 8) throw Error("压缩包包含过多实例清单");
      manifests.push({ name, value: await entryJSON(entry, open) });
    }
  });
  const supported = manifests.filter(
    m =>
      m.name.endsWith("modrinth.index.json") ||
      m.name.endsWith("mmc-pack.json") ||
      m.value?.minecraft?.version
  );
  if (supported.length > 1) throw Error("压缩包含有多个实例，请分别导出后导入");
  const meta = supported[0],
    root = meta ? meta.name.slice(0, meta.name.lastIndexOf("/") + 1) : "";
  const index = meta?.name.endsWith("modrinth.index.json") ? meta.value : null;
  const manifest =
    meta?.name.endsWith("manifest.json") && !index ? meta.value : null;
  const mmc = meta?.name.endsWith("mmc-pack.json") ? meta.value : null;
  let minecraft = "",
    loader = "",
    loaderVersion = "",
    format = "minecraft-zip",
    version = "",
    name = path
      .basename(file)
      .replace(/\.(mrpack|zip|modpack|pack|instance)$/i, "");
  const files = [],
    embedded = [],
    seen = new Set();
  let overridePrefixes = [];
  if (index) {
    if (
      index.formatVersion !== 1 ||
      index.game !== "minecraft" ||
      !index.dependencies?.minecraft ||
      !Array.isArray(index.files) ||
      index.files.length > 100000
    )
      throw Error("不是支持的 Modrinth 整合包");
    minecraft = index.dependencies.minecraft;
    name = String(index.name || name);
    version = String(index.versionId || "");
    format = "modrinth";
    const loaders = [
      "fabric-loader",
      "quilt-loader",
      "forge",
      "neoforge"
    ].filter(k => index.dependencies[k]);
    if (loaders.length > 1) throw Error("整合包声明了冲突的加载器");
    loader = loaders[0]?.replace("-loader", "") || "";
    loaderVersion = loaders.length ? index.dependencies[loaders[0]] : "";
    for (const f of index.files) {
      safeRelative(f.path);
      const key = f.path.toLowerCase();
      if (seen.has(key)) throw Error("整合包下载清单包含重复路径");
      seen.add(key);
      if (
        !/^[a-f0-9]{128}$/i.test(f.hashes?.sha512 || "") ||
        !/^[a-f0-9]{40}$/i.test(f.hashes?.sha1 || "") ||
        !Number.isSafeInteger(f.fileSize) ||
        f.fileSize < 0 ||
        f.fileSize > 8 * 1024 ** 3 ||
        !Array.isArray(f.downloads) ||
        !f.downloads.length
      )
        throw Error("整合包文件缺少有效校验信息");
      for (const raw of f.downloads) {
        const u = new URL(raw);
        if (u.protocol !== "https:" || u.username || u.password)
          throw Error("整合包下载地址必须使用 HTTPS");
      }
      files.push(f);
    }
    overridePrefixes = [root + "overrides/", root + "client-overrides/"];
  } else if (manifest) {
    if (!Array.isArray(manifest.files) || manifest.files.length > 100000)
      throw Error("CurseForge 文件清单无效");
    minecraft = String(manifest.minecraft.version);
    name = String(manifest.name || name);
    version = String(manifest.version || "");
    format = "curseforge";
    const choices = manifest.minecraft.modLoaders || [],
      selected = choices.find(x => x.primary) || choices[0];
    if (selected) {
      const match = String(selected.id).match(
        /^(fabric-loader|quilt-loader|forge|neoforge)-(.+)$/i
      );
      if (!match) throw Error("整合包加载器无法识别");
      loader = match[1].toLowerCase().replace("-loader", "");
      loaderVersion = match[2];
    }
    for (const item of manifest.files) {
      if (
        !Number.isSafeInteger(item.projectID) ||
        !Number.isSafeInteger(item.fileID) ||
        item.projectID <= 0 ||
        item.fileID <= 0
      )
        throw Error("CurseForge 文件标识无效");
      const dest = `mods/curseforge-${item.projectID}-${item.fileID}.jar`;
      if (seen.has(dest)) throw Error("CurseForge 清单包含重复文件");
      seen.add(dest);
      files.push({
        path: dest,
        curseforge: { projectID: item.projectID, fileID: item.fileID },
        env: item.required === false ? { client: "optional" } : undefined
      });
    }
    overridePrefixes = [
      root + safeRelative(manifest.overrides || "overrides") + "/"
    ];
  } else if (mmc) {
    if (!Array.isArray(mmc.components)) throw Error("Prism / MultiMC 清单无效");
    const component = id => mmc.components.find(x => x.uid === id)?.version;
    minecraft = component("net.minecraft") || "";
    format = "prism";
    const choices = [
      ["net.fabricmc.fabric-loader", "fabric"],
      ["org.quiltmc.quilt-loader", "quilt"],
      ["net.minecraftforge", "forge"],
      ["net.neoforged.neoforge", "neoforge"]
    ].filter(([id]) => component(id));
    if (choices.length > 1) throw Error("整合包声明了冲突的加载器");
    loader = choices[0]?.[1] || "";
    loaderVersion = choices.length ? component(choices[0][0]) : "";
  }
  if (format !== "minecraft-zip" && !minecraft)
    throw Error("整合包缺少 Minecraft 版本信息");
  // Read only instance data, never import launcher accounts, caches or a foreign versions tree.
  const dataPath =
    /^(mods|config|defaultconfigs|kubejs|scripts|saves|resourcepacks|shaderpacks|datapacks|updater|options.txt|optionsof.txt|servers.dat)(\/|$)/i;
  if (!index && !manifest) {
    let prefix = root;
    for (const candidate of [root + ".minecraft/", root + "minecraft/"])
      if (
        [...entries.keys()].some(n => n.startsWith(candidate.toLowerCase()))
      ) {
        prefix = candidate;
        break;
      }
    if (!meta && !prefix) {
      const roots = new Set(
        [...entries.values()]
          .map(n => n.match(/^(.*?)(?:\.minecraft|minecraft)\//i)?.[0])
          .filter(Boolean)
      );
      if (roots.size === 1) prefix = [...roots][0];
    }
    for (const archivePath of entries.values()) {
      if (!archivePath.startsWith(prefix) || archivePath.endsWith("/"))
        continue;
      const relative = archivePath.slice(prefix.length);
      if (!dataPath.test(relative)) continue;
      safeRelative(relative);
      const key = relative.toLowerCase();
      if (seen.has(key)) throw Error("整合包包含重复目标路径");
      seen.add(key);
      embedded.push({ archivePath, path: relative });
    }
    if (!embedded.length && format === "minecraft-zip")
      throw Error("ZIP 中没有可导入的 Minecraft 实例文件");
  }
  const configPaths = new Set(
    embedded
      .filter(e => e.path === "updater/config.json")
      .map(e => e.archivePath)
  );
  let updateConfig,
    configPriority = -1,
    overrideCount = embedded.length;
  await archive(file, async (entry, open) => {
    if (entry.fileName.endsWith("/")) return;
    const prefix = overridePrefixes.find(p => entry.fileName.startsWith(p));
    if (prefix) {
      const relative = safeRelative(entry.fileName.slice(prefix.length));
      overrideCount++;
      if (
        relative === "updater/config.json" &&
        overridePrefixes.indexOf(prefix) >= configPriority
      ) {
        configPriority = overridePrefixes.indexOf(prefix);
        updateConfig = await entryJSON(entry, open);
      }
    }
    if (configPaths.has(entry.fileName))
      updateConfig = await entryJSON(entry, open);
  });
  let updateUrls = [];
  if (updateConfig) {
    if (!Array.isArray(updateConfig.servers) || !updateConfig.servers.length)
      throw Error("包内 HXZ UP 配置缺少服务地址");
    updateUrls = [...new Set(updateConfig.servers.map(endpoint))];
  }
  return {
    file,
    name,
    version,
    minecraft,
    loader,
    loaderVersion,
    format,
    files,
    embedded,
    overridePrefixes,
    overrideCount,
    optionalFiles: files
      .filter(f => f.env?.client === "optional")
      .map(f => f.path),
    hxzup: updateUrls.length > 0,
    updateUrls
  };
}
export async function resolveCurseFile(ref, signal, request = remoteJSON) {
  const base = "https://mod.mcimirror.top/curseforge/v1/mods/" + ref.projectID;
  const info = (await request(base + "/files/" + ref.fileID, { signal })).data;
  const sha1 = info?.hashes?.find(h => h.algo === 1)?.value;
  if (
    info?.id !== ref.fileID ||
    info?.modId !== ref.projectID ||
    !/^[a-f0-9]{40}$/i.test(sha1 || "") ||
    !Number.isSafeInteger(info.fileLength) ||
    info.fileLength <= 0 ||
    !info.downloadUrl
  )
    throw Error(
      `CurseForge 文件 ${ref.projectID}/${ref.fileID} 暂不可自动下载；请检查作者下载许可或稍后继续`
    );
  const url = new URL(info.downloadUrl);
  if (url.protocol !== "https:" || url.username || url.password)
    throw Error("CurseForge 下载地址无效");
  let folder = "mods";
  if (!/\.jar$/i.test(info.fileName)) {
    const project = (await request(base, { signal })).data;
    folder =
      project?.classId === 12
        ? "resourcepacks"
        : project?.classId === 6552
          ? "shaderpacks"
          : "";
    if (!folder || !/\.zip$/i.test(info.fileName))
      throw Error("不支持的 CurseForge 文件类型");
  }
  if (/[\\/]/.test(info.fileName)) throw Error("CurseForge 文件名无效");
  return {
    path: safeRelative(folder + "/" + info.fileName),
    downloads: [url.href],
    hashes: { sha1 },
    fileSize: info.fileLength
  };
}
export async function extractPack(
  pack,
  instance,
  {
    signal,
    onProgress = () => {},
    includeOptional = true,
    optionalFiles,
    downloadConcurrency = 64
  } = {}
) {
  const downloadFiles = (values, fn) =>
    parallel(values, fn, normalizeDownloadConcurrency(downloadConcurrency));
  const protectedPath = relative => {
    const r = relative.toLowerCase();
    if (
      r.startsWith(".hxzl/") ||
      r.startsWith("updater/.updater/") ||
      [
        path.basename(instance).toLowerCase() + ".json",
        path.basename(instance).toLowerCase() + ".jar"
      ].includes(r)
    )
      throw Error("整合包不能覆盖安装状态或启动元数据");
    return relative;
  };
  const files = pack.files.filter(
    f =>
      f.env?.client !== "unsupported" &&
      (f.env?.client !== "optional" ||
        (optionalFiles ? optionalFiles.includes(f.path) : includeOptional))
  );
  const downloads = fileProgress(
    "下载整合包文件",
    files.length,
    onProgress,
    "文件"
  );
  await downloadFiles(files, original =>
    downloads.run(original.path, async onProgress => {
      const f = original.curseforge
        ? await resolveCurseFile(original.curseforge, signal)
        : original;
      signal?.throwIfAborted();
      await download(
        f.downloads[0],
        inside(instance, protectedPath(safeRelative(f.path))),
        {
          urls: f.downloads,
          sha1: f.hashes.sha1,
          sha512: f.hashes.sha512,
          size: f.fileSize,
          onProgress,
          signal
        }
      );
    })
  );
  const extraction = fileProgress(
    "解压整合包文件",
    pack.overrideCount || 0,
    onProgress,
    "文件"
  );
  const embedded = new Map(
    (pack.embedded || []).map(item => [item.archivePath, item.path])
  );
  if (embedded.size)
    await archive(pack.file, async (entry, open) => {
      signal?.throwIfAborted();
      const relative = embedded.get(entry.fileName);
      if (!relative) return;
      const target = inside(instance, protectedPath(safeRelative(relative)));
      await noLinks(target);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await extraction.run(relative, async () =>
        pipeline(await open(), createWriteStream(target), { signal })
      );
    });
  for (const prefix of pack.overridePrefixes || [
    "overrides/",
    "client-overrides/"
  ])
    await archive(pack.file, async (entry, open) => {
      signal?.throwIfAborted();
      if (!entry.fileName.startsWith(prefix) || entry.fileName.endsWith("/"))
        return;
      const relative = protectedPath(
        safeRelative(entry.fileName.slice(prefix.length))
      );
      if (
        relative.startsWith(".hxzl/") ||
        relative.startsWith("updater/.updater/")
      )
        throw Error("整合包不能覆盖安装状态");
      const target = inside(instance, relative);
      await noLinks(target);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await extraction.run(relative, async () =>
        pipeline(await open(), createWriteStream(target), { signal })
      );
    });
  const cfg = path.join(instance, "updater/config.json");
  let updateUrls = [];
  if (await exists(cfg)) {
    const value = await json(cfg);
    updateUrls = [...new Set((value.servers || []).map(endpoint))];
    if (!updateUrls.length) throw Error("HXZ UP 配置无效");
    await writeJSON(cfg, { ...value, servers: updateUrls });
  }
  return { hxzup: updateUrls.length > 0, updateUrls };
}
