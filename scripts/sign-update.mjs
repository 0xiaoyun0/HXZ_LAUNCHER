import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createPublicKey, sign } from "node:crypto";
import { UPDATE_PUBLIC_KEY } from "../client/src-electron/core/update-public-key.mjs";
import { verifyRelease } from "../client/src-electron/core/update-sources.mjs";

export async function signUpdate(info, arch = process.arch) {
  const file = process.env.HXZ_UPDATE_SIGNING_KEY ||
    path.join(os.homedir(), ".hxz-launcher-publish", "update-ed25519.pem");
  const privateKey = await fs.readFile(file);
  if (createPublicKey(privateKey).export({type: "spki", format: "pem"}) !== UPDATE_PUBLIC_KEY)
    throw Error("发布签名密钥与客户端内置公钥不匹配");
  const bytes = Buffer.from(JSON.stringify(info));
  const envelope = {payload: bytes.toString("base64"),
    signature: sign(null, bytes, privateKey).toString("base64")};
  verifyRelease(envelope, UPDATE_PUBLIC_KEY, arch);
  return JSON.stringify(envelope) + "\n";
}
