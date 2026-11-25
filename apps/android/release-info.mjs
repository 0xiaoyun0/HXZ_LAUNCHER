export const releasePackage = 'top.hxzmc.community';
// Public SHA-256 fingerprint of the certificate on the official 0.9.2 APK.
export const releaseSigner = '2d330c0dadd47ce20e18982c278619a84b973cb1e060937811020f035bd90a06';
export const supportedAbis = ['arm64-v8a', 'x86_64'];

const versionPattern = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d?)\.(0|[1-9]\d?)$/;

export function androidRelease({androidBuild}) {
  const {version, number: build, versionCode} = androidBuild ?? {};
  if (!versionPattern.test(version)) throw Error('安卓产品版本需要三个整数');
  for (const value of [build, versionCode]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 2_100_000_000) throw Error('安卓构建号和安装序号须为正整数');
  }
  const id = version + '-build.' + build;
  return {version, build, versionCode, versionName: version + '+' + build, id, tag: 'v' + id};
}

export function apkName(release, abi, mode = 'release') {
  if (!supportedAbis.includes(abi) || !['debug', 'release'].includes(mode)) throw Error('不支持的安卓安装包类型');
  return 'HXZ-FCL-' + release.id + '-' + abi + '-' + mode + '.apk';
}

// The original signed feed derived the installation order from the three-part version.
export function androidVersionCode(version) {
  const match = versionPattern.exec(version);
  if (!match) throw Error('无法为此版本生成 Android versionCode：' + version);
  const [major, minor, patch] = match.slice(1).map(Number);
  const code = major * 1_000_000 + minor * 10_000 + patch * 100;
  if (code < 1 || code > 2_100_000_000) throw Error('Android versionCode 超出可发布范围');
  return code;
}
