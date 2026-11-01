// Upload reviewed artifacts to an existing draft release; resume only missing or changed assets.
// GitHub removes non-ASCII characters from uploaded filenames. Keep local paths in Chinese,
// but use the explicit ASCII assetName from the release manifest for remote attachments.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const root=await fs.realpath(path.join('release',version)),stage=path.join(await fs.realpath('.runtime'),'upload-'+version);
const gh=process.env.HXZ_GH||'gh',repo='0xiaoyun0/HXZ_LAUNCHER',tag='v'+version;
const manifest=JSON.parse(await fs.readFile(path.join(root,'发布信息.json'),'utf8'));
const files=manifest.files.map(v=>({...v,name:v.assetName||path.basename(v.path)}));
for(const [file,name] of [['发布信息.json',`release-${version}.json`],['正式发布信息.json',`release-assets-${version}.json`],[`${version}-SHA256SUMS.txt`,`${version}-SHA256SUMS.txt`]]){
 const h=createHash('sha256'),source=path.join(root,file);for await(const chunk of createReadStream(source))h.update(chunk);files.push({path:file,name,sha256:h.digest('hex'),size:(await fs.stat(source)).size});
}
const releases=JSON.parse(execFileSync(gh,['api',`repos/${repo}/releases?per_page=100`],{maxBuffer:16*1024*1024}));
const release=releases.find(v=>v.tag_name===tag);if(!release?.draft)throw Error('An existing draft release is required; this script never changes a published release');
await fs.mkdir(stage,{recursive:true});const pending=[];
for(const file of files){
 if(!/^[A-Za-z0-9._-]+$/.test(file.name))throw Error('Non-ASCII GitHub asset name: '+file.name);
 const current=release.assets.find(v=>v.name===file.name);if(current?.state==='uploaded'&&current.size===file.size&&current.digest==='sha256:'+file.sha256)continue;
 const source=path.join(root,file.path),destination=path.join(stage,file.name);if(!source.startsWith(root+path.sep)||!destination.startsWith(stage+path.sep))throw Error('Asset path escaped release directory');
 await fs.rm(destination,{force:true});try{await fs.link(source,destination);}catch(error){if(error.code!=='EXDEV')throw error;await fs.copyFile(source,destination);}pending.push(destination);
}
console.log(`Already verified ${files.length-pending.length}/${files.length}; uploading ${pending.length} files.`);
if(pending.length)await new Promise((resolve,reject)=>{const child=spawn(gh,['release','upload',tag,'--repo',repo,'--clobber',...pending],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code?reject(Error('Asset upload failed: '+code)):resolve());});
