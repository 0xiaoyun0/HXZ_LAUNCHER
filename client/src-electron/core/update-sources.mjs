import { verify } from "node:crypto";
import { UPDATE_PUBLIC_KEY } from "./update-public-key.mjs";

export const RELEASE_ROOT =
  "https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases";
export const UPDATE_SOURCES = Object.freeze([
  { name: "GitHub", prefix: "" },
  { name: "GHProxy", prefix: "https://ghproxy.net/" },
  { name: "GHFast", prefix: "https://ghfast.top/" },
  { name: "GH-Proxy", prefix: "https://gh-proxy.com/" }
]);
const LIMIT = 256 * 1024;
export function compareVersions(a, b) {
  const left = a.split(".").map(Number),
    right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}
export function verifyRelease(envelope, publicKey = UPDATE_PUBLIC_KEY) {
  if (
    typeof envelope?.payload !== "string" ||
    envelope.payload.length > LIMIT ||
    typeof envelope.signature !== "string" ||
    envelope.signature.length !== 88
  )
    throw Error("更新发布信息格式错误");
  const bytes = Buffer.from(envelope.payload, "base64");
  if (
    !verify(null, bytes, publicKey, Buffer.from(envelope.signature, "base64"))
  )
    throw Error("更新发布签名无效");
  const info = JSON.parse(bytes.toString("utf8"));
  const file = info.files?.[0];
  if (
    !/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(
      info.version
    ) ||
    info.files?.length !== 1 ||
    file?.url !== `HXZ-Launcher-${info.version}-x64.exe` ||
    !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512) ||
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > 2 * 1024 ** 3 ||
    typeof info.releaseNotes !== "string" ||
    info.releaseNotes.length > 30000 ||
    !Number.isFinite(Date.parse(info.releaseDate))
  )
    throw Error("更新发布信息不符合要求");
  // Only these signed fields can influence the updater. No packages, redirects or scripts.
  return {
    version: info.version,
    files: [{ url: file.url, sha512: file.sha512, size: file.size }],
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
    releaseName: `幻想镇启动器 ${info.version}`
  };
}
export async function fetchUpdateJSON(
  url,
  { fetcher = fetch, timeout = 8000 } = {}
) {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: "application/json", "Cache-Control": "no-cache" }
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Error(`HTTP ${response.status}`);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > LIMIT) throw Error("更新信息过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function discoverRelease({
  sources = UPDATE_SOURCES,
  fetcher,
  publicKey,
  timeout = 8000
} = {}) {
  const results = await Promise.allSettled(
    sources.map(async source => ({
      source,
      info: verifyRelease(
        await fetchUpdateJSON(
          source.prefix + RELEASE_ROOT + "/latest/download/latest.json",
          { fetcher, timeout }
        ),
        publicKey
      )
    }))
  );
  const valid = results.filter(x => x.status === "fulfilled").map(x => x.value);
  if (!valid.length) throw Error("GitHub 与备用更新源均不可用，请稍后重试");
  valid.sort((a, b) => compareVersions(b.info.version, a.info.version));
  const selected = valid[0];
  const preferred = valid
    .filter(x => x.info.version === selected.info.version)
    .map(x => x.source);
  return {
    info: selected.info,
    sources: [...preferred, ...sources.filter(x => !preferred.includes(x))]
  };
}
export function updateFileURL(source, info) {
  return new URL(
    source.prefix +
      RELEASE_ROOT +
      `/download/v${info.version}/${info.files[0].url}`
  );
}
