import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  nativeImage,
  dialog,
  shell,
  session
} from "electron";
import path from "node:path";
import { mkdirSync } from "node:fs";
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from "#q-app/electron/main";
import { createAppUpdate } from "./core/app-update.mjs";
import { createServices } from "./core/services.mjs";

let appUpdate: ReturnType<typeof createAppUpdate>;
let main: BrowserWindow | null = null;
let services: Awaited<ReturnType<typeof createServices>>;
const skinWindows = new Map<string, BrowserWindow>();
const skinOrigin = "https://skin.hxzmc.top";
if (process.env.HXZ_LA_HOME) {
  const profile = path.resolve(process.env.HXZ_LA_HOME);
  mkdirSync(profile, { recursive: true });
  app.setPath("userData", profile);
}
function openSkin(account: string) {
  const previous = skinWindows.get(account);
  if (previous && !previous.isDestroyed()) {
    previous.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 1060,
    height: 780,
    autoHideMenuBar: true,
    title: "幻想镇皮肤站",
    webPreferences: {
      partition: "persist:skin-" + account.replace(/[^a-zA-Z0-9-]/g, ""),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  skinWindows.set(account, win);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== skinOrigin) event.preventDefault();
  });
  win.on("closed", () => skinWindows.delete(account));
  void win.loadURL(skinOrigin + "/user");
}
async function createWindow() {
  main = new BrowserWindow({
    icon: resolveElectronAssetsPath("icons/icon.png"),
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    backgroundColor: "#101b19",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "electron-preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  const win = main;
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", event => event.preventDefault());
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    main = null;
    services?.dispose();
    appUpdate?.dispose();
    for (const child of skinWindows.values()) child.close();
  });
  services = await createServices({
    data: app.getPath("userData"),
    resources: app.isPackaged
      ? process.resourcesPath
      : path.resolve("resources"),
    safeStorage,
    nativeImage,
    dialog,
    shell,
    window: () => win,
    openSkin,
    emit: value => {
      if (!win.isDestroyed()) win.webContents.send("hxz:event", value);
    }
  });
  appUpdate = createAppUpdate({
    app,
    isBusy: () => services.isBusy(),
    emit: (value: unknown) => {
      if (!win.isDestroyed()) win.webContents.send("hxz:event", value);
    }
  });
  if (import.meta.env.QUASAR_DEV)
    await win.loadURL(import.meta.env.QUASAR_APP_URL);
  else await win.loadFile("index.html");
  if (app.isPackaged) {
    const current = (await services.invoke("state")) as {
      settings: { updateFeed: string; autoCheckUpdates: boolean };
    };
    if (current.settings.updateFeed && current.settings.autoCheckUpdates) {
      void appUpdate.check(current.settings.updateFeed).catch(() => {});
    }
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (main?.isMinimized()) main.restore();
    main?.focus();
  });
  void app.whenReady().then(async () => {
    registerQuasarRuntime();
    const trusted = (url: string) => {
      if (!main) return false;
      try {
        const a = new URL(url),
          b = new URL(main.webContents.getURL());
        return a.origin === b.origin && a.pathname === b.pathname;
      } catch {
        return false;
      }
    };
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback, details) =>
        // Electron permission handlers require this callback, even after app readiness.
        // oxlint-disable-next-line promise/no-callback-in-promise
        callback(
          contents === main?.webContents &&
            trusted(details.requestingUrl) &&
            permission === "media" &&
            "mediaTypes" in details &&
            !!details.mediaTypes?.length &&
            details.mediaTypes.every(type => type === "audio")
        )
    );
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission, origin, details) =>
        contents === main?.webContents &&
        permission === "media" &&
        details.mediaType === "audio" &&
        (origin === "file://" ||
          origin === new URL(main!.webContents.getURL()).origin)
    );
    ipcMain.handle(
      "hxz:invoke",
      async (event, action: unknown, input: unknown = {}) => {
        try {
          if (
            !main ||
            event.sender !== main.webContents ||
            event.senderFrame !== main.webContents.mainFrame ||
            !trusted(event.senderFrame.url)
          )
            throw Error("无效窗口请求");
          if (
            typeof action !== "string" ||
            JSON.stringify(input).length >
              (action === "settings.save" ? 12 * 1024 * 1024 : 65536)
          )
            throw Error("请求格式错误");
          let value;
          if (action === "app-update.status") value = appUpdate.status();
          else if (action === "app-update.check") {
            const current = (await services.invoke("state")) as {
              settings: { updateFeed: string };
            };
            value = await appUpdate.check(current.settings.updateFeed);
          } else if (action === "app-update.download")
            value = await appUpdate.download();
          else if (action === "app-update.install") value = appUpdate.install();
          else value = await services.invoke(action, input);
          return { ok: true, value };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : "操作未完成"
          };
        }
      }
    );
    await createWindow();
    app.on("activate", () => {
      if (!main) void createWindow();
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
