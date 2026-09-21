import fs from "node:fs/promises";
import path from "node:path";
import { inside, noLinks, exists, json, writeJSON, hash } from "./io.mjs";

function locations(root, id) {
  if (
    !/^[\p{L}\p{N}_ .-]{1,80}$/u.test(id) ||
    /[. ]$/.test(id) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id)
  )
    throw Error("实例名称无效");
  const home = inside(root, ".hxzl-install/" + id);
  return {
    home,
    record: path.join(home, "job.json"),
    stage: path.join(home, "instance", id),
    target: inside(root, "versions/" + id)
  };
}
async function restoreInterruptedUpgrade(root,paths,job){
  if(!job.backup || await exists(paths.target))return;
  const expected=inside(root,'.hxzl-backups/'+job.id+'/'+path.basename(job.backup));
  if(expected!==path.resolve(job.backup)||!/^\d+$/.test(path.basename(job.backup)))throw Error('安装备份路径无效');
  await noLinks(expected);
  if(await exists(expected))await fs.rename(expected,paths.target);
}
export async function beginInstall(root, id, request, pack, input) {
  const paths = locations(root, id);
  await noLinks(paths.home);
  await noLinks(paths.target);
  const fingerprint = pack ? await hash(pack.file, "sha256") : "";
  const identity = {
    request,
    pack: pack?.file || "",
    fingerprint,
    includeOptional: input.includeOptional !== false,
    ...(input.fabricAPI ? {fabricAPI:true}:{}),
    ...(input.upgrade ? {upgrade:true}:{}),
    ...(input.presetSignature ? {presetSignature:input.presetSignature}:{})
  };
  let job;
  if (await exists(paths.record)) {
    job = await json(paths.record);
    if(job.id!==id)throw Error('安装记录与实例不匹配');
    await restoreInterruptedUpgrade(root,paths,job);
    if (JSON.stringify(job.identity) !== JSON.stringify(identity))
      throw Error("该实例有另一项未完成安装，请继续原任务或先清理");
  } else {
    job = { id, identity, created: Date.now() };
    // Import only a directory explicitly marked by the old installer as incomplete.
    if ((await exists(paths.target)) && !input.upgrade) {
      const marker = path.join(paths.target, ".hxzl/install-request.json");
      if (!(await exists(marker)))
        throw Error("同名实例已存在，请使用新的名称");
      const old = await json(marker);
      if (
        JSON.stringify(old.request) !== JSON.stringify(request) ||
        old.pack !== (pack?.file || "")
      )
        throw Error("此目录属于另一次未完成安装");
      await fs.mkdir(path.dirname(paths.stage), { recursive: true });
      await fs.rename(paths.target, paths.stage);
    }
  }
  if ((await exists(paths.target)) && !input.upgrade) throw Error("目标实例已经存在，请先刷新列表");
  if(input.upgrade && !(await exists(path.join(paths.home,'upgrade-copied.json')))) {
    await writeJSON(paths.record,{...job,status:'running',updated:Date.now()});
    // Copy into the transaction; the original instance remains playable on failure.
    await fs.cp(paths.target,paths.stage,{recursive:true,filter:async source=>{
      if((await fs.lstat(source)).isSymbolicLink())throw Error('实例包含链接，请先移除链接后升级');return true;
    }});
    await writeJSON(path.join(paths.home,'upgrade-copied.json'),{complete:true});
  }
  await fs.mkdir(paths.stage, { recursive: true });
  const save = async (status, error = "") => {
    job = {
      ...job,
      status,
      error: String(error).slice(0, 2000),
      updated: Date.now()
    };
    await writeJSON(paths.record, job);
  };
  await save("running");
  return {
    ...paths,
    save,
    async commit() {
      await noLinks(paths.target);
      await noLinks(paths.stage);
      if ((await exists(paths.target)) && !input.upgrade)
        throw Error("目标实例已存在，安装未覆盖它");
      await fs.mkdir(path.dirname(paths.target), { recursive: true });
      await save("committing");
      if(input.upgrade) {
        const backup=inside(root,'.hxzl-backups/'+id+'/'+Date.now());
        await noLinks(backup);await fs.mkdir(path.dirname(backup),{recursive:true});
        // Journal the backup before moving anything, for interruption recovery.
        job.backup=backup;await save('committing');
        await fs.rename(paths.target,backup);
        try{await fs.rename(paths.stage,paths.target);}catch(error){await fs.rename(backup,paths.target);throw error;}
      } else await fs.rename(paths.stage, paths.target);
      await fs
        .rm(paths.home, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 250
        })
        .catch(() => {});
    }
  };
}
export async function listInstalls(root) {
  if (!root) return [];
  const base = inside(root, ".hxzl-install");
  await noLinks(base);
  const result = [];
  for (const entry of await fs
    .readdir(base, { withFileTypes: true })
    .catch(() => [])) {
    if (!entry.isDirectory()) continue;
    try {
      const p = locations(root, entry.name);
      await noLinks(p.record);
      const job = await json(p.record);
      if (job.id !== entry.name) continue;
      if (
        job.status === "committing" &&
        (await exists(p.target)) &&
        !(await exists(p.stage))
      )
        continue;
      result.push({
        ...job,
        status: job.status === "running" ? "paused" : job.status
      });
    } catch {}
  }
  // Old incomplete installations remain discoverable after upgrading.
  for (const entry of await fs
    .readdir(path.join(root, "versions"), { withFileTypes: true })
    .catch(() => [])) {
    if (!entry.isDirectory() || result.some(j => j.id === entry.name)) continue;
    try {
      const marker = path.join(
        root,
        "versions",
        entry.name,
        ".hxzl/install-request.json"
      );
      await noLinks(marker);
      const old = await json(marker);
      result.push({
        id: entry.name,
        status: "paused",
        identity: { ...old, includeOptional: true },
        legacy: true
      });
    } catch {}
  }
  return result.slice(0, 300);
}
export async function discardInstall(root, id) {
  const p = locations(root, id);
  const job = (await listInstalls(root)).find(j => j.id === id);
  if (!job) throw Error("未找到可清理的未完成安装");
  await restoreInterruptedUpgrade(root,p,job);
  const target = job.legacy ? p.target : p.home;
  await noLinks(target);
  // locations() resolves this target strictly beneath the selected game directory.
  await fs.rm(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 300
  });
}
