// Keep raw diagnostics in the expandable log; the primary message is actionable.
export function playerError(value){
 const raw=String(value?.message||value||''),text=raw+' '+String(value?.cause?.message||''),has=p=>p.test(text);
 if(has(/ENOSPC|No space left|磁盘空间|空间不足/))return {title:'游戏盘的可用空间不足',message:'请腾出空间后继续安装。已完成的下载会保留，不需要删除整个实例。',action:'free-space'};
 if(has(/EACCES|EPERM|AccessDenied|being used|占用|拒绝访问/))return {title:'部分文件正在被占用',message:'请退出正在运行的游戏，再点击继续安装。不要删除整个游戏文件夹。',action:'resume'};
 if(has(/SHA|校验|checksum|hash mismatch/))return {title:'下载的文件不完整',message:'校验未通过，未将错误文件放入游戏。请切换下载来源后重试，其他已完成文件会复用。',action:'source'};
 if(has(/maintenance|正在维护|服务正在维护/))return {title:'服务器整合包正在维护',message:'管理员发布完成后即可继续。已有的游戏文件会保留。',action:'wait'};
 if(has(/登录已|账号.*过期|Authentication|authserver.*(?:401|403)/))return {title:'账号登录需要重新验证',message:'请重新登录皮肤站账号，再继续进入服务器。',action:'account'};
 if(has(/\b(?:401|403)\b/))return {title:'下载来源拒绝了这次请求',message:'请切换备用来源后继续。若仍失败，将诊断信息交给管理员检查文件访问权限。',action:'source'};
 if(has(/404|文件不存在|找不到下载/))return {title:'下载来源缺少所需文件',message:'请尝试备用下载源。若仍无法下载，可导出诊断信息交给管理员检查更新包。',action:'source'};
 if(has(/fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|Socket|UnknownHost|SSL|timeout|超时|持续低速|下载暂未完成|无法完成更新检查|下载失败|下载.*中断|NetworkFailure|HXZUP_OFFLINE/))return {title:'下载来源暂时连接不畅',message:'已完成并校验的内容会保留。可继续下载，或切换来源再试；不需要重新安装启动器。',action:'source'};
 if(has(/UnsupportedClassVersion|没有.*Java|Java.*不兼容/))return {title:'当前 Java 不适合这个游戏版本',message:'请在实例配置中选择“自动选择 Java”，然后重试启动。',action:'java'};
 if(has(/取消|AbortError/))return {title:'安装已暂停',message:'已完成的文件会保留，下次可以继续。',action:'resume'};
 return {title:'这一步没有完成',message:!has(/Exception|Error:| at |进程退出/)&&raw.length<160?raw:'请先点击重试。若仍失败，可导出日志交给管理员，已完成的文件会保留。',action:'resume'};
}
