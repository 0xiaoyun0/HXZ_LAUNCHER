import { gunzip } from "node:zlib";
import { promisify } from "node:util";
const unzip = promisify(gunzip);

// Parse bounded Java structure NBT without retaining positions, inventories or entity payloads.
export async function inspectSchematic(bytes) {
  const data =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await unzip(bytes, { maxOutputLength: 32 * 1024 * 1024 })
      : bytes;
  let offset = 0,
    nodes = 0;
  const metadata = { dimensions: [], blocks: 0, materials: [], materialVersion:1, materialCounts:[] };
  const palette=[],counts=new Map();
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
  function payload(type, depth, name = "", scope = "") {
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
      if(scope==='palette'&&name==='Name'&&value.length<=256&&/^[\w.-]+:[\w./-]+$/.test(value))return value;
      return;
    }
    if (type === 9) {
      const child = data[take(1)],
        count = length();
      if (child === 0 && count) throw Error("蓝图列表格式错误");
      if (depth === 1 && name === "blocks") metadata.blocks = count;
      const mode=depth===1&&child===10?(name==='palette'?'palette':name==='blocks'?'block':''):'';
      if(mode==='palette'&&count>65536)throw Error('蓝图方块状态种类过多');
      for (let i = 0; i < count; i++) {
        const value = payload(child, depth + 1,'',mode);
        if(mode==='palette')palette.push(value);
        if(mode==='block'&&Number.isInteger(value)){if(value<0||value>=65536)throw Error('蓝图方块状态编号无效');counts.set(value,(counts.get(value)||0)+1);}
        if (depth === 1 && name === "size" && child === 3 && count === 3)
          metadata.dimensions.push(value);
      }
      return;
    }
    if (type === 10) {
      let retained;
      for (;;) {
        const child = data[take(1)];
        if (child === 0) break;
        const key = string();
        const value=payload(child, depth + 1, key,scope);
        if(scope==='palette'&&key==='Name'&&child===8||scope==='block'&&key==='state'&&child===3)retained=value;
      }
      return retained;
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
  const totals=new Map();for(const [index,quantity]of counts){const item=palette[index];if(!item)continue;if(['minecraft:air','minecraft:cave_air','minecraft:void_air','minecraft:structure_void'].includes(item))continue;totals.set(item,(totals.get(item)||0)+quantity);}
  metadata.materialCounts=[...totals].map(([item,quantity])=>({item,quantity})).sort((a,b)=>b.quantity-a.quantity||a.item.localeCompare(b.item)).slice(0,4096);
  metadata.materials=metadata.materialCounts.slice(0,256).map(v=>v.item);
  metadata.materialWarning=!palette.length?'这份结构没有单一 palette，暂不能统计方块数量':!counts.size||[...counts.keys()].some(i=>!palette[i])?'部分方块状态无法识别，统计可能不完整':totals.size>4096?'方块种类超过 4096，仅显示数量最多的部分':'';
  return metadata;
}
