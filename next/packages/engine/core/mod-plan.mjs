export function instanceTarget(metadata) {
  const libs = (metadata.libraries || []).map(l => l.name || "").join("\n");
  const patches = metadata.patches || [];
  const loader = /net\.neoforged:/.test(libs)
    ? "neoforge"
    : /net\.minecraftforge:/.test(libs)
      ? "forge"
      : /org\.quiltmc:quilt-loader/.test(libs)
        ? "quilt"
        : /net\.fabricmc:fabric-loader/.test(libs)
          ? "fabric"
          : ["neoforge", "forge", "quilt", "fabric"].find(l =>
              patches.some(p => String(p.id).toLowerCase() === l)
            ) || "";
  return {
    minecraft:
      patches.find(p => p.id === "game")?.version ||
      metadata.inheritsFrom ||
      metadata.minecraftVersion ||
      metadata.id,
    loader
  };
}
export async function modPlan(
  target,
  project,
  selected,
  { versions, version }
) {
  if (!target.loader)
    throw Error("原版实例不能直接加载 MOD，请先安装对应加载器");
  const plan = [],
    visited = new Map(),
    names = new Map();
  async function resolve(projectId, versionId, depth = 0) {
    const key = projectId || versionId;
    if (visited.has(key)) {
      if (versionId && visited.get(key) !== versionId)
        throw Error("模组依赖版本冲突：" + key);
      return;
    }
    visited.set(key, versionId);
    if (depth > 16 || visited.size > 64) throw Error("模组依赖数量或层级过多");
    const candidates = versionId
      ? [await version(versionId)]
      : await versions(projectId);
    const match = candidates.find(
      v =>
        v.game_versions?.includes(target.minecraft) &&
        v.loaders?.includes(target.loader) &&
        (!projectId || v.project_id === projectId)
    );
    if (!match)
      throw Error(
        `没有适合 Minecraft ${target.minecraft} / ${target.loader} 的模组版本：${projectId || versionId}`
      );
    visited.set(key, match.id);
    const file =
      match.files?.find(f => f.primary && /\.jar$/i.test(f.filename)) ||
      match.files?.find(f => /\.jar$/i.test(f.filename));
    if (
      !file ||
      !/^[-\w .+()]+\.jar$/i.test(file.filename) ||
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      file.size > 256 * 1024 * 1024 ||
      !/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 || "")
    )
      throw Error("模组缺少可校验的文件");
    const url = new URL(file.url);
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error("模组下载地址无效");
    for (const dep of match.dependencies || [])
      if (dep.dependency_type === "required")
        await resolve(dep.project_id, dep.version_id, depth + 1);
    const name = file.filename.toLowerCase();
    if (names.has(name) && names.get(name) !== file.hashes.sha512)
      throw Error("模组文件名称冲突：" + file.filename);
    if (!names.has(name)) {
      names.set(name, file.hashes.sha512);
      plan.push(file);
    }
  }
  await resolve(project, selected);
  return plan;
}
