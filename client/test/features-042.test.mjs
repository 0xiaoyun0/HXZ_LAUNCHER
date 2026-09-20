import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  inspectPack,
  extractPack,
  resolveCurseFile
} from "../src-electron/core/packs.mjs";
import { instanceTarget, modPlan } from "../src-electron/core/mod-plan.mjs";
import { createServices } from "../src-electron/core/services.mjs";
const fixtures = fileURLToPath(new URL("./fixtures-042/", import.meta.url));
test("four pack formats extract instance data and respect HXZ UP override priority", async t => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "hxz-packs-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, format, mc] of [
    ["minimal.mrpack", "modrinth", "1.21.1"],
    ["prism.zip", "prism", "1.20.1"],
    ["curse.zip", "curseforge", "1.20.1"],
    ["raw.zip", "minecraft-zip", ""]
  ]) {
    const pack = await inspectPack(path.join(fixtures, file));
    assert.equal(pack.format, format);
    assert.equal(pack.minecraft, mc);
    const dest = path.join(root, file);
    await fs.mkdir(dest);
    const result = await extractPack(pack, dest);
    if (file === "minimal.mrpack") {
      assert.deepEqual(pack.updateUrls, ["https://test.invalid/client"]);
      assert.deepEqual(result.updateUrls, pack.updateUrls);
    }
    if (file === "prism.zip") assert.equal(result.hxzup, true);
    assert.equal(
      await fs.access(path.join(dest, "accounts.json")).then(
        () => true,
        () => false
      ),
      false
    );
  }
  const metadata = {
    data: {
      id: 2,
      modId: 1,
      fileName: "valid.jar",
      fileLength: 12,
      downloadUrl: "https://test.invalid/mod.jar",
      hashes: [{ algo: 1, value: "a".repeat(40) }]
    }
  };
  assert.equal(
    (
      await resolveCurseFile(
        { projectID: 1, fileID: 2 },
        undefined,
        async () => metadata
      )
    ).path,
    "mods/valid.jar"
  );
  await assert.rejects(
    () =>
      resolveCurseFile({ projectID: 1, fileID: 2 }, undefined, async () => ({
        data: { ...metadata.data, downloadUrl: null }
      })),
    /许可/
  );
});
test("MOD plans match loader and MC, include required dependencies and reject conflicting names", async () => {
  const target = instanceTarget({
    inheritsFrom: "1.21.1",
    libraries: [{ name: "net.neoforged:neoforge:21.1.250" }]
  });
  assert.equal(target.loader, "neoforge");
  const mod = (id, mc = "1.21.1") => ({
    id,
    project_id: id,
    game_versions: [mc],
    loaders: ["neoforge"],
    dependencies: [],
    files: [
      {
        filename: id + ".jar",
        url: "https://test.invalid/" + id + ".jar",
        size: 20,
        hashes: { sha512: "b".repeat(128) },
        primary: true
      }
    ]
  });
  const main = mod("main");
  main.dependencies = [{ dependency_type: "required", project_id: "dep" }];
  const plan = await modPlan(target, "main", null, {
    versions: async id =>
      id === "main" ? [mod("main", "1.22"), main] : [mod(id)]
  });
  assert.deepEqual(
    plan.map(f => f.filename),
    ["dep.jar", "main.jar"]
  );
  await assert.rejects(
    () =>
      modPlan(target, "main", "bad", {
        version: async () => mod("main", "1.22")
      }),
    /没有适合/
  );
});
test("appearance migration preserves saved customization and fresh profiles default to light", async t => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "hxz-settings-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  async function open(data) {
    return createServices({
      data,
      resources: root,
      safeStorage: { isEncryptionAvailable: () => false },
      emit: () => {},
      window: () => null
    });
  }
  const fresh = await open(path.join(root, "new"));
  assert.equal((await fresh.invoke("state")).settings.theme, "light");
  const saved = path.join(root, "saved");
  await fs.mkdir(saved);
  await fs.writeFile(
    path.join(saved, "settings.json"),
    JSON.stringify({
      theme: "dark",
      fontSize: 20,
      accentColor: "#123456",
      appearanceVersion: 1
    })
  );
  const old = await open(saved);
  const state = await old.invoke("state");
  assert.equal(state.settings.theme, "dark");
  assert.equal(state.settings.fontSize, 20);
  assert.equal(state.settings.accentColor, "#123456");
});
