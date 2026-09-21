import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {signUpdate} from './sign-update.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(await fs.readFile(path.join(root,'client/package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
const release=process.env.HXZ_RELEASE_DIR ? path.resolve(process.env.HXZ_RELEASE_DIR) : path.join(root,'release',version),client=path.join(release,'client'),server=path.join(release,'server'),build=path.join(root,'client/dist/electron/Packaged');
// Refuse to turn a previously deployed directory into a public archive.
for(const relative of ['server/幻想镇社区服务端/data','server/幻想镇社区服务端/.env','client/幻想镇启动器/profile']) {
 const runtime=path.join(release,relative);
 try {await fs.access(runtime);} catch(error) {if(error.code==='ENOENT')continue;throw error;}
 throw Error('Release directory contains runtime data; use a clean release directory: '+runtime);
}
for(const dir of [client,server])await fs.mkdir(dir,{recursive:true});
const exe='HXZ-Launcher-'+version+'-x64.exe';
await fs.copyFile(path.join(build,exe),path.join(client,exe));
try{await fs.copyFile(path.join(build,exe+'.blockmap'),path.join(client,exe+'.blockmap'));}catch(e){if(e.code!=='ENOENT')throw e;}
const portable=path.join(client,'幻想镇启动器');await fs.cp(path.join(build,'win-unpacked'),portable,{recursive:true});
await fs.writeFile(path.join(portable,'便携启动.bat'),'@echo off\r\nchcp 65001 >nul\r\nsetlocal\r\ncd /d "%~dp0" || exit /b 1\r\nset "HXZ_LA_HOME=%~dp0profile"\r\nstart "" "%~dp0幻想镇启动器.exe"\r\n');
await fs.writeFile(path.join(client,'使用说明.txt'),'幻想镇启动器 '+version+'\n玩家只需本目录客户端。安装程序支持安装版升级；便携版解压后运行 便携启动.bat。\n下载与安装：Minecraft / 加载器 / Modrinth / 导入 mrpack / CurseForge / Prism / MultiMC / ZIP。\n个性化：字号、颜色、图片、布局。\n社区服务端是另一个独立发布包，客户端不会自动启动它。\n安装版默认从 GitHub 正式版本自动更新，可在设置中关闭；便携版建议手动替换程序并保留 profile。\n');
const serverApp=path.join(server,'幻想镇社区服务端');await fs.mkdir(serverApp,{recursive:true});
for(const dir of ['src','public','arcana','shared'])await fs.cp(path.join(root,'server',dir),path.join(serverApp,dir),{recursive:true});
for(const file of ['package.json','pnpm-lock.yaml','.env.example','Dockerfile','compose.yaml','nginx-community.conf.example'])await fs.copyFile(path.join(root,file==='nginx-community.conf.example'?'docs':'server',file),path.join(serverApp,file));
await fs.mkdir(path.join(serverApp,'node_modules'),{recursive:true});await fs.cp(await fs.realpath(path.join(root,'server/node_modules/ws')),path.join(serverApp,'node_modules/ws'),{recursive:true});
await fs.copyFile(process.execPath,path.join(serverApp,'node.exe'));
await fs.copyFile(path.join(root,'LICENSE'),path.join(serverApp,'LICENSE'));
await fs.copyFile(path.join(root,'server/Node-LICENSE.txt'),path.join(serverApp,'Node-LICENSE.txt'));
await fs.writeFile(path.join(serverApp,'启动社区服务.bat'),'@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0" || exit /b 1\r\nif not exist .env copy .env.example .env >nul\r\n"%~dp0node.exe" --env-file=.env src/server.mjs\r\npause\r\n');
await fs.writeFile(path.join(serverApp,'使用说明.txt'),'幻想镇社区服务端 '+version+'\n独立运行，不需要客户端。双击 启动社区服务.bat。\n网页管理：http://127.0.0.1:8787/admin/\n账号：admin；初始随机密码在 data/初始管理员密码.txt。\n公告、聊天记录、用户、蓝图审核员、论坛与活动管理在网页管理。\n默认只监听本机。公网部署配置 .env、HTTPS 代理和允许来源。语音使用同一社区连接，无需单独配置。\n升级时先停服，保留自己的 data 与 .env。不要把服务端密码发送给玩家。\n');
await fs.mkdir(path.join(serverApp,'docs'),{recursive:true});await fs.copyFile(path.join(root,'docs/部署与接入.md'),path.join(serverApp,'docs/部署与接入.md'));
async function digest(file,algorithm,encoding='hex'){const h=createHash(algorithm);for await(const c of createReadStream(file))h.update(c);return h.digest(encoding);}
const sha512=await digest(path.join(client,exe),'sha512','base64'),size=(await fs.stat(path.join(client,exe))).size;
const changelog=await fs.readFile(path.join(root,'CHANGELOG.md'),'utf8');
const notes=changelog.split('## '+version)[1]?.split(/\r?\n## /)[0]?.trim();
if(!notes)throw Error('Missing release notes for '+version);
await fs.writeFile(path.join(client,'latest.json'),await signUpdate({version,files:[{url:exe,sha512,size}],releaseDate:new Date().toISOString(),releaseNotes:notes}));
await fs.writeFile(path.join(client,'latest.yml'),`version: ${version}\nfiles:\n  - url: ${JSON.stringify(exe)}\n    sha512: ${sha512}\n    size: ${size}\npath: ${JSON.stringify(exe)}\nsha512: ${sha512}\nreleaseDate: ${JSON.stringify(new Date().toISOString())}\n`);
async function zip(dir,file){await new Promise((resolve,reject)=>{const child=spawn('tar.exe',['-a','-c','-f',file,'-C',dir,'.'],{stdio:'inherit',windowsHide:true,shell:false});child.on('error',reject);child.on('close',code=>code?reject(Error('ZIP failed '+code)):resolve());});}
await Promise.all([zip(portable,path.join(client,'HXZ-Launcher-'+version+'-windows-x64-portable.zip')),zip(serverApp,path.join(server,'HXZ-Community-'+version+'-windows-x64.zip'))]);
const legacyBuild=path.join(root,'client/dist/electron/LegacyPackaged'),legacyExe='HXZ-Launcher-'+version+'-ia32.exe';
if(await fs.stat(path.join(legacyBuild,legacyExe)).then(()=>true,()=>false)){
 const legacyDir=path.join(release,'client-ia32');await fs.mkdir(legacyDir,{recursive:true});
 for(const file of [legacyExe,legacyExe+'.blockmap'])await fs.copyFile(path.join(legacyBuild,file),path.join(legacyDir,file));
 const portable=path.join(legacyDir,'幻想镇启动器');await fs.cp(path.join(legacyBuild,'win-ia32-unpacked'),portable,{recursive:true});
 await fs.copyFile(path.join(client,'幻想镇启动器/便携启动.bat'),path.join(portable,'便携启动.bat'));
 await fs.writeFile(path.join(legacyDir,'使用说明.txt'),'Windows 7 SP1 / 32位兼容版。现代Windows 64位请优先使用x64版。\n按游戏 Java 选择本机库与内存；32位Java最大堆限制1280MB，64位系统可使用64位Java。现代Minecraft版本不一定支持Win7或32位。\n便携版保留profile升级；安装版使用独立的ia32签名更新通道。\n');
 const sha512=await digest(path.join(legacyDir,legacyExe),'sha512','base64'),size=(await fs.stat(path.join(legacyDir,legacyExe))).size;
 await fs.writeFile(path.join(legacyDir,'latest-ia32.json'),await signUpdate({version,files:[{url:legacyExe,sha512,size}],releaseDate:new Date().toISOString(),releaseNotes:notes},'ia32'));
 await zip(portable,path.join(legacyDir,'HXZ-Launcher-'+version+'-windows-ia32-portable.zip'));
}
const checks=[];for(const folder of ['client','server',...(await fs.stat(path.join(release,'client-ia32')).then(()=>['client-ia32'],()=>[]))])for(const name of await fs.readdir(path.join(release,folder)))if(/\.(zip|exe|yml|json|blockmap)$/.test(name))checks.push((await digest(path.join(release,folder,name),'sha256'))+'  '+folder+'/'+name);
await fs.writeFile(path.join(release,'SHA256SUMS.txt'),checks.join('\n')+'\n');
console.log('Separate client and server releases:',release);
