import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createAppUpdate } from "../src-electron/core/app-update.mjs";
void test("GitHub update auto-downloads and silently installs only when idle and still enabled", async t => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  const updater = new EventEmitter();
  let installs = 0,
    downloads = 0,
    busy = true;
  updater.setFeedURL = feed => assert.equal(feed.repo, "HXZ_LAUNCHER");
  updater.checkForUpdates = async () =>
    updater.emit("update-available", { version: "0.3.1" });
  updater.downloadUpdate = async () => {
    downloads++;
    updater.emit("update-downloaded");
  };
  updater.quitAndInstall = (silent, restart) => {
    assert.equal(silent, true);
    assert.equal(restart, true);
    installs++;
  };
  const service = createAppUpdate({
    app: { getVersion: () => "0.3.0", isPackaged: true },
    isBusy: () => busy,
    emit: () => {},
    updater
  });
  try {
    service.configure(true);
    await new Promise(r => setImmediate(r));
    assert.equal(downloads, 1);
    t.mock.timers.tick(20000);
    assert.equal(installs, 0);
    busy = false;
    t.mock.timers.tick(1000);
    service.configure(false);
    t.mock.timers.tick(20000);
    assert.equal(installs, 0);
    service.configure(true);
    t.mock.timers.tick(1000);
    t.mock.timers.tick(16000);
    assert.equal(installs, 1);
  } finally {
    service.dispose();
  }
});
