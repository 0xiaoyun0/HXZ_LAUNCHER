// Loaded before the application in the Windows 7 / ia32 bundle (Node 16).
if (!globalThis.fetch) {
  const {fetch, Headers, Request, Response, FormData} = require('undici');
  Object.assign(globalThis, {fetch, Headers, Request, Response, FormData});
}
if (!AbortSignal.any) AbortSignal.any = signals => {
  const controller = new AbortController(), listeners = new Map();
  const abort = signal => {
    controller.abort(signal.reason);
    for (const [source, listener] of listeners) source.removeEventListener('abort', listener);
    listeners.clear();
  };
  for (const signal of signals) {
    if (signal.aborted) { abort(signal); break; }
    const listener = () => abort(signal);
    listeners.set(signal, listener); signal.addEventListener('abort', listener, {once:true});
  }
  return controller.signal;
};
