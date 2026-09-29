import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const target=process.argv[2];if(!target)throw Error('用法：node install.mjs <社区服务端目录>');
const root=path.resolve(target),entry=path.join(root,'src/server.mjs'),here=path.dirname(fileURLToPath(import.meta.url));
let source=await fs.readFile(entry,'utf8');
if(!source.includes('createDirectLobby')){
 const anchor='const feedbackRoute=createFeedback({db,auth,admin,body,send,limit});',route='if(await feedbackRoute(req,res,url))return;';
 if(!source.includes(anchor)||!source.includes(route))throw Error('此服务端入口与当前扩展不匹配，已停止，未修改文件');
 await fs.copyFile(entry,entry+'.before-direct-lobby-'+Date.now());
 source="import {createDirectLobby} from './direct-lobby.mjs';\n"+source.replace(anchor,anchor+'\n  const directLobby=createDirectLobby({db,auth,admin,body,send,limit});').replace(route,'if(await directLobby(req,res,url))return;\n      '+route);
}
await fs.copyFile(path.join(here,'direct-lobby.mjs'),path.join(root,'src/direct-lobby.mjs'));
await fs.copyFile(path.join(here,'direct-wire.mjs'),path.join(root,'src/direct-wire.mjs'));
await fs.writeFile(entry,source);console.log('联机权限扩展已安装；重启社区服务后生效。账号、积分及其他原表均保留。');
