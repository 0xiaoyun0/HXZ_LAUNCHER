// A 32-bit launcher can run a 64-bit game on a 64-bit Windows installation.
export function systemArchitecture(env = process.env, fallback = process.arch) {
  const value = String(env.PROCESSOR_ARCHITEW6432 || env.PROCESSOR_ARCHITECTURE || fallback).toLowerCase();
  return /arm64|aarch64/.test(value) ? "arm64" : /amd64|x64|x86_64/.test(value) ? "x64" : /x86|ia32/.test(value) ? "ia32" : fallback;
}
export const javaPathArgument = value => "utf8:" + Buffer.from(value, "utf8").toString("base64");

// Maven coordinates may include @jar; do not infer architecture with endsWith().
export function nativeArtifactAllowed(library, architecture, platform = process.platform) {
  const osName = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux';
  const name = String(library.name || '').split('@')[0].split(':')[3] || '';
  const artifact = library.downloads?.artifact?.path || '';
  for (const text of [name, artifact]) {
    const match = text.match(/natives-(windows|linux|macos|osx)(?:-(arm64|aarch64|x86_64|x64|x86|arm32))?(?=\.jar$|$)/i);
    if (!match) continue;
    if ((match[1] === 'osx' ? 'macos' : match[1]) !== osName) return false;
    const nativeArch = /arm64|aarch64/.test(match[2] || '') ? 'arm64' : match[2] === 'x86' ? 'ia32' : match[2] === 'arm32' ? 'arm' : 'x64';
    if (nativeArch !== architecture) return false;
  }
  return true;
}
