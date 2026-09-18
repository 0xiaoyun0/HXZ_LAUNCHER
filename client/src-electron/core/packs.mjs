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
  exists
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
  let index, manifest, mmc;
  const entries = new Set();
  const configs = {};
  await archive(file, async (entry, open) => {
    const name = entry.fileName;
    if (entries.has(name.toLowerCase())) throw Error("压缩包包含重复文件项");
    entries.add(name.toLowerCase());
    const lower = name.toLowerCase();
    if (lower === "modrinth.index.json") index = await entryJSON(entry, open);
    if (lower === "manifest.json") manifest = await entryJSON(entry, open);
    if (lower === "mmc-pack.json") mmc = await entryJSON(entry, open);
    if (
      [
        "overrides/updater/config.json",
        "client-overrides/updater/config.json"
      ].includes(name)
    )
      configs[name] = await entryJSON(entry, open);
  });
  const seen = new Set();
  const embedded = [];
  const files = [];
  const addEmbedded = (name, destination = name) => {
    if (name.endsWith("/")) return;
    const relative = safeRelative(destination);
    const key = relative.toLowerCase();
    if (seen.has(key)) throw Error("整合包包含重复目标路径");
    seen.add(key);
    embedded.push({ archivePath: name, path: relative });
  };
  let minecraft = "",
    loader = "",
    loaderVersion = "",
    name = path
      .basename(file)
      .replace(/\.(mrpack|zip|modpack|pack|instance)$/i, ""),
    version = "",
    format = "";
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
    const loaders = [
      "fabric-loader",
      "quilt-loader",
      "forge",
      "neoforge"
    ].filter(key => index.dependencies[key]);
    if (loaders.length > 1) throw Error("整合包声明了冲突的加载器");
    loader = loaders[0]?.replace("-loader", "") || "";
    loaderVersion = loaders[0] ? index.dependencies[loaders[0]] : "";
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
    format = "modrinth";
  } else if (manifest?.minecraft?.version && Array.isArray(manifest.files)) {
    minecraft = String(manifest.minecraft.version);
    name = String(manifest.name || name);
    version = String(manifest.version || "");
    const modLoader = String(manifest.minecraft.modLoaders?.[0]?.id || "");
    const match = modLoader.match(
      /^(fabric-loader|quilt-loader|forge|neoforge)-(.+)$/i
    );
    if (match) {
      loader = match[1].toLowerCase().replace("-loader", "");
      loaderVersion = match[2];
    }
    for (const item of manifest.files) {
      if (!Number.isInteger(item.projectID) || !Number.isInteger(item.fileID))
        throw Error("CurseForge 清单缺少有效文件标识");
      files.push({
        path: `mods/curseforge-${item.projectID}-${item.fileID}.jar`,
        downloads: [
          `https://www.curseforge.com/api/v1/mods/${item.projectID}/files/${item.fileID}/download`
        ],
        hashes: {},
        fileSize: null,
        env: item.required === false ? { client: "optional" } : undefined
      });
    }
    format = "curseforge";
  } else if (mmc?.components && Array.isArray(mmc.components)) {
    const component = id => mmc.components.find(x => x.uid === id)?.version;
    minecraft = component("net.minecraft") || "";
    const loaderInfo = [
      ["net.fabricmc.fabric-loader", "fabric"],
      ["org.quiltmc.quilt-loader", "quilt"],
      ["net.minecraftforge", "forge"],
      ["net.neoforged.neoforge", "neoforge"]
    ].find(([id]) => component(id));
    loader = loaderInfo?.[1] || "";
    loaderVersion = loaderInfo ? component(loaderInfo[0]) : "";
    format = "prism";
  }
  if (!minecraft && !index && !manifest && !mmc) format = "minecraft-zip";
  if (!minecraft && format !== "minecraft-zip")
    throw Error("整合包缺少 Minecraft 版本信息");
  let updateUrls = [];
  const updaterConfig =
    configs["client-overrides/updater/config.json"] ||
    configs["overrides/updater/config.json"];
  if (updaterConfig) {
    if (!Array.isArray(updaterConfig.servers) || !updaterConfig.servers.length)
      throw Error("包内 HXZ UP 配置缺少服务地址");
    updateUrls = [...new Set(updaterConfig.servers.map(endpoint))];
  }
  const key = loaders[0];
  if (!index && !manifest) {
    await archive(file, async entry => {
      const raw = entry.fileName
        .replace(/^\.minecraft\//i, "")
        .replace(/^minecraft\//i, "");
      if (!raw || raw === "instance.cfg" || raw === "mmc-pack.json") return;
      if (/^(?:\.minecraft\/|minecraft\/)/i.test(entry.fileName))
        addEmbedded(entry.fileName, raw);
      else if (
        /^(?:mods|config|saves|resourcepacks|shaderpacks|options\.txt)\//i.test(
          raw
        ) ||
        /^(?:mods|config|saves|resourcepacks|shaderpacks|options\.txt)$/i.test(
          raw
        )
      )
        addEmbedded(entry.fileName, raw);
    });
    if (format === "minecraft-zip" && !embedded.length)
      throw Error("无法识别此 ZIP 整合包，请确认其中包含 Minecraft 文件");
  }
  return {
    file,
    name,
    version,
    minecraft,
    loader,
    loaderVersion,
    format,
    overrideCount:
      [...entries].filter(
        n => /^(overrides|client-overrides)\//.test(n) && !n.endsWith("/")
      ).length + embedded.length,
    files,
    embedded,
    optionalFiles: files
      .filter(f => f.env?.client === "optional")
      .map(f => f.path),
    hxzup: updateUrls.length > 0,
    updateUrls
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
  await downloadFiles(files, f =>
    downloads.run(f.path, async onProgress => {
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
  for (const prefix of ["overrides/", "client-overrides/"])
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
