import { reactive, computed } from "vue";
import { Notify } from "quasar";
export interface InstanceConfig {
  autoJoin: boolean;
  serverAddress: string;
  memoryMB: number;
  width: number;
  height: number;
  isolated: boolean;
  autoUpdate: boolean;
  fullscreen: boolean;
  updateUrls: string[];
  jvmArgs: string[];
}
export interface Settings {
  fontSize: number;
  accentColor: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundOpacity: number;
  layout: string;
  downloadMode: string;
  downloadConcurrency: number;
  updateFeed: string;
  autoCheckUpdates: boolean;
  hxzupPopup: boolean;
  simpleHome: boolean;
  gameRoot: string;
  javaPath: string;
  selectedInstance: string;
  selectedAccount: string;
  theme: string;
  communityUrl: string;
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
  system: { memoryMB: number; platform: string };
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
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    backgroundImage: "",
    backgroundOpacity: 0.4,
    layout: "standard",
    downloadMode: "domestic",
    downloadConcurrency: 64,
    updateFeed: "",
    autoCheckUpdates: true,
    hxzupPopup: true,
    simpleHome: false,
    gameRoot: "",
    javaPath: "",
    selectedInstance: "",
    selectedAccount: "",
    theme: localStorage.getItem("hxz-theme") || "dark",
    communityUrl: "https://qqbot.hxzmc.top",
    instanceSettings: {}
  },
  accounts: [],
  instances: [],
  persistentCredentials: false,
  system: { memoryMB: 8192, platform: "" },
  running: false
});
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
  version: "0.3.2",
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
export async function invoke<T = unknown>(
  action: string,
  input: unknown = {}
): Promise<T> {
  if (!window.launcher) throw Error("请在桌面启动器中使用此功能");
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
  applyTheme();
}
export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
  localStorage.setItem("hxz-theme", state.settings.theme);
  const root = document.documentElement,
    cfg = state.settings;
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
}
export async function saveSettings(
  input: Partial<Settings> | { instance: InstanceConfig & { id: string } }
) {
  state.settings = await invoke<Settings>("settings.save", input);
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
    memoryMB: 4096,
    width: 1280,
    height: 720,
    isolated: true,
    autoJoin: id === "HXZ-survival",
    serverAddress: id === "HXZ-survival" ? "s1.hxzmc.top" : "",
    autoUpdate: false,
    fullscreen: false,
    updateUrls: [],
    jvmArgs: [],
    ...state.settings.instanceSettings[id]
  };
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
