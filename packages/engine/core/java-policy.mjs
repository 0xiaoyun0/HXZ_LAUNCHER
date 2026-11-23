// Version metadata is authoritative. Fall back only for well-known release IDs;
// custom instance names must never silently turn a modern game into Java 8.
export function javaRequirement(metadata = {}, { tool = false } = {}) {
  if (tool) return { major: 8, minimum: true, reason: '安装/更新工具（Java 8 及以上）' };
  const explicit = Number(metadata.javaVersion?.majorVersion);
  if (Number.isInteger(explicit) && explicit >= 8 && explicit <= 99)
    return { major: explicit, minimum: false, reason: '游戏版本清单' };
  const ids = [metadata.patches?.find(p => p.id === 'game')?.version, metadata.inheritsFrom,
    metadata.gameVersion, metadata.id, metadata.assetIndex?.id];
  for (const id of ids) {
    if (/^26\.\d+(?:[.-].*)?$/.test(id || '')) return { major: 25, minimum: false, reason: 'Minecraft 26.x' };
    const match = /^(?:1\.)(\d+)(?:\.(\d+))?(?:-(?:pre|rc)\d+)?$/.exec(id || '');
    if (!match) continue;
    const minor = +match[1], patch = +(match[2] || 0);
    return { major: minor > 20 || minor === 20 && patch >= 5 ? 21 : minor >= 18 ? 17 : minor === 17 ? 16 : 8,
      minimum: false, reason: 'Minecraft ' + id };
  }
  throw Error('游戏清单缺少 Java 要求且无法识别原版版本，请修复实例的版本清单；不会猜测下载 Java 8');
}
export function selectJavaCandidate(options, requirement, architecture) {
  return options.filter(j => j.architecture === architecture && (requirement.minimum ? j.major >= requirement.major : j.major === requirement.major))
    .sort((a,b) => requirement.minimum ? b.major-a.major || b.version.localeCompare(a.version,undefined,{numeric:true}) : b.version.localeCompare(a.version,undefined,{numeric:true}))[0];
}
