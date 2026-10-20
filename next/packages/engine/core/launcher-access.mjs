// Startup, account recovery and window controls remain available before login.
// Community connectivity is intentionally not part of this check: cached skin
// identities continue to work when the community is temporarily unavailable.
export function allowedBeforeLogin(action) {
 return ['state','account.login','account.profile','account.remove','window.control','window.sleep','renderer.diagnostic','external.open','skin.open','skin.bounds','skin.hide','app-update.status','app-update.check','app-update.download','app-update.install'].includes(action);
}
export function requireLauncherAccount(action, authenticated) {
 if(!authenticated&&!allowedBeforeLogin(action))throw Error('请先登录幻想镇皮肤站账号，再使用此功能');
}
