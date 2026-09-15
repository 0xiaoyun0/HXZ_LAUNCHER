import { reactive } from "vue";
import { invoke, errorMessage, loadNotices } from "./launcher";
export interface Member {
  id: string;
  uid: string;
  avatarVersion?: string;
  name: string;
  room: string | null;
  muted: boolean;
}
export interface ChatMessage {
  id: number;
  uid: string;
  avatarVersion?: string;
  name: string;
  body: string;
  created: number;
}
interface Session {
  token: string;
  base: string;
  user: { uid: string; name: string; admin: boolean; avatarVersion?: string };
}
interface Packet {
  heartbeatInterval?: number;
  uid?: string;
  avatarVersion?: string;
  type: string;
  id?: string;
  user?: Session["user"];
  users?: Member[];
  messages?: ChatMessage[];
  message?: ChatMessage;
  error?: string;
  from?: string;
  data?: {
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}
interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  candidates: RTCIceCandidateInit[];
  queue: Promise<void>;
}
export const community = reactive({
  status: "未连接",
  connected: false,
  connecting: false,
  error: "",
  id: "",
  user: null as Session["user"] | null,
  users: [] as Member[],
  messages: [] as ChatMessage[],
  room: "",
  muted: false,
  deafened: false,
  voiceError: "",
  peers: 0
});
let socket: WebSocket | null = null,
  credentials: Session | null = null,
  stream: MediaStream | null = null,
  iceServers: RTCIceServer[] = [];
let generation = 0,
  retryTimer: ReturnType<typeof setTimeout> | undefined,
  retries = 0,
  heartbeat: ReturnType<typeof setInterval> | undefined,
  wanted = false,
  refreshSession = false;
const peers = new Map<string, Peer>();
function send(value: unknown) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !community.connected)
    throw Error("社区尚未连接");
  socket.send(JSON.stringify(value));
}
function disposePeer(id: string) {
  const peer = peers.get(id);
  if (!peer) return;
  peer.pc.close();
  peer.audio.pause();
  peer.audio.srcObject = null;
  peers.delete(id);
  community.peers = peers.size;
}
function voiceCleanup() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  for (const id of peers.keys()) disposePeer(id);
  community.room = "";
  community.muted = false;
  community.deafened = false;
}
export function disconnect() {
  wanted = false;
  retries = 0;
  generation++;
  clearInterval(heartbeat);
  clearTimeout(retryTimer);
  retryTimer = undefined;
  voiceCleanup();
  socket?.close();
  socket = null;
  credentials = null;
  community.connected = false;
  community.connecting = false;
  community.user = null;
  community.users = [];
  community.messages = [];
  community.status = "未连接";
}
function createPeer(id: string) {
  const existing = peers.get(id);
  if (existing) return existing;
  if (!stream) throw Error("麦克风尚未准备好");
  const pc = new RTCPeerConnection({ iceServers }),
    audio = new Audio();
  audio.autoplay = true;
  audio.muted = community.deafened;
  const peer: Peer = { pc, audio, candidates: [], queue: Promise.resolve() };
  peers.set(id, peer);
  community.peers = peers.size;
  stream.getTracks().forEach(track => pc.addTrack(track, stream!));
  pc.onicecandidate = event => {
    if (event.candidate && community.connected)
      send({
        type: "signal",
        to: id,
        data: { candidate: event.candidate.toJSON() }
      });
  };
  pc.ontrack = event => {
    audio.srcObject = event.streams[0] || new MediaStream([event.track]);
    void audio.play().catch(() => {
      community.voiceError = "音频播放被暂停，请重新加入语音";
    });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed")
      community.voiceError =
        "语音连接失败；请重连。跨网络连接需要服务端配置 TURN。";
  };
  return peer;
}
function syncPeers() {
  const own = community.users.find(user => user.id === community.id);
  if (!community.room || !stream || own?.room !== community.room) return;
  const members = community.users.filter(
    user => user.id !== community.id && user.room === community.room
  );
  for (const id of peers.keys())
    if (!members.some(user => user.id === id)) disposePeer(id);
  for (const member of members)
    if (!peers.has(member.id)) {
      const peer = createPeer(member.id);
      if (community.id < member.id)
        peer.queue = peer.queue
          .then(async () => {
            await peer.pc.setLocalDescription(await peer.pc.createOffer());
            send({
              type: "signal",
              to: member.id,
              data: { description: peer.pc.localDescription }
            });
          })
          .catch(error => {
            community.voiceError = errorMessage(error);
          });
    }
}
async function receiveSignal(packet: Packet) {
  if (!packet.from || !packet.data || !stream || !community.room) return;
  if (
    !community.users.some(
      user => user.id === packet.from && user.room === community.room
    )
  )
    return;
  const id = packet.from,
    data = packet.data,
    peer = createPeer(id);
  peer.queue = peer.queue
    .then(async () => {
      if (data.description) {
        await peer.pc.setRemoteDescription(data.description);
        for (const candidate of peer.candidates.splice(0))
          await peer.pc.addIceCandidate(candidate);
        if (data.description.type === "offer") {
          await peer.pc.setLocalDescription(await peer.pc.createAnswer());
          send({
            type: "signal",
            to: id,
            data: { description: peer.pc.localDescription }
          });
        }
      } else if (data.candidate) {
        if (peer.pc.remoteDescription)
          await peer.pc.addIceCandidate(data.candidate);
        else if (peer.candidates.length < 128)
          peer.candidates.push(data.candidate);
      }
    })
    .catch(error => {
      community.voiceError = errorMessage(error);
    });
  await peer.queue;
}
function scheduleRetry() {
  clearTimeout(retryTimer);
  if (!wanted) return;
  const wait =
    Math.min(30000, 1500 * 2 ** Math.min(retries++, 5)) +
    Math.floor(Math.random() * 1000);
  community.status = "连接中断，正在重试";
  retryTimer = setTimeout(() => {
    if (wanted) void connect();
  }, wait);
}
export async function connect() {
  wanted = true;
  clearTimeout(retryTimer);
  if (community.connecting || community.connected) return;
  const attempt = ++generation;
  community.connecting = true;
  community.error = "";
  community.status = "正在验证身份";
  try {
    const session = await invoke<Session>("community.connect", {
      refresh: refreshSession
    });
    if (attempt !== generation) return;
    credentials = session;
    refreshSession = false;
    const url = new URL(session.base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/$/, "") + "/ws";
    const ws = new WebSocket(url);
    socket = ws;
    community.status = "正在连接社区";
    const timeout = setTimeout(() => ws.close(), 20000);
    let lastMessage = Date.now(),
      readyAt = 0;
    ws.onopen = () => {
      if (attempt !== generation) {
        ws.close();
        return;
      }
      ws.send(JSON.stringify({ type: "auth", token: session.token }));
    };
    ws.onmessage = event => {
      if (attempt !== generation) return;
      lastMessage = Date.now();
      let packet: Packet;
      try {
        packet = JSON.parse(String(event.data)) as Packet;
      } catch {
        return;
      }
      if (packet.type === "ready") {
        clearTimeout(timeout);
        readyAt = Date.now();
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (attempt !== generation || ws.readyState !== WebSocket.OPEN)
            return;
          if (packet.heartbeatInterval && Date.now() - lastMessage > 90000) {
            ws.close();
            return;
          }
          if (packet.heartbeatInterval)
            ws.send(JSON.stringify({ type: "ping" }));
        }, 15000);
        community.connected = true;
        community.connecting = false;
        community.status = "社区在线";
        community.id = packet.id!;
        community.user = packet.user!;
        community.messages = packet.messages || [];
      } else if (packet.type === "presence") {
        community.users = packet.users || [];
        syncPeers();
      } else if (packet.type === "avatar-changed") {
        for (const member of community.users)
          if (member.uid === packet.uid)
            member.avatarVersion = packet.avatarVersion || "";
        for (const message of community.messages)
          if (message.uid === packet.uid)
            message.avatarVersion = packet.avatarVersion || "";
        if (community.user && community.user.uid === packet.uid)
          community.user.avatarVersion = packet.avatarVersion || "";
      } else if (packet.type === "message-deleted") {
        community.messages = community.messages.filter(
          m => String(m.id) !== String(packet.id)
        );
      } else if (packet.type === "chat" && packet.message) {
        community.messages.push(packet.message);
        if (community.messages.length > 300)
          community.messages.splice(0, community.messages.length - 300);
      } else if (packet.type === "signal") void receiveSignal(packet);
      else if (packet.type === "notices-changed") void loadNotices();
      else if (packet.type === "error") {
        community.error = packet.error || "社区请求未完成";
        if (
          community.room &&
          !community.users.some(
            user => user.id === community.id && user.room === community.room
          )
        )
          voiceCleanup();
      }
    };
    ws.onerror = () => {
      community.error = "无法连接社区，请检查服务地址与网络";
    };
    ws.onclose = event => {
      clearTimeout(timeout);
      if (attempt !== generation) return;
      voiceCleanup();
      community.connected = false;
      community.connecting = false;
      community.users = [];
      community.status = "连接已断开";
      if (event.reason) community.error = event.reason;
      clearInterval(heartbeat);
      socket = null;
      if (readyAt && Date.now() - readyAt > 60000) retries = 0;
      if (event.code === 1008 && /禁用|封禁|过多连接/.test(event.reason)) {
        wanted = false;
        return;
      }
      if (event.code === 1008) refreshSession = true;
      scheduleRetry();
    };
  } catch (error) {
    if (attempt !== generation) return;
    community.connecting = false;
    community.status = "连接未完成";
    community.error = errorMessage(error);
    if (/请先登录|未选择角色|账号已失效|密码|禁用|封禁/.test(community.error))
      wanted = false;
    scheduleRetry();
  }
}
export function sendChat(body: string) {
  if (!body.trim() || body.length > 1000)
    throw Error("消息请输入 1–1000 个字符");
  send({ type: "chat", body });
}
export async function joinVoice(room: string, deviceId = "") {
  if (!credentials || !community.connected) throw Error("请先连接社区");
  leaveVoice();
  community.voiceError = "";
  const attempt = generation;
  const response = await fetch(credentials.base + "/api/voice-config", {
    headers: { Authorization: "Bearer " + credentials.token },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw Error("获取语音配置失败");
  iceServers = ((await response.json()) as { iceServers: RTCIceServer[] })
    .iceServers;
  const acquired = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    }
  });
  if (attempt !== generation || !community.connected) {
    acquired.getTracks().forEach(track => track.stop());
    return;
  }
  stream = acquired;
  community.room = room;
  send({ type: "voice-join", room });
}
export function leaveVoice() {
  if (community.connected && community.room) send({ type: "voice-leave" });
  voiceCleanup();
}
export function toggleMute() {
  community.muted = !community.muted;
  stream?.getAudioTracks().forEach(track => {
    track.enabled = !community.muted;
  });
  if (community.connected) send({ type: "voice-mute", muted: community.muted });
}
export function toggleDeafen() {
  community.deafened = !community.deafened;
  for (const peer of peers.values()) peer.audio.muted = community.deafened;
}
window.addEventListener("online", () => {
  if (wanted && !community.connected && !community.connecting) {
    retries = 0;
    void connect();
  }
});
window.addEventListener("beforeunload", disconnect);
