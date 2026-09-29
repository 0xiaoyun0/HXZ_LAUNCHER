import fs from "node:fs/promises";
import path from "node:path";
import { inside, noLinks, exists } from "./io.mjs";
export function serverAddress(value = "") {
  if (!value) return "";
  if (
    typeof value !== "string" ||
    value.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:]+\])(?::\d{1,5})?$/i.test(
      value
    )
  )
    throw Error("服务器地址应为主机名，可附加端口");
  const u = new URL("http://" + value);
  if (u.port && (+u.port < 1 || +u.port > 65535)) throw Error("服务器端口无效");
  return value;
}
export async function modDirectory(settings, id) {
  if (
    typeof id !== "string" ||
    !id ||
    id === "." ||
    id === ".." ||
    /[\\/:]/.test(id)
  )
    throw Error("无效实例");
  const instance = inside(settings.gameRoot, "versions/" + id);
  await noLinks(instance);
  if (!(await exists(path.join(instance, id + ".json"))))
    throw Error("请先完成实例安装");
  const dir = path.join(
    settings.instanceSettings[id]?.isolated === false
      ? settings.gameRoot
      : instance,
    "mods"
  );
  await noLinks(dir);
  return dir;
}
export async function listMods(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true }).catch(e => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  const mods = files.filter(
    e => e.isFile() && /\.jar(?:\.disabled)?$/i.test(e.name)
  );
  if (mods.length > 10000) throw Error("模组数量超过管理上限");
  return Promise.all(
    mods.map(async e => ({
      file: e.name,
      name: e.name.replace(/\.jar(?:\.disabled)?$/i, ""),
      enabled: !e.name.endsWith(".disabled"),
      size: (await fs.stat(path.join(dir, e.name))).size
    }))
  );
}
export function modFile(dir, name) {
  if (
    typeof name !== "string" ||
    /[\\/:]/.test(name) ||
    !/\.jar(?:\.disabled)?$/i.test(name)
  )
    throw Error("无效模组文件");
  return inside(dir, name);
}
