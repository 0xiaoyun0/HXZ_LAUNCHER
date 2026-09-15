import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { createServices } from "../src-electron/core/services.mjs";
import { extractPack } from "../src-electron/core/packs.mjs";
const base = path.resolve("../.test");
await fs.mkdir(base, { recursive: true });
await test("default 64, five persisted choices, and actual mrpack concurrency up to 128", async t => {
  const root = await fs.mkdtemp(path.join(base, "download-settings-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const data = path.join(root, "profile");
  let service = await createServices({
    data,
    resources: path.resolve("resources"),
    safeStorage: { isEncryptionAvailable: () => false },
    dialog: {},
    shell: {},
    window: () => null,
    openSkin: () => {},
    emit: () => {}
  });
  try {
    assert.equal(
      (await service.invoke("state")).settings.downloadConcurrency,
      64
    );
    for (const value of [8, 16, 32, 64, 128]) {
      await service.invoke("settings.save", { downloadConcurrency: value });
      assert.equal(
        (await service.invoke("state")).settings.downloadConcurrency,
        value
      );
    }
    await assert.rejects(
      service.invoke("settings.save", { downloadConcurrency: 129 })
    );
    assert.equal(
      JSON.parse(await fs.readFile(path.join(data, "settings.json")))
        .downloadConcurrency,
      128
    );
  } finally {
    service.dispose();
  }
  const packFile = path.join(root, "fixture.mrpack"),
    zip = Buffer.alloc(22);
  zip.writeUInt32LE(0x06054b50);
  await fs.writeFile(packFile, zip);
  const bytes = Buffer.from("asset"),
    sha = createHash("sha1").update(bytes).digest("hex");
  for (const limit of [64, 128]) {
    let requests = 0;
    const pending = [];
    const server = http.createServer((req, res) => {
      requests++;
      pending.push(res);
      if (pending.length === limit)
        for (const response of pending) {
          response.writeHead(200, { "Content-Length": bytes.length });
          response.end(bytes);
        }
    });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    try {
      const files = Array.from({ length: limit }, (_, i) => ({
        path: `mods/file${i}.jar`,
        downloads: [`http://127.0.0.1:${server.address().port}/file${i}`],
        fileSize: bytes.length,
        hashes: { sha1: sha }
      }));
      const instance = path.join(root, "instance-" + limit);
      await fs.mkdir(instance);
      await extractPack({ file: packFile, files, overrideCount: 0 }, instance, {
        ...(limit === 128 ? { downloadConcurrency: 128 } : {}),
        signal: AbortSignal.timeout(5000)
      });
      assert.equal(requests, limit);
      assert.equal(
        (await fs.readdir(path.join(instance, "mods"))).length,
        limit
      );
    } finally {
      server.closeAllConnections();
      await new Promise(r => server.close(r));
    }
  }
});
