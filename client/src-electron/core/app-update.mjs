import updaterPackage from "electron-updater";
import { remoteJSON } from "./io.mjs";
import { discoverRelease, RELEASE_ROOT, compareVersions } from "./update-sources.mjs";
import { SignedReleaseProvider } from "./update-provider.mjs";
export const REPOSITORY = {
  provider: "github",
  owner: "0xiaoyun0",
  repo: "HXZ_LAUNCHER"
};
export async function launcherReleases() {
  let items;
  try {
    items = [];
    // Bound memory and latency while retaining paginated release history.
    for (let page = 1; page <= 10; page++) {
      let batch;
      try {
        batch = await remoteJSON(
          "https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases?per_page=100&page=" +
            page,
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(6000)
          }
        );
        if (!Array.isArray(batch)) throw Error("GitHub 更新日志格式错误");
      } catch (error) {
        if (items.length) break;
        throw error;
      }
      items.push(...batch);
      if (batch.length < 100) break;
    }
  } catch {
    const { info } = await discoverRelease();
    return [
      {
        version: info.version,
        title: info.releaseName,
        body: info.releaseNotes,
        date: info.releaseDate,
        url: RELEASE_ROOT + "/tag/v" + info.version
      }
    ];
  }
  return items
    .filter(
      x => !x.draft && !x.prerelease && /^v?\d+\.\d+\.\d+$/.test(x.tag_name)
    )
    .map(x => ({
      version: x.tag_name.replace(/^v/, ""),
      title: String(x.name || x.tag_name),
      body: String(x.body || "暂无更新说明"),
      date: x.published_at,
      url: x.html_url
    }));
}
export function createAppUpdate({
  app,
  isBusy,
  emit,
  updater = updaterPackage.autoUpdater,
  discover = discoverRelease,
  stallTimeout = 45000
}) {
  // Avoid writing to a closed parent console pipe (EPIPE) in packaged apps.
  updater.logger = Object.fromEntries(['info','warn','error','debug'].map(level=>[level,(...values)=>emit({type:'logs',lines:['[启动器更新] '+values.map(String).join(' ').slice(0,2000)]})]));
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.disableWebInstaller = true;
  let release, cancellationToken, downloadTimer;
  updater.disableDifferentialDownload = true;
  function armDownloadTimeout() {
    clearTimeout(downloadTimer);
    downloadTimer = setTimeout(() => cancellationToken?.cancel(), stallTimeout);
    downloadTimer.unref?.();
  }
  async function selectSource(source) {
    updater.setFeedURL({
      provider: "custom",
      updateProvider: SignedReleaseProvider,
      info: release.info,
      source
    });
    const result = await updater.checkForUpdates();
    cancellationToken = result?.cancellationToken;
  }
  let working = false,
    enabled = false,
    disposed = false,
    available = false,
    ready = false,
    installAt = 0;
  let state = {
    phase: "尚未检查",
    version: app.getVersion(),
    available: false,
    ready: false,
    percent: 0
  };
  const update = value => {
    state = { ...state, ...value };
    emit({ type: "app-update", ...state });
  };
  const handlers = {
    "update-available": info => {
      available = true;
      update({ phase: "发现新版本", version: info.version, available: true });
    },
    "update-not-available": () => {
      available = false;
      update({ phase: "已是最新版本", available: false });
    },
    "download-progress": p => {
      armDownloadTimeout();
      update({
        phase: "正在下载启动器更新 · " + state.source,
        percent: Math.round(p.percent), received:p.transferred, total:p.total
      });
    },
    "update-downloaded": () => {
      ready = true;
      installAt = 0;
      update({ phase: "更新已就绪", ready: true, percent: 100 });
    },
    error: error => update({ phase: "更新源连接失败，正在重试", error: String(error?.message||error).slice(0,400) })
  };
  for (const [name, fn] of Object.entries(handlers)) updater.on(name, fn);
  async function download() {
    if (!available) throw Error("请先检查新版本");
    if (working) throw Error("更新任务正在进行");
    working = true;
    try {
      for (let attempt=0;attempt<release.sources.length*2;attempt++) {
        const source=release.sources[attempt%release.sources.length];
        if(attempt===release.sources.length)await new Promise(resolve=>setTimeout(resolve,1500));
        if (disposed) throw Error("更新检查已关闭");
        try {
          update({
            phase: "正在连接更新源 · " + source.name,
            source: source.name,
            percent: 0
          });
          await selectSource(source);
          armDownloadTimeout();
          await updater.downloadUpdate(cancellationToken);
          return state;
        } catch {
          if (disposed) throw Error("更新检查已关闭");
          update({
            phase: source.name + " 暂不可用，正在切换更新源",
            percent: 0
          });
        } finally {
          clearTimeout(downloadTimer);
        }
      }
      throw Error("所有更新源下载失败，稍后可重新尝试");
    } catch (error) {
      update({ phase: error.message });
      throw error;
    } finally {
      working = false;
    }
  }
  async function check() {
    if (!app.isPackaged) throw Error("请在已安装的桌面版本中检查启动器更新");
    if (working || ready) return state;
    working = true;
    try {
      update({ phase: "正在检查 GitHub 与备用更新源" });
      const found = await discover();
      if(!release || compareVersions(found.info.version,release.info.version)>=0)release=found;
      if (disposed) return state;
      update({ source: release.sources[0].name });
      await selectSource(release.sources[0]);
    } catch (error) {
      update({ phase: error.message });
      throw error;
    } finally {
      working = false;
    }
    if (enabled && available && !ready) await download();
    return state;
  }
  function install() {
    if (!ready) throw Error("更新尚未下载完成");
    if (isBusy()) throw Error("游戏或安装任务结束后自动更新");
    updater.quitAndInstall(true, true);
    return { ok: true };
  }
  function idle() {
    if (disposed || !enabled || !ready || working) return;
    if (isBusy()) {
      installAt = 0;
      update({ phase: "更新已就绪，等待当前任务结束" });
      return;
    }
    if (!installAt) installAt = Date.now() + 15000;
    update({
      phase:
        "将在 " +
        Math.max(0, Math.ceil((installAt - Date.now()) / 1000)) +
        " 秒后自动重启更新，可在设置关闭"
    });
    if (Date.now() >= installAt) {
      enabled = false;
      install();
    }
  }
  const idleTimer = setInterval(idle, 1000);
  idleTimer.unref?.();
  const checkTimer = setInterval(() => {
    if (enabled) void check().catch(() => {});
  }, 30 * 60000);
  checkTimer.unref?.();
  return {
    status: () => state,
    check,
    download,
    install,
    configure(value) {
      const previous = enabled;
      enabled = value !== false;
      installAt = 0;
      if (!enabled && ready) update({ phase: "更新已就绪，自动安装已关闭" });
      if (enabled && !previous && app.isPackaged) void check().catch(() => {});
    },
    dispose() {
      disposed = true;
      clearTimeout(downloadTimer);
      cancellationToken?.cancel();
      clearInterval(idleTimer);
      clearInterval(checkTimer);
      for (const [name, fn] of Object.entries(handlers))
        updater.removeListener(name, fn);
    }
  };
}
