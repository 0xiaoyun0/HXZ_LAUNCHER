// Small, bounded preferences shared by the renderer and the settings store.
const keyPattern = /^[a-zA-Z0-9._-]{1,80}$/;
const integer = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
export function normalizeCardLayouts(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [page, data] of Object.entries(value).slice(0, 80)) {
    if (!keyPattern.test(page) || ['__proto__','constructor','prototype'].includes(page) || !data || typeof data !== 'object') continue;
    const used = new Set();
    const items = [];
    for (const item of (Array.isArray(data.items) ? data.items : []).slice(0, 48)) {
      if (!item || typeof item.i !== 'string' || !keyPattern.test(item.i) || used.has(item.i)) continue;
      used.add(item.i);
      const w = integer(item.w, 6, 2, 12);
      items.push({ i: item.i, x: integer(item.x, 0, 0, 12 - w), y: integer(item.y, 0, 0, 500), w, h: integer(item.h, 14, 5, 100) });
    }
    const ids = list => [...new Set((Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && keyPattern.test(id)))].slice(0, 48);
    result[page] = { items, hidden: ids(data.hidden), locked: ids(data.locked), fixed: ids(data.fixed) };
  }
  return result;
}
export function normalizeCardStyle(value) {
  return {
    color: /^#[a-f0-9]{6}$/i.test(value?.color) ? value.color : '',
    opacity: Number.isFinite(value?.opacity) ? Math.max(.2, Math.min(1, value.opacity)) : 1,
    gap: integer(value?.gap, 14, 8, 24),
    radius: integer(value?.radius, 10, 4, 20),
  };
}
