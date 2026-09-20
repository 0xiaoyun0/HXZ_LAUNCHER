import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createCommunity } from "../src/server.mjs";
test("ARCANA uses separate player progress, enforces final reveal and persists; admin settings stay private", async (t) => {
  const data = await mkdtemp(path.join(tmpdir(), "hxz-arcana-"));
  let server;
  const start = async () => {
    server = createCommunity({
      data,
      adminIDs: ["alice"],
      exchange: async (input) => ({ selectedProfile: { id: input.id, name: input.id } }),
    });
    server.server.listen(0, "127.0.0.1");
    await once(server.server, "listening");
  };
  await start();
  t.after(async () => {
    await server.close();
    await rm(data, { recursive: true, force: true });
  });
  let token = "";
  async function api(p, method = "GET", body) {
    const r = await fetch("http://127.0.0.1:" + server.server.address().port + p, {
      method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    return { status: r.status, value: await r.json() };
  }
  token = (await api("/api/session", "POST", { id: "alice" })).value.token;
  const alice = token;
  const config = (await api("/api/admin/arcana")).value;
  const initial = (await api("/api/arcana/public")).value;
  assert.deepEqual(initial.cards, []);
  assert.ok(!JSON.stringify(initial).includes(config.accessCode));
  await api("/api/arcana/unlock", "POST", { code: config.accessCode });
  assert.deepEqual(config.cards.map(c=>c.unlockAt),['2026-10-01','2026-11-01','2026-12-01','2027-01-01','2027-02-01','2027-03-01','2027-04-01'].map(d=>d+'T00:00:00+08:00'));
  // The fixture opens the schedule explicitly; production keeps monthly gating.
  for(const card of config.cards)card.unlockAt='2000-01-01T00:00:00+08:00';
  assert.equal((await api('/api/admin/arcana','PUT',config)).status,200);
  for (const card of [...config.cards.slice(1), config.cards[0]])
    assert.equal(
      (await api("/api/arcana/card-unlock", "POST", { code: card.unlockCode })).status,
      200,
    );
  assert.equal(
    (await api("/api/arcana/card-unlock", "POST", { code: config.center.unlockCode })).status,
    423,
  );
  await api("/api/arcana/card-read", "POST", { cardId: config.cards[0].id });
  let view = (await api("/api/arcana/public")).value;
  assert.equal(view.finalRevealReady, true);
  assert.equal(view.cards.length, 8);
  assert.equal(view.center.dialogue, undefined);
  assert.ok(!JSON.stringify(view).includes("unlockCode"));
  assert.equal(config.center.unlockAt, '2027-05-01T00:00:00+08:00');
  assert.equal(view.cards.find(c=>c.id==='lovers').state, 'locked');
  assert.equal((await api('/api/arcana/card-unlock','POST',{code:config.center.unlockCode})).status,423);
  config.center.unlockAt='2000-01-01T00:00:00+08:00';
  assert.equal((await api('/api/admin/arcana','PUT',config)).status,200);
  assert.equal(
    (await api("/api/arcana/card-unlock", "POST", { code: config.center.unlockCode })).status,
    200,
  );
  assert.equal((await api("/api/arcana/story-complete", "POST", {})).status, 200);
  token = (await api("/api/session", "POST", { id: "bob" })).value.token;
  assert.equal((await api("/api/arcana/public")).value.entered, false);
  assert.notEqual((await api("/api/admin/arcana")).status, 200);
  token = alice;
  await server.close();
  await start();
  assert.equal((await api("/api/arcana/public")).value.storyCompleted, true);
  assert.ok((await readFile(path.join(data, "arcana/config.json"), "utf8")).includes(config.title));
  assert.equal((await api("/api/blueprints/versions")).status, 200);
});
