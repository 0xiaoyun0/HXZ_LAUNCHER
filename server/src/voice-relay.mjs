// Client frame: protocol(1), epoch(4), sequence(4), raw 20ms Opus packet.
// Server inserts the authenticated connection UUID after the protocol byte.
export function relayVoice(ws, raw, clients) {
  const c = clients.get(ws);
  if (!c || !c.room || c.muted || c.voiceTransport !== "ws-opus-v1" || c.user.exp < Date.now())
    return;
  if (raw.length < 10 || raw.length > 4009 || raw[0] !== 1) return;
  const now = Date.now();
  if (!c.audioRate || now - c.audioRate.time >= 1000)
    c.audioRate = { time: now, count: 0, bytes: 0 };
  if (++c.audioRate.count > 65 || (c.audioRate.bytes += raw.length) > 32000) return;
  const epoch = raw.readUInt32BE(1),
    seq = raw.readUInt32BE(5);
  if (c.audioEpoch === epoch && seq <= c.audioSeq) return;
  c.audioEpoch = epoch;
  c.audioSeq = seq;
  const frame = Buffer.concat([raw.subarray(0, 1), Buffer.from(c.id, "ascii"), raw.subarray(1)]);
  for (const [target, member] of clients) {
    if (
      target !== ws &&
      member.room === c.room &&
      member.voiceTransport === "ws-opus-v1" &&
      !member.deafened &&
      target.readyState === 1 &&
      target.bufferedAmount < 32 * 1024
    )
      target.send(frame, { binary: true });
  }
}
