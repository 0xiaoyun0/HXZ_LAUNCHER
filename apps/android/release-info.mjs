export const releasePackage = 'top.hxzmc.community';
// Public SHA-256 fingerprint of the certificate on the official 0.9.2 APK.
export const releaseSigner = '2d330c0dadd47ce20e18982c278619a84b973cb1e060937811020f035bd90a06';
export const supportedAbis = ['arm64-v8a', 'x86_64'];

export function androidVersionCode(version) {
  const match = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d?)\.(0|[1-9]\d?)$/.exec(version);
  if (!match) throw Error('无法为此版本生成 Android versionCode：' + version);
  const [major, minor, patch] = match.slice(1).map(Number);
  const code = major * 1_000_000 + minor * 10_000 + patch * 100;
  if (code < 1 || code > 2_100_000_000) throw Error('Android versionCode 超出可发布范围');
  return code;
}
