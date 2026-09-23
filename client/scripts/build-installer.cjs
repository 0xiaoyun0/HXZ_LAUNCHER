const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const javaHome = process.env.JAVA_HOME || "C:/Program Files/Java/jdk-21";
const tool = name =>
  fs.existsSync(path.join(javaHome, "bin", name + ".exe"))
    ? path.join(javaHome, "bin", name + ".exe")
    : name;
const out = path.join(root, ".installer-build"),
  resources = path.join(root, "resources/installer");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(resources, { recursive: true });
for (const [command, args] of [
  [
    tool("javac"),
    [
      "-encoding",
      "UTF-8",
      "--release",
      "8",
      "-cp",
      path.join(root, "resources/hxzup/updater-1.0.3.jar"),
      "-d",
      out,
      ...["Network", "GameInstaller", "ForgeInstaller", "LauncherInstall", "Updater"].map(
        n => path.join(root, "installer-java/up/hxz", n + ".java")
      )
    ]
  ],
  [
    tool("jar"),
    ["cf", path.join(resources, "game-installer.jar"), "-C", out, "."]
  ]
]) {
  const r = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (r.error) throw r.error;
  if (r.status) process.exit(r.status);
}

// The embedded 1.0.3 protocol runtime shares the launcher's bounded downloader.
const embedded=path.join(root,'resources/hxzup/updater-launcher.jar');
fs.copyFileSync(path.join(root,'resources/hxzup/updater-1.0.3.jar'),embedded);
const patched=fs.readdirSync(path.join(out,'up/hxz')).filter(n=>/^(Updater|Network|GameInstaller|ForgeInstaller)(\$[^/]*)?\.class$/.test(n));
const patchedResult=spawnSync(tool('jar'),['uf',embedded,...patched.flatMap(n=>['-C',out,'up/hxz/'+n])],{stdio:'inherit',shell:false});
if(patchedResult.error)throw patchedResult.error;
if(patchedResult.status)process.exit(patchedResult.status);
