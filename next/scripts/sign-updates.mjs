import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,createPublicKey,sign} from 'node:crypto';
import {UPDATE_PUBLIC_KEY} from '../packages/engine/core/update-public-key.mjs';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const base=path.resolve('release',version),output=path.join(base,'updates');
const key=await fs.readFile(process.env.HXZ_UPDATE_SIGNING_KEY||path.join(os.homedir(),'.hxz-launcher-publish/update-ed25519.pem'));
if(createPublicKey(key).export({type:'spki',format:'pem'})!==UPDATE_PUBLIC_KEY)throw Error('更新签名公钥不匹配');
await fs.mkdir(output,{recursive:true});
const releaseDate=new Date().toISOString(),releaseNotes=await fs.readFile(`docs/${version}发布说明.md`,'utf8');
for(const arch of ['x64','ia32']){
 const url=`HXZ-Launcher-${version}-${arch}.exe`,file=path.join(base,'windows-'+arch,url),hash=createHash('sha512');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 const info={version,files:[{url,sha512:hash.digest('base64'),size:(await fs.stat(file)).size}],releaseDate,releaseNotes};
 const bytes=Buffer.from(JSON.stringify(info)),envelope={payload:bytes.toString('base64'),signature:sign(null,bytes,key).toString('base64')};
 verifyRelease(envelope,UPDATE_PUBLIC_KEY,arch);
 await fs.writeFile(path.join(output,arch==='ia32'?'latest-ia32.json':'latest.json'),JSON.stringify(envelope)+'\n');
 if(arch==='x64')await fs.writeFile(path.join(output,'latest.yml'),`version: ${version}\nfiles:\n  - url: ${url}\n    sha512: ${info.files[0].sha512}\n    size: ${info.files[0].size}\npath: ${url}\nsha512: ${info.files[0].sha512}\nreleaseDate: '${releaseDate}'\n`);
 console.log(`Signed ${version} ${arch} manifest, installer hash verified`);
}
