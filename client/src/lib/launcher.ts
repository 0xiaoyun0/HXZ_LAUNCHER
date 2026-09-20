import { reactive, computed } from "vue";
import { Notify } from "quasar";
export interface InstanceConfig {
  memoryMode: "inherit" | "auto" | "manual";
  autoJoin: boolean;
  serverAddress: string;
  memoryMB: number;
  favorite: boolean;
  width: number;
  height: number;
  isolated: boolean;
  autoUpdate: boolean;
  fullscreen: boolean;
  updateUrls: string[];
  jvmArgs: string[];
  coverPositionX: number;
  coverPositionY: number;
  coverZoom: number;
}
export interface Settings {
  appearanceVersion: number;
  fontSize: number;
  accentColor: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundOpacity: number;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundFit: string;
  layout: string;
  downloadMode: string;
  downloadConcurrency: number;
  updateFeed: string;
  autoCheckUpdates: boolean;
  memoryMode: string;
  defaultMemoryMB: number;
  voiceMode: string;
  voiceKey: string;
  voiceSounds: boolean;
  hxzupPopup: boolean;
  simpleHome: boolean;
  gameRoot: string;
  javaPath: string;
  selectedInstance: string;
  selectedAccount: string;
  theme: string;
  communityUrl: string;
  hiddenLinks: string[];
  columns: {
    sidebar: {
      visible: boolean;
      color: string;
      opacity: number;
      label: string;
    };
    workspace: {
      visible: boolean;
      color: string;
      opacity: number;
      label: string;
    };
    dock: { visible: boolean; color: string; opacity: number; label: string };
  };
  instanceSettings: Record<string, InstanceConfig>;
}
export interface Account {
  avatar?: string;
  id: string;
  username: string;
  name: string;
  uuid: string;
  persistent: boolean;
  profiles: { id: string; name: string }[];
}
type StoredAccount = Account & {
  accessToken: string;
  clientToken: string;
  avatars?: Record<string, string>;
};
export interface Instance {
  id: string;
  name: string;
  version: string;
  loader: string;
  javaMajor: number;
  error?: string;
  builtin?: boolean;
  placeholder?: boolean;
  address?: string;
}
export interface Notice {
  id: string;
  groupId: string;
  title: string;
  body: string;
  author: string;
  updated: number;
}
interface State {
  settings: Settings;
  accounts: Account[];
  instances: Instance[];
  persistentCredentials: boolean;
  system: { memoryMB: number; freeMemoryMB: number; platform: string };
  running: boolean;
}
export interface TaskStep {
  phase: string;
  started: number;
  ended: number;
  status: string;
  completed: number;
  total: number;
  unit: string;
}
interface Event {
  unit?: string;
  received?: number;
  activeFiles?: string[];
  detail?: string;
  failed?: boolean;
  cancelled?: boolean;
  failure?: string;
  version?: string;
  percent?: number;
  available?: boolean;
  ready?: boolean;
  type: string;
  line?: string;
  lines?: string[];
  phase?: string;
  busy?: boolean;
  running?: boolean;
  completed?: number;
  total?: number;
  error?: string;
}
declare global {
  interface Window {
    launcher?: {
      filePath(file: File): string;
      invoke(
        action: string,
        input?: unknown
      ): Promise<{ ok: boolean; value: unknown; error?: string }>;
      subscribe(callback: (event: Event) => void): () => void;
    };
  }
}
export const desktop = !!window.launcher;
export const groups = [
  { id: "survival", name: "原版生存群组" },
  { id: "mod-1", name: "模组一服" },
  { id: "mod-2", name: "模组二服" }
];
export const state = reactive<State>({
  settings: {
    appearanceVersion: 2,
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    backgroundImage: "",
    backgroundOpacity: 0.4,
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundFit: "cover",
    layout: "standard",
    downloadMode: "domestic",
    downloadConcurrency: 64,
    updateFeed: "",
    autoCheckUpdates: true,
    memoryMode: "auto",
    defaultMemoryMB: 4096,
    voiceMode: "open",
    voiceKey: "KeyT",
    voiceSounds: true,
    hxzupPopup: true,
    simpleHome: false,
    gameRoot: "",
    javaPath: "",
    selectedInstance: "",
    selectedAccount: "",
    theme: localStorage.getItem("hxz-theme") || "light",
    communityUrl: "https://qqbot.hxzmc.top",
    hiddenLinks: [],
    columns: {
      sidebar: { visible: true, color: "", opacity: 1, label: "游戏与社区" },
      workspace: { visible: true, color: "", opacity: 1, label: "主工作区" },
      dock: { visible: true, color: "", opacity: 1, label: "任务详情" }
    },
    instanceSettings: {}
  },
  accounts: [],
  instances: [],
  persistentCredentials: false,
  system: { memoryMB: 8192, freeMemoryMB: 4096, platform: "" },
  running: false
});
const webAccountKey = "hxz-mobile-accounts-v1";
let webAccounts: StoredAccount[] = [];
try {
  const raw = localStorage.getItem(webAccountKey);
  if (raw) webAccounts = JSON.parse(raw) as StoredAccount[];
} catch {
  webAccounts = [];
}
function webAccountView(account: StoredAccount): Account {
  const value: Account = {
    id: account.id,
    username: account.username,
    name: account.name,
    uuid: account.uuid,
    persistent: false,
    profiles: account.profiles
  };
  const avatar = account.avatars?.[account.uuid];
  if (avatar !== undefined) value.avatar = avatar;
  return value;
}
function syncWebAccounts() {
  state.accounts = webAccounts.map(webAccountView);
  try {
    localStorage.setItem(webAccountKey, JSON.stringify(webAccounts));
  } catch {}
}
syncWebAccounts();
export const task = reactive({
  busy: false,
  phase: "准备好，出发吧",
  completed: 0,
  total: 0,
  unit: "项",
  received: 0,
  speed: 0,
  sampleAt: 0,
  activeFiles: [] as string[],
  detail: "",
  failure: "",
  started: 0,
  updated: 0,
  lastLogAt: 0,
  steps: [] as TaskStep[]
});
export const taskDetailsOpen = reactive({ value: false });
export function bytesLabel(value: number) {
  if (value < 1024) return Math.round(value) + " B";
  if (value < 1048576) return (value / 1024).toFixed(1) + " KB";
  return (value / 1048576).toFixed(1) + " MB";
}
export const taskCount = computed(() =>
  task.total > 0
    ? task.unit === "bytes"
      ? bytesLabel(task.completed) + " / " + bytesLabel(task.total)
      : task.completed + " / " + task.total + " " + task.unit
    : task.busy
      ? "处理中"
      : ""
);
export const appUpdate = reactive({
  phase: "尚未检查",
  version: "0.4.1",
  available: false,
  ready: false,
  percent: 0
});
export const logs = reactive<string[]>([]);
export const notices = reactive<{
  items: Notice[];
  error: string;
  loading: boolean;
}>({ items: [], error: "", loading: false });
export const selectedInstance = computed(() =>
  state.instances.find(i => i.id === state.settings.selectedInstance)
);
export const selectedAccount = computed(() =>
  state.accounts.find(a => a.id === state.settings.selectedAccount)
);
export const orderedInstances = computed(() => {
  const builtin = state.instances.filter(i => i.builtin);
  const custom = state.instances
    .filter(i => !i.builtin)
    .sort((a, b) => {
      const af = instanceConfig(a.id).favorite ? 1 : 0;
      const bf = instanceConfig(b.id).favorite ? 1 : 0;
      return bf - af || a.name.localeCompare(b.name, "zh-CN");
    });
  return [...builtin, ...custom];
});
async function webJSON(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: init.signal || AbortSignal.timeout(30000)
  });
  const value = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw Error(typeof value.error === "string" ? value.error : "请求未完成");
  return value;
}
async function webInvoke<T>(action: string, input: any): Promise<T> {
  if (action === "state") {
    syncWebAccounts();
    return {
      ...state,
      persistentCredentials: false,
      system: { ...state.system, platform: "android" }
    } as T;
  }
  if (action === "settings.save") {
    if (input.instance) {
      const { id, ...config } = input.instance;
      state.settings.instanceSettings[id] = {
        ...instanceConfig(id),
        ...config
      };
    } else state.settings = { ...state.settings, ...input };
    try {
      localStorage.setItem(
        "hxz-mobile-settings-v1",
        JSON.stringify(state.settings)
      );
    } catch {}
    return state.settings as T;
  }
  if (action === "account.login") {
    const response = await webJSON(
      "https://skin.hxzmc.top/api/yggdrasil/authserver/authenticate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: { name: "Minecraft", version: 1 },
          username: input.username,
          password: input.password,
          clientToken: crypto.randomUUID(),
          requestUser: true
        })
      }
    );
    const profile = (response.selectedProfile || {}) as {
      id?: string;
      name?: string;
    };
    const account: StoredAccount = {
      id: crypto.randomUUID(),
      username: input.username,
      name: profile.name || "",
      uuid: profile.id || "",
      persistent: false,
      profiles: (response.availableProfiles || []) as {
        id: string;
        name: string;
      }[],
      accessToken:
        typeof response.accessToken === "string" ? response.accessToken : "",
      clientToken:
        typeof response.clientToken === "string" ? response.clientToken : "",
      avatars: {}
    };
    if (!account.accessToken || !account.uuid)
      throw Error("皮肤站未返回有效角色");
    webAccounts = [
      ...webAccounts.filter(a => a.username !== account.username),
      account
    ];
    state.settings.selectedAccount = account.id;
    syncWebAccounts();
    return webAccountView(account) as T;
  }
  if (action === "account.remove") {
    webAccounts = webAccounts.filter(account => account.id !== input.id);
    if (state.settings.selectedAccount === input.id)
      state.settings.selectedAccount = webAccounts[0]?.id || "";
    syncWebAccounts();
    return { ok: true } as T;
  }
  if (action === "account.profile") {
    const account = webAccounts.find(item => item.id === input.id);
    const profile = account?.profiles.find(item => item.id === input.uuid);
    if (!account || !profile) throw Error("角色不存在");
    const response = await webJSON(
      "https://skin.hxzmc.top/api/yggdrasil/authserver/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: account.accessToken,
          clientToken: account.clientToken,
          selectedProfile: profile,
          requestUser: true
        })
      }
    );
    const selected = (response.selectedProfile || profile) as {
      id?: string;
      name?: string;
    };
    Object.assign(account, {
      accessToken:
        typeof response.accessToken === "string"
          ? response.accessToken
          : account.accessToken,
      clientToken:
        typeof response.clientToken === "string"
          ? response.clientToken
          : account.clientToken,
      uuid: selected.id || profile.id,
      name: selected.name || profile.name
    });
    syncWebAccounts();
    return webAccountView(account) as T;
  }
  if (action === "community.connect") {
    const account = webAccounts.find(
      item => item.id === state.settings.selectedAccount
    );
    if (!account) throw Error("请先登录皮肤站并选择游戏角色");
    const base = state.settings.communityUrl.replace(/\/$/, "");
    const response = await webJSON(base + "/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: account.accessToken,
        clientToken: account.clientToken
      })
    });
    return {
      token: String(response.token),
      base,
      user: response.user
    } as T;
  }
  if (action === "avatar.save") {
    const account = webAccounts.find(item => item.id === input.id);
    if (!account) throw Error("账号不存在");
    account.avatars ||= {};
    account.avatars[account.uuid] = input.avatar || "";
    syncWebAccounts();
    return { synced: false } as T;
  }
  if (action === "skin.open") {
    window.open("https://skin.hxzmc.top", "_blank");
    return { ok: true } as T;
  }
  if (action === "notices.list") {
    return (await webJSON(
      state.settings.communityUrl.replace(/\/$/, "") + "/api/notices"
    )) as T;
  }
  throw Error("此功能需要桌面版");
}
export async function invoke<T = unknown>(
  action: string,
  input: unknown = {}
): Promise<T> {
  if (!window.launcher) return webInvoke<T>(action, input);
  const result = await window.launcher.invoke(action, input);
  if (!result.ok) throw Error(result.error || "操作未完成");
  return result.value as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
export async function perform<T>(
  operation: () => Promise<T>,
  success?: string
): Promise<T | undefined> {
  try {
    const value = await operation();
    if (success)
      Notify.create({ message: success, type: "positive", position: "top" });
    return value;
  } catch (error) {
    Notify.create({
      message: errorMessage(error),
      type: "negative",
      position: "top",
      timeout: 6000
    });
  }
}
export async function reload() {
  if (desktop) Object.assign(state, await invoke<State>("state"));
  else {
    try {
      const raw = localStorage.getItem("hxz-mobile-settings-v1");
      if (raw) state.settings = { ...state.settings, ...JSON.parse(raw) };
    } catch {}
    syncWebAccounts();
  }
  applyTheme();
}
export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
  localStorage.setItem("hxz-theme", state.settings.theme);
  const root = document.documentElement,
    cfg = state.settings;
  if (cfg.columns?.workspace) cfg.columns.workspace.visible = true;
  root.dataset.background = cfg.backgroundImage ? "custom" : "default";
  root.dataset.layout = cfg.layout || "standard";
  root.style.setProperty("--ui-font-size", (cfg.fontSize || 15) + "px");
  const accent = cfg.accentColor || "#a9ce80";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--q-primary", accent);
  const rgb = accent
    .slice(1)
    .match(/../g)
    ?.map(v => parseInt(v, 16)) || [169, 206, 128];
  root.style.setProperty(
    "--accent-ink",
    (rgb[0] || 0) * 0.299 + (rgb[1] || 0) * 0.587 + (rgb[2] || 0) * 0.114 > 150
      ? "#172018"
      : "#ffffff"
  );
  if (cfg.backgroundColor) root.style.setProperty("--bg", cfg.backgroundColor);
  else root.style.removeProperty("--bg");
  root.style.setProperty(
    "--background-image",
    cfg.backgroundImage ? 'url("' + cfg.backgroundImage + '")' : "none"
  );
  root.style.setProperty(
    "--background-opacity",
    String(cfg.backgroundOpacity ?? 0.4)
  );
  root.style.setProperty(
    "--background-position",
    `${Number(cfg.backgroundPositionX ?? 50)}% ${Number(cfg.backgroundPositionY ?? 50)}%`
  );
  root.style.setProperty("--background-fit", cfg.backgroundFit || "cover");
  for (const [name, column] of Object.entries(cfg.columns || {})) {
    const fallback =
      name === "sidebar"
        ? "var(--sidebar)"
        : name === "workspace"
          ? "var(--panel)"
          : "var(--sidebar)";
    root.style.setProperty(`--${name}-color`, column.color || fallback);
    root.style.setProperty(`--${name}-opacity`, String(column.opacity ?? 1));
  }
  root.dataset.sidebarCustom =
    cfg.columns?.sidebar?.color ||
    (cfg.columns?.sidebar?.opacity != null && cfg.columns.sidebar.opacity !== 1)
      ? "true"
      : "false";
  root.dataset.workspaceCustom =
    cfg.columns?.workspace?.color ||
    (cfg.columns?.workspace?.opacity != null &&
      cfg.columns.workspace.opacity !== 1)
      ? "true"
      : "false";
  root.dataset.dockCustom =
    cfg.columns?.dock?.color ||
    (cfg.columns?.dock?.opacity != null && cfg.columns.dock.opacity !== 1)
      ? "true"
      : "false";
  root.dataset.sidebarHidden =
    cfg.columns?.sidebar?.visible === false ? "true" : "false";
  root.dataset.workspaceHidden =
    cfg.columns?.workspace?.visible === false ? "true" : "false";
  root.dataset.dockHidden =
    cfg.columns?.dock?.visible === false ? "true" : "false";
}
export async function saveSettings(
  input: Partial<Settings> | { instance: InstanceConfig & { id: string } }
) {
  if ("instance" in input) {
    state.settings = await invoke<Settings>("settings.save", input);
  } else {
    const columns = input.columns
      ? {
          ...input.columns,
          workspace: {
            ...state.settings.columns.workspace,
            ...input.columns.workspace,
            visible: true
          }
        }
      : undefined;
    state.settings = await invoke<Settings>("settings.save", {
      ...input,
      ...(columns ? { columns } : {})
    });
  }
  applyTheme();
}
export async function toggleTheme() {
  const theme = state.settings.theme === "dark" ? "light" : "dark";
  if (desktop) await saveSettings({ theme });
  else {
    state.settings.theme = theme;
    applyTheme();
  }
}
export function instanceConfig(id: string): InstanceConfig {
  return {
    memoryMode: "inherit",
    memoryMB: state.settings.defaultMemoryMB || 4096,
    favorite: false,
    width: 1280,
    height: 720,
    isolated: true,
    autoJoin: id === "HXZ-survival",
    serverAddress: id === "HXZ-survival" ? "s1.hxzmc.top" : "",
    autoUpdate: false,
    fullscreen: false,
    updateUrls: [],
    jvmArgs: [],
    coverPositionX: 50,
    coverPositionY: 50,
    coverZoom: 1,
    ...state.settings.instanceSettings[id]
  };
}
export function instanceMemoryLabel(id: string): string {
  const config = instanceConfig(id);
  const mode =
    config.memoryMode === "inherit"
      ? state.settings.memoryMode
      : config.memoryMode;
  return mode === "auto" ? "自动分配" : config.memoryMB + " MB";
}
export async function loadNotices() {
  notices.loading = true;
  notices.error = "";
  try {
    if (desktop) notices.items = await invoke<Notice[]>("notices.list");
    else {
      const r = await fetch(state.settings.communityUrl + "/api/notices", {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) throw Error("公告服务暂时无法连接");
      notices.items = (await r.json()) as Notice[];
    }
  } catch (error) {
    notices.error = errorMessage(error);
  } finally {
    notices.loading = false;
  }
}
export async function launch(
  id = state.settings.selectedInstance,
  updateOnly = false,
  joinServer = false
) {
  if (!id) throw Error("请先添加或选择游戏实例");
  taskDetailsOpen.value = true;
  try {
    await invoke(updateOnly ? "game.update" : "game.launch", {
      id,
      joinServer
    });
  } finally {
    await reload();
  }
}
window.launcher?.subscribe(event => {
  if (event.type === "app-update") Object.assign(appUpdate, event);
  if (event.type === "logs" && event.lines) {
    task.lastLogAt = Date.now();
    logs.push(...event.lines);
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  }
  if (event.type === "log" && event.line) {
    task.lastLogAt = Date.now();
    logs.push(event.line);
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  }
  if (event.type === "logs-reset") {
    logs.splice(0);
    task.steps.splice(0);
    Object.assign(task, {
      started: Date.now(),
      updated: Date.now(),
      sampleAt: 0,
      received: 0,
      speed: 0,
      failure: "",
      detail: "",
      activeFiles: [],
      total: 0,
      completed: 0
    });
  }
  if (event.type === "task") {
    const now = Date.now(),
      previous = task.steps.at(-1);
    const changed = !!event.phase && event.phase !== previous?.phase;
    task.started ||= now;
    if (event.failed || event.cancelled || event.error) {
      if (previous) {
        previous.status = event.cancelled ? "cancelled" : "failed";
        previous.ended = now;
      }
      task.failure = event.failure || event.error || "任务未完成";
      task.updated = now;
    } else {
      if (changed) {
        if (previous && previous.status === "active") {
          previous.status = "done";
          previous.ended = now;
        }
        task.steps.push({
          phase: event.phase!,
          started: now,
          ended: 0,
          status: "active",
          completed: 0,
          total: 0,
          unit: "项"
        });
        if (task.steps.length > 120) task.steps.shift();
        Object.assign(task, {
          completed: 0,
          total: 0,
          received: 0,
          speed: 0,
          sampleAt: 0,
          unit: "项",
          activeFiles: [],
          detail: "",
          updated: now
        });
      }
      if (
        (event.completed ?? task.completed) !== task.completed ||
        (event.received ?? task.received) !== task.received
      )
        task.updated = now;
      if (event.received != null) {
        if (task.sampleAt && now > task.sampleAt)
          task.speed =
            (Math.max(0, event.received - task.received) * 1000) /
            (now - task.sampleAt);
        task.sampleAt = now;
        task.received = event.received;
      }
      task.completed = event.completed ?? task.completed;
      task.total = event.total ?? task.total;
      task.unit = event.unit || task.unit;
      task.activeFiles = event.activeFiles ?? task.activeFiles;
      task.detail = event.detail ?? task.detail;
      const step = task.steps.at(-1);
      if (step) {
        Object.assign(step, {
          completed: task.completed,
          total: task.total,
          unit: task.unit
        });
        if (!event.busy) {
          step.status = "done";
          step.ended = now;
        }
      }
    }
    task.phase = event.phase || task.phase;
    task.busy = !!event.busy;
    if (event.running != null) state.running = event.running;
    if (event.error) Notify.create({ type: "negative", message: event.error });
  }
});
applyTheme();
