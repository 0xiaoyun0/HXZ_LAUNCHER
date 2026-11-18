import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createCommunity } from "../src/server.mjs";
test("reply parent survives fetch, cross-post parents rejected, deleted parent leaves children", async (t) => {
  const data = await mkdtemp(path.join(tmpdir(), "hxz-replies-"));
  const s = createCommunity({
    data,
    exchange: async () => ({ selectedProfile: { id: "alice", name: "Alice" } }),
  });
  s.server.listen(0, "127.0.0.1");
  await once(s.server, "listening");
  t.after(async () => {
    await s.close();
    await rm(data, { recursive: true, force: true });
  });
  const base = "http://127.0.0.1:" + s.server.address().port;
  let token = "";
  async function api(p, method = "GET", body) {
    const r = await fetch(base + p, {
      method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    return { status: r.status, value: await r.json() };
  }
  token = (await api("/api/session", "POST", {})).value.token;
  const post = (
    await api("/api/forum/posts", "POST", { title: "Thread", body: "text", category: "交流讨论" })
  ).value.id;
  const post2 = (
    await api("/api/forum/posts", "POST", { title: "Other", body: "text", category: "交流讨论" })
  ).value.id;
  const parent = (await api("/api/forum/posts/" + post + "/replies", "POST", { body: "parent" }))
    .value.id;
  const child = (
    await api("/api/forum/posts/" + post + "/replies", "POST", { body: "child", parentId: parent })
  ).value.id;
  assert.equal(
    (await api("/api/forum/posts/" + post)).value.replies.find((r) => r.id === child).parentId,
    parent,
  );
  assert.equal(
    (await api("/api/forum/posts/" + post2 + "/replies", "POST", { body: "bad", parentId: parent }))
      .status,
    400,
  );
  assert.equal(
    (await api("/api/forum/replies/" + child + "/like", "PUT", { liked: true })).value.likes,
    1,
  );
  assert.equal(
    (await api("/api/forum/replies/" + child + "/like", "PUT", { liked: true })).value.likes,
    1,
  );
  assert.equal(
    (await api("/api/forum/posts/" + post)).value.replies.find((r) => r.id === child).liked,
    true,
  );
  assert.equal(
    (await api("/api/forum/replies/" + child + "/like", "PUT", { liked: false })).value.likes,
    0,
  );
  await api("/api/forum/replies/" + parent, "DELETE");
  assert.ok((await api("/api/forum/posts/" + post)).value.replies.some((r) => r.id === child));
});
