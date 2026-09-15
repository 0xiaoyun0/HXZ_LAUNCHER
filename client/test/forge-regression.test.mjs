import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { prepareLaunch } from "../src-electron/core/minecraft.mjs";
await test("Forge flattened library list must not repeat gson in classpath", async () => {
  const root = path.resolve("../.test/duplicate-libraries");
  await fs.mkdir(root + "/versions/fixture", { recursive: true });
  await fs.mkdir(root + "/libraries/com/google/code/gson/gson/2.10.1", {
    recursive: true
  });
  await fs.writeFile(
    root + "/libraries/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
    "fixture"
  );
  await fs.writeFile(root + "/versions/fixture/fixture.jar", "fixture");
  const lib = {
    name: "com.google.code.gson:gson:2.10.1",
    downloads: {
      artifact: {
        path: "com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
        url: ""
      }
    }
  };
  await fs.writeFile(
    root + "/versions/fixture/fixture.json",
    JSON.stringify({
      id: "fixture",
      mainClass: "cpw.mods.bootstraplauncher.BootstrapLauncher",
      libraries: [lib, lib],
      arguments: { jvm: ["-cp", "${classpath}"], game: [] }
    })
  );
  const c = await prepareLaunch({
    root,
    id: "fixture",
    java: "java",
    settings: { memoryMB: 1024 },
    account: { name: "Fixture", uuid: "test", accessToken: "test" }
  });
  const cp = c.args[c.args.indexOf("-cp") + 1].split(path.delimiter);
  assert.equal(
    cp.length,
    new Set(cp).size,
    "Duplicate key: gson jar appears twice in the actual Forge classpath"
  );
});
