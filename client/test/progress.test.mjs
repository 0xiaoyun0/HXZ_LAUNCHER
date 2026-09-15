import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { download } from "../src-electron/core/io.mjs";
import { fileProgress } from "../src-electron/core/progress.mjs";

await test("progress follows transferred bytes and verified files; retries and failures cannot report completion", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hxz-progress-"));
  const bytes = Buffer.alloc(65536, 7),
    sha1 = createHash("sha1").update(bytes).digest("hex");
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Length": bytes.length });
    if (req.url === "/bad") return res.end(Buffer.alloc(bytes.length, 8));
    res.write(bytes.subarray(0, 32768));
    setTimeout(() => res.end(bytes.subarray(32768)), 260);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const snapshots = [],
      transfers = [];
    const meter = fileProgress(
      "下载整合包文件",
      2,
      p => snapshots.push(p),
      "文件"
    );
    const file = path.join(dir, "good.jar");
    await meter.run("mods/good.jar", onProgress =>
      download(base + "/good", file, {
        sha1,
        size: bytes.length,
        onProgress,
        onTransfer: p => transfers.push(p),
        urls: [base + "/bad"]
      })
    );
    assert.ok(transfers.some(p => p.bytes === 32768 && !p.verified));
    assert.equal(
      transfers.filter(p => p.bytes === 0).length,
      2,
      "each source resets byte progress"
    );
    assert.equal(transfers.at(-1).verified, true);
    assert.ok(
      snapshots.some(
        p =>
          p.completed === 0 &&
          p.received > 0 &&
          p.activeFiles.includes("mods/good.jar")
      )
    );
    await assert.rejects(
      meter.run("mods/broken.jar", onProgress =>
        download(base + "/bad", path.join(dir, "bad.jar"), { sha1, onProgress })
      ),
      /mods\/broken.jar/
    );
    assert.equal(
      snapshots.at(-1).completed,
      1,
      "failed file must not increment completion"
    );
    assert.equal(snapshots.at(-1).total, 2);
    assert.ok(snapshots.at(-1).activeFiles.includes("mods/broken.jar"));
    assert.ok(!snapshots.some(p => p.completed === p.total));
  } finally {
    await new Promise(r => server.close(r));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
