import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  beginInstall,
  listInstalls,
  discardInstall
} from "../src-electron/core/install-jobs.mjs";
import { exists, writeJSON } from "../src-electron/core/io.mjs";
void test("interrupted install is isolated, resumes verified files and publishes atomically", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hxzl-jobs-"));
  const request = { gameVersion: "26.2", loader: { type: "", version: "" } };
  try {
    const job = await beginInstall(root, "new-game", request, null, {});
    await fs.writeFile(path.join(job.stage, "verified.jar"), "verified");
    await job.save("failed", "network reset");
    assert.equal(await exists(job.target), false);
    const saved = await listInstalls(root);
    assert.equal(saved[0].status, "failed");
    const resumed = await beginInstall(root, "new-game", request, null, {});
    assert.equal(
      await fs.readFile(path.join(resumed.stage, "verified.jar"), "utf8"),
      "verified"
    );
    await resumed.commit();
    assert.equal(
      await fs.readFile(path.join(resumed.target, "verified.jar"), "utf8"),
      "verified"
    );
    assert.deepEqual(await listInstalls(root), []);
    await assert.rejects(discardInstall(root, "new-game"));
    assert.ok(await exists(resumed.target));
    const failed = await beginInstall(root, "failed-game", request, null, {});
    await fs.writeFile(path.join(failed.stage, "partial"), "partial");
    await discardInstall(root, "failed-game");
    assert.equal(await exists(failed.home), false);
    assert.ok(await exists(resumed.target));
    await assert.rejects(beginInstall(root, "../outside", request, null, {}));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
void test("old marked incomplete instance moves to resumable staging without touching other games", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hxzl-legacy-"));
  const request = {
    gameVersion: "1.21.1",
    loader: { type: "neoforge", version: "21.1.250" }
  };
  try {
    const target = path.join(root, "versions/legacy");
    await writeJSON(path.join(target, ".hxzl/install-request.json"), {
      request,
      pack: ""
    });
    await fs.writeFile(path.join(target, "old-file"), "keep");
    const job = await beginInstall(root, "legacy", request, null, {});
    assert.equal(await exists(target), false);
    assert.equal(
      await fs.readFile(path.join(job.stage, "old-file"), "utf8"),
      "keep"
    );
    await discardInstall(root, "legacy");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
