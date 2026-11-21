import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,createPublicKey,sign} from 'node:crypto';
import {UPDATE_PUBLIC_KEY} from '../packages/engine/core/update-public-key.mjs';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';

const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const root=path.resolve('release',version),out=path.join(root,'updates');
if(!process.env.HXZ_UPDATE_SIGNING_KEY)throw Error('设置 HXZ_UPDATE_SIGNING_KEY 后才能签发兼容 0.9.2 的正式更新');
const key=await fs.readFile(process.env.HXZ_UPDATE_SIGNING_KEY);
if(createPublicKey(key).export({type:'spki',format:'pem'})!==UPDATE_PUBLIC_KEY)throw Error('发布密钥与 0.9.2 的信任公钥不匹配');
const notes=await fs.readFile(process.argv[2]||'docs/0.10.0发布说明.md','utf8');
const date=new Date().toISOString();
const artifacts=[];
for(const arch of ['x64','ia32']){
 const src=path.join(root,'HXZ-3rd-'+version+'-setup-'+arch+'.exe'),sha256=createHash('sha256'),sha512=createHash('sha512');
 for await(const bytes of createReadStream(src)){sha256.update(bytes);sha512.update(bytes);}
 const file={url:'HXZ-Launcher-'+version+'-'+arch+'.exe',size:(await fs.stat(src)).size,sha256:sha256.digest('hex'),sha512:sha512.digest('base64')};
 const payload=Buffer.from(JSON.stringify({version,files:[file],releaseDate:date,releaseNotes:notes}));
 const envelope={payload:payload.toString('base64'),signature:sign(null,payload,key).toString('base64')};
 verifyRelease(envelope,UPDATE_PUBLIC_KEY,arch);
 artifacts.push({src,file,envelope,name:arch==='x64'?'latest.json':'latest-ia32.json'});
}
await fs.mkdir(out,{recursive:true});
for(const {src,file,envelope,name} of artifacts){
 await fs.copyFile(src,path.join(out,file.url));
 await fs.writeFile(path.join(out,name+'.tmp'),JSON.stringify(envelope)+'\n');
 await fs.rename(path.join(out,name+'.tmp'),path.join(out,name));
}
console.log('两种架构的安装程序与签名清单已写入 '+out);
