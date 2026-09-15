// Electron 44 downloads its binary lazily; make a fresh build reproducible.
const fs = require("node:fs");
const executable = require("../src-electron/node_modules/electron");
if (!fs.existsSync(executable))
  throw new Error("Electron runtime is not installed");
