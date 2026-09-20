import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  createReadStream,
} from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

export function createArcana({ data, db, auth, admin, body, send, limit }) {
  const assets = fileURLToPath(new URL("../arcana/assets/", import.meta.url));
  const directory = join(data, "arcana");
  mkdirSync(directory, { recursive: true });
  const configPath = join(directory, "config.json");
  const defaults = JSON.parse(
    readFileSync(new URL("../arcana/cards.json", import.meta.url), "utf8"),
  );
  const fail = (message, status = 400) => {
    throw Object.assign(Error(message), { status });
  };
  const text = (v, max = 1000) => {
    if (typeof v !== "string" || v.length > max) fail("活动内容格式或长度无效");
    return v;
  };
  const code = (v) => {
    v = text(v, 100).trim().toUpperCase();
    if (!v) fail("活动代码不能为空");
    return v;
  };
  const lines = (v) => {
    if (!Array.isArray(v) || v.length > 100) fail("剧情最多100行");
    return v.map((l) => ({ speaker: text(l.speaker, 30), text: text(l.text, 1000) }));
  };
  const art = (v) => {
    if (
      typeof v !== "string" ||
      !/^\/assets\/[\w-]+\.(png|svg)$/.test(v) ||
      !existsSync(join(assets, basename(v)))
    )
      fail("卡面文件不存在");
    return v;
  };
  function validate(input) {
    if (!input || !Array.isArray(input.cards) || input.cards.length !== 7 || !input.center)
      fail("需要七张基础牌和中心牌");
    const seen = new Set();
    function card(value, index) {
      const c = {
        id: defaults.cards[index].id,
        slot: defaults.cards[index].slot,
        name: text(value.name, 100),
        activity: text(value.activity, 100),
        unlockCode: code(value.unlockCode),
        unlockAt: value.unlockAt || "",
        art: art(value.art),
        detail: {
          eyebrow: text(value.detail?.eyebrow || "", 100),
          title: text(value.detail?.title || value.name, 100),
          line: text(value.detail?.line || "", 2000),
        },
        dialogue: lines(value.dialogue || []),
      };
      if (c.unlockAt && !Number.isFinite(Date.parse(c.unlockAt))) fail("卡牌开放时间无效");
      if (seen.has(c.unlockCode)) fail("卡牌代码不能重复");
      seen.add(c.unlockCode);
      return c;
    }
    const cards = input.cards.map(card),
      c = input.center;
    const center = {
      name: text(c.name, 100),
      english: text(c.english || "", 100),
      signal: text(c.signal || "", 100),
      line: text(c.line || "", 2000),
      activity: text(c.activity || "", 100),
      art: art(c.art),
      unlockCode: code(c.unlockCode),
      unlockAt: c.unlockAt ?? defaults.center.unlockAt ?? "",
      detail: {
        eyebrow: text(c.detail?.eyebrow || "", 100),
        title: text(c.detail?.title || c.name, 100),
        line: text(c.detail?.line || "", 2000),
      },
      cardDialogue: lines(c.cardDialogue || []),
      dialogue: lines(c.dialogue || []),
    };
    if (seen.has(center.unlockCode)) fail("最终牌代码不能与其他牌重复");
    if (center.unlockAt && !Number.isFinite(Date.parse(center.unlockAt))) fail("最终牌开放时间无效");
    return {
      enabled: input.enabled !== false,
      title: text(input.title, 100),
      subtitle: text(input.subtitle || "", 200),
      accessCode: code(input.accessCode),
      cards,
      center,
    };
  }
  let config = validate(
    existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : defaults,
  );
  if (!existsSync(configPath))
    writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  db.exec(
    "CREATE TABLE IF NOT EXISTS arcana_progress(uid TEXT PRIMARY KEY,state TEXT NOT NULL,updated INTEGER NOT NULL)",
  );
  const progress = (uid) =>
    JSON.parse(
      db.prepare("SELECT state FROM arcana_progress WHERE uid=?").get(uid)?.state ||
        '{"entered":false,"cards":[],"read":[],"lastUnlockedCardId":null,"storyCompleted":false}',
    );
  const save = (uid, state) =>
    db
      .prepare(
        "INSERT INTO arcana_progress VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET state=excluded.state,updated=excluded.updated",
      )
      .run(uid, JSON.stringify(state), Date.now());
  const all = (state) => config.cards.every((c) => state.cards.includes(c.id));
  const ready = (state) => all(state) && state.read.includes(state.lastUnlockedCardId);
  function publicConfig(user, state) {
    const result = {
      entered: state.entered,
      session: { authenticated: true, id: user.uid, name: user.name },
      serverTime: new Date().toISOString(),
      title: config.title,
      subtitle: config.subtitle,
      cards: [],
      center: {},
      lastUnlockedCardId: state.lastUnlockedCardId,
      finalRevealReady: ready(state),
      storyCompleted: state.storyCompleted,
    };
    if (!state.entered) return result;
    result.cards = config.cards.map((c) => {
      const stateName =
        c.unlockAt && Date.now() < Date.parse(c.unlockAt)
          ? "locked"
          : state.cards.includes(c.id)
            ? "available"
            : "unlit";
      if (stateName !== "available")
        return {
          id: c.id,
          slot: c.slot,
          state: stateName,
          unlockAt: c.unlockAt,
          art: "assets/card-back.svg",
        };
      const { unlockCode, ...visible } = c;
      return { ...visible, state: stateName };
    });
    if (ready(state)) {
      const c = config.center,
        timeLocked = c.unlockAt && Date.now() < Date.parse(c.unlockAt),
        lit = state.cards.includes("lovers") && !timeLocked;
      result.cards.push(
        lit
          ? {
              id: "lovers",
              slot: "lovers",
              state: "available",
              name: c.name,
              activity: c.activity,
              art: c.art,
              detail: c.detail,
              dialogue: c.cardDialogue,
            }
          : { id: "lovers", slot: "lovers", state: timeLocked ? "locked" : "unlit", unlockAt: c.unlockAt, art: "assets/card-back.svg" },
      );
      if (lit) {
        const { unlockCode, ...visible } = c;
        result.center = { ...visible, background: "/assets/lovers-world-gpt.png" };
      }
    }
    return result;
  }
  return async (req, res, url) => {
    const p = url.pathname;
    if (p === "/api/admin/arcana") {
      admin(req);
      if (req.method === "GET") {
        send(res, 200, config);
        return true;
      }
      if (req.method === "PUT") {
        const next = validate(await body(req, 256 * 1024));
        admin(req);
        writeFileSync(configPath + ".tmp", JSON.stringify(next, null, 2), { mode: 0o600 });
        renameSync(configPath + ".tmp", configPath);
        config = next;
        send(res, 200, { ok: true });
        return true;
      }
      fail("不支持的活动管理操作", 405);
    }
    if (!p.startsWith("/api/arcana/")) return false;
    const user = auth(req);
    if (!config.enabled) fail("活动尚未开启", 404);
    const state = progress(user.uid);
    if (p === "/api/arcana/public" && req.method === "GET") {
      send(res, 200, publicConfig(user, state));
      return true;
    }
    if (p.startsWith("/api/arcana/art/") && req.method === "GET") {
      const name = p.slice("/api/arcana/art/".length);
      if (!/^[\w-]+\.(png|svg)$/.test(name) || !state.entered) fail("卡面尚未解锁", 403);
      const card = config.cards.find((c) => basename(c.art) === name);
      const allowed = card
        ? state.cards.includes(card.id) &&
          (!card.unlockAt || Date.now() >= Date.parse(card.unlockAt))
        : ["lovers-world-gpt.png", basename(config.center.art)].includes(name) &&
          state.cards.includes("lovers") &&
          (!config.center.unlockAt || Date.now() >= Date.parse(config.center.unlockAt)) &&
          ready(state);
      if (!allowed) fail("卡面尚未解锁", 403);
      res.writeHead(200, {
        "Content-Type": name.endsWith(".svg") ? "image/svg+xml" : "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      await pipeline(createReadStream(join(assets, name)), res);
      return true;
    }
    if (req.method !== "POST") fail("活动接口不存在", 404);
    limit("arcana:" + user.uid, 30);
    const input = await body(req);
    // Re-read after an awaited body: concurrent unlocks must not overwrite each other.
    const current = progress(user.uid);
    if (p === "/api/arcana/unlock") {
      if (code(input.code) !== config.accessCode) fail("入口代码不正确", 401);
      current.entered = true;
      save(user.uid, current);
      send(res, 200, { ok: true });
      return true;
    }
    if (!current.entered) fail("请先打开入口", 403);
    if (p === "/api/arcana/card-read") {
      if (!config.cards.some((c) => c.id === input.cardId) || !current.cards.includes(input.cardId))
        fail("卡牌尚未点亮", 403);
      if (!current.read.includes(input.cardId)) current.read.push(input.cardId);
    } else if (p === "/api/arcana/card-unlock") {
      const submitted = code(input.code),
        card = config.cards.find((c) => c.unlockCode === submitted),
        lovers = submitted === config.center.unlockCode;
      if (!card && !lovers) fail("卡牌代码不正确", 401);
      if (lovers && !ready(current)) fail("请先点亮七张牌并读完最后点亮的卡牌", 423);
      if (lovers && config.center.unlockAt && Date.now() < Date.parse(config.center.unlockAt)) fail("尚未到恋人牌开放时间", 423);
      if (card?.unlockAt && Date.now() < Date.parse(card.unlockAt)) fail("尚未到卡牌开放时间", 423);
      const id = lovers ? "lovers" : card.id;
      if (!current.cards.includes(id)) {
        current.cards.push(id);
        if (!lovers) current.lastUnlockedCardId = id;
        save(user.uid, current);
      }
      send(res, 200, { ok: true, cardId: id });
      return true;
    } else if (p === "/api/arcana/story-complete") {
      if (!ready(current) || !current.cards.includes("lovers")) fail("尚未完成最终卡牌解锁", 409);
      if (config.center.unlockAt && Date.now() < Date.parse(config.center.unlockAt)) fail("尚未到恋人牌开放时间", 423);
      current.storyCompleted = true;
    } else fail("活动接口不存在", 404);
    save(user.uid, current);
    send(res, 200, { ok: true });
    return true;
  };
}
