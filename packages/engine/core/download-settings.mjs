export const DOWNLOAD_CONCURRENCY = Object.freeze([8, 16, 32, 64, 128]);
export const DEFAULT_DOWNLOAD_CONCURRENCY = 32;
// Zero is the final, unlimited slider position. Values are MiB/s (shown as MB/s in the UI).
export const DOWNLOAD_SPEED_STEPS = Object.freeze([.25,.5,1,2,4,8,16,32,64,128,256,0]);
export function normalizeDownloadSpeed(value){return DOWNLOAD_SPEED_STEPS.includes(value)?value:0;}
export function validateDownloadSpeed(value){if(!DOWNLOAD_SPEED_STEPS.includes(value))throw Error('下载限速档位无效');return value;}
export function normalizeDownloadConcurrency(value) {
  return DOWNLOAD_CONCURRENCY.includes(value)
    ? value
    : DEFAULT_DOWNLOAD_CONCURRENCY;
}
export function validateDownloadConcurrency(value) {
  if (!DOWNLOAD_CONCURRENCY.includes(value))
    throw Error("下载并发仅支持 8、16、32、64、128");
  return value;
}
