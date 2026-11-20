// Only catalogued text may leave the device in a shareable summary.
const catalogue = {
  pluginMismatch: ['社区插件与启动器版本不匹配', '重新下载本版本的社区插件，或选择对应的本地插件包。验证通过后才能启用。', 'retry', 'player'],
  pluginDownload: ['社区插件下载暂时不可用', '稍后重新下载，或在扩展设置中从本地安装同版本的插件包。如多人持续遇到，请联系发布管理员。', 'retry', 'admin-if-repeated'],
  stopped: ['操作已取消', '可以返回原页面，需要时再继续。', 'resume', 'player'],
  disk: ['可用磁盘空间不足', '打开游戏目录所在的磁盘，腾出空间后重试。已经通过校验的下载可以继续使用。', 'free-space', 'player'],
  locked: ['文件正被其他程序使用', '先退出使用这个实例的游戏或程序，再重试刚才的操作。', 'resume', 'player'],
  denied: ['当前目录没有写入权限', '在设置里选择当前 Windows 用户可以写入的目录，然后重试。', 'directory', 'player'],
  checksum: ['下载的文件校验失败', '切换下载节点后重试。如果多个节点的同一文件都失败，请联系整合包管理员。', 'source', 'admin-if-repeated'],
  maintenance: ['整合包服务器正在维护', '等待管理员完成维护后，再检查更新。已安装的文件保留在本机。', 'wait', 'admin'],
  missingRemote: ['下载节点缺少所需文件', '试用备用下载节点。如果同一个文件仍然缺失，请将摘要交给整合包管理员。', 'source', 'admin-if-repeated'],
  sourceDenied: ['下载节点拒绝了请求', '切换下载来源后重试。如果两个来源都拒绝访问，请联系整合包管理员。', 'source', 'admin-if-repeated'],
  download: ['下载连接已中断', '检查网络或切换下载节点，再继续安装。已校验的文件会被复用。', 'source', 'player'],
  credentials: ['账号或密码不正确', '请核对账号和密码后重新输入。忘记密码时，可以去皮肤站找回。', 'account', 'player'],
  expired: ['皮肤站登录已过期', '在「账号与角色」里重新登录，然后再试。', 'account', 'player'],
  login: ['这项功能需要登录', '打开「账号与角色」，登录幻想镇并选择一个角色。', 'account', 'player'],
  role: ['还没有可用的游戏角色', '在皮肤站建立角色，或在「账号与角色」中选中已有角色，再继续。', 'account', 'player'],
  skinNetwork: ['暂时连接不到皮肤站', '在「账号与角色」点击「检测连接」。网络恢复后重试，原有账号会保留。', 'retry', 'player'],
  skinService: ['皮肤站暂时无法提供验证', '稍后重新检测。若其他玩家也持续遇到同一提示，请把摘要交给皮肤站管理员。', 'retry', 'admin-if-repeated'],
  service: ['社区服务暂时不可用', '稍后重新连接。若多名玩家都无法进入，请把摘要交给社区管理员。', 'retry', 'admin-if-repeated'],
  network: ['暂时连接不到目标服务', '检查网络连接，然后在当前页面重试。', 'retry', 'player'],
  permission: ['当前角色没有操作权限', '先确认选中了正确的角色。需要额外权限时，请联系社区管理员。', 'account', 'admin'],
  heap: ['Java 无法分配游戏内存', '在实例配置或全局设置里降低最大内存、关闭占用内存的程序，再运行启动前检查。', 'memory', 'player'],
  outOfHeap: ['游戏用完了分配的内存', '在「启动前检查」查看实际内存。如果机器还有余量，适当提高实例内存后重试。', 'memory', 'player'],
  java: ['Java 版本或路径不适合这个实例', '打开实例配置，选择自动匹配 Java，再运行启动前检查。', 'java', 'player'],
  gameFiles: ['实例缺少启动文件', '在游戏库打开这个实例的「启动前检查」，按缺失项修复；导入的整合包可以从原包重新导入。', 'preflight', 'player'],
  mod: ['模组或依赖与实例版本不匹配', '在实例文件中核对近期变更的模组、依赖和加载器版本。如果无法判断冲突项，可以使用 AI 辅助排查。', 'preflight', 'ai'],
  crash: ['游戏进程异常退出', '重新打开启动前检查。如果问题能重复出现，记录退出前最后一个操作，可以用 AI 辅助排查或交给整合包维护者。', 'preflight', 'ai'],
  musicFile: ['播放器无法读取这首歌', '本地曲目请重新选择原音频文件；在线曲目请刷新歌单后重试。', 'retry', 'player'],
  remote: ['远端服务暂时不可用', '稍后再试。若多名玩家持续遇到相同提示，请联系该服务的管理员。', 'retry', 'admin-if-repeated'],
  page: ['当前页面没有正确载入', '重新打开这个页面。若问题可以重复出现，可将排查摘要和重现步骤交给维护者。', 'retry', 'ai']
};
const contexts = {
  extension: ['社区插件操作中断', '回到扩展设置重试。已安装的游戏可以照常使用。'],
  settings: ['设置未能保存', '重试保存。若再次失败，请检查本机资料目录能否写入。'],
  state: ['无法读取本机资料', '关闭其他正在写入资料的启动器，再重新读取。'],
  game: ['游戏启动中断', '打开这个实例的启动前检查，核对 Java、游戏文件和内存。'],
  install: ['安装中断', '到任务中心查看可继续的安装，然后重试。'],
  skin: ['皮肤站操作中断', '在账号页检测连接，再重试。'],
  account: ['账号操作中断', '在账号页检测皮肤站连接，确认角色后重试。'],
  community: ['社区请求没有成功', '重新连接社区，再打开刚才的内容。'],
  lobby: ['联机操作中断', '检查房间是否仍然开放，并请房主确认邀请。'],
  music: ['播放操作中断', '重试当前曲目，也可以更换曲目以确认是否只有这个音源受影响。'],
  pack: ['整合包无法处理', '检查原压缩包是否完整，然后重新选择文件。'],
  import: ['旧资料导入中断', '重新选择旧目录并预览，确认后再重试。'],
  interface: ['启动器操作遇到异常', '重新打开当前页面，再尝试一次。']
};
function scope(operation) {
  const prefix = String(operation || '').split(/[./]/, 1)[0];
  return Object.hasOwn(contexts, prefix) ? prefix : 'interface';
}
function build(code, area) {
  const [title,message,action,owner] = Object.hasOwn(catalogue,code)
    ? catalogue[code] : [...contexts[area], 'retry', 'ai'];
  return {code, area, title, message, action, owner};
}
export function playerError(value, operation = '') {
  const area = scope(operation || value?.operation);
  const raw = [value?.message ?? value, value?.cause?.message, value?.code, value?.status].filter(Boolean).join(' ').slice(0,16000);
  const has = pattern => pattern.test(raw);
  const skin = ['skin','account'].includes(area) || has(/皮肤站|yggdrasil|authserver/i);
  const download = ['install','pack'].includes(area) || has(/下载|HXZUP|镜像/);
  let code;
  if (area==='extension' && has(/校验|checksum|版本不匹配/i)) code='pluginMismatch';
  else if(area==='extension' && has(/HTTP|fetch|下载中断|timeout|ENOTFOUND|ECONN/i)) code='pluginDownload';
  else if (has(/用户取消|已取消|AbortError|operation cancelled/i)) code = 'stopped';
  else if (has(/ENOSPC|no space left|空间不足|磁盘空间不够/i)) code = 'disk';
  else if (has(/EBUSY|sharing violation|being used|正被.+使用|占用中|文件.*占用/i)) code = 'locked';
  else if (has(/EACCES|EPERM|AccessDenied|拒绝访问|目录.*不可写/i)) code = 'denied';
  else if (has(/sha(?:1|256|512)|checksum|校验.*(?:失败|不符|未通过)|hash mismatch/i)) code = 'checksum';
  else if (has(/maintenance|维护中|正在维护/i)) code = 'maintenance';
  else if (has(/invalid (?:login|credentials|username|password)|密码(?:不正确|错误)|用户名或密码|账号或密码/i) || area==='account' && /login/.test(operation) && has(/\b(?:401|403)\b/)) code = 'credentials';
  else if (has(/登录.*过期|invalid token|令牌.*(?:失效|无效)|invalid session/i) || skin && has(/\b(?:401|403)\b/)) code = 'expired';
  else if (has(/选择.*角色|没有.*角色|缺少.*角色|建立.*角色|皮肤站.*创建.*角色/)) code = 'role';
  else if (has(/请先登录|需要登录|登录后才|未登录|缺少皮肤站登录凭据/)) code = 'login';
  else if (has(/没有.*权限|仅管理员|需要管理员|forbidden|\b403\b/i)) code = download ? 'sourceDenied' : 'permission';
  else if (has(/OutOfMemoryError|java heap space|内存耗尽/i)) code = 'outOfHeap';
  else if (has(/could not reserve|invalid (?:maximum|initial) heap|内存.*(?:范围|分配失败|超限)|无法分配.*内存/i)) code = 'heap';
  else if (has(/UnsupportedClassVersion|class file version|没有.*Java|Java.*(?:不兼容|版本不符合|不存在)|找不到.*Java/i)) code = 'java';
  else if (has(/mod resolution|incompatible mod|missing.*dependenc|mod loading|模组冲突|模组.*依赖/i)) code = 'mod';
  else if (has(/客户端 JAR|客户端文件|Could not find or load main class|缺少.*(?:游戏文件|启动文件|版本清单)|版本清单.*(?:损坏|缺失)/i)) code = 'gameFiles';
  else if (area==='music' && has(/ENOENT|decode|audio|媒体文件|播放失败|无法播放|not supported/i)) code = 'musicFile';
  else if (has(/404|找不到下载/)) code = download ? 'missingRemote' : undefined;
  else if (has(/\b5\d\d\b|service unavailable|服务暂时不|暂时不可用|暂时无法提供/i)) code = skin ? 'skinService' : area==='community' ? 'service' : 'remote';
  else if (has(/fetch failed|failed to fetch|network|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket|unknownhost|TLS|SSL|timeout|超时|低速|无法连接|连接.*中断|断开|下载失败|HXZUP_OFFLINE/i)) code = skin ? 'skinNetwork' : download ? 'download' : 'network';
  else if (has(/进程.*退出|游戏.*崩溃|游戏未正常退出|exit code/i)) code = 'crash';
  else if (operation==='interface.page') code = 'page';
  return build(code || 'unknown', area);
}
export const supportAdvice = {
  player: '可以先在本机处理，通常无需联系管理员。',
  admin: '由管理员处理。可以把下方摘要和发生时间交给管理员。',
  'admin-if-repeated': '先重试。如果问题持续或有多人遇到，建议联系管理员。',
  ai: '原因需要进一步排查。可自行选择 AI 辅助，或请维护者查看重现步骤。'
};
export function diagnosticSummary(issue, version = '', architecture = '') {
  const area = scope(issue?.area);
  const safe = build(Object.hasOwn(catalogue,issue?.code) ? issue.code : 'unknown', area);
  const release = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]{1,20})?$/i.test(version) ? version : '';
  const cpu = ['x64','ia32','arm64','x86'].includes(architecture) ? architecture : '';
  return ['幻想镇启动器' + (release ? ' '+release : '') + (cpu ? ' · '+cpu : ''), '诊断编号 '+area+'/'+safe.code, safe.title, safe.message, supportAdvice[safe.owner]].join('\n');
}
