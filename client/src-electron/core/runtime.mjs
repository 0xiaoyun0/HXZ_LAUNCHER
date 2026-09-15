import { normalizeDownloadConcurrency } from "./download-settings.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { remoteJSON, download, inside, noLinks, json, exists } from "./io.mjs";
import { fileProgress } from "./progress.mjs";
import { parallel } from "./io.mjs";
const MANIFEST =
  "https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";
export async function ensureRuntime(
  data,
  metadata,
  signal,
  onProgress,
  downloadConcurrency = 64
) {
  const component = metadata.javaVersion?.component;
  if (
    process.platform !== "win32" ||
    process.arch !== "x64" ||
    !/^java-runtime-[a-z]+$/.test(component || "")
  )
    throw Error(
      "请在设置中选择 Java " + (metadata.javaVersion?.majorVersion || 8)
    );
  const home = inside(data, "runtimes/" + component);
  await noLinks(home);
  await fs.mkdir(home, { recursive: true });
  const all = await remoteJSON(MANIFEST, { signal });
  const release = all["windows-x64"]?.[component]?.[0];
  if (!release?.manifest) throw Error("没有适用的官方 Java 运行环境");
  const file = path.join(home, "runtime-manifest.json");
  await download(release.manifest.url, file, {
    sha1: release.manifest.sha1,
    size: release.manifest.size,
    signal
  });
  const manifest = await json(file),
    entries = Object.entries(manifest.files || {});
  if (!entries.length || entries.length > 20000)
    throw Error("Java 文件清单无效");
  const progress = fileProgress(
    "准备 Java " + metadata.javaVersion.majorVersion,
    entries.length,
    onProgress,
    "文件"
  );
  await parallel(
    entries,
    ([name, item]) =>
      progress.run(name, async onBytes => {
        signal?.throwIfAborted();
        const target = inside(home, name);
        await noLinks(target);
        if (item.type === "directory")
          await fs.mkdir(target, { recursive: true });
        else if (item.type === "file") {
          const f = item.downloads?.raw;
          if (!f || !/^[a-f0-9]{40}$/.test(f.sha1))
            throw Error("Java 文件缺少校验信息");
          await download(f.url, target, {
            sha1: f.sha1,
            size: f.size,
            signal,
            onProgress: onBytes
          });
        } else throw Error("不支持的 Java 文件类型");
      }),
    normalizeDownloadConcurrency(downloadConcurrency)
  );
  const java = path.join(home, "bin/java.exe");
  if (!(await exists(java))) throw Error("Java 安装不完整");
  return java;
}
