import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import pkg from '../../../package.json' with {type:'json'};
import {androidRelease,apkName} from '../../android/release-info.mjs';
const {version}=pkg, base='HXZ-3rd-'+version;
const android=androidRelease(pkg);
const files=[
 ...['x64','ia32'].flatMap(arch=>[base+'-setup-'+arch+'.exe',base+'-windows-'+arch+'.zip','updates/HXZ-Launcher-'+version+'-'+arch+'.exe']),
 ...['Community','Music','Arcade'].map(id=>'extensions/HXZ-'+id+'-Plugin-'+version+'.zip'),
 'updates/latest.json','updates/latest-ia32.json','android/'+apkName(android,'arm64-v8a'),'SHA256SUMS.txt'
];
async function shipped(){
 const root=path.resolve(import.meta.dirname,'../../..');
 const list=[];
 for(const rel of files){const name=path.basename(rel);
   const isAndroid=rel.startsWith('android/');
   const dirs=process.env.HXZ3_RELEASE_DIR?[path.resolve(process.env.HXZ3_RELEASE_DIR)]:
     isAndroid?[path.resolve(root,'release',android.id),path.resolve(root,'..',android.id),root]:[root,path.resolve(root,'release',version)];
   for(const dir of dirs){const absolute=path.join(dir,rel),stat=await fs.stat(absolute).catch(()=>null);if(stat?.isFile()){list.push({name,absolute,size:stat.size,url:'/api/release-file/'+name});break;}}
 }
 return list;
}
export async function releaseIndex(){const items=await shipped();return {version,notes:'桌面启动器支持继续上次游玩。设置中可下载社区插件，重启后可使用聊天、论坛、冒险者协会与 LINKING。',assets:items.filter(f=>f.name!=='SHA256SUMS.txt').map(({absolute,...file})=>file),checksums:items.find(f=>f.name==='SHA256SUMS.txt')?.url};}
export async function releaseFile(req,res,name){if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const entry=(await shipped()).find(f=>f.name===name);if(!entry){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':entry.size,'Content-Disposition':'attachment; filename="'+entry.name+'"','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD'){res.end();return;}await pipeline(createReadStream(entry.absolute),res);
}
