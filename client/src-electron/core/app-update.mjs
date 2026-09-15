import updaterPackage from "electron-updater";
import { remoteJSON } from "./io.mjs";
export const REPOSITORY = {
  provider: "github",
  owner: "0xiaoyun0",
  repo: "HXZ_LAUNCHER"
};
export async function launcherReleases() {
  const items = await remoteJSON(
    "https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases?per_page=20",
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!Array.isArray(items)) throw Error("GitHub 更新日志格式错误");
  return items
    .filter(
      x => !x.draft && !x.prerelease && /^v?\d+\.\d+\.\d+$/.test(x.tag_name)
    )
    .map(x => ({
      version: x.tag_name.replace(/^v/, ""),
      title: String(x.name || x.tag_name),
      body: String(x.body || "暂无更新说明").slice(0, 30000),
      date: x.published_at,
      url: x.html_url
    }));
}
export function createAppUpdate({
  app,
  isBusy,
  emit,
  updater = updaterPackage.autoUpdater
}) {
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.setFeedURL(REPOSITORY);
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
    "download-progress": p =>
      update({ phase: "正在下载启动器更新", percent: Math.round(p.percent) }),
    "update-downloaded": () => {
      ready = true;
      installAt = 0;
      update({ phase: "更新已就绪", ready: true, percent: 100 });
    },
    error: () => update({ phase: "暂时无法获取更新，稍后会自动重试" })
  };
  for (const [name, fn] of Object.entries(handlers)) updater.on(name, fn);
  async function download() {
    if (!available) throw Error("请先检查新版本");
    if (working) throw Error("更新任务正在进行");
    working = true;
    try {
      await updater.downloadUpdate();
      return state;
    } finally {
      working = false;
    }
  }
  async function check() {
    if (!app.isPackaged) throw Error("请在已安装的桌面版本中检查启动器更新");
    if (working || ready) return state;
    working = true;
    try {
      update({ phase: "正在检查 GitHub 更新" });
      await updater.checkForUpdates();
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
      clearInterval(idleTimer);
      clearInterval(checkTimer);
      for (const [name, fn] of Object.entries(handlers))
        updater.removeListener(name, fn);
    }
  };
}
