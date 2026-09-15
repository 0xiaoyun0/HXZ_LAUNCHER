export const DOWNLOAD_CONCURRENCY = Object.freeze([8, 16, 32, 64, 128]);
export const DEFAULT_DOWNLOAD_CONCURRENCY = 64;
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
