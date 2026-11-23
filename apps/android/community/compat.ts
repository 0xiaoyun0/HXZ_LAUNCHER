import 'core-js/actual/array/at';
import 'core-js/actual/array/find-last';
import 'core-js/actual/object/has-own';
import 'core-js/actual/string/replace-all';
import 'core-js/actual/structured-clone';
import '../../desktop/src/compat';
if (!AbortSignal.timeout) AbortSignal.timeout = (milliseconds: number) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), milliseconds);
  return controller.signal;
};
// Legacy Canvas can still draw the game when rounded paths are unavailable.
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height) {
    this.rect(x, y, width, height);
  };
}
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (...nodes: (string|Node)[]) {
    const fragment=document.createDocumentFragment();
    fragment.append(...nodes);
    this.textContent='';
    this.append(fragment);
  };
}
if (!crypto.randomUUID) Object.defineProperty(crypto,'randomUUID',{value:()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}});
