import fs from 'node:fs/promises';
import path from 'node:path';
export function errorEvidence(text){
 const lines=text.split(/\r?\n/);
 // Keep exception context, not a tail of every line containing the word "error".
 const findings=[];
 for(let i=0;i<lines.length;i++){
  if(/\bWARN(?:ING)?\b|Attempt to query job object information failed/i.test(lines[i]))continue;
  if(/Exception in thread|^Caused by:|\bFATAL\b|\bERROR\b|^Description:|OutOfMemoryError|UnsupportedClassVersionError|InvalidPathException|ModLoadingException|Agent_OnLoad|Error opening zip|architecture mismatch|Connection refused|UnknownHostException|Connection timed out|Disconnected|Failed to connect/i.test(lines[i])){
   findings.push(lines.slice(Math.max(0,i-1),Math.min(lines.length,i+5)).join('\n'));i+=3;
  }
 }
 return [...new Set(findings)].slice(0,8).join('\n\n');
}
export function redactDiagnostic(text,secrets=[]){for(const secret of secrets)if(secret)text=text.split(secret).join('[凭据已隐藏]');return text.replace(/((?:accessToken|clientToken|authorization|password|refreshToken)["'\s:=]+)(?:Bearer\s+)?[^\s,"'}]+/gi,'$1[已隐藏]').replace(/(--accessToken\s+)\S+/g,'$1[已隐藏]').replace(/([?&](?:token|key|auth)=)[^&\s]+/gi,'$1[已隐藏]');}
export function crashHints(text,code){const hints=[];for(const [pattern,message] of [
 [/Error opening zip file or JAR manifest missing.*\?{2,}/i,'外置登录组件路径编码损坏：日志路径出现连续问号，Java 未能加载 agent，游戏尚未启动。更新启动器以使用相对路径；重新安装模组或调整内存不能解决此错误。'],
 [/Error opening zip file or JAR manifest missing(?!.*\?{2,})|agent library failed Agent_OnLoad/i,'Java 登录组件加载失败：检查日志中 agent 文件是否存在、完整或被安全软件隔离，使用启动器重新校验组件。'],
 [/Platform\/architecture mismatch|windows\/x86[\s\S]*Windows amd64|Windows amd64[\s\S]*windows\/x86/i,'Java 与本机库位数不一致：64 位 Java 必须配套 x64 本机库。重新校验游戏依赖；无需删除存档。'],
 [/UnknownHostException|ENOTFOUND|EAI_AGAIN/i,'域名解析失败：核对服务器地址，检查本机 DNS；仅此错误不能证明服务器停服。'],
 [/Connection refused|ECONNREFUSED/i,'目标端口拒绝连接：核对服务器端口，请管理员确认服务已启动且端口开放。'],
 [/Connection timed out|ETIMEDOUT|ReadTimeoutException/i,'连接或读取超时：可能是线路、网络拥塞或服务端无响应；尝试备用入口，并向管理员提供发生时间和目标地址。'],
 [/Outdated client|Outdated server|Incompatible client|mismatched mod|Failed to synchronize registry|Registry remapping failed/i,'客户端与服务器版本或模组注册表不一致：校验并更新同一服务器整合包，向管理员确认服务端版本。'],
 [/OutOfMemoryError|Could not reserve enough space|Native memory allocation/i,'内存分配失败：关闭后台程序，调整实例内存；32位Java通常只能使用约1–1.5GB。'],[/UnsupportedClassVersionError|class file version|requires Java/i,'Java版本不匹配：在实例配置中自动匹配该游戏要求的Java，或选择对应主版本。'],[/Mixin.*(?:failed|error)|ModLoadingException|Missing.*depend|Incompatible.*mod/i,'模组或依赖可能不兼容：检查证据中的模组名称与必需依赖，保留备份后逐项排查。'],[/GLFW|OpenGL|Pixel format|graphics driver/i,'图形初始化失败：更新显卡驱动，检查游戏版本对OpenGL的要求。'],[/Invalid session|AuthenticationException|Failed to verify username/i,'账号认证失败：重新登录皮肤站账号并选择角色；离线模式不能进入要求在线认证的服务器。']])if(pattern.test(text))hints.push(message);if((Number(code)>>>0)===0xc0000005)hints.push('Java或本机库发生访问冲突：检查JVM崩溃报告，尝试同版本其他发行版Java与显卡驱动。');if(!hints.length)hints.push('日志不足以确认原因。请把本次错误证据和诊断报告提交反馈；服务器内部故障需管理员结合服务端日志确认。');return hints;}
async function tail(file,limit=256*1024){const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('非普通日志文件');const h=await fs.open(file,'r');try{const buffer=Buffer.alloc(Math.min(stat.size,limit));await h.read(buffer,0,buffer.length,Math.max(0,stat.size-buffer.length));return buffer.toString('utf8');}finally{await h.close();}}
export async function crashReport({cwd,id,started,code,signal,logs,secrets,java}){
 const files=[];let text=logs.join('\n');
 for(const directory of [cwd,path.join(cwd,'crash-reports'),path.join(cwd,'logs')]){try{const stat=await fs.lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())continue;for(const entry of await fs.readdir(directory)){if(!/^(?:crash-.*\.txt|hs_err_pid\d+\.log|latest\.log|debug\.log)$/.test(entry))continue;const file=path.join(directory,entry),info=await fs.lstat(file);if(info.isFile()&&!info.isSymbolicLink()&&info.mtimeMs>=started-3000)files.push({file,mtime:info.mtimeMs});}}catch{}}
 files.sort((a,b)=>b.mtime-a.mtime);const reports=[];for(const item of files.slice(0,5)){try{const content=redactDiagnostic(await tail(item.file),secrets);reports.push({path:item.file,content});text+='\n'+content;}catch{}}
 const safe=redactDiagnostic(text,secrets),evidence=errorEvidence(safe);return {id,code,signal:signal||'',cwd,java,created:Date.now(),hints:crashHints(evidence||safe,code),reports,log:redactDiagnostic(logs.join('\n'),secrets),summary:evidence};
}
export function diagnosticText(report){return ['HXZ Launcher 0.5.0 · 游戏异常诊断','实例: '+report.id,'退出码: '+report.code+' · 信号: '+report.signal,'Java: '+report.java,'提示（推测，不代表确定原因）:',...report.hints,'','启动器日志:',report.log,...report.reports.flatMap(r=>['','报告: '+path.basename(r.path),r.content])].join('\n');}
