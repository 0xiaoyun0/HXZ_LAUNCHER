// Run after `quasar build -m electron --skip-pkg`.
// Invoke electron-builder directly: avoids the CLI's incompatible module interop.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const runtimeRequire = createRequire(
  path.join(root, "src-electron/package.json")
);
const { build, Platform, Arch } = runtimeRequire("electron-builder");
const electron = path.dirname(runtimeRequire("electron"));
const electronVersion = runtimeRequire("electron/package.json").version;
const app = path.join(root, "dist/electron/UnPackaged");
if (!fs.existsSync(path.join(app, "electron-main.js")))
  throw Error("Compile the Electron app first");
build({
  projectDir: root,
  targets: Platform.WINDOWS.createTarget(["nsis", "dir"], Arch.x64),
  publish: "never",
  config: {
    appId: "top.hxzmc.launcher",
    productName: "幻想镇启动器",
    directories: { app, output: path.join(root, "dist/electron/Packaged") },
    electronDist: electron,
    electronVersion,
    npmRebuild: false,
    artifactName: "HXZ-Launcher-${version}-${arch}.${ext}",
    files: ["**/*", "!**/*.map"],
    extraResources: ["app-update.yml", "hxzup", "installer"].map(name => ({
      from: path.join(root, "resources", name),
      to: name
    })),
    win: { icon: path.join(app, "electron-assets/icons/icon.ico") },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      perMachine: false,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      runAfterFinish: true
    }
  }
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
