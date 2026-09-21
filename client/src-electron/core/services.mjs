import {crashReport,diagnosticText,redactDiagnostic} from "./diagnostics.mjs";
import {javaPathArgument, systemArchitecture} from "./platform.mjs";
import {createPresetCatalog} from "./server-presets.mjs";
import {normalizeUpdateUrl,readUpdateSource} from "./hxzup-sources.mjs";
import { instanceTarget, modPlan } from "./mod-plan.mjs";
import {
  normalizeDownloadConcurrency,
  validateDownloadConcurrency
} from "./download-settings.mjs";
import { ensureRuntime } from "./runtime.mjs";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import {
  exists,
  json,
  writeJSON,
  endpoint,
  remoteJSON,
  download,
  inside,
  noLinks,
  hash
} from "./io.mjs";
import {
  findJava,
  inspectJava,
  scanInstances,
  prepareLaunch,
  readVersion
} from "./minecraft.mjs";

import {
  serverAddress,
  modDirectory,
  listMods,
  modFile
} from "./instances.mjs";
import { beginInstall, listInstalls, discardInstall } from "./install-jobs.mjs";
import { inspectPack, extractPack } from "./packs.mjs";
import * as catalog from "./catalog.mjs";
import { setDownloadMode } from "./sources.mjs";
const SKIN = "https://skin.hxzmc.top/api/yggdrasil";
const APPEARANCE_VERSION = 2;
export async function createServices({
  data,
  resources,
  safeStorage,
  nativeImage,
  dialog,
  shell,
  window,
  emit,
  openSkin,
  skinPanel
}) {
  await fs.mkdir(data, { recursive: true });
  const configFile = path.join(data, "settings.json"),
    accountFile = path.join(data, "accounts.bin");
  let settings = {
    appearanceVersion: APPEARANCE_VERSION,
    gameRoot: "",
    javaPath: "",
    selectedInstance: "",
    selectedAccount: "",
    theme: "light",
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    backgroundImage: "",
    backgroundOpacity: 0.4,
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundFit: "cover",
    layout: "standard",
    downloadMode: "domestic",
    downloadConcurrency: 64,
    updateFeed: "",
    autoCheckUpdates: true,
    memoryMode: "auto",
    defaultMemoryMB: 4096,
    voiceMode: "open",
    voiceKey: "KeyT",
    voiceSounds: true,
    hxzupPopup: true,
    simpleHome: false,
    communityUrl: "https://qqbot.hxzmc.top",
    hiddenLinks: [],
    columns: {
      sidebar: { visible: true, color: "", opacity: 1, label: "游戏与社区" },
      workspace: { visible: true, color: "", opacity: 1, label: "主工作区" },
      dock: { visible: true, color: "", opacity: 1, label: "任务详情" }
    },
    instanceSettings: {}
  };
  if (await exists(configFile))
    settings = { ...settings, ...(await json(configFile)) };
  const presetCatalog = await createPresetCatalog(data,()=>settings.communityUrl);
  void presetCatalog.refresh();
  // Extend old settings without resetting the player's appearance.
  settings.appearanceVersion = APPEARANCE_VERSION;
  settings.hiddenLinks = Array.isArray(settings.hiddenLinks)
    ? settings.hiddenLinks.filter(
        value =>
          value !== "/" && value !== "/settings" && value !== "/appearance"
      )
    : [];
  settings.columns = {
    sidebar: {
      visible: true,
      color: "",
      opacity: 1,
      label: "游戏与社区",
      ...settings.columns?.sidebar
    },
    workspace: {
      visible: true,
      color: "",
      opacity: 1,
      label: "主工作区",
      ...settings.columns?.workspace
    },
    dock: {
      visible: true,
      color: "",
      opacity: 1,
      label: "任务详情",
      ...settings.columns?.dock
    }
  };
  settings.columns.workspace.visible = true;
  settings.downloadConcurrency = normalizeDownloadConcurrency(
    settings.downloadConcurrency
  );
  setDownloadMode(settings.downloadMode);
  const persistent =
    safeStorage.isEncryptionAvailable() &&
    !(
      process.platform === "linux" &&
      safeStorage.getSelectedStorageBackend() === "basic_text"
    );
  let accounts = [];
  if (persistent && (await exists(accountFile)))
    try {
      accounts = JSON.parse(
        safeStorage.decryptString(await fs.readFile(accountFile))
      );
    } catch {}
  let running = null,
    task = null,
    logs = [],
    community = null;
  let lastCrash=null, stoppedByUser=false;
  const secrets = new Set(
    accounts.flatMap(a => [a.accessToken, a.clientToken]).filter(Boolean)
  );
  let pendingLogs = [],
    logTimer;
  function rememberSecrets() {
    for (const a of accounts)
      for (const value of [a.accessToken, a.clientToken])
        if (value) secrets.add(value);
  }
  function flushLogs() {
    clearTimeout(logTimer);
    logTimer = null;
    if (pendingLogs.length) {
      emit({ type: "logs", lines: pendingLogs });
      pendingLogs = [];
    }
  }
  function log(line) {
    rememberSecrets();
    line=redactDiagnostic(String(line),[...secrets]);
    for (const value of secrets) line = line.replaceAll(value, "[凭据已隐藏]");
    line = line.replace(/(--accessToken\s+)[^\s]+/g, "$1[已隐藏]");
    for (const part of line.split(/\r?\n/)) {
      if (!part) continue;
      const value = part.slice(0, 12000);
      logs.push(value);
      pendingLogs.push(value);
    }
    if (logs.length > 5000) logs.splice(0, logs.length - 5000);
    if (pendingLogs.length > 500)
      pendingLogs.splice(0, pendingLogs.length - 500);
    if (!logTimer) logTimer = setTimeout(flushLogs, 100);
  }
  function attachLog(output, consume = () => false) {
    const decoder = new TextDecoder();
    let buffer = "",
      dropping = false;
    output.on("data", chunk => {
      buffer += decoder.decode(chunk, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        if (!dropping && !consume(line)) log(line);
        dropping = false;
      }
      if (buffer.length > 16384) {
        if (!dropping) log("[日志行过长，已省略]");
        buffer = "";
        dropping = true;
      }
    });
    output.on("end", () => {
      buffer += decoder.decode();
      if (buffer && !dropping && !consume(buffer)) log(buffer);
      flushLogs();
    });
  }
  const accountView = a => ({
    id: a.id,
    username: a.username,
    name: a.name,
    uuid: a.uuid,
    profiles: a.profiles || [],
    persistent,
    avatar: a.avatars?.[a.uuid]
  });
  async function saveAccounts() {
    rememberSecrets();
    if (persistent) {
      const buffer = safeStorage.encryptString(JSON.stringify(accounts));
      const tmp = accountFile + ".tmp";
      await fs.writeFile(tmp, buffer, { mode: 0o600 });
      await fs.rename(tmp, accountFile);
    }
  }
  async function syncAvatar(a) {
    const avatar = a.avatars?.[a.uuid];
    if (!community || community.user.uid !== a.uuid || avatar === undefined)
      return false;
    try {
      await remoteJSON(community.base + "/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + community.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ avatar })
      });
      return true;
    } catch {
      return false;
    }
  }
  async function authCall(method, body) {
    return remoteJSON(SKIN + "/authserver/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  function selected() {
    const a = accounts.find(a => a.id === settings.selectedAccount);
    if (!a || !a.uuid) throw Error("请先登录皮肤站并选择游戏角色");
    return a;
  }
  async function refresh(a) {
    const next = await authCall("refresh", {
      accessToken: a.accessToken,
      clientToken: a.clientToken,
      requestUser: true
    });
    Object.assign(a, {
      accessToken: next.accessToken,
      clientToken: next.clientToken || a.clientToken,
      name: next.selectedProfile?.name || a.name,
      uuid: next.selectedProfile?.id || a.uuid
    });
    await saveAccounts();
    return a;
  }
  async function ensureAccount() {
    const a = selected();
    try {
      await authCall("validate", {
        accessToken: a.accessToken,
        clientToken: a.clientToken
      });
      return a;
    } catch {
      return refresh(a);
    }
  }
  function busy() {
    if (task || running) throw Error("请等待当前任务完成或先停止游戏");
  }
  function memoryFor(cfg) {
    if (
      (cfg.memoryMode && cfg.memoryMode !== "inherit"
        ? cfg.memoryMode
        : settings.memoryMode) !== "auto"
    )
      return cfg.memoryMB;
    const total = Math.floor(os.totalmem() / 1048576);
    const free = Math.floor(os.freemem() / 1048576);
    return Math.max(
      1024,
      Math.min(131072, Math.floor(Math.min(total * 0.75, free * 0.5)))
    );
  }
  let previousPhase = "", lastDetailLog=0;
  function phase(value) {
    if(value.busy && value.total && Date.now()-lastDetailLog>2000){lastDetailLog=Date.now();log(`[进度] ${value.phase||previousPhase} · ${value.completed||0}/${value.total} · 已接收 ${value.received||0} bytes`);for(const file of (value.activeFiles||[]).slice(0,4))log("[正在处理] "+file);}
    if (value.phase && value.phase !== previousPhase) {
      previousPhase = value.phase;
      log("[" + new Date().toLocaleTimeString() + "] " + value.phase);
    }
    flushLogs();
    emit({ type: "task", ...value });
  }
  async function credentialsAgent(signal) {
    const dir = path.join(data, "runtime"),
      file = path.join(dir, "authlib-injector.jar"),
      record = path.join(dir, "authlib-injector.json");
    await fs.mkdir(dir, { recursive: true });
    try {
      const metadata = await remoteJSON(
        "https://authlib-injector.yushi.moe/artifact/latest.json",
        { signal }
      );
      if (!/^[a-f0-9]{64}$/i.test(metadata.checksums?.sha256 || ""))
        throw Error("外置登录组件缺少校验信息");
      await download(metadata.download_url, file, {
        sha256: metadata.checksums.sha256,
        signal
      });
      await writeJSON(record, { sha256: metadata.checksums.sha256 });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (!(await exists(file)) || !(await exists(record))) throw error;
      await noLinks(file);
      const saved = await json(record);
      if ((await hash(file, "sha256")) !== saved.sha256) throw error;
      log("登录组件更新服务暂不可达，使用已校验的本地组件");
    }
    return file;
  }
  async function runProcess(
    command,
    args,
    cwd,
    signal,
    installerProgress = false
  ) {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        windowsHide: true,
        shell: false
      });
      log("[进程] "+path.basename(command)+" · 工作目录: "+cwd);
      let finished = false, failureEvidence = "";
      const started = Date.now();
      const abort = () => {
        if (process.platform === "win32" && child.pid) {
          const killer = spawn(
            "taskkill",
            ["/PID", String(child.pid), "/T", "/F"],
            { windowsHide: true, stdio: "ignore", shell: false }
          );
          killer.on("error", () => child.kill());
        } else child.kill();
      };
      signal?.addEventListener("abort", abort, { once: true });
      attachLog(child.stdout, line => {
        if (!installerProgress || !line.startsWith("HXZ_PROGRESS\t"))
          return false;
        try {
          const p = JSON.parse(line.slice(13));
          if (typeof p.phase !== "string") return false;
          phase({
            phase: p.phase.slice(0, 300),
            busy: true,
            completed: Math.max(0, Number(p.completed) || 0),
            total: Math.max(0, Number(p.total) || 0),
            unit: String(p.unit || "项"),
            received: Math.max(0, Number(p.received) || 0),
            activeFiles: Array.isArray(p.activeFiles)
              ? p.activeFiles.slice(0, 8).map(f => String(f).slice(0, 2048))
              : []
          });
          return true;
        } catch {
          return false;
        }
      });
      attachLog(child.stderr, line => {
        if (/^(?:Caused by:|Exception in thread|Error:)|InvalidPathException|UnsupportedClassVersionError/.test(line))
          failureEvidence = redactDiagnostic(line, [...secrets]).slice(0, 800);
        return false;
      });
      child.on("error", error => {
        finished = true;
        signal?.removeEventListener("abort", abort);
        reject(error);
      });
      child.on("close", code => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", abort);
        if (signal?.aborted) reject(Error("任务已取消"));
        else if (code !== 0) {
          log(`[进程结束] 退出码 ${code} · 耗时 ${Math.round((Date.now()-started)/1000)} 秒`);
          reject(Error(`任务进程退出（${code}）${failureEvidence ? "：" + failureEvidence : "，请查看任务详情"}`));
        }
        else resolve();
      });
    });
  }
  async function updateInstance(id, cfg, signal) {
    const instance = inside(settings.gameRoot, `versions/${id}`),
      updater = path.join(instance, "updater");
    await noLinks(updater);
    await fs.mkdir(updater, { recursive: true });
    let existingConfig = {};
    if (await exists(path.join(updater, "config.json")))
      existingConfig = await json(path.join(updater, "config.json"));
    const urls = (cfg.updateUrls || []).length
      ? cfg.updateUrls
      : existingConfig.servers;
    if (!urls?.length) {
      throw Error("请为此实例填写 HXZ UP 客户端地址");
    }
    const {status,base:availableSource}=await readUpdateSource(urls,{signal,log});
    if(status.maintenance){log('[HXZ UP] 整合包正在维护，保留已安装版本并跳过本次更新');return;}
    for (const name of ["updater-1.0.3.jar", "launcher-agent.jar"]) {
      const target = path.join(updater, name);
      if (!(await exists(target)))
        await fs.copyFile(path.join(resources, "hxzup", name), target);
    }
    const value = {
      ...existingConfig,
      servers: [availableSource,...urls.map(normalizeUpdateUrl).filter(url=>url!==availableSource)],
      showChangelog: settings.hxzupPopup !== false,
      theme: settings.theme
    };
    if (
      !(await exists(path.join(updater, "config.json"))) ||
      JSON.stringify(value.servers) !==
        JSON.stringify(existingConfig.servers) ||
      value.showChangelog !== existingConfig.showChangelog ||
      value.theme !== existingConfig.theme
    )
      await writeJSON(path.join(updater, "config.json"), value);
    const jars = (await fs.readdir(updater))
      .filter(n => /^updater-\d+\.\d+\.\d+\.jar$/.test(n))
      .sort((a, b) => {
        const x = a.match(/\d+/g).map(BigInt),
          y = b.match(/\d+/g).map(BigInt);
        for (let i = 0; i < 3; i++)
          if (x[i] !== y[i]) return x[i] > y[i] ? -1 : 1;
        return 0;
      });
    const java = settings.javaPath || (await findJava())[0]?.path;
    if (!java) throw Error("请安装或选择 Java");
    phase({
      phase:
        settings.hxzupPopup !== false
          ? "在 HXZ UP 窗口中更新"
          : "正在执行 HXZ UP 更新",
      busy: true
    });
    // Update before assembling JVM arguments, so a replaced instance JSON is used immediately.
    await runProcess(
      java,
      [
        "-Xmx256m",
        "-Dfile.encoding=UTF-8",
        "-Dstdout.encoding=UTF-8",
        "-Dstderr.encoding=UTF-8",
        "-Dsun.stdout.encoding=UTF-8",
        "-Dsun.stderr.encoding=UTF-8",
        "-Djava.awt.headless=" + (settings.hxzupPopup === false),
        "-jar",
        path.join("updater", jars[0])
      ],
      instance,
      signal
    );
    if (await exists(path.join(updater, ".updater/local-version.json"))) {
      const version = await json(
        path.join(updater, ".updater/local-version.json")
      );
      if (version.pendingVersion)
        throw Error("部分文件未更新完成，请解除占用后重试；详情见日志");
    }
  }
  async function launch(id, updateOnly = false, joinServer = false) {
    busy();
    const preset = (await presetCatalog.refresh()).find(p => p.id === id);
    if (preset && !preset.enabled) throw Error("管理员暂时关闭了此服务器入口");
    if (preset) {
      if (!settings.gameRoot) {
        settings.gameRoot = path.join(data, "games/.minecraft");
        await writeJSON(configFile, settings);
      }
      const metadata = inside(settings.gameRoot, `versions/${id}/${id}.json`);
      const local = await exists(metadata) ? instanceTarget(await readVersion(settings.gameRoot,id)) : null;
      const presetSignature=JSON.stringify([preset.profileSource,preset.version,preset.loader,preset.loaderVersion,preset.fabricAPI,preset.packageSha256]);
      const installedRecord=path.join(path.dirname(metadata),'.hxzl/server-preset.json');
      const previous=await exists(installedRecord)?await json(installedRecord):{};
      const needsInstall = !local || (preset.profileSource==='manual' && (local.minecraft!==preset.version || local.loader!==preset.loader || previous.signature!==presetSignature)) || (preset.profileSource==='package'&&previous.signature!==presetSignature);
      if (needsInstall) {
        const setup = new AbortController();task=setup;
        phase({phase:'读取 '+preset.name+' 安装配置',busy:true});
        let input={name:id,minecraft:preset.version,loader:preset.loader,loaderVersion:preset.loaderVersion,fabricAPI:preset.fabricAPI,upgrade:!!local,presetSignature},pack=null;
        try {
          if(preset.profileSource==='hxzup') {
            const {status,profile}=await readUpdateSource(preset.updateUrls,{signal:setup.signal,profile:true,log});
            if(status.maintenance)throw Error(preset.name+' 正在维护，发布后即可安装');
            input={...input,minecraft:profile.gameVersion,loader:profile.loader?.type||'',loaderVersion:profile.loader?.version||''};
          } else if(preset.profileSource==='package') {
            const file=path.join(data,'downloads',preset.packageSha256+'.zip');
            await download(preset.packageUrl,file,{sha256:preset.packageSha256,signal:setup.signal,onProgress:received=>phase({phase:'下载 '+preset.name+' 整合包',busy:true,received})});
            pack=await inspectPack(file);
          }
          if(input.loader&&!input.loaderVersion&&!pack){
            const releases=await catalog.loaders(input.minecraft,input.loader);
            input.loaderVersion=(releases.find(v=>v.stable)||releases[0])?.version||'';
            if(!input.loaderVersion)throw Error('没有适用的 '+input.loader+' 加载器版本');
          }
        } catch(error){phase({phase:'服务器安装未开始',busy:false,failed:true,failure:error.message});throw error;}
        finally {task=null;}
        await installGame(input,pack);
      }
    }
    if (
      !settings.gameRoot ||
      typeof id !== "string" ||
      /[\\/:]/.test(id) ||
      [".", ".."].includes(id)
    )
      throw Error("请先选择游戏目录和实例");
    if (
      await exists(
        inside(settings.gameRoot, `versions/${id}/.hxzl/install-request.json`)
      )
    )
      throw Error("此实例尚未安装完成，请在下载页面使用同一名称重试");
    const controller = new AbortController();
    task = controller;
    logs = [];
    emit({ type: "logs-reset" });
    try {
      const cfg = {
        memoryMB: settings.defaultMemoryMB,
        width: 1280,
        height: 720,
        isolated: true,
        autoUpdate: preset?.autoUpdate || false,
        autoJoin: !!preset?.address && preset.autoJoin,
        serverAddress: preset?.address || "",
        ...settings.instanceSettings[id],
        ...(preset ? {updateUrls:preset.updateUrls,serverAddress:preset.address} : {})
      };
      if(preset?.updateRequired)cfg.autoUpdate=true;
      cfg.memoryMB = memoryFor(cfg);
      if (joinServer) {
        if (!cfg.serverAddress) throw Error("请先在实例配置中填写服务器地址");
        cfg.autoJoin = true;
      }
      if (updateOnly || cfg.autoUpdate)
        await updateInstance(id, cfg, controller.signal);
      if (updateOnly) {
        phase({ phase: "更新检查完成", busy: false });
        return { ok: true };
      }
      phase({ phase: "正在验证皮肤站账号", busy: true });
      const account = await ensureAccount();
      phase({ phase: "准备外置登录组件", busy: true });
      const authAgent = await credentialsAgent(controller.signal);
      phase({ phase: "读取实例与选择 Java", busy: true });
      const metadata = await readVersion(settings.gameRoot, id);
      const available = await findJava();
      const runtimeArch=systemArchitecture();
      const managed = path.join(
        data,
        "runtimes",
        (metadata.javaVersion?.component || "none")+(runtimeArch==='x64'?'':'-'+runtimeArch),
        "bin/java.exe"
      );
      if (await exists(managed)) available.unshift(await inspectJava(managed));
      const required = metadata.javaVersion?.majorVersion || 8;
      const java =
        settings.javaPath ||
        available.find(j => j.major === required)?.path ||
        available
          .filter(j => j.major >= required)
          .sort((a, b) => a.major - b.major)[0]?.path ||
        (await ensureRuntime(
          data,
          metadata,
          controller.signal,
          p => phase({ ...p, busy: true }),
          settings.downloadConcurrency
        ));
      if (!java) throw Error("没有找到 Java，请在设置中选择");
      const command = await prepareLaunch({
        root: settings.gameRoot,
        id,
        java,
        settings: cfg,
        downloadConcurrency: settings.downloadConcurrency,
        account: { ...account },
        authAgent,
        signal: controller.signal,
        onProgress: value => phase({ ...value, busy: true })
      });
      if (controller.signal.aborted) throw Error("任务已取消");
      phase({ phase: "正在启动游戏", busy: true });
      const gameStarted=Date.now(),gameLogs=[];stoppedByUser=false;lastCrash=null;
      const capture=line=>{gameLogs.push(redactDiagnostic(line,[...secrets]));if(gameLogs.length>5000)gameLogs.splice(0,gameLogs.length-5000);return false;};
      log("[启动] 实例: "+id+" · 目录: "+command.cwd+" · Java: "+command.command+" · 内存: "+cfg.memoryMB+" MB");
      const child = spawn(command.command, command.args, {
        cwd: command.cwd,
        windowsHide: true,
        shell: false
      });
      running = child;
      attachLog(child.stdout,capture);
      attachLog(child.stderr,capture);
      child.on("error", error => {
        log("游戏启动失败: " + error.message);
        running = null;
        phase({
          phase: "启动失败",
          busy: false,
          running: false,
          error: error.message
        });
      });
      child.on("close", (code, exitSignal) => {
        running = null;
        phase({
          phase: code === 0 ? "游戏已结束" : "游戏进程已退出",
          busy: false,
          running: false,
          failed: code != null && code !== 0,
          failure:
            code != null && code !== 0
              ? "游戏退出码 " + code + "，请查看最后的错误日志"
              : "",
          exitCode: code
        });
        log("游戏退出代码: " + code + " · 信号: " + (exitSignal||"无"));
        if(!stoppedByUser && (code!==0 || exitSignal)) void crashReport({cwd:command.cwd,id,started:gameStarted,code,signal:exitSignal,logs:gameLogs,secrets:[...secrets],java:command.command}).then(report=>{lastCrash=report;emit({type:"game-crash",report});}).catch(error=>log("诊断报告读取失败: "+error.message));
        if (code != null && code >>> 0 === 0xc0000005) {
          const message =
            "Java 本机运行库异常退出 (0xC0000005)。请在设置中切换同版本的其他 Java（例如 Zulu / Temurin），并查看游戏崩溃日志。";
          log(message);
          phase({
            phase: "Java 运行库异常退出",
            busy: false,
            running: false,
            error: message
          });
        }
      });
      phase({ phase: "游戏运行中", busy: false, running: true });
      return { ok: true };
    } catch (error) {
      log(error.stack || error.message);
      phase({
        phase: controller.signal.aborted ? "任务已取消" : "启动未完成",
        busy: false,
        failed: !controller.signal.aborted,
        cancelled: controller.signal.aborted,
        failure: error.message
      });
      throw error;
    } finally {
      controller.abort();
      task = null;
    }
  }
  async function installGame(input, pack = null) {
    busy();
    if (!settings.gameRoot) throw Error("先选择游戏目录");
    const id = String(input.name || "").trim();
    if (
      !/^[\p{L}\p{N}_ .-]{1,80}$/u.test(id) ||
      /[. ]$/.test(id) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id)
    )
      throw Error("实例名称无效");
    const request = {
      gameVersion: pack?.minecraft || input.minecraft,
      loader: {
        type: pack?.loader || input.loader || "",
        version: pack?.loaderVersion || input.loaderVersion || ""
      }
    };
    if (
      typeof request.gameVersion !== "string" ||
      !/^[\w.+-]{1,100}$/.test(request.gameVersion) ||
      !["", "fabric", "quilt", "forge", "neoforge"].includes(
        request.loader.type
      ) ||
      (request.loader.type && !/^[\w.+-]{1,100}$/.test(request.loader.version))
    )
      throw Error("游戏或加载器版本无效");
    const controller = new AbortController();
    task = controller;
    logs = [];
    emit({ type: "logs-reset" });
    phase({ phase: "准备安装 " + id, busy: true });
    let job;
    try {
      job = await beginInstall(settings.gameRoot, id, request, pack, input);
      const instance = job.stage;
      const marker = path.join(instance, ".hxzl/install-request.json");
      await writeJSON(marker, { request, pack: pack?.file || "" });
      const [versions, metadata] = await Promise.all([
          findJava(),
          catalog.gameMetadata(request.gameVersion)
        ]),
        required = metadata.javaVersion?.majorVersion || 8,
        java =
          settings.javaPath ||
          versions.find(j => j.major === required)?.path ||
          versions
            .filter(j => j.major >= required)
            .sort((a, b) => a.major - b.major)[0]?.path ||
          (await ensureRuntime(
            data,
            metadata,
            controller.signal,
            p => phase({ ...p, busy: true }),
            settings.downloadConcurrency
          ));
      if (!java)
        throw Error(
          "此版本需要 Java " + required + "，请在设置中选择已安装的 Java"
        );
      if ((await inspectJava(java)).major < required)
        throw Error("选择的 Java 版本过低，需要 Java " + required);
      const configFile = path.join(instance, ".hxzl/installer-settings.json"),
        requestFile = path.join(instance, ".hxzl/game-profile.json");
      await writeJSON(requestFile, request);
      await writeJSON(configFile, {
        gameDir: settings.gameRoot,
        parallelDownloads: settings.downloadConcurrency
      });
      await fs.mkdir(path.join(instance, "updater"), { recursive: true });
      // Keep JVM bootstrap paths ASCII too; application paths travel as UTF-8 payloads.
      for(const [source,name] of [['installer/game-installer.jar','game-installer.jar'],['hxzup/updater-1.0.3.jar','updater.jar']])
        await fs.copyFile(path.join(resources,source),path.join(instance,'.hxzl',name));
      const javaInfo=await inspectJava(java);
      log(`[安装环境] 启动器 ${process.arch} · 系统 ${systemArchitecture()} · Java ${javaInfo.version} ${javaInfo.arch} · MC ${request.gameVersion} · ${request.loader.type||'原版'} ${request.loader.version}`);
      await runProcess(
        java,
        [
          "-Xmx768m",
          "-Djava.awt.headless=true",
          "-Dfile.encoding=UTF-8",
          "-Dstdout.encoding=UTF-8",
          "-Dstderr.encoding=UTF-8",
          "-Dsun.stdout.encoding=UTF-8",
          "-Dsun.stderr.encoding=UTF-8",
          "-Dhxz.launcher.official=" + (settings.downloadMode === "official"),
          "-cp",
          [
            ".hxzl/game-installer.jar",
            ".hxzl/updater.jar"
          ].join(path.delimiter),
          "up.hxz.LauncherInstall",
          ...[path.join(instance, "updater"), requestFile, configFile].map(javaPathArgument)
        ],
        instance,
        controller.signal,
        true
      );
      let update = { hxzup: false, updateUrls: [] };
      if (pack) {
        phase({ phase: "写入整合包文件", busy: true });
        update = await extractPack(pack, instance, {
          signal: controller.signal,
          onProgress: p => phase({ ...p, busy: true }),
          includeOptional: input.includeOptional !== false,
          downloadConcurrency: settings.downloadConcurrency
        });
      }
      if(input.fabricAPI) {
        phase({phase:'准备 Fabric API',busy:true});
        const files=await modPlan({minecraft:request.gameVersion,loader:request.loader.type},'P7dR8mSH',null,{versions:catalog.modVersions,version:catalog.modVersion});
        for(const f of files)await download(f.url,path.join(instance,'mods',f.filename),{sha512:f.hashes.sha512,size:f.size,signal:controller.signal,onProgress:received=>phase({phase:'下载 Fabric API · '+f.filename,received,busy:true})});
        const keep=new Set(files.map(f=>f.filename));
        for(const name of await fs.readdir(path.join(instance,'mods')))if(/^fabric-api-[\w.+-]+\.jar$/.test(name)&&!keep.has(name))await fs.rm(path.join(instance,'mods',name));
      }
      if(input.presetSignature)await writeJSON(path.join(instance,'.hxzl/server-preset.json'),{signature:input.presetSignature});
      if (update.hxzup)
        for (const name of ["updater-1.0.3.jar", "launcher-agent.jar"]) {
          const target = path.join(instance, "updater", name);
          if (!(await exists(target)))
            await fs.copyFile(path.join(resources, "hxzup", name), target);
        }
      settings.instanceSettings[id] = {
        memoryMB: settings.defaultMemoryMB,
        favorite: false,
        width: 1280,
        height: 720,
        isolated: true,
        fullscreen: false,
        jvmArgs: [],
        coverPositionX: 50,
        coverPositionY: 50,
        coverZoom: 1,
        ...(!presetCatalog.list().some(p=>p.id===id) ? {autoUpdate:update.hxzup,updateUrls:update.updateUrls} : {}),
        ...settings.instanceSettings[id]
      };
      settings.selectedInstance = id;
      await writeJSON(
        configFile.replace("installer-settings.json", "installed.json"),
        { request, pack: pack?.name || "", hxzup: update.hxzup }
      );
      await fs.rm(marker, { force: true });
      controller.signal.throwIfAborted();
      await writeJSON(path.join(data, "settings.json"), settings);
      await job.commit();
      phase({
        phase: "安装完成" + (update.hxzup ? " · 已启用 HXZ UP 自动更新" : ""),
        busy: false
      });
      return { id, ...update };
    } catch (error) {
      await job?.save(
        controller.signal.aborted ? "paused" : "failed",
        error.message
      );
      log(error.stack || error.message);
      phase({
        phase: controller.signal.aborted
          ? "任务已取消"
          : "安装已暂停，可在任务详情继续或清理",
        busy: false,
        failed: !controller.signal.aborted,
        cancelled: controller.signal.aborted,
        failure: error.message
      });
      throw error;
    } finally {
      controller.abort();
      task = null;
    }
  }
  async function packView(file) {
    const pack = await inspectPack(file);
    return {
      ...pack,
      files: undefined,
      fileCount: pack.files.length + (pack.overrideCount || 0)
    };
  }
  const actions = {
    async "catalog.versions"() {
      return catalog.versions();
    },
    async "catalog.loaders"(input) {
      return catalog.loaders(input.minecraft, input.loader);
    },
    async "catalog.packs"(input) {
      return catalog.searchPacks(input.query, input.offset);
    },
    async "catalog.packVersions"(input) {
      return catalog.packVersions(input.id);
    },
    async "install.list"() {
      return listInstalls(settings.gameRoot);
    },
    async "install.discard"(input) {
      busy();
      await discardInstall(settings.gameRoot, input.id);
      return { ok: true };
    },
    async "install.resume"(input) {
      busy();
      const job = (await listInstalls(settings.gameRoot)).find(
        j => j.id === input.id
      );
      if (!job) throw Error("未找到安装任务");
      const i = job.identity;
      const pack = i.pack ? await inspectPack(i.pack) : null;
      return installGame(
        {
          name: job.id,
          minecraft: i.request.gameVersion,
          loader: i.request.loader.type,
          loaderVersion: i.request.loader.version,
          includeOptional: i.includeOptional
          ,fabricAPI:i.fabricAPI,upgrade:i.upgrade,presetSignature:i.presetSignature
        },
        pack
      );
    },
    async "game.install"(input) {
      return installGame(input);
    },
    async "pack.choose"() {
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openFile"],
        filters: [
          {
            name: "Minecraft 整合包",
            extensions: ["mrpack", "zip", "modpack", "pack", "instance"]
          },
          { name: "所有文件", extensions: ["*"] }
        ]
      });
      return r.canceled ? null : packView(r.filePaths[0]);
    },
    async "pack.inspect"(input) {
      return packView(input.file);
    },
    async "pack.install"(input) {
      const pack = await inspectPack(input.file);
      return installGame(input, pack);
    },
    async "pack.download"(input) {
      busy();
      const controller = new AbortController();
      task = controller;
      logs = [];
      emit({ type: "logs-reset" });
      phase({ phase: "正在获取整合包", busy: true });
      try {
        const releases = await catalog.packVersions(input.project);
        const release = releases.find(v => v.id === input.version);
        const f =
          release?.files.find(
            f => f.primary && f.filename.endsWith(".mrpack")
          ) || release?.files.find(f => f.filename.endsWith(".mrpack"));
        if (!f || !/^[a-f0-9]{40}$/i.test(f.hashes?.sha1 || ""))
          throw Error("未找到可校验的整合包文件");
        const file = path.join(data, "downloads", f.hashes.sha1 + ".mrpack");
        let received = 0,
          last = 0;
        await download(f.url, file, {
          sha1: f.hashes.sha1,
          sha512: f.hashes.sha512,
          size: f.size,
          signal: controller.signal,
          onProgress: n => {
            received += n;
          },
          onTransfer: transfer => {
            if (Date.now() - last > 200 || transfer.verified) {
              last = Date.now();
              phase({
                phase: "下载整合包",
                busy: true,
                completed: transfer.bytes,
                total: transfer.total,
                unit: "bytes",
                received,
                activeFiles: [f.filename],
                detail: transfer.verified ? "校验通过" : transfer.source
              });
            }
          }
        });
        phase({ phase: "读取整合包配置", busy: true });
        const view = await packView(file);
        phase({ phase: "整合包下载完成", busy: false });
        return view;
      } catch (error) {
        log(error.stack || error.message);
        phase({
          phase: controller.signal.aborted ? "任务已取消" : "整合包下载失败",
          busy: false,
          failed: !controller.signal.aborted,
          cancelled: controller.signal.aborted,
          failure: error.message
        });
        throw error;
      } finally {
        controller.abort();
        task = null;
      }
    },
    async "community.status"() {
      try {
        const value = await remoteJSON(
          endpoint(settings.communityUrl) + "/health"
        );
        if (!value.ok) throw Error("地址不是社区服务");
        return { ok: true, version: value.version };
      } catch (error) {
        return {
          ok: false,
          error:
            "无法连接社区服务。请运行独立服务端，并确认地址和端口。" +
            error.message
        };
      }
    },
    async "background.choose"() {
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openFile"],
        filters: [
          { name: "背景图片", extensions: ["png", "jpg", "jpeg", "webp"] }
        ]
      });
      if (r.canceled) return null;
      const file = r.filePaths[0],
        stat = await fs.stat(file);
      if (stat.size > 8 * 1024 * 1024) throw Error("背景图片不能超过 8 MB");
      const ext = path.extname(file).slice(1).toLowerCase();
      return (
        "data:image/" +
        (ext === "jpg" ? "jpeg" : ext) +
        ";base64," +
        (await fs.readFile(file)).toString("base64")
      );
    },
    async state() {
      await presetCatalog.refresh();
      const presets=presetCatalog.list();
      const local = await scanInstances(settings.gameRoot);
      const instances = [
        ...presets.map(p => ({
          ...p,
          ...local.find(i => i.id === p.id),
          name: p.name
        })),
        ...local.filter(i => !presets.some(p => p.id === i.id))
      ];
      return {
        settings,
        accounts: accounts.map(accountView),
        instances,
        persistentCredentials: persistent,
        system: {
          memoryMB: Math.floor(os.totalmem() / 1048576),
          freeMemoryMB: Math.floor(os.freemem() / 1048576),
          platform: process.platform
        },
        running: !!running
      };
    },
    async "settings.save"(input) {
      if (
        Object.keys(input).some(
          k =>
            ![
              "autoCheckUpdates",
              "theme",
              "fontSize",
              "accentColor",
              "backgroundColor",
              "backgroundImage",
              "backgroundOpacity",
              "backgroundPositionX",
              "backgroundPositionY",
              "backgroundFit",
              "linkingDiscovered",
              "showLinking",
              "layout"
            ].includes(k)
        )
      )
        busy();
      if (input.fontSize != null) {
        if (
          !Number.isInteger(input.fontSize) ||
          input.fontSize < 13 ||
          input.fontSize > 22
        )
          throw Error("字号范围 13–22");
        settings.fontSize = input.fontSize;
      }
      for (const key of ["accentColor", "backgroundColor"])
        if (input[key] != null) {
          if (input[key] && !/^#[a-f0-9]{6}$/i.test(input[key]))
            throw Error("颜色格式无效");
          settings[key] = input[key];
        }
      if (input.backgroundImage != null) {
        if (input.backgroundImage.length > 12 * 1024 * 1024)
          throw Error("背景图片过大");
        if (
          input.backgroundImage &&
          !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(
            input.backgroundImage
          )
        )
          throw Error("背景图片无效");
        settings.backgroundImage = input.backgroundImage;
      }
      if (input.backgroundOpacity != null)
        settings.backgroundOpacity = Math.max(
          0,
          Math.min(1, Number(input.backgroundOpacity) || 0)
        );
      for (const key of ["backgroundPositionX", "backgroundPositionY"])
        if (input[key] != null)
          settings[key] = Math.max(0, Math.min(100, Number(input[key]) || 0));
      if (["cover", "contain", "100% 100%"].includes(input.backgroundFit))
        settings.backgroundFit = input.backgroundFit;
      if (["standard", "compact", "wide"].includes(input.layout))
        settings.layout = input.layout;
      if (input.downloadConcurrency != null)
        settings.downloadConcurrency = validateDownloadConcurrency(
          input.downloadConcurrency
        );
      if (input.downloadMode) {
        settings.downloadMode =
          input.downloadMode === "official" ? "official" : "domestic";
        setDownloadMode(settings.downloadMode);
      }
      if (input.hxzupPopup != null) {
        if (typeof input.hxzupPopup !== "boolean")
          throw Error("更新弹窗设置无效");
        settings.hxzupPopup = input.hxzupPopup;
      }
      if (input.simpleHome != null) settings.simpleHome = !!input.simpleHome;
      if (input.autoCheckUpdates != null)
        settings.autoCheckUpdates = !!input.autoCheckUpdates;
      if (input.memoryMode != null) {
        if (!["auto", "manual"].includes(input.memoryMode))
          throw Error("内存分配方式无效");
        settings.memoryMode = input.memoryMode;
      }
      if (input.defaultMemoryMB != null) {
        if (
          !Number.isInteger(input.defaultMemoryMB) ||
          input.defaultMemoryMB < 512 ||
          input.defaultMemoryMB > 131072
        )
          throw Error("默认内存范围为 512–131072 MB");
        settings.defaultMemoryMB = input.defaultMemoryMB;
      }
      if (input.voiceMode != null) {
        if (!["open", "push-to-talk"].includes(input.voiceMode))
          throw Error("语音麦克风模式无效");
        settings.voiceMode = input.voiceMode;
      }
      if (input.voiceKey != null) {
        if (
          typeof input.voiceKey !== "string" ||
          !/^[A-Za-z][A-Za-z0-9+_:-]{0,63}$/.test(input.voiceKey)
        )
          throw Error("语音按键无效");
        settings.voiceKey = input.voiceKey;
      }
      if (input.voiceSounds != null) settings.voiceSounds = !!input.voiceSounds;
      if (input.hiddenLinks != null) {
        if (
          !Array.isArray(input.hiddenLinks) ||
          input.hiddenLinks.length > 20 ||
          input.hiddenLinks.some(
            value => typeof value !== "string" || value.length > 80
          )
        )
          throw Error("隐藏栏目设置无效");
        settings.hiddenLinks = [...new Set(input.hiddenLinks)].filter(
          value =>
            value !== "/" && value !== "/settings" && value !== "/appearance"
        );
      }
      if (input.columns != null) {
        if (typeof input.columns !== "object" || Array.isArray(input.columns))
          throw Error("栏目设置无效");
        for (const name of ["sidebar", "workspace", "dock"]) {
          const value = input.columns[name];
          if (value == null) continue;
          if (
            typeof value.visible !== "boolean" ||
            typeof value.label !== "string" ||
            value.label.length > 80 ||
            (value.color && !/^#[a-f0-9]{6}$/i.test(value.color))
          )
            throw Error("栏目设置无效");
          settings.columns[name] = {
            visible: value.visible,
            color: value.color || "",
            opacity: Math.max(0, Math.min(1, Number(value.opacity) || 0)),
            label: value.label
          };
        }
        settings.columns.workspace.visible = true;
      }
      if (input.updateFeed != null)
        settings.updateFeed = input.updateFeed
          ? endpoint(input.updateFeed)
          : "";
      if (input.gameRoot != null) {
        if (
          typeof input.gameRoot !== "string" ||
          !path.isAbsolute(input.gameRoot)
        )
          throw Error("请通过文件夹选择器设置游戏目录");
        await noLinks(input.gameRoot);
        settings.gameRoot = input.gameRoot;
      }
      if (input.communityUrl != null) {
        settings.communityUrl = endpoint(input.communityUrl);
        community = null;
      }
      if (input.javaPath != null) {
        if (input.javaPath) await inspectJava(input.javaPath);
        settings.javaPath = input.javaPath;
      }
      for (const name of ["selectedInstance", "selectedAccount", "theme"])
        if (typeof input[name] === "string" && input[name].length < 300)
          settings[name] = input[name];
      for (const key of ["linkingDiscovered", "showLinking"]) if (typeof input[key] === "boolean") settings[key] = input[key];
      if (input.instance) {
        const { id, ...v } = input.instance;
        if (typeof id !== "string" || !id || /[\\/:]/.test(id))
          throw Error("无效实例");
        if (
          !Number.isInteger(v.memoryMB) ||
          v.memoryMB < 512 ||
          v.memoryMB > 131072 ||
          !Number.isInteger(v.width) ||
          v.width < 640 ||
          v.width > 7680 ||
          !Number.isInteger(v.height) ||
          v.height < 360 ||
          v.height > 4320
        )
          throw Error("内存或分辨率超出范围");
        if (!Array.isArray(v.updateUrls) || v.updateUrls.length > 16)
          throw Error("更新地址最多 16 个");
        v.updateUrls = v.updateUrls.map(normalizeUpdateUrl);
        settings.instanceSettings[id] = {
          ...settings.instanceSettings[id],
          autoJoin: !!v.autoJoin,
          serverAddress: serverAddress(v.serverAddress || ""),
          memoryMode: ["auto", "manual"].includes(v.memoryMode)
            ? v.memoryMode
            : "inherit",
          memoryMB: v.memoryMB,
          favorite: !!v.favorite,
          width: v.width,
          height: v.height,
          isolated: !!v.isolated,
          autoUpdate: !!v.autoUpdate,
          fullscreen: !!v.fullscreen,
          updateUrls: v.updateUrls,
          jvmArgs: v.jvmArgs || [],
          coverPositionX: Math.max(
            0,
            Math.min(
              100,
              Number.isFinite(v.coverPositionX) ? v.coverPositionX : 50
            )
          ),
          coverPositionY: Math.max(
            0,
            Math.min(
              100,
              Number.isFinite(v.coverPositionY) ? v.coverPositionY : 50
            )
          ),
          coverZoom: Math.max(
            1,
            Math.min(2, Number.isFinite(v.coverZoom) ? v.coverZoom : 1)
          )
        };
      }
      await writeJSON(configFile, settings);
      return settings;
    },
    async "instance.favorite"(input) {
      const { id, favorite } = input;
      if (typeof id !== "string" || !id || /[\\/:]/.test(id) || typeof favorite !== "boolean")
        throw Error("无效的实例收藏设置");
      settings.instanceSettings[id] = { ...settings.instanceSettings[id], favorite };
      await writeJSON(configFile, settings);
      return { favorite };
    },
    async "instance.cover-placement"(input) {
      if(typeof input.id!=="string"||!input.id||/[\\/:]/.test(input.id))throw Error("无效实例");
      if(![input.x,input.y,input.zoom].every(Number.isFinite))throw Error("头图位置无效");
      settings.instanceSettings[input.id]={...settings.instanceSettings[input.id],coverPositionX:Math.max(0,Math.min(100,input.x)),coverPositionY:Math.max(0,Math.min(100,input.y)),coverZoom:Math.max(1,Math.min(2,input.zoom))};
      await writeJSON(configFile,settings);return {ok:true};
    },
    async "directory.choose"() {
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openDirectory", "createDirectory"],
        title: "选择 .minecraft 游戏目录"
      });
      return r.canceled ? null : r.filePaths[0];
    },
    async "java.choose"() {
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openFile"],
        title: "选择 Java 可执行文件"
      });
      return r.canceled ? null : (await inspectJava(r.filePaths[0])).path;
    },
    async "java.scan"() {
      return findJava();
    },
    async "instance.create"(input) {
      busy();
      if (!settings.gameRoot) throw Error("请先选择游戏目录");
      if (
        !/^[\p{L}\p{N}_ -]{1,60}$/u.test(input.name) ||
        input.name.endsWith(" ")
      )
        throw Error("实例名称只能包含文字、数字、空格和短横线");
      const dir = inside(settings.gameRoot, "versions/" + input.name);
      await noLinks(dir);
      if (await exists(dir)) throw Error("此实例已存在");
      if (!input.updateUrl)
        throw Error("新建实例需要一个已配置游戏版本的 HXZ UP 地址");
      await fs.mkdir(path.join(dir, "updater"), { recursive: true });
      settings.instanceSettings[input.name] = {
        memoryMB: settings.defaultMemoryMB,
        favorite: false,
        width: 1280,
        height: 720,
        isolated: true,
        autoUpdate: true,
        updateUrls: [normalizeUpdateUrl(input.updateUrl)],
        coverPositionX: 50,
        coverPositionY: 50,
        coverZoom: 1
      };
      settings.selectedInstance = input.name;
      await writeJSON(configFile, settings);
      await launch(input.name, true);
      return { ok: true };
    },
    async "mods.search"(input) {
      const target = instanceTarget(
        await readVersion(settings.gameRoot, input.instance)
      );
      if (!target.loader)
        throw Error("原版实例不能直接加载 MOD，请先安装加载器");
      return catalog.searchMods(
        input.query,
        input.offset,
        target.minecraft,
        target.loader
      );
    },
    async "mods.download"(input) {
      busy();
      if (
        typeof input.project !== "string" ||
        !/^[\w-]{1,100}$/.test(input.project)
      )
        throw Error("无效模组项目");
      const target = instanceTarget(
        await readVersion(settings.gameRoot, input.instance)
      );
      const plan = await modPlan(target, input.project, input.version, {
        versions: catalog.modVersions,
        version: catalog.modVersion
      });
      const dir = await modDirectory(settings, input.instance),
        staging = path.join(data, "mod-downloads", randomUUID()),
        installed = [];
      const controller = new AbortController();
      task = controller;
      try {
        await noLinks(dir);
        await fs.mkdir(dir, { recursive: true });
        await fs.mkdir(staging, { recursive: true });
        for (let i = 0; i < plan.length; i++) {
          const f = plan[i];
          phase({
            phase: "下载 MOD · " + f.filename,
            busy: true,
            completed: i,
            total: plan.length
          });
          await download(f.url, path.join(staging, f.filename), {
            sha512: f.hashes.sha512,
            size: f.size,
            maxSize: 256 * 1024 * 1024,
            signal: controller.signal
          });
        }
        for (const f of plan) {
          controller.signal.throwIfAborted();
          const dest = modFile(dir, f.filename);
          await noLinks(dest);
          if (await exists(dest)) {
            if ((await hash(dest, "sha512")) === f.hashes.sha512) continue;
            throw Error("同名 MOD 已存在，请先在管理页移除：" + f.filename);
          }
          await fs.copyFile(
            path.join(staging, f.filename),
            dest,
            fs.constants.COPYFILE_EXCL
          );
          installed.push(dest);
        }
        phase({
          phase: "MOD 安装完成",
          busy: false,
          completed: plan.length,
          total: plan.length
        });
        return { ok: true, files: plan.map(f => f.filename) };
      } catch (error) {
        for (const file of installed) await fs.rm(file, { force: true });
        phase({
          phase: "MOD 安装未完成",
          busy: false,
          failure: error.message,
          failed: true
        });
        throw error;
      } finally {
        task = null;
        await fs.rm(staging, { recursive: true, force: true });
      }
    },
    async "mods.list"(input) {
      return listMods(await modDirectory(settings, input.id));
    },
    async "mods.open"(input) {
      const dir = await modDirectory(settings, input.id);
      await fs.mkdir(dir, { recursive: true });
      return shell.openPath(dir);
    },
    async "mods.toggle"(input) {
      busy();
      const dir = await modDirectory(settings, input.id),
        file = modFile(dir, input.file),
        target = file.endsWith(".disabled")
          ? file.slice(0, -9)
          : file + ".disabled";
      await noLinks(file);
      await noLinks(target);
      if (await exists(target)) throw Error("目标模组已存在");
      await fs.rename(file, target);
      return { ok: true };
    },
    async "mods.remove"(input) {
      busy();
      const dir = await modDirectory(settings, input.id),
        file = modFile(dir, input.file);
      await noLinks(file);
      await shell.trashItem(file);
      return { ok: true };
    },
    async "mods.add"(input) {
      busy();
      const dir = await modDirectory(settings, input.id);
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Minecraft MOD", extensions: ["jar"] }]
      });
      if (r.canceled) return;
      await fs.mkdir(dir, { recursive: true });
      for (const source of r.filePaths) {
        await noLinks(source);
        const target = modFile(dir, path.basename(source));
        await noLinks(target);
        await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
      }
      return { ok: true };
    },
    async "instance.cover"(input) {
      if (typeof input.id !== "string" || !input.id || input.id.length > 100)
        throw Error("无效实例");
      const file = path.join(
        data,
        "covers",
        createHash("sha256").update(input.id).digest("hex") + ".jpg"
      );
      if (input.choose) {
        if (!nativeImage) throw Error("图片处理不可用");
        const r = await dialog.showOpenDialog(window(), {
          properties: ["openFile"],
          filters: [
            { name: "头图", extensions: ["png", "jpg", "jpeg", "webp"] }
          ]
        });
        if (r.canceled) return null;
        const source = r.filePaths[0];
        await noLinks(source);
        if ((await fs.stat(source)).size > 16 * 1024 * 1024)
          throw Error("头图原图不能超过16MB");
        const image = await nativeImage.createThumbnailFromPath(source, {
          width: 1600,
          height: 900
        });
        if (image.isEmpty()) throw Error("无法读取图片");
        const buffer = image.toJPEG(80);
        if (buffer.length > 1024 * 1024) throw Error("头图过大，请换一张图片");
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, buffer);
      }
      if (input.reset) await fs.rm(file, { force: true });
      return (await exists(file))
        ? "data:image/jpeg;base64," +
            (await fs.readFile(file)).toString("base64")
        : "";
    },
    async "instance.open"(input) {
      const dir = inside(settings.gameRoot, "versions/" + input.id);
      await noLinks(dir);
      return shell.openPath(dir);
    },
    async "instance.folder"(input) {
      if (
        typeof input.id !== "string" ||
        !input.id ||
        /[\\/:]/.test(input.id) ||
        !["screenshots", "versions", "saves"].includes(input.kind)
      )
        throw Error("实例文件夹无效");
      if (!settings.gameRoot) throw Error("请先选择游戏目录");
      const versionDir = inside(settings.gameRoot, "versions/" + input.id),
        cfg = settings.instanceSettings[input.id] || {},
        dir =
          input.kind === "versions"
            ? versionDir
            : path.join(
                cfg.isolated === false ? settings.gameRoot : versionDir,
                input.kind
              );
      await noLinks(dir);
      await fs.mkdir(dir, { recursive: true });
      return shell.openPath(dir);
    },
    async "account.login"(input) {
      busy();
      if (
        typeof input.username !== "string" ||
        typeof input.password !== "string" ||
        input.password.length > 1024
      )
        throw Error("请输入皮肤站账号和密码");
      const clientToken = randomUUID();
      const response = await authCall("authenticate", {
        agent: { name: "Minecraft", version: 1 },
        username: input.username,
        password: input.password,
        clientToken,
        requestUser: true
      });
      const a = {
        id: randomUUID(),
        username: input.username,
        accessToken: response.accessToken,
        clientToken: response.clientToken || clientToken,
        profiles: response.availableProfiles || [],
        name: response.selectedProfile?.name || "",
        uuid: response.selectedProfile?.id || ""
      };
      if(skinPanel)try{await skinPanel.login(a.id,input.username,input.password);}catch{log("[皮肤站] 内嵌会话需要在账号管理中完成网站验证");}
      accounts.push(a);
      settings.selectedAccount = a.id;
      community = null;
      await saveAccounts();
      await writeJSON(configFile, settings);
      return accountView(a);
    },
    async "account.profile"(input) {
      busy();
      const a = accounts.find(a => a.id === input.id),
        profile = a?.profiles.find(p => p.id === input.uuid);
      if (!profile) throw Error("角色不存在");
      const response = await authCall("refresh", {
        accessToken: a.accessToken,
        clientToken: a.clientToken,
        selectedProfile: profile,
        requestUser: true
      });
      Object.assign(a, {
        accessToken: response.accessToken,
        clientToken: response.clientToken || a.clientToken,
        name: response.selectedProfile.name,
        uuid: response.selectedProfile.id
      });
      community = null;
      await saveAccounts();
      return accountView(a);
    },
    async "account.remove"(input) {
      busy();
      const a = accounts.find(a => a.id === input.id);
      if (a)
        try {
          await authCall("invalidate", {
            accessToken: a.accessToken,
            clientToken: a.clientToken
          });
        } catch {}
      await skinPanel?.remove(input.id);
      accounts = accounts.filter(a => a.id !== input.id);
      if (settings.selectedAccount === input.id)
        settings.selectedAccount = accounts[0]?.id || "";
      community = null;
      await saveAccounts();
      await writeJSON(configFile, settings);
      return { ok: true };
    },
    async "skin.bounds"(input){skinPanel?.bounds(settings.selectedAccount||"default",input);return {ok:true};},
    async "skin.hide"(){skinPanel?.hide();return {ok:true};},
    async "skin.open"() {
      return openSkin(settings.selectedAccount || "default");
    },
    async "community.connect"(input) {
      if (input.refresh) community = null;
      if (
        community &&
        community.user.uid === selected().uuid &&
        community.expiresAt > Date.now() + 60000
      ) {
        void syncAvatar(selected());
        return community;
      }
      const a = await ensureAccount();
      const base = endpoint(settings.communityUrl);
      const response = await remoteJSON(base + "/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: a.accessToken,
          clientToken: a.clientToken
        })
      });
      Object.assign(a, {
        accessToken: response.credentials.accessToken,
        clientToken: response.credentials.clientToken || a.clientToken
      });
      await saveAccounts();
      community = {
        token: response.token,
        user: response.user,
        base,
        expiresAt: Date.now() + 11 * 3600000
      };
      void syncAvatar(a);
      return community;
    },
    async "update-logs.list"() {
      return remoteJSON(endpoint(settings.communityUrl) + "/api/update-logs", {
        signal: AbortSignal.timeout(28000)
      });
    },
    async "avatar.choose"() {
      if (!nativeImage) throw Error("头像处理组件不可用");
      const r = await dialog.showOpenDialog(window(), {
        properties: ["openFile"],
        title: "选择头像",
        filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg"] }]
      });
      if (r.canceled) return null;
      const file = r.filePaths[0];
      await noLinks(file);
      if ((await fs.stat(file)).size > 8 * 1024 * 1024)
        throw Error("头像原图请小于 8 MB");
      let image = await nativeImage.createThumbnailFromPath(file, {
        width: 128,
        height: 128
      });
      if (image.isEmpty()) throw Error("无法读取头像图片");
      const { width, height } = image.getSize(),
        side = Math.min(width, height);
      image = image
        .crop({
          x: Math.floor((width - side) / 2),
          y: Math.floor((height - side) / 2),
          width: side,
          height: side
        })
        .resize({ width: 96, height: 96 });
      let png = image.toPNG();
      if (png.length > 17000)
        png = image.resize({ width: 64, height: 64 }).toPNG();
      if (png.length > 18000) throw Error("头像处理失败，请换一张图片");
      return "data:image/png;base64," + png.toString("base64");
    },
    async "avatar.save"(input) {
      const a = selected();
      if (input.id !== a.id) throw Error("当前角色已切换，请重新选择头像");
      if (
        typeof input.avatar !== "string" ||
        input.avatar.length > 24576 ||
        (input.avatar &&
          !/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(input.avatar))
      )
        throw Error("头像格式无效");
      a.avatars ||= {};
      a.avatars[a.uuid] = input.avatar;
      await saveAccounts();
      return { synced: await syncAvatar(a) };
    },
    async "blueprints.download"(input) {
      if (typeof input.id !== "string" || !/^[\w-]{1,64}$/.test(input.id))
        throw Error("蓝图标识无效");
      const base = endpoint(settings.communityUrl),
        headers =
          community?.base === base
            ? { Authorization: "Bearer " + community.token }
            : {};
      const item = await remoteJSON(base + "/api/blueprints/" + input.id, {
        headers
      });
      if (
        !Number.isInteger(item.size) ||
        item.size <= 0 ||
        item.size > 8 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/.test(item.sha256)
      )
        throw Error("蓝图文件信息无效");
      const result = await dialog.showSaveDialog(window(), {
        defaultPath: String(item.filename || "blueprint.nbt").replace(
          /[\\/:*?"<>|]/g,
          "_"
        ),
        filters: [{ name: "机械动力蓝图", extensions: ["nbt"] }]
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      await download(
        base + "/api/blueprints/" + input.id + "/file",
        result.filePath,
        {
          headers,
          size: item.size,
          sha256: item.sha256,
          maxSize: 8 * 1024 * 1024
        }
      );
      return { ok: true };
    },
    async "notices.list"() {
      return remoteJSON(endpoint(settings.communityUrl) + "/api/notices");
    },
    async "notices.publish"(input) {
      if (!community) throw Error("请先连接社区");
      return remoteJSON(community.base + "/api/notices", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + community.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async "notices.delete"(input) {
      if (!community) throw Error("请先连接社区");
      return remoteJSON(
        community.base + "/api/notices/" + encodeURIComponent(input.id),
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + community.token }
        }
      );
    },
    async "game.launch"(input) {
      return launch(input.id, false, !!input.joinServer);
    },
    async "game.update"(input) {
      return launch(input.id, true);
    },
    async "task.cancel"() {
      task?.abort();
      return { ok: true };
    },
    async "game.stop"() {
      stoppedByUser=true;running?.kill();
      return { ok: true };
    },
    async "diagnostics.current"(){return lastCrash;},
    async "diagnostics.folder"(){if(!lastCrash)throw Error("暂无异常报告");return shell.openPath(lastCrash.cwd);},
    async "diagnostics.export"(){if(!lastCrash)throw Error("暂无异常报告");const r=await dialog.showSaveDialog(window(),{defaultPath:"幻想镇-游戏诊断.txt"});if(!r.canceled)await fs.writeFile(r.filePath,diagnosticText(lastCrash),"utf8");return {ok:true};},
    async "logs.export"() {
      const r = await dialog.showSaveDialog(window(), {
        defaultPath: "幻想镇启动日志.txt"
      });
      if (!r.canceled) await fs.writeFile(r.filePath, logs.join("\n"), "utf8");
      return { ok: true };
    },
    async "window.control"(input) {
      const w = window();
      if (input.action === "close") w.close();
      else if (input.action === "minimize") w.minimize();
      else if (input.action === "maximize") {
        if (w.isMaximized()) w.unmaximize();
        else w.maximize();
      }
      return { ok: true };
    }
  };
  let exclusive = false;
  return {
    async invoke(action, input = {}) {
      if (!Object.hasOwn(actions, action)) throw Error("不支持的操作");
      if (input == null || typeof input !== "object" || Array.isArray(input))
        throw Error("请求格式错误");
      const owns = [
        "mods.add",
        "mods.toggle",
        "mods.remove",
        "mods.download",
        "install.resume",
        "install.discard",
        "game.install",
        "pack.install",
        "pack.download",
        "game.launch",
        "game.update",
        "instance.create"
      ].includes(action);
      if (
        exclusive &&
        (owns ||
          (action === "settings.save" &&
            Object.keys(input).some(k => k !== "autoCheckUpdates")))
      )
        throw Error("请等待当前游戏任务完成");
      if (owns) exclusive = true;
      try {
        return await actions[action](input);
      } finally {
        if (owns) exclusive = false;
      }
    },
    dispose() {
      presetCatalog.dispose();
      task?.abort();
      clearTimeout(logTimer);
      pendingLogs = [];
    },
    isBusy() {
      return exclusive || !!task || !!running;
    }
  };
}
