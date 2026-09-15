import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { download } from "../src-electron/core/io.mjs";
import { createHash } from "node:crypto";

void test("transient server failure retries and releases partial file handles", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hxzl-recovery-"));
  let requests = 0;
  const body = Buffer.from("complete verified file");
  const server = http.createServer((req, res) => {
    if (++requests === 1) {
      res.writeHead(503);
      res.end("temporary");
    } else res.end(body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const file = path.join(dir, "mod.jar");
    await download("http://127.0.0.1:" + server.address().port, file, {
      sha1: createHash("sha1").update(body).digest("hex"),
      retryDelay: 1
    });
    assert.equal(await fs.readFile(file, "utf8"), body.toString());
    assert.equal(requests, 2);
    await fs.rename(dir, dir + "-released");
    await fs.rename(dir + "-released", dir);
  } finally {
    server.closeAllConnections();
    await new Promise(r => server.close(r));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
