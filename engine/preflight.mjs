import fs from 'node:fs/promises';
import os from 'node:os';
import {requestedHeap,javaHeapLimit} from '../packages/engine/core/memory-policy.mjs';
import path from 'node:path';
import {readVersion,findJava,inspectJava} from '../packages/engine/core/minecraft.mjs';
import {javaRequirement,selectJavaCandidate} from '../packages/engine/core/java-policy.mjs';
import {runtimeHome} from '../packages/engine/core/game-storage.mjs';
import {systemArchitecture} from '../packages/engine/core/platform.mjs';
import {inside} from '../packages/engine/core/io.mjs';

const runtime={readVersion,findJava,inspectJava,architecture:systemArchitecture};
const isFile=async file=>fs.stat(file).then(s=>s.isFile()&&s.size>0,()=>false);
export async function preflight(snapshot,id,{roots=[],tools=runtime}={}){
 const game=snapshot.instances.find(v=>v.id===id);if(!game)throw Error('这个实例已移走，请回游戏库重新选择');
 const settings=snapshot.settings,root=settings.gameRoot,checks=[];
 const add=(id,title,status,detail,action)=>checks.push({id,title,status,detail,action});
 const directory=!!root&&await fs.stat(root).then(s=>s.isDirectory(),()=>false);
 add('root','游戏目录',directory?'ok':'needs',directory?'已找到游戏目录':'选择存放 Minecraft 实例的目录','directory');
 let metadata;
 if(!directory)add('files','游戏文件','unknown','选择目录后检查版本清单和客户端文件');
 else if(game.builtin&&!game.installed&&!game.error)add('files','游戏文件','info','此预设尚未安装，首次启动时可安装','install');
 else if(game.error)add('files','游戏文件','needs',game.error,'library');
 else {
   try{
     metadata=await tools.readVersion(root,id);
     const jarId=metadata.jar||metadata.id||id;
     const local=inside(root,['versions',id,id+'.jar'].join('/')), shared=inside(root,['versions',jarId,jarId+'.jar'].join('/'));
     if(await isFile(local)||await isFile(shared))add('files','游戏文件','ok','版本清单和客户端 JAR 可读取');
     else if(metadata.downloads?.client?.url)add('files','游戏文件','info','缺少客户端 JAR，启动时可按清单补全','library');
     else add('files','游戏文件','needs','没有找到客户端 JAR，清单也没有下载地址','library');
   }catch(e){add('files','游戏文件','needs','版本清单无法读取：'+e.message,'library');}
 }
 if(!metadata)add('java','Java 环境','unknown','取得游戏版本清单后才能匹配 Java','java');
 else try{
   const need=javaRequirement(metadata),cfg=settings.instanceSettings?.[id]||{},preferred=cfg.javaMode==='auto'?'':cfg.javaMode==='custom'?cfg.javaPath:settings.javaPath;
   const architecture=tools.architecture();
   let found;
   if(preferred){const selected=await tools.inspectJava(preferred);if(selected.major>=need.major&&selected.architecture===architecture)found=selected;}
   else {const items=await tools.findJava({roots:[runtimeHome(root),path.join(root,'runtime'),path.join(root,'runtimes'),...roots],chinesePaths:settings.chinesePaths!==false});found=selectJavaCandidate(items,need,architecture);}
   add('java','Java 环境',found?'ok':'needs',found?'Java '+found.version+' · '+found.architecture:'此实例需要 Java '+need.major+' · '+architecture+'，当前未匹配','java');
 }catch(e){add('java','Java 环境','needs',String(e.message),'java');}
 const role=snapshot.accounts.find(a=>a.id===settings.selectedAccount);
 add('account','游戏角色',role?.authenticated&&role.uuid?'ok':'needs',role?.authenticated?(role.uuid?'当前角色可用':'该账号尚未选择游戏角色'):'登录后可以启动游戏','account');
 const override=settings.instanceSettings?.[id]||{},mode=override.memoryMode||'inherit',total=os.totalmem()/1048576;
 const requested=requestedHeap(settings,override,total,os.freemem()/1048576),limit=javaHeapLimit(requested,total,tools.architecture());
 const source=mode==='manual'?'实例单独设置':mode==='auto'||settings.memoryMode!=='manual'?'自动分配':'跟随全局设置';
 add('memory','游戏内存',limit<requested?'info':'ok',source+' · 预计最大堆 '+limit+' MB'+(limit<requested?'（已按 Java 架构和物理内存限制调整）':''),'memory');
 return {instance:id,name:game.name||id,checks,checkedAt:Date.now()};
}
