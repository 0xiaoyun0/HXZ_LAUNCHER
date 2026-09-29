export function createServices(options: {
  data: string;
  dependencyRoot?: string;
  resources: string;
  nativeImage?: typeof import("electron").nativeImage;
  safeStorage: typeof import("electron").safeStorage;
  dialog: typeof import("electron").dialog;
  shell: typeof import("electron").shell;
  window: () => import("electron").BrowserWindow;
  emit: (value: unknown) => void;
  skinPanel?: any;
  openSkin: (account: string) => void;
}): Promise<{
  invoke(action: string, input?: unknown): Promise<unknown>;
  dispose(): void;
  isBusy(): boolean;
}>;
