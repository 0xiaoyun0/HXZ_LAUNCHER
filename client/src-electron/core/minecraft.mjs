import { normalizeDownloadConcurrency } from "./download-settings.mjs";
import { serverAddress } from "./instances.mjs";
import { fileProgress } from "./progress.mjs";
import { nativeArtifactAllowed } from "./platform.mjs";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { javaRequirement } from "./java-policy.mjs";
import {
  json,
  exists,
  inside,
  noLinks,
  download,
  parallel,
  extractNative
} from "./io.mjs";

export function allowed(rules = [], features = {}, architecture = process.arch) {
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
          architecture,
          architecture === "x64" ? "amd64" : architecture === "ia32" ? "x86" : architecture === "arm64" ? "aarch64" : architecture
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
        javaMajor: javaRequirement(v).major
      });
    } catch (error) {
      result.push({ id: e.name, name: e.name, error: error.message });
    }
  }
  return result.slice(0, 300);
}
const javaInspections = new Map();
export async function inspectJava(binary) {
  const info = await fs.stat(binary).catch(()=>null);
  const key = path.resolve(binary).toLowerCase(), stamp = info ? `${info.size}:${info.mtimeMs}` : '';
  const cached = javaInspections.get(key);
  if (cached && cached.stamp === stamp && Date.now()-cached.time<60000) return cached.value;
  const value = inspectJavaProcess(binary);
  javaInspections.set(key,{stamp,time:Date.now(),value});
  try { return await value; } catch(error) {javaInspections.delete(key);throw error;}
}
async function inspectJavaProcess(binary) {
  // javaw.exe suppresses the console on Windows; inspect and launch its paired java.exe.
  if (/javaw\.exe$/i.test(binary)) {
    const consoleJava = binary.replace(/javaw\.exe$/i, 'java.exe');
    if (await exists(consoleJava)) binary = consoleJava;
  }
  return new Promise((ok, fail) => {
    const p = spawn(binary, ["-XshowSettings:properties", "-version"], { windowsHide: true, shell: false });
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
        output.match(/version\s+"([\d._+\-]+)/) ||
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
        arch: /64-Bit|aarch64|amd64/i.test(output) ? "64 位" : "32 位",
        architecture: /os\.arch\s*=\s*(aarch64|arm64)/i.test(output) ? "arm64" : /64-Bit|amd64|x86_64/i.test(output) ? "x64" : "ia32"
      });
    });
  });
}
const javaDiscovery=new Map();
export async function findJava(options={}){
 const key=JSON.stringify([options.roots||[],options.chinesePaths!==false,process.env.JAVA_HOME,process.env.PATH]);
 const cached=javaDiscovery.get(key);if(!options.refresh&&cached&&Date.now()-cached.time<60000)return cached.promise;
 const promise=discoverJava(options);if(javaDiscovery.size>10)javaDiscovery.clear();javaDiscovery.set(key,{time:Date.now(),promise});try{return await promise;}catch(e){javaDiscovery.delete(key);throw e;}
}
async function discoverJava({ roots = [], chinesePaths = true } = {}) {
  const candidates = new Set(), binary = process.platform==='win32'?'java.exe':'java';
  const addHome = home => {if(home)candidates.add(path.join(home,'bin',binary));};
  for(const name of ['JAVA_HOME','JDK_HOME','JRE_HOME'])addHome(process.env[name]);
  for(const dir of (process.env.PATH||'').split(path.delimiter).filter(Boolean))candidates.add(path.join(dir.replace(/^"|"$/g,''),binary));
  const scanRoots = [...roots];
  if(process.platform==='win32'){
    const bases=[process.env.ProgramW6432,process.env.ProgramFiles,process.env['ProgramFiles(x86)'],'C:/Programs'].filter(Boolean);
    for(const base of bases){
      for(const vendor of ['Java','Eclipse Adoptium','Eclipse Foundation','Microsoft','Amazon Corretto','BellSoft','Semeru','Zulu','Azul','OpenJDK'])scanRoots.push(path.join(base,vendor));
      // A vendor-neutral shallow check also finds portable JDKs in standard install folders.
      for(const entry of (await fs.readdir(base,{withFileTypes:true}).catch(()=>[])).slice(0,150))if(entry.isDirectory())addHome(path.join(base,entry.name));
    }
    for(const base of [process.env.APPDATA,process.env.LOCALAPPDATA].filter(Boolean))scanRoots.push(path.join(base,'.minecraft/runtime'),path.join(base,'Programs/Java'));
    if(process.env.USERPROFILE)scanRoots.push(path.join(process.env.USERPROFILE,'.jdks'));
    await Promise.all(['HKLM\\SOFTWARE\\JavaSoft','HKLM\\SOFTWARE\\WOW6432Node\\JavaSoft','HKLM\\SOFTWARE\\Eclipse Adoptium'].map(async key=>{
      try{const {stdout}=await promisify(execFile)('reg.exe',['query',key,'/s'],{windowsHide:true,timeout:1500,maxBuffer:256*1024});
        for(const line of stdout.split(/\r?\n/)){const m=line.match(/(?:JavaHome|Path)\s+REG_(?:EXPAND_)?SZ\s+(.+)$/i);if(m)addHome(m[1].trim());}
      }catch{}
    }));
  }
  // Bounded scan of selected roots supports Unicode vendor/install paths without walking drives.
  let visitedTotal=0;
  for (const root of new Set(scanRoots.filter(Boolean))) {
    const queue = [{ dir: root, depth: 0 }]; let visited = 0;
    while (queue.length && visited++ < 100 && visitedTotal++ < 1200) {
      const { dir, depth } = queue.shift();
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (!chinesePaths && /[^\x00-\x7f]/.test(entry.name)) continue;
        if (entry.isDirectory() && !entry.isSymbolicLink() && depth < 3) queue.push({dir:path.join(dir,entry.name),depth:depth+1});
        if (entry.isFile() && /^java(?:\.exe)?$/i.test(entry.name)) candidates.add(path.join(dir,entry.name));
      }
    }
  }
  const result = [];
  await parallel(
    [...candidates].filter(p => chinesePaths || !/[^\x00-\x7f]/.test(p)),
    async p => {
      try {
        if(await exists(p)){
          const real=await fs.realpath(p);
          if(!result.some(j=>j.path.toLowerCase()===real.toLowerCase()))result.push(await inspectJava(real));
        }
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
  downloadConcurrency = 64,
  root,
  id,
  java,
  settings,
  account,
  authAgent,
  authServer="https://skin.hxzmc.top/api/yggdrasil",authMetadata,
  signal,
  onProgress = () => {}
}) {
  const downloadFiles = (values, fn) =>
    parallel(values, fn, normalizeDownloadConcurrency(downloadConcurrency));
  const version = await readVersion(root, id),
    instance = inside(root, `versions/${id}`);
  await noLinks(instance);
  const j = await inspectJava(java);
  const run = settings.isolated !== false ? instance : root,
    natives = path.join(instance, ".hxzl/natives-" + j.architecture);
  await noLinks(natives);
  await fs.mkdir(natives, { recursive: true });
  const requiredJava=javaRequirement(version).major;
  if (j.major < requiredJava)
    throw Error(
      `该实例至少需要 Java ${requiredJava}，当前为 Java ${j.major}`
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
    if (!allowed(lib.rules, {}, j.architecture)) continue;
    if (!nativeArtifactAllowed(lib, j.architecture)) continue;
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
          j.architecture.includes("64") ? "64" : "32"
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
  await downloadFiles(entries, e =>
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
    await downloadFiles(objects, o =>
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
    launcher_version: "0.5.0",
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
          : allowed(v.rules, features, j.architecture)
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
    Math.floor((os.totalmem() / 1048576) * 0.85),
    j.architecture === "ia32" ? 1280 : 131072
  );
  jvm.unshift(
    "-Xmx" + memory + "M",
    "-Dfile.encoding=UTF-8",
    "-Dstdout.encoding=UTF-8",
    "-Dstderr.encoding=UTF-8",
    "-Dlog4j2.formatMsgNoLookups=true"
  );
  if (authAgent) {
    // libinstrument on Windows may interpret the option with the ANSI code page.
    // CreateProcessW still handles a Unicode cwd correctly: use an ASCII relative
    // agent name within that cwd, never the translated AppData/application name.
    const stagedAgent=path.join(run,'.hxzl/authlib-injector.jar');
    await noLinks(stagedAgent);await fs.mkdir(path.dirname(stagedAgent),{recursive:true});
    if(path.resolve(authAgent)!==path.resolve(stagedAgent))await fs.copyFile(authAgent,stagedAgent);
    jvm.unshift(
      "-javaagent:.hxzl/authlib-injector.jar="+authServer
    );
    if(authMetadata)jvm.unshift('-Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(JSON.stringify(authMetadata)).toString('base64'));
  }
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
  const optionsFile=path.join(run,'options.txt');
  if(!await exists(optionsFile)){await noLinks(optionsFile);await fs.writeFile(optionsFile,'guiScale:2\nlang:zh_cn\n',{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
  return {
    command: java,
    args: [...jvm, version.mainClass, ...gameArgs],
    cwd: run,
    javaMajor: j.major
  };
}
