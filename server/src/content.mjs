import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { inspectSchematic } from "./schematic.mjs";

export const BLUEPRINT_CATEGORIES = [
  "生产与加工",
  "仓储与物流",
  "动力与传动",
  "列车与交通",
  "建筑与装饰",
  "其他",
];
export const FORUM_CATEGORIES = ["交流讨论", "游戏求助", "作品分享", "建议反馈"];
export function createContent({ data, db, auth, admin, adminIDs, body, send, limit }) {
  const directory = path.join(data, "blueprints");
  mkdirSync(directory, { recursive: true });
  const uploads = new Set();
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS members(uid TEXT PRIMARY KEY,name TEXT NOT NULL,seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS blueprint_reviewers(uid TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS blueprints(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,mc TEXT NOT NULL,loader TEXT NOT NULL,create_version TEXT NOT NULL,dependencies TEXT NOT NULL,cover TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'uploading',reason TEXT NOT NULL DEFAULT '',reviewer TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL DEFAULT '',size INTEGER NOT NULL DEFAULT 0,sha256 TEXT NOT NULL DEFAULT '',metadata TEXT NOT NULL DEFAULT '{}',downloads INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS blueprint_listing ON blueprints(status,updated);
    CREATE TABLE IF NOT EXISTS content_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS forum_posts(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,pinned INTEGER NOT NULL DEFAULT 0,locked INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS forum_listing ON forum_posts(hidden,pinned,updated);
    CREATE TABLE IF NOT EXISTS forum_replies(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,uid TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL,hidden INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS forum_reply_post ON forum_replies(post_id,created);
    CREATE TABLE IF NOT EXISTS forum_likes(post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,uid TEXT NOT NULL,PRIMARY KEY(post_id,uid));`);
  const fail = (message, status = 400) => {
    throw Object.assign(Error(message), { status });
  };
  const text = (value, max, optional = false) => {
    if (typeof value !== "string" || value.length > max || (!optional && !value.trim()))
      fail("请完整填写内容，且不要超过长度限制");
    return value.trim();
  };
  const optionalUser = (req) => (req.headers.authorization ? auth(req) : null);
  const isAdmin = (user) => !!user && (!!user.consoleAdmin || adminIDs.has(user.uid));
  const reviewer = (user) =>
    isAdmin(user) ||
    (!!user && !!db.prepare("SELECT 1 FROM blueprint_reviewers WHERE uid=?").get(user.uid));
  const audit = (user, kind, id, action, reason = "") =>
    db
      .prepare(
        "INSERT INTO content_audit(actor,kind,target,action,reason,created) VALUES(?,?,?,?,?,?)",
      )
      .run(user.uid, kind, id, action, reason, Date.now());
  const pagination = (url) => ({
    offset: Math.max(0, Math.min(100000, Number(url.searchParams.get("offset")) || 0)),
    size: 24,
  });
  function blueprint(id) {
    const item = db.prepare("SELECT * FROM blueprints WHERE id=?").get(id);
    if (!item) fail("蓝图不存在", 404);
    return item;
  }
  function visible(item, user) {
    return item.status === "approved" || user?.uid === item.uid || reviewer(user);
  }
  function presented(item) {
    return { ...item, metadata: JSON.parse(item.metadata) };
  }
  function cover(value = "") {
    if (!value) return "";
    if (
      typeof value !== "string" ||
      value.length > 400000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)
    )
      fail("封面需为小于 300 KB 的 PNG 图片");
    const bytes = Buffer.from(value.slice(22), "base64");
    if (
      bytes.length < 33 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.subarray(12, 16).toString() !== "IHDR" ||
      !bytes.readUInt32BE(16) ||
      !bytes.readUInt32BE(20) ||
      bytes.readUInt32BE(16) > 1024 ||
      bytes.readUInt32BE(20) > 1024
    )
      fail("封面 PNG 格式或尺寸无效");
    return value;
  }
  async function downloadFile(req, res, item) {
    if (!visible(item, optionalUser(req)) || !item.size) fail("蓝图尚未公开或文件未上传", 403);
    const file = path.join(directory, item.id + ".nbt"),
      stat = await fs.stat(file);
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": stat.size,
      "Content-Disposition":
        "attachment; filename=\"blueprint.nbt\"; filename*=UTF-8''" +
        encodeURIComponent(item.filename),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    await pipeline(createReadStream(file), res);
    if (item.status === "approved")
      db.prepare("UPDATE blueprints SET downloads=downloads+1 WHERE id=?").run(item.id);
  }
  function post(id, user, manage = false) {
    const item = db
      .prepare(
        "SELECT p.*, (SELECT COUNT(*) FROM forum_likes WHERE post_id=p.id) AS likes, (SELECT COUNT(*) FROM forum_replies WHERE post_id=p.id AND hidden=0) AS replies FROM forum_posts p WHERE p.id=?",
      )
      .get(id);
    if (!item || (item.hidden && !(manage && isAdmin(user)))) fail("帖子不存在或已被管理", 404);
    item.liked =
      !!user &&
      !!db.prepare("SELECT 1 FROM forum_likes WHERE post_id=? AND uid=?").get(id, user.uid);
    return item;
  }
  return {
    recordMember(user) {
      db.prepare(
        "INSERT INTO members VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,seen=excluded.seen",
      ).run(user.uid, user.name, Date.now());
    },
    async route(req, res, url) {
      const p = url.pathname,
        method = req.method;
      if (p === "/api/content/access") {
        const user = optionalUser(req);
        send(res, 200, {
          admin: isAdmin(user),
          reviewer: reviewer(user),
          blueprintCategories: BLUEPRINT_CATEGORIES,
          forumCategories: FORUM_CATEGORIES,
        });
        return true;
      }
      if (p === "/api/admin/reviewers") {
        const user = admin(req);
        if (method === "GET") {
          send(res, 200, {
            members: db
              .prepare(
                "SELECT m.*, EXISTS(SELECT 1 FROM blueprint_reviewers r WHERE r.uid=m.uid) AS reviewer FROM members m ORDER BY m.seen DESC LIMIT 500",
              )
              .all(),
            reviewers: db
              .prepare(
                "SELECT r.uid, m.name FROM blueprint_reviewers r LEFT JOIN members m ON m.uid=r.uid",
              )
              .all(),
          });
          return true;
        }
        if (method === "POST") {
          const input = await body(req);
          admin(req);
          if (!/^\w{1,64}$/.test(input.uid) || typeof input.enabled !== "boolean")
            fail("审核员角色无效");
          if (input.enabled)
            db.prepare("INSERT OR IGNORE INTO blueprint_reviewers VALUES(?)").run(input.uid);
          else db.prepare("DELETE FROM blueprint_reviewers WHERE uid=?").run(input.uid);
          audit(user, "reviewer", input.uid, input.enabled ? "appoint" : "remove");
          send(res, 200, { ok: true });
          return true;
        }
      }
      if (p === "/api/blueprints" && method === "GET") {
        const user = optionalUser(req),
          scope = url.searchParams.get("scope") || "public",
          { offset, size } = pagination(url),
          q = (url.searchParams.get("q") || "").slice(0, 100);
        let where = "status='approved'",
          args = [];
        if (scope === "mine") {
          if (!user) fail("请先连接社区", 401);
          where = "uid=?";
          args.push(user.uid);
        }
        if (scope === "review") {
          if (!reviewer(user)) fail("需要蓝图审核权限", 403);
          where = "status='pending'";
        }
        if (scope === "manage") {
          admin(req);
          where = "1=1";
          const status = url.searchParams.get("status");
          if (status) {
            where += " AND status=?";
            args.push(status);
          }
        }
        if (q) {
          where += " AND (title LIKE ? OR name LIKE ? OR description LIKE ?)";
          args.push(...Array(3).fill("%" + q + "%"));
        }
        for (const field of ["category", "mc", "loader", "create_version"]) {
          const value = url.searchParams.get(field);
          if (value) {
            where += " AND " + field + "=?";
            args.push(value);
          }
        }
        const total = db
          .prepare("SELECT COUNT(*) AS n FROM blueprints WHERE " + where)
          .get(...args).n;
        const items = db
          .prepare(
            "SELECT * FROM blueprints WHERE " + where + " ORDER BY updated DESC LIMIT ? OFFSET ?",
          )
          .all(...args, size, offset)
          .map(presented);
        send(res, 200, { items, total });
        return true;
      }
      if (p === "/api/blueprints" && method === "POST") {
        const user = auth(req);
        limit("blueprint:" + user.uid, 6);
        const input = await body(req, 512 * 1024);
        if (db.prepare("SELECT COUNT(*) AS n FROM blueprints WHERE uid=?").get(user.uid).n >= 200)
          fail("个人蓝图数量达到上限，请先整理已有蓝图");
        if (
          !BLUEPRINT_CATEGORIES.includes(input.category) ||
          !["forge", "neoforge", "fabric", "quilt", "通用"].includes(input.loader)
        )
          fail("请选择蓝图分类和加载器");
        const id = randomUUID(),
          now = Date.now();
        db.prepare(
          "INSERT INTO blueprints(id,uid,name,title,description,category,mc,loader,create_version,dependencies,cover,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          user.uid,
          user.name,
          text(input.title, 100),
          text(input.description, 12000),
          input.category,
          text(input.mc, 40),
          input.loader,
          text(input.create_version, 40),
          text(input.dependencies || "", 2000, true),
          cover(input.cover),
          now,
          now,
        );
        send(res, 201, { id });
        return true;
      }
      const match = p.match(/^\/api\/blueprints\/([\w-]+)(?:\/(file|review))?$/);
      if (match) {
        const item = blueprint(match[1]),
          user = optionalUser(req);
        if (match[2] === "file" && method === "GET") {
          await downloadFile(req, res, item);
          return true;
        }
        if (!match[2] && method === "GET") {
          if (!visible(item, user)) fail("蓝图尚未通过审核", 403);
          send(res, 200, presented(item));
          return true;
        }
        if (!match[2] && method === "DELETE") {
          if (!user || (user.uid !== item.uid && !isAdmin(user))) fail("不能删除此蓝图", 403);
          if (uploads.has(item.id)) fail("文件正在上传，请稍后删除");
          await fs.rm(path.join(directory, item.id + ".nbt"), { force: true });
          db.prepare("DELETE FROM blueprints WHERE id=?").run(item.id);
          audit(user, "blueprint", item.id, "delete");
          send(res, 200, { ok: true });
          return true;
        }
        if (match[2] === "review" && method === "POST") {
          if (!reviewer(user)) fail("需要蓝图审核权限", 403);
          if (user.uid === item.uid && !isAdmin(user)) fail("不能审核自己上传的蓝图", 403);
          const input = await body(req);
          if (!reviewer(user)) fail("需要蓝图审核权限", 403);
          blueprint(item.id);
          if (
            !["approved", "rejected"].includes(input.status) ||
            !item.size ||
            !["pending", "approved", "rejected"].includes(item.status)
          )
            fail("蓝图暂不可审核");
          const reason = text(input.reason || "", 1000, input.status === "approved");
          db.prepare("UPDATE blueprints SET status=?,reason=?,reviewer=?,updated=? WHERE id=?").run(
            input.status,
            reason,
            user.uid,
            Date.now(),
            item.id,
          );
          audit(user, "blueprint", item.id, input.status, reason);
          send(res, 200, { ok: true });
          return true;
        }
        if (match[2] === "file" && method === "PUT") {
          if (!user || user.uid !== item.uid) fail("只能上传自己的蓝图文件", 403);
          if (item.status !== "uploading") fail("该蓝图已提交审核，替换文件请重新上传");
          if (uploads.size >= 2 || uploads.has(item.id)) fail("上传通道繁忙，请稍后重试", 429);
          uploads.add(item.id);
          const temp = path.join(directory, item.id + "." + randomUUID() + ".part");
          let bytes = 0;
          const hash = createHash("sha256");
          try {
            const meter = new Transform({
              transform(chunk, _, done) {
                bytes += chunk.length;
                if (bytes > 8 * 1024 * 1024) return done(Error("蓝图文件不能超过 8 MB"));
                hash.update(chunk);
                done(null, chunk);
              },
            });
            await pipeline(req, meter, createWriteStream(temp, { flags: "wx" }));
            const metadata = await inspectSchematic(await fs.readFile(temp));
            await fs.rename(temp, path.join(directory, item.id + ".nbt"));
            db.prepare(
              "UPDATE blueprints SET status='pending',filename=?,size=?,sha256=?,metadata=?,updated=? WHERE id=?",
            ).run(
              item.title.replace(/[\\/:*?"<>|]/g, "_") + ".nbt",
              bytes,
              hash.digest("hex"),
              JSON.stringify(metadata),
              Date.now(),
              item.id,
            );
            send(res, 200, { status: "pending", metadata });
          } finally {
            uploads.delete(item.id);
            await fs.rm(temp, { force: true });
          }
          return true;
        }
        fail("不支持的蓝图操作", 405);
      }
      if (p === "/api/forum/posts" && method === "GET") {
        const user = optionalUser(req),
          manage = url.searchParams.get("manage") === "1" && isAdmin(user),
          { offset, size } = pagination(url),
          args = [];
        let where = manage ? "1=1" : "p.hidden=0";
        const q = (url.searchParams.get("q") || "").slice(0, 100),
          category = url.searchParams.get("category");
        if (q) {
          where += " AND (p.title LIKE ? OR p.body LIKE ?)";
          args.push("%" + q + "%", "%" + q + "%");
        }
        if (category) {
          where += " AND p.category=?";
          args.push(category);
        }
        const total = db
          .prepare("SELECT COUNT(*) AS n FROM forum_posts p WHERE " + where)
          .get(...args).n;
        const items = db
          .prepare(
            "SELECT p.*, substr(p.body,1,180) AS body, (SELECT COUNT(*) FROM forum_likes WHERE post_id=p.id) AS likes,(SELECT COUNT(*) FROM forum_replies WHERE post_id=p.id AND hidden=0) AS replies FROM forum_posts p WHERE " +
              where +
              " ORDER BY p.pinned DESC,p.updated DESC LIMIT ? OFFSET ?",
          )
          .all(...args, size, offset);
        send(res, 200, { items, total });
        return true;
      }
      if (p === "/api/forum/posts" && method === "POST") {
        const user = auth(req);
        limit("forum-post:" + user.uid, 4);
        const input = await body(req);
        if (!FORUM_CATEGORIES.includes(input.category)) fail("请选择帖子分类");
        const id = randomUUID(),
          now = Date.now();
        db.prepare(
          "INSERT INTO forum_posts(id,uid,name,title,body,category,created,updated) VALUES(?,?,?,?,?,?,?,?)",
        ).run(
          id,
          user.uid,
          user.name,
          text(input.title, 100),
          text(input.body, 12000),
          input.category,
          now,
          now,
        );
        send(res, 201, { id });
        return true;
      }
      const forum = p.match(/^\/api\/forum\/posts\/([\w-]+)(?:\/(replies|like|moderate))?$/);
      if (forum) {
        const user = optionalUser(req),
          item = post(forum[1], user, true);
        if (!forum[2] && method === "GET") {
          const { offset, size } = pagination(url);
          const items = db
            .prepare(
              "SELECT * FROM forum_replies WHERE post_id=?" +
                (isAdmin(user) ? "" : " AND hidden=0") +
                " ORDER BY created,id LIMIT ? OFFSET ?",
            )
            .all(item.id, size, offset);
          send(res, 200, {
            post: item,
            replies: items,
            total: db
              .prepare(
                "SELECT COUNT(*) AS n FROM forum_replies WHERE post_id=?" +
                  (isAdmin(user) ? "" : " AND hidden=0"),
              )
              .get(item.id).n,
          });
          return true;
        }
        if (forum[2] === "moderate" && method === "POST") {
          admin(req);
          const input = await body(req);
          admin(req);
          post(item.id, user, true);
          if (
            !["hidden", "locked", "pinned"].includes(input.action) ||
            typeof input.value !== "boolean"
          )
            fail("管理操作无效");
          db.prepare("UPDATE forum_posts SET " + input.action + "=? WHERE id=?").run(
            input.value ? 1 : 0,
            item.id,
          );
          audit(user, "forum", item.id, input.action, String(input.value));
          send(res, 200, { ok: true });
          return true;
        }
        if (!user) fail("请先连接社区", 401);
        if (!forum[2] && method === "DELETE") {
          if (!isAdmin(user) && item.uid !== user.uid) fail("不能删除他人的帖子", 403);
          db.prepare("DELETE FROM forum_posts WHERE id=?").run(item.id);
          audit(user, "forum", item.id, "delete");
          send(res, 200, { ok: true });
          return true;
        }
        if (forum[2] === "replies" && method === "POST") {
          if (item.locked || item.hidden) fail("该帖子已关闭回复");
          limit("forum-reply:" + user.uid, 12);
          const input = await body(req),
            id = randomUUID(),
            current = post(item.id, user, true);
          if (current.locked || current.hidden) fail("该帖子已关闭回复");
          db.prepare(
            "INSERT INTO forum_replies(id,post_id,uid,name,body,created) VALUES(?,?,?,?,?,?)",
          ).run(id, item.id, user.uid, user.name, text(input.body, 5000), Date.now());
          db.prepare("UPDATE forum_posts SET updated=? WHERE id=?").run(Date.now(), item.id);
          send(res, 201, { id });
          return true;
        }
        if (forum[2] === "like" && method === "PUT") {
          if (item.hidden) fail("帖子不可操作");
          limit("forum-like:" + user.uid, 60);
          const input = await body(req);
          post(item.id, user);
          if (typeof input.liked !== "boolean") fail("点赞状态无效");
          if (input.liked)
            db.prepare("INSERT OR IGNORE INTO forum_likes VALUES(?,?)").run(item.id, user.uid);
          else
            db.prepare("DELETE FROM forum_likes WHERE post_id=? AND uid=?").run(item.id, user.uid);
          send(res, 200, post(item.id, user));
          return true;
        }
        fail("不支持的论坛操作", 405);
      }
      const reply = p.match(/^\/api\/forum\/replies\/([\w-]+)$/);
      if (reply && method === "DELETE") {
        const user = auth(req),
          item = db.prepare("SELECT * FROM forum_replies WHERE id=?").get(reply[1]);
        if (!item) fail("回复不存在", 404);
        if (item.uid !== user.uid && !isAdmin(user)) fail("不能删除他人的回复", 403);
        db.prepare("DELETE FROM forum_replies WHERE id=?").run(item.id);
        audit(user, "reply", item.id, "delete");
        send(res, 200, { ok: true });
        return true;
      }
      return false;
    },
  };
}
