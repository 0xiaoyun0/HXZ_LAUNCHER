// Shared installation boundary: UI and imported packs use the same canonical profile.
export function installationRequest(input, pack = null) {
  const gameVersion = pack?.minecraft || input.minecraft;
  const kind = pack?.loader || input.loader || '';
  const type = kind === 'vanilla' ? '' : kind;
  const version = type ? (pack?.loaderVersion || input.loaderVersion || '') : '';
  const valid = value => typeof value === 'string' && /^[\w.+-]{1,100}$/.test(value) && value !== '.' && value !== '..';
  if (!valid(gameVersion) || !['', 'fabric', 'quilt', 'forge', 'neoforge'].includes(type) || (type && !valid(version)))
    throw Error('游戏或加载器版本无效');
  return {gameVersion, loader: {type, version}};
}
