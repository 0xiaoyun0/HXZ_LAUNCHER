import { gunzip } from "node:zlib";
import { promisify } from "node:util";
const unzip = promisify(gunzip);

// Parse bounded Java structure NBT, retaining only display metadata.
export async function inspectSchematic(bytes) {
  const data =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await unzip(bytes, { maxOutputLength: 32 * 1024 * 1024 })
      : bytes;
  let offset = 0,
    nodes = 0;
  const metadata = { dimensions: [], blocks: 0, materials: [] };
  function take(n) {
    if (n < 0 || offset + n > data.length) throw Error("蓝图 NBT 不完整");
    const start = offset;
    offset += n;
    return start;
  }
  function string() {
    const length = data.readUInt16BE(take(2));
    return data.toString("utf8", take(length), offset);
  }
  function length() {
    const n = data.readInt32BE(take(4));
    if (n < 0 || n > 2000000) throw Error("蓝图条目数量过大");
    return n;
  }
  function payload(type, depth, name = "") {
    if (++nodes > 2000000 || depth > 32) throw Error("蓝图结构过于复杂");
    if (type === 1) {
      take(1);
      return;
    }
    if (type === 2) {
      take(2);
      return;
    }
    if (type === 3) {
      const n = data.readInt32BE(take(4));
      return n;
    }
    if (type === 4 || type === 6) {
      take(8);
      return;
    }
    if (type === 5) {
      take(4);
      return;
    }
    if (type === 7 || type === 11 || type === 12) {
      take(length() * (type === 7 ? 1 : type === 11 ? 4 : 8));
      return;
    }
    if (type === 8) {
      const value = string();
      if (name === "Name" && metadata.materials.length < 256 && /^[\w.-]+:[\w./-]+$/.test(value))
        metadata.materials.push(value);
      return;
    }
    if (type === 9) {
      const child = data[take(1)],
        count = length();
      if (child === 0 && count) throw Error("蓝图列表格式错误");
      if (depth === 1 && name === "blocks") metadata.blocks = count;
      for (let i = 0; i < count; i++) {
        const value = payload(child, depth + 1);
        if (depth === 1 && name === "size" && child === 3 && count === 3)
          metadata.dimensions.push(value);
      }
      return;
    }
    if (type === 10) {
      for (;;) {
        const child = data[take(1)];
        if (child === 0) break;
        const key = string();
        payload(child, depth + 1, key);
      }
      return;
    }
    throw Error("蓝图 NBT 标签无效");
  }
  if (data[take(1)] !== 10) throw Error("请选择机械动力导出的 .nbt 蓝图");
  string();
  payload(10, 0);
  if (
    offset !== data.length ||
    metadata.dimensions.length !== 3 ||
    metadata.dimensions.some((n) => n <= 0 || n > 2048) ||
    !metadata.blocks
  )
    throw Error("不是有效的机械动力结构蓝图，需包含尺寸和方块列表");
  metadata.materials = [...new Set(metadata.materials)];
  return metadata;
}
