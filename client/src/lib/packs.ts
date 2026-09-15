import { reactive } from "vue";
import {
  invoke,
  reload,
  state,
  saveSettings,
  taskDetailsOpen
} from "./launcher";
export interface PackInfo {
  file: string;
  name: string;
  version: string;
  minecraft: string;
  loader: string;
  loaderVersion: string;
  fileCount: number;
  optionalFiles: string[];
  hxzup: boolean;
  updateUrls: string[];
}
export const importing = reactive({
  pack: null as PackInfo | null,
  name: "",
  optional: true,
  working: false
});
export function showPack(pack: PackInfo) {
  importing.pack = pack;
  importing.name =
    pack.name
      .replace(/[^\p{L}\p{N}_ .-]/gu, "-")
      .replace(/[. ]+$/, "")
      .slice(0, 80) || "整合包";
  importing.optional = true;
}
export async function choosePack() {
  const pack = await invoke<PackInfo | null>("pack.choose");
  if (pack) showPack(pack);
}
export async function chooseRoot() {
  const gameRoot = await invoke<string | null>("directory.choose");
  if (gameRoot) {
    await saveSettings({ gameRoot });
    await reload();
  }
  return !!state.settings.gameRoot;
}
export async function installPack() {
  if (!importing.pack) return;
  if (!state.settings.gameRoot && !(await chooseRoot())) return;
  importing.working = true;
  const pack = importing.pack;
  importing.pack = null;
  taskDetailsOpen.value = true;
  try {
    await invoke("pack.install", {
      file: pack.file,
      name: importing.name,
      includeOptional: importing.optional
    });
    importing.pack = null;
    await reload();
  } finally {
    importing.working = false;
    await reload();
  }
}
