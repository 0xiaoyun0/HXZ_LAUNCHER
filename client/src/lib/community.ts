import { reactive } from "vue";
import { createRelayVoice } from "./voice-relay.mjs";
import { invoke, errorMessage, loadNotices, state } from "./launcher";
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
  voiceTransport?: string;
  roomLimit?: number;
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
  action?: "join" | "leave";
  room?: string;
  voiceUser?: { id: string; uid: string; name: string };
}
export const chatView = reactive({
  draft: "",
  scrollTop: 0,
  atBottom: true,
  device: "",
  devices: [] as MediaDeviceInfo[],
  voiceTalking: false
});
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
  peers: 0,
  roomLimit: 20,
  voiceTransport: "",
  voiceTalking: false
});
let socket: WebSocket | null = null,
  credentials: Session | null = null,
  stream: MediaStream | null = null;
let voice: ReturnType<typeof createRelayVoice> | null = null,
  voiceGeneration = 0;
let generation = 0,
  retryTimer: ReturnType<typeof setTimeout> | undefined,
  retries = 0,
  heartbeat: ReturnType<typeof setInterval> | undefined,
  wanted = false,
  refreshSession = false;
let talking = false,
  audioContext: AudioContext | null = null;

function voiceKeyMatches(event: KeyboardEvent) {
  const key = state.settings.voiceKey || "KeyT";
  return event.code === key || event.key === key;
}
function canTransmit() {
  return state.settings.voiceMode !== "push-to-talk" || talking;
}
function playVoiceTone(action: "join" | "leave") {
  if (!state.settings.voiceSounds) return;
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(action === "join" ? 660 : 440, now);
    oscillator.frequency.linearRampToValueAtTime(
      action === "join" ? 880 : 330,
      now + 0.1
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  } catch {}
}

function send(value: unknown) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !community.connected)
    throw Error("社区尚未连接");
  socket.send(JSON.stringify(value));
}
function voiceMembers() {
  return community.users
    .filter(u => u.id !== community.id && u.room === community.room)
    .map(u => u.id);
}
function syncPeers() {
  const own = community.users.find(u => u.id === community.id);
  if (community.room && own?.room !== community.room) return;
  const ids = voiceMembers();
  voice?.sync(ids);
  community.peers = community.room ? ids.length : 0;
}
function voiceCleanup() {
  voiceGeneration++;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  voice?.close();
  voice = null;
  community.room = "";
  community.peers = 0;
  community.muted = false;
  community.deafened = false;
  talking = false;
  community.voiceTalking = false;
  chatView.voiceTalking = false;
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
  chatView.draft = "";
  chatView.scrollTop = 0;
  chatView.atBottom = true;
  community.status = "未连接";
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
    ws.binaryType = "arraybuffer";
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
      if (event.data instanceof ArrayBuffer) {
        voice?.receive(event.data, voiceMembers());
        return;
      }
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
        community.voiceTransport = packet.voiceTransport || "";
        community.roomLimit = packet.roomLimit || 20;
        community.id = packet.id!;
        community.user = packet.user!;
        community.messages = packet.messages || [];
      } else if (packet.type === "presence") {
        community.users = packet.users || [];
        syncPeers();
      } else if (
        packet.type === "voice-event" &&
        packet.action &&
        packet.voiceUser
      ) {
        if (
          packet.voiceUser.id === community.id ||
          packet.room === community.room
        )
          playVoiceTone(packet.action);
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
      } else if (packet.type === "notices-changed") void loadNotices();
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
  if (community.voiceTransport !== "ws-opus-v1")
    throw Error("社区服务端尚未升级到 0.4.1，暂不支持语音转发");
  leaveVoice();
  community.voiceError = "";
  const attempt = voiceGeneration;
  const acquired = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    }
  });
  if (attempt !== voiceGeneration || !community.connected) {
    acquired.getTracks().forEach(t => t.stop());
    return;
  }
  stream = acquired;
  const relay = createRelayVoice({
    send: (bytes: ArrayBuffer) => {
      if (
        socket?.readyState === WebSocket.OPEN &&
        community.room &&
        !community.muted &&
        canTransmit() &&
        socket.bufferedAmount < 32768
      )
        socket.send(bytes);
    },
    onError: (error: unknown) => {
      community.voiceError = errorMessage(error);
    }
  });
  voice = relay;
  try {
    await relay.start(acquired);
    if (attempt !== voiceGeneration || !community.connected) {
      relay.close();
      return;
    }
    community.room = room;
    send({ type: "voice-join", room, transport: "ws-opus-v1" });
  } catch (error) {
    if (attempt === voiceGeneration) voiceCleanup();
    throw error;
  }
}
export function leaveVoice() {
  if (community.connected && community.room) send({ type: "voice-leave" });
  voiceCleanup();
}
export function toggleMute() {
  community.muted = !community.muted;
  voice?.mute(community.muted);
  stream?.getAudioTracks().forEach(track => {
    track.enabled = !community.muted;
  });
  if (community.connected) send({ type: "voice-mute", muted: community.muted });
}
export function toggleDeafen() {
  community.deafened = !community.deafened;
  voice?.deafen(community.deafened);
  if (community.connected)
    send({ type: "voice-deafen", deafened: community.deafened });
}
function handleTalkKey(event: KeyboardEvent, active: boolean) {
  if (state.settings.voiceMode !== "push-to-talk" || !voiceKeyMatches(event))
    return;
  if (active && event.repeat) return;
  event.preventDefault();
  talking = active;
  community.voiceTalking = active;
  chatView.voiceTalking = active;
}
window.addEventListener("keydown", event => handleTalkKey(event, true));
window.addEventListener("keyup", event => handleTalkKey(event, false));
window.addEventListener("blur", () => {
  talking = false;
  community.voiceTalking = false;
  chatView.voiceTalking = false;
});
window.addEventListener("online", () => {
  if (wanted && !community.connected && !community.connecting) {
    retries = 0;
    void connect();
  }
});
window.addEventListener("beforeunload", disconnect);

export async function communityRequest<T>(
  path: string,
  options: RequestInit = {},
  requireLogin = false
): Promise<T> {
  if (requireLogin && !credentials) throw Error("请先连接社区");
  if (!path.startsWith("/api/")) throw Error("无效社区接口");
  const base =
    credentials?.base || state.settings.communityUrl.replace(/\/$/, "");
  const headers = new Headers(options.headers);
  if (credentials) headers.set("Authorization", "Bearer " + credentials.token);
  const response = await fetch(base + path, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(30000)
  });
  if (
    response.status === 404 &&
    ["/api/content/access", "/api/blueprints", "/api/forum/posts"].includes(
      path.split("?")[0]!
    )
  )
    throw Error("社区服务端尚未升级到 0.4.1，请联系管理员更新社区服务");
  const value = await response.json();
  if (!response.ok) throw Error(value.error || "社区请求未完成");
  return value as T;
}
