import updaterPackage from "electron-updater";
import { endpoint } from "./io.mjs";
export function createAppUpdate({ app, isBusy, emit }) {
  const updater = updaterPackage.autoUpdater;
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  let feed = "",
    working = false,
    available = false,
    ready = false;
  let state = {
    phase: "尚未检查",
    version: app.getVersion(),
    available: false,
    ready: false,
    percent: 0
  };
  function update(value) {
    state = { ...state, ...value };
    emit({ type: "app-update", ...state });
  }
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
      update({ phase: "更新已就绪", ready: true, percent: 100 });
    },
    error: () => update({ phase: "更新失败，请检查更新地址或网络" })
  };
  for (const [name, handler] of Object.entries(handlers))
    updater.on(name, handler);
  return {
    status: () => state,
    async check(raw) {
      if (!app.isPackaged) throw Error("请在已安装的桌面版本中检查启动器更新");
      if (working) throw Error("更新任务正在进行");
      const next = endpoint(raw);
      if (!next.startsWith("https://"))
        throw Error("启动器更新地址必须使用 HTTPS");
      working = true;
      try {
        if (feed !== next) {
          ready = false;
          available = false;
          feed = next;
          updater.setFeedURL({ provider: "generic", url: feed });
          update({ available: false, ready: false, percent: 0 });
        }
        update({ phase: "正在检查启动器更新" });
        await updater.checkForUpdates();
        return state;
      } finally {
        working = false;
      }
    },
    async download() {
      if (!available) throw Error("请先检查新版本");
      if (working) throw Error("更新任务正在进行");
      working = true;
      try {
        await updater.downloadUpdate();
        return state;
      } finally {
        working = false;
      }
    },
    install() {
      if (!ready) throw Error("请先下载更新");
      if (isBusy()) throw Error("请先结束游戏和当前安装任务");
      updater.quitAndInstall(false, true);
      return { ok: true };
    },
    dispose() {
      for (const [name, handler] of Object.entries(handlers))
        updater.removeListener(name, handler);
    }
  };
}
