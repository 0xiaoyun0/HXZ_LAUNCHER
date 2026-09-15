import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { createServices } from "../src-electron/core/services.mjs";

await test("bundled HXZ UP runs headless and honors server maintenance", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hxz-integration-"));
  const events = [],
    requests = [];
  let held = false,
    release,
    arrived;
  const requestArrived = new Promise(resolve => {
    arrived = resolve;
  });
  const server = http.createServer(async (req, res) => {
    if (held) {
      arrived();
      await new Promise(resolve => {
        release = resolve;
      });
    }
    requests.push(req.url);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ version: "maintenance-test", maintenance: true }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const services = await createServices({
    data: path.join(dir, "profile"),
    resources: path.resolve("resources"),
    safeStorage: { isEncryptionAvailable: () => false },
    dialog: {},
    shell: {},
    window: () => null,
    emit: event => events.push(event),
    openSkin: () => {}
  });
  t.after(async () => {
    services.dispose();
    await new Promise(r => server.close(r));
    await fs.rm(dir, { recursive: true, force: true });
  });
  assert.equal((await services.invoke("state")).settings.hxzupPopup, true);
  await services.invoke("settings.save", {
    hxzupPopup: false,
    gameRoot: path.join(dir, "game"),
    javaPath: process.env.TEST_JAVA || "java"
  });
  await services.invoke("instance.create", {
    name: "fixture",
    updateUrl: "http://127.0.0.1:" + server.address().port
  });
  assert.ok(requests.includes("/version.json"));
  assert.ok(
    events.some(
      event =>
        event.type === "logs" && event.lines.some(line => /维护/.test(line))
    )
  );
  const state = await services.invoke("state");
  assert.equal(state.running, false);
  assert.equal(state.settings.instanceSettings.fixture.autoUpdate, true);
  assert.equal(
    (
      await fs.stat(
        path.join(dir, "game/versions/fixture/updater/updater-1.0.3.jar")
      )
    ).isFile(),
    true
  );
  const configPath = path.join(
    dir,
    "game/versions/fixture/updater/config.json"
  );
  assert.equal(
    JSON.parse(await fs.readFile(configPath, "utf8")).showChangelog,
    false
  );
  if (process.platform === "win32") {
    await services.invoke("settings.save", { hxzupPopup: true });
    held = true;
    const updating = services.invoke("game.update", { id: "fixture" });
    try {
      await requestArrived;
      const script =
        "$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine.Contains('" +
        dir.replaceAll("'", "''") +
        "') }; $p | ForEach-Object { (Get-Process -Id $_.ProcessId).MainWindowTitle }";
      const result = await promisify(execFile)(
        "powershell.exe",
        [
          "-NoProfile",
          "-EncodedCommand",
          Buffer.from(script, "utf16le").toString("base64")
        ],
        { windowsHide: true }
      );
      assert.match(
        result.stdout,
        /HXZ UP/,
        "native updater window must be visible"
      );
    } finally {
      release?.();
      await updating;
    }
    assert.equal(
      JSON.parse(await fs.readFile(configPath, "utf8")).showChangelog,
      true
    );
  }
});
