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
  updater.setFeedURL = feed => assert.equal(feed.provider, "custom");
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
    updater,
    discover: async () => ({
      info: { version: "0.3.1" },
      sources: [{ name: "fixture", prefix: "" }]
    })
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

void test("failed download switches source without changing signed release", async () => {
  const updater = new EventEmitter(),
    feeds = [];
  const info = { version: "0.3.4" };
  let downloads = 0;
  updater.setFeedURL = feed => feeds.push(feed);
  updater.checkForUpdates = async () => {
    updater.emit("update-available", info);
    return { cancellationToken: { cancel() {} } };
  };
  updater.downloadUpdate = async () => {
    if (++downloads === 1) throw Error("Network down");
    updater.emit("update-downloaded");
  };
  const service = createAppUpdate({
    app: { getVersion: () => "0.3.3", isPackaged: true },
    isBusy: () => false,
    emit: () => {},
    updater,
    discover: async () => ({
      info,
      sources: [
        { name: "direct", prefix: "" },
        { name: "mirror", prefix: "https://ghproxy.net/" }
      ]
    })
  });
  try {
    await service.check();
    await service.download();
    assert.equal(downloads, 2);
    assert.equal(service.status().ready, true);
    assert.equal(service.status().source, "mirror");
    assert.ok(feeds.every(f => f.info === info));
  } finally {
    service.dispose();
  }
});
