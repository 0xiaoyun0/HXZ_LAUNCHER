import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { once } from "node:events";
import { createHash } from "node:crypto";
import {
  inside,
  writeJSON,
  download,
  parallel,
  remoteJSON
} from "../src-electron/core/io.mjs";
import {
  maven,
  allowed,
  readVersion,
  prepareLaunch,
  scanInstances
} from "../src-electron/core/minecraft.mjs";

await test("paths, inherited metadata and prepared Java arguments preserve boundaries", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hxz-launch-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const invalid of [
    "../outside",
    "versions/../../outside",
    "C:/outside",
    "a\\b"
  ])
    assert.throws(() => inside(root, invalid));
  assert.equal(
    maven("org.example:demo:1.0:windows"),
    "org/example/demo/1.0/demo-1.0-windows.jar"
  );
  assert.equal(
    allowed([{ action: "allow", features: { has_custom_resolution: true } }]),
    false
  );
  await writeJSON(path.join(root, "versions/base/base.json"), {
    id: "base",
    mainClass: "net.minecraft.client.main.Main",
    javaVersion: { majorVersion: 8 },
    arguments: {
      jvm: ["-cp", "${classpath}"],
      game: [
        "--username",
        "${auth_player_name}",
        "--accessToken",
        "${auth_access_token}"
      ]
    },
    libraries: []
  });
  await writeJSON(path.join(root, "versions/child/child.json"), {
    id: "child",
    inheritsFrom: "base",
    arguments: { game: ["--version", "${version_name}"] }
  });
  await fs.writeFile(path.join(root, "versions/child/child.jar"), "fixture");
  const metadata = await readVersion(root, "child");
  assert.equal(metadata.mainClass, "net.minecraft.client.main.Main");
  const command = await prepareLaunch({
    root,
    id: "child",
    java: process.env.TEST_JAVA || "java",
    settings: { memoryMB: 1024, width: 1280, height: 720 },
    account: {
      name: "Player Name",
      uuid: "abc",
      accessToken: "token-with spaces"
    }
  });
  assert.equal(command.cwd, path.join(root, "versions/child"));
  assert.equal(
    command.args[command.args.indexOf("--username") + 1],
    "Player Name"
  );
  assert.equal(
    command.args[command.args.indexOf("--accessToken") + 1],
    "token-with spaces"
  );
  assert.ok(command.args.includes("-Xmx1024M"));
  assert.equal((await scanInstances(root)).length, 2);
  await writeJSON(path.join(root, "versions/base/base.json"), {
    id: "base",
    inheritsFrom: "child"
  });
  await assert.rejects(readVersion(root, "child"), /循环/);
});
await test("streaming downloads reject corrupt payloads, retain originals and stop bounded workers", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hxz-download-"));
  const server = http.createServer((req, res) => {
    if (req.url === "/large") {
      res.end("x".repeat(4 * 1024 * 1024 + 1));
      return;
    }
    res.end("new-file");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise(r => server.close(r));
    await fs.rm(root, { recursive: true, force: true });
  });
  const base = "http://127.0.0.1:" + server.address().port,
    file = path.join(root, "data.jar");
  await fs.writeFile(file, "original");
  await assert.rejects(download(base, file, { sha1: "0".repeat(40) }), /校验/);
  assert.equal(await fs.readFile(file, "utf8"), "original");
  await download(base, file, {
    sha1: createHash("sha1").update("new-file").digest("hex"),
    size: 8
  });
  assert.equal(await fs.readFile(file, "utf8"), "new-file");
  assert.equal((await fs.readdir(root)).length, 1);
  await assert.rejects(remoteJSON(base + "/large"), /过大/);
  let started = 0,
    finished = 0;
  await assert.rejects(
    parallel(
      [1, 2, 3, 4, 5],
      async value => {
        started++;
        if (value === 1) throw Error("worker failure");
        await new Promise(r => setTimeout(r, 15));
        finished++;
      },
      2
    ),
    /worker failure/
  );
  assert.ok(started <= 2);
  assert.equal(finished, started - 1);
});
