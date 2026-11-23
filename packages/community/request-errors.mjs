// Keep transport failures readable without confusing one unreachable service
// with a disconnected computer. Preserve server-supplied domain errors.
export function requestFailureMessage(error, {community = false, mutation = false} = {}) {
  const raw = String(error?.message || error || '操作未完成');
  if (error?.name === 'AbortError') return '操作已取消';
  const target = community ? '社区' : '服务';
  if (error?.name === 'TimeoutError' || /ETIMEDOUT|operation.*timed?\s*out|aborted due to timeout/i.test(raw)) {
    return mutation
      ? '请求超时，操作结果尚未确认。请先刷新查看结果，再决定是否重试。'
      : `${target}响应较慢，请稍后重试。`;
  }
  if (/^(?:TypeError:\s*)?(?:Failed to fetch|fetch failed|NetworkError when attempting to fetch resource\.?|Load failed)$/i.test(raw.trim()) || /\b(?:ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN)\b/.test(raw)) {
    return mutation
      ? `暂时无法连接${target}，操作结果尚未确认。请恢复连接后先刷新查看，避免重复提交。`
      : `暂时无法连接${target}，请稍后重试；也可检查服务地址或网络连接。`;
  }
  return raw;
}

export function requiresPageReload(error) {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading (?:CSS )?chunk|ChunkLoadError/i.test(String(error?.message || error || ''));
}
