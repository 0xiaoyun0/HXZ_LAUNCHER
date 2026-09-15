import { serverAddress } from "./instances.mjs";
import { fileProgress } from "./progress.mjs";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  json,
  exists,
  inside,
  noLinks,
  download,
  parallel,
  extractNative
} from "./io.mjs";

export function allowed(rules = [], features = {}) {
  if (!rules.length) return true;
  let result = false;
  for (const rule of rules) {
    const spec = rule.os || {};
    const osName =
      process.platform === "win32"
        ? "windows"
        : process.platform === "darwin"
          ? "osx"
          : "linux";
    let match =
      (!spec.name || spec.name === osName) &&
      (!spec.arch ||
        [
          process.arch,
          process.arch === "x64" ? "amd64" : process.arch
        ].includes(spec.arch));
    if (spec.version)
      match = match && new RegExp(spec.version).test(os.release());
    if (rule.features)
      match =
        match &&
        Object.entries(rule.features).every(([k, v]) => !!features[k] === v);
    if (match) result = rule.action === "allow";
  }
  return result;
}
export function maven(name) {
  const [coordinate, ext = "jar"] = name.split("@"),
    p = coordinate.split(":");
  if (
    p.length < 3 ||
    p.length > 4 ||
    p.some(x => !/^[\w.+-]+$/.test(x)) ||
    !/^\w+$/.test(ext)
  )
    throw Error("无效的游戏依赖名称");
  return `${p[0].replaceAll(".", "/")}/${p[1]}/${p[2]}/${p[1]}-${p[2]}${p[3] ? "-" + p[3] : ""}.${ext}`;
}
export function mergeVersion(base, extra) {
  const libs = new Map();
  for (const l of [...(base.libraries || []), ...(extra.libraries || [])]) {
    const p = l.name.split(":");
    libs.set(`${p[0]}:${p[1]}:${p[3] || ""}`, l);
  }
  return {
    ...base,
    ...extra,
    libraries: [...libs.values()],
    arguments: {
      jvm: [...(base.arguments?.jvm || []), ...(extra.arguments?.jvm || [])],
      game: [...(base.arguments?.game || []), ...(extra.arguments?.game || [])]
    }
  };
}
export async function readVersion(root, id, seen = new Set()) {
  if (seen.has(id) || seen.size > 12) throw Error("游戏版本继承存在循环");
  seen.add(id);
  const file = inside(root, `versions/${id}/${id}.json`);
  const value = await json(file);
  if (value.inheritsFrom)
    return mergeVersion(
      await readVersion(root, value.inheritsFrom, seen),
      value
    );
  return { ...value, libraries: mergeVersion({}, value).libraries };
}
export async function scanInstances(root) {
  if (!root) return [];
  const base = path.join(root, "versions");
  if (!(await exists(base))) return [];
  const result = [];
  for (const e of await fs.readdir(base, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    try {
      if (await exists(path.join(base, e.name, ".hxzl/install-request.json")))
        throw Error("安装未完成，请使用同一名称重试安装");
      const v = await readVersion(root, e.name);
      const game = v.patches?.find(p => p.id === "game");
      const loader = v.patches?.find(p => p.id !== "game");
      result.push({
        id: e.name,
        name: e.name,
        version: game?.version || v.inheritsFrom || v.id,
        loader: loader
          ? `${loader.id} ${loader.version}`
          : (v.mainClass || "").includes("fabric")
            ? "Fabric"
            : (v.mainClass || "").includes("bootstrap")
              ? "Forge / NeoForge"
              : "原版",
        javaMajor: v.javaVersion?.majorVersion || 8
      });
    } catch (error) {
      result.push({ id: e.name, name: e.name, error: error.message });
    }
  }
  return result.slice(0, 300);
}
export async function inspectJava(binary) {
  return new Promise((ok, fail) => {
    const p = spawn(binary, ["-version"], { windowsHide: true, shell: false });
    let output = "";
    const timer = setTimeout(() => {
      p.kill();
      fail(Error("Java 检测超时"));
    }, 6000);
    p.stdout.on("data", c => (output += c));
    p.stderr.on("data", c => (output += c));
    p.on("error", e => {
      clearTimeout(timer);
      fail(e);
    });
    p.on("close", code => {
      clearTimeout(timer);
      const match =
        output.match(/version\s+"([\d.]+)/) ||
        output.match(/(?:openjdk|java)\s+(\d[\d.]*)/);
      if (code || !match) {
        fail(Error("不是可用的 Java"));
        return;
      }
      const version = match[1],
        major = Number(
          version.startsWith("1.")
            ? version.split(".")[1]
            : version.split(".")[0]
        );
      ok({
        path: binary,
        version,
        major,
        arch: /64-Bit|aarch64|amd64/i.test(output) ? "64 位" : "32 位"
      });
    });
  });
}
export async function findJava() {
  const candidates = new Set(["java"]);
  if (process.env.JAVA_HOME)
    candidates.add(
      path.join(
        process.env.JAVA_HOME,
        "bin",
        process.platform === "win32" ? "java.exe" : "java"
      )
    );
  if (process.platform === "win32")
    for (const base of [
      path.join(process.env.ProgramFiles || "C:/Program Files", "Java"),
      path.join(
        process.env.ProgramFiles || "C:/Program Files",
        "Eclipse Adoptium"
      ),
      "E:/zulu-java"
    ]) {
      try {
        for (const e of await fs.readdir(base, { withFileTypes: true }))
          if (e.isDirectory())
            candidates.add(path.join(base, e.name, "bin/java.exe"));
      } catch {}
    }
  const result = [];
  await parallel(
    [...candidates],
    async p => {
      try {
        result.push(await inspectJava(p));
      } catch {}
    },
    4
  );
  return result.sort((a, b) => b.major - a.major);
}
function legacySplit(text) {
  return [...text.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map(
    m => m[1] ?? m[2] ?? m[3]
  );
}
export async function prepareLaunch({
  root,
  id,
  java,
  settings,
  account,
  authAgent,
  signal,
  onProgress = () => {}
}) {
  const version = await readVersion(root, id),
    instance = inside(root, `versions/${id}`);
  await noLinks(instance);
  const run = settings.isolated !== false ? instance : root,
    natives = path.join(instance, ".hxzl/natives");
  await fs.mkdir(natives, { recursive: true });
  const j = await inspectJava(java);
  if (j.major < (version.javaVersion?.majorVersion || 8))
    throw Error(
      `该实例至少需要 Java ${version.javaVersion.majorVersion}，当前为 Java ${j.major}`
    );
  const entries = [],
    nativeArchives = [];
  const osName =
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "osx"
        : "linux";
  for (const lib of version.libraries || []) {
    if (!allowed(lib.rules)) continue;
    if (
      process.platform === "win32" &&
      lib.name?.includes(":natives-windows")
    ) {
      if (lib.name.endsWith("-arm64") !== (process.arch === "arm64")) continue;
      if (
        process.arch !== "arm64" &&
        lib.name.endsWith("-x86") !== (process.arch === "ia32")
      )
        continue;
    }
    const artifact = lib.downloads?.artifact;
    if (artifact || !lib.downloads) {
      const rel = artifact?.path || maven(lib.name),
        file = inside(root, "libraries/" + rel);
      entries.push({
        file,
        url:
          artifact?.url ??
          (lib.url || "https://libraries.minecraft.net/").replace(/\/$/, "") +
            "/" +
            rel,
        sha1: artifact?.sha1,
        size: artifact?.size
      });
    }
    if (lib.natives?.[osName]) {
      const classifier = lib.natives[osName].replace(
          "${arch}",
          process.arch.includes("64") ? "64" : "32"
        ),
        d = lib.downloads?.classifiers?.[classifier];
      if (d) {
        const file = inside(
          root,
          "libraries/" + (d.path || maven(lib.name + ":" + classifier))
        );
        nativeArchives.push({ file, exclude: lib.extract?.exclude || [] });
        entries.push({
          file,
          url: d.url,
          sha1: d.sha1,
          size: d.size,
          native: true
        });
      }
    }
  }
  const dependencies = fileProgress(
    "校验游戏依赖",
    entries.length,
    onProgress,
    "文件"
  );
  await parallel(entries, e =>
    dependencies.run(path.relative(root, e.file), async onProgress => {
      if (!(await exists(e.file)) || e.sha1) {
        if (!e.url) {
          if (!(await exists(e.file)))
            throw Error("加载器依赖缺失，请先使用 HXZ UP 安装或修复游戏");
        } else await download(e.url, e.file, { ...e, signal, onProgress });
      }
    })
  );
  const nativeProgress = fileProgress(
    "提取本机库",
    nativeArchives.length,
    onProgress,
    "文件"
  );
  for (const a of nativeArchives)
    await nativeProgress.run(path.relative(root, a.file), () =>
      extractNative(a.file, natives, a.exclude)
    );
  const jarId = version.jar || version.id || id;
  let jar = inside(root, `versions/${jarId}/${jarId}.jar`);
  if (await exists(path.join(instance, id + ".jar")))
    jar = path.join(instance, id + ".jar");
  const clientProgress = fileProgress("检查游戏主文件", 1, onProgress, "文件");
  await clientProgress.run(path.relative(root, jar), async onProgress => {
    if (!(await exists(jar))) {
      const d = version.downloads?.client;
      if (!d?.url) throw Error("缺少游戏主文件");
      await download(d.url, jar, {
        sha1: d.sha1,
        size: d.size,
        signal,
        onProgress
      });
    }
  });
  if (version.assetIndex?.url) {
    const indexFile = inside(
      root,
      "assets/indexes/" + version.assetIndex.id + ".json"
    );
    onProgress({
      phase: "读取游戏资源清单",
      activeFiles: [path.relative(root, indexFile)]
    });
    await download(version.assetIndex.url, indexFile, {
      sha1: version.assetIndex.sha1,
      size: version.assetIndex.size,
      signal
    });
    const index = await json(indexFile),
      objects = Object.values(index.objects || {});
    if (objects.length > 100000) throw Error("资源清单超过上限");
    const assets = fileProgress(
      "校验游戏资源",
      objects.length,
      onProgress,
      "文件"
    );
    await parallel(objects, o =>
      assets.run("assets/objects/" + o.hash, async onProgress => {
        if (!/^[a-f0-9]{40}$/.test(o.hash)) throw Error("无效资源哈希");
        await download(
          "https://resources.download.minecraft.net/" +
            o.hash.slice(0, 2) +
            "/" +
            o.hash,
          inside(root, "assets/objects/" + o.hash.slice(0, 2) + "/" + o.hash),
          { sha1: o.hash, size: o.size, signal, onProgress }
        );
      })
    );
    if (index.virtual || index.map_to_resources) {
      const copies = fileProgress(
        "映射旧版游戏资源",
        objects.length,
        onProgress,
        "项"
      );
      await parallel(Object.entries(index.objects), ([name, o]) =>
        copies.run(name, async () => {
          const source = inside(
            root,
            "assets/objects/" + o.hash.slice(0, 2) + "/" + o.hash
          );
          for (const targetRoot of [
            ...(index.virtual
              ? [inside(root, "assets/virtual/" + version.assetIndex.id)]
              : []),
            ...(index.map_to_resources ? [path.join(run, "resources")] : [])
          ]) {
            const target = inside(targetRoot, name);
            await noLinks(target);
            await fs.mkdir(path.dirname(target), { recursive: true });
            if (!(await exists(target))) await fs.copyFile(source, target);
          }
        })
      );
    }
  }
  onProgress({ phase: "组装游戏启动参数" });
  const uniquePaths = new Map();
  for (const file of [
    ...entries.filter(e => !e.native).map(e => e.file),
    jar
  ]) {
    const real = await fs.realpath(file);
    const key = process.platform === "win32" ? real.toLowerCase() : real;
    if (!uniquePaths.has(key)) uniquePaths.set(key, real);
  }
  const classpath = [...uniquePaths.values()].join(path.delimiter);
  const vars = {
    auth_player_name: account.name,
    auth_uuid: account.uuid,
    auth_access_token: account.accessToken,
    auth_session: account.accessToken,
    user_type: "mojang",
    user_properties: "{}",
    version_name: id,
    primary_jar_name: path.basename(jar),
    version_type: version.type || "release",
    game_directory: run,
    assets_root: path.join(root, "assets"),
    assets_index_name: version.assetIndex?.id || version.assets || "",
    game_assets: path.join(root, "assets/virtual", version.assets || ""),
    natives_directory: natives,
    library_directory: path.join(root, "libraries"),
    classpath,
    classpath_separator: path.delimiter,
    launcher_name: "HXZ Launcher",
    launcher_version: "0.3.0",
    resolution_width: String(settings.width || 1280),
    resolution_height: String(settings.height || 720),
    clientid: "",
    auth_xuid: ""
  };
  const replace = s =>
    s.replace(/\$\{([^}]+)\}/g, (_, key) => {
      if (!(key in vars)) throw Error("不支持的游戏启动参数: " + key);
      return vars[key];
    });
  const flatten = (values, features = {}) =>
    values
      .flatMap(v =>
        typeof v === "string"
          ? [v]
          : allowed(v.rules, features)
            ? [].concat(v.value)
            : []
      )
      .map(replace);
  let jvm = flatten(version.arguments?.jvm || []);
  if (!jvm.includes("-cp") && !jvm.includes("-classpath"))
    jvm.push("-cp", classpath);
  if (!jvm.some(arg => arg.startsWith("-Djava.library.path=")))
    jvm.push("-Djava.library.path=" + natives);
  if (version.logging?.client?.file?.url) {
    const l = version.logging.client,
      file = inside(root, "assets/log_configs/" + l.file.id);
    onProgress({
      phase: "准备日志配置",
      activeFiles: [path.relative(root, file)]
    });
    await download(l.file.url, file, {
      sha1: l.file.sha1,
      size: l.file.size,
      signal
    });
    jvm.push(l.argument.replace("${path}", file));
  }
  const memory = Math.min(
    Math.max(Number(settings.memoryMB) || 4096, 512),
    Math.floor((os.totalmem() / 1048576) * 0.85)
  );
  jvm.unshift(
    "-Xmx" + memory + "M",
    "-Dfile.encoding=UTF-8",
    "-Dstdout.encoding=UTF-8",
    "-Dstderr.encoding=UTF-8",
    "-Dlog4j2.formatMsgNoLookups=true"
  );
  if (authAgent)
    jvm.unshift(
      "-javaagent:" + authAgent + "=https://skin.hxzmc.top/api/yggdrasil"
    );
  const extra = settings.jvmArgs || [];
  if (
    !Array.isArray(extra) ||
    extra.length > 30 ||
    extra.some(
      v =>
        typeof v !== "string" ||
        /[\r\n]/.test(v) ||
        !/^-(?:D|X|XX:|ea$|da$)/.test(v)
    )
  )
    throw Error("额外 JVM 参数格式无效");
  jvm.push(...extra);
  const gameArgs = version.minecraftArguments
    ? legacySplit(version.minecraftArguments).map(replace)
    : flatten(version.arguments?.game || [], { has_custom_resolution: true });
  if (settings.autoJoin && settings.serverAddress) {
    const address = serverAddress(settings.serverAddress);
    const quick = JSON.stringify(version.arguments?.game || []).includes(
      "quickPlayMultiplayer"
    );
    if (quick) gameArgs.push("--quickPlayMultiplayer", address);
    else {
      const u = new URL("http://" + address);
      gameArgs.push("--server", u.hostname, "--port", u.port || "25565");
    }
  }
  if (settings.fullscreen) gameArgs.push("--fullscreen");
  else if (!gameArgs.includes("--width"))
    gameArgs.push(
      "--width",
      String(settings.width || 1280),
      "--height",
      String(settings.height || 720)
    );
  if (!version.mainClass || !/^[\w.$]+$/.test(version.mainClass))
    throw Error("游戏入口无效");
  return {
    command: java,
    args: [...jvm, version.mainClass, ...gameArgs],
    cwd: run,
    javaMajor: j.major
  };
}
