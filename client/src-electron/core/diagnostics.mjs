import fs from 'node:fs/promises';
import path from 'node:path';
export function errorEvidence(text){
 const lines=text.split(/\r?\n/);
 // Keep exception context, not a tail of every line containing the word "error".
 const findings=[];
 for(let i=0;i<lines.length;i++){
  if(/\bWARN(?:ING)?\b|Attempt to query job object information failed/i.test(lines[i]))continue;
  if(/Exception in thread|^Caused by:|\bFATAL\b|\bERROR\b|^Description:|OutOfMemoryError|UnsupportedClassVersionError|InvalidPathException|ModLoadingException/i.test(lines[i])){
   findings.push(lines.slice(Math.max(0,i-1),Math.min(lines.length,i+5)).join('\n'));i+=3;
  }
 }
 return [...new Set(findings)].slice(0,8).join('\n\n');
}
export function redactDiagnostic(text,secrets=[]){for(const secret of secrets)if(secret)text=text.split(secret).join('[凭据已隐藏]');return text.replace(/((?:accessToken|clientToken|authorization|password|refreshToken)["'\s:=]+)(?:Bearer\s+)?[^\s,"'}]+/gi,'$1[已隐藏]').replace(/(--accessToken\s+)\S+/g,'$1[已隐藏]').replace(/([?&](?:token|key|auth)=)[^&\s]+/gi,'$1[已隐藏]');}
export function crashHints(text,code){const hints=[];for(const [pattern,message] of [[/OutOfMemoryError|Could not reserve enough space|Native memory allocation/i,'内存分配失败：关闭后台程序，调整实例内存；32位Java通常只能使用约1–1.5GB。'],[/UnsupportedClassVersionError|class file version|requires Java/i,'Java版本不匹配：在设置中选择该游戏和加载器要求的Java。'],[/Mixin.*(?:failed|error)|ModLoadingException|Missing.*depend|Incompatible.*mod/i,'模组或依赖可能不兼容：在MOD管理中检查报错模组及必需依赖，保留备份后逐项排查。'],[/GLFW|OpenGL|Pixel format|graphics driver/i,'图形初始化失败：更新显卡驱动，检查游戏版本对OpenGL的要求。'],[/Invalid session|AuthenticationException|Failed to verify username/i,'账号认证失败：重新登录皮肤站账号并选择角色。']])if(pattern.test(text))hints.push(message);if((Number(code)>>>0)===0xc0000005)hints.push('Java或本机库发生访问冲突：检查JVM崩溃报告，尝试同版本其他发行版Java与显卡驱动。');if(!hints.length)hints.push('尚不能从日志确定唯一原因。先看报告中最早的异常及 Caused by，再导出诊断信息给管理员。');return hints;}
async function tail(file,limit=256*1024){const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('非普通日志文件');const h=await fs.open(file,'r');try{const buffer=Buffer.alloc(Math.min(stat.size,limit));await h.read(buffer,0,buffer.length,Math.max(0,stat.size-buffer.length));return buffer.toString('utf8');}finally{await h.close();}}
export async function crashReport({cwd,id,started,code,signal,logs,secrets,java}){
 const files=[];let text=logs.join('\n');
 for(const directory of [cwd,path.join(cwd,'crash-reports'),path.join(cwd,'logs')]){try{const stat=await fs.lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())continue;for(const entry of await fs.readdir(directory)){if(!/^(?:crash-.*\.txt|hs_err_pid\d+\.log|latest\.log|debug\.log)$/.test(entry))continue;const file=path.join(directory,entry),info=await fs.lstat(file);if(info.isFile()&&!info.isSymbolicLink()&&info.mtimeMs>=started-3000)files.push({file,mtime:info.mtimeMs});}}catch{}}
 files.sort((a,b)=>b.mtime-a.mtime);const reports=[];for(const item of files.slice(0,5)){try{const content=redactDiagnostic(await tail(item.file),secrets);reports.push({path:item.file,content});text+='\n'+content;}catch{}}
 const safe=redactDiagnostic(text,secrets),evidence=errorEvidence(safe);return {id,code,signal:signal||'',cwd,java,created:Date.now(),hints:crashHints(evidence||safe,code),reports,log:redactDiagnostic(logs.join('\n'),secrets),summary:evidence};
}
export function diagnosticText(report){return ['HXZ Launcher 0.4.4 · 游戏异常诊断','实例: '+report.id,'退出码: '+report.code+' · 信号: '+report.signal,'Java: '+report.java,'提示（推测，不代表确定原因）:',...report.hints,'','启动器日志:',report.log,...report.reports.flatMap(r=>['','报告: '+path.basename(r.path),r.content])].join('\n');}
