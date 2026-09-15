import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  discoverRelease,
  verifyRelease,
  fetchUpdateJSON,
  updateFileURL
} from "../src-electron/core/update-sources.mjs";
import { SignedReleaseProvider } from "../src-electron/core/update-provider.mjs";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function envelope(version = "0.3.4") {
  const bytes = Buffer.from(
    JSON.stringify({
      version,
      files: [
        {
          url: `HXZ-Launcher-${version}-x64.exe`,
          sha512: Buffer.alloc(64).toString("base64"),
          size: 100
        }
      ],
      releaseNotes: "修复更新",
      releaseDate: "2026-09-15T00:00:00Z"
    })
  );
  return {
    payload: bytes.toString("base64"),
    signature: sign(null, bytes, privateKey).toString("base64")
  };
}
void test("offline GitHub and stale mirror do not hide newer signed mirror release", async () => {
  const sources = [
    { name: "direct", prefix: "" },
    { name: "old", prefix: "https://old/" },
    { name: "new", prefix: "https://new/" }
  ];
  const result = await discoverRelease({
    sources,
    publicKey,
    fetcher: async url => {
      if (!url.startsWith("https://old/") && !url.startsWith("https://new/"))
        throw Error("offline");
      return Response.json(
        envelope(url.startsWith("https://old/") ? "0.3.3" : "0.3.4")
      );
    }
  });
  assert.equal(result.info.version, "0.3.4");
  assert.equal(result.sources[0].name, "new");
  const provider = new SignedReleaseProvider(
    { info: result.info, source: sources[2] },
    null,
    {}
  );
  assert.equal(await provider.getLatestVersion(), result.info);
  assert.equal(
    provider.resolveFiles(result.info)[0].url.href,
    updateFileURL(sources[2], result.info).href
  );
  assert.match(
    provider.resolveFiles(result.info)[0].url.href,
    /\/download\/v0\.3\.4\/HXZ-Launcher-0\.3\.4-x64\.exe$/
  );
});
void test("proxy tampering, HTML and excessive metadata are rejected", async () => {
  const value = envelope();
  value.payload = Buffer.from(
    Buffer.from(value.payload, "base64").toString().replace("0.3.4", "9.9.9")
  ).toString("base64");
  assert.throws(() => verifyRelease(value, publicKey), /签名/);
  await assert.rejects(
    discoverRelease({
      publicKey,
      sources: [{ name: "bad", prefix: "" }],
      fetcher: async () => new Response("<html>error</html>")
    }),
    /均不可用/
  );
  await assert.rejects(
    fetchUpdateJSON("https://fixture/", {
      fetcher: async () => new Response("a".repeat(256 * 1024 + 1))
    }),
    /过大/
  );
});
