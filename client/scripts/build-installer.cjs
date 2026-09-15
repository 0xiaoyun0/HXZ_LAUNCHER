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
      ...["GameInstaller", "ForgeInstaller", "LauncherInstall"].map(n =>
        path.join(root, "installer-java/up/hxz", n + ".java")
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
