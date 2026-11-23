export const packagedClients = [
  {name:'Windows', origin:'http://tauri.localhost'},
  {name:'Android', origin:'https://appassets.androidplatform.net'}
];

// This is the allowlist shipped in the 0.9.2 Windows and Docker templates.
const legacyDefaults = ['null', 'file://', 'http://127.0.0.1:9000', 'http://localhost:9000'];
export const defaultOrigins = [...legacyDefaults, ...packagedClients.map(client => client.origin)];

export function communityOrigins(configured, override) {
  const entries = override ?? (configured ? configured.split(',') : defaultOrigins);
  const allowed = new Set(entries.map(value => value.trim()).filter(Boolean));
  if (override === undefined && allowed.size === legacyDefaults.length && legacyDefaults.every(value => allowed.has(value))) {
    for (const {origin} of packagedClients) allowed.add(origin);
  }
  // Electron uses file:// in its handshake and null in opaque browser requests.
  if (allowed.has('null')) allowed.add('file://');
  return allowed;
}
