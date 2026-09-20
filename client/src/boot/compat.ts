// Electron 22 / Chromium 108: keep abort behaviour consistent with modern builds.
if (!AbortSignal.any) {
  AbortSignal.any = (signals: AbortSignal[]) => {
    const controller = new AbortController();
    const listeners = new Map<AbortSignal, () => void>();
    const abort = (signal: AbortSignal) => {
      controller.abort(signal.reason);
      for (const [source, listener] of listeners) source.removeEventListener('abort', listener);
      listeners.clear();
    };
    for (const signal of signals) {
      if (signal.aborted) { abort(signal); break; }
      const listener = () => abort(signal);
      listeners.set(signal, listener);
      signal.addEventListener('abort', listener, { once: true });
    }
    return controller.signal;
  };
}
export default () => {};
