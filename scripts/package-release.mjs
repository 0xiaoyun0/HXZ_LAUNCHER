import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(await fs.readFile(path.join(root,'client/package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
const release=path.join(root,'release',version),client=path.join(release,'client'),server=path.join(release,'server'),build=path.join(root,'client/dist/electron/Packaged');
// Refuse to turn a previously deployed directory into a public archive.
for(const relative of ['server/幻想镇社区服务端/data','server/幻想镇社区服务端/.env','client/幻想镇启动器/profile']) {
 const runtime=path.join(release,relative);
 try {await fs.access(runtime);} catch(error) {if(error.code==='ENOENT')continue;throw error;}
 throw Error('Release directory contains runtime data; use a clean release directory: '+runtime);
}
for(const dir of [client,server])await fs.mkdir(dir,{recursive:true});
const exe='幻想镇启动器-'+version+'-x64.exe';
await fs.copyFile(path.join(build,exe),path.join(client,exe));
try{await fs.copyFile(path.join(build,exe+'.blockmap'),path.join(client,exe+'.blockmap'));}catch(e){if(e.code!=='ENOENT')throw e;}
const portable=path.join(client,'幻想镇启动器');await fs.cp(path.join(build,'win-unpacked'),portable,{recursive:true});
await fs.writeFile(path.join(portable,'便携启动.bat'),'@echo off\r\nchcp 65001 >nul\r\nsetlocal\r\ncd /d "%~dp0" || exit /b 1\r\nset "HXZ_LA_HOME=%~dp0profile"\r\nstart "" "%~dp0幻想镇启动器.exe"\r\n');
await fs.writeFile(path.join(client,'使用说明.txt'),'幻想镇启动器 '+version+'\n玩家只需本目录客户端。安装程序支持安装版升级；便携版解压后运行 便携启动.bat。\n下载与安装：Minecraft / 加载器 / Modrinth / 拖入 mrpack。\n个性化：字号、颜色、图片、布局。\n社区服务端是另一个独立发布包，客户端不会自动启动它。\n内置自更新请使用管理员的 HTTPS 发布目录；便携版建议手动替换程序并保留 profile。\n');
const serverApp=path.join(server,'幻想镇社区服务端');await fs.mkdir(serverApp,{recursive:true});
for(const dir of ['src','public'])await fs.cp(path.join(root,'server',dir),path.join(serverApp,dir),{recursive:true});
for(const file of ['package.json','pnpm-lock.yaml','.env.example','Dockerfile','compose.yaml','nginx-community.conf.example'])await fs.copyFile(path.join(root,file==='nginx-community.conf.example'?'docs':'server',file),path.join(serverApp,file));
await fs.mkdir(path.join(serverApp,'node_modules'),{recursive:true});await fs.cp(await fs.realpath(path.join(root,'server/node_modules/ws')),path.join(serverApp,'node_modules/ws'),{recursive:true});
await fs.copyFile(process.execPath,path.join(serverApp,'node.exe'));
await fs.copyFile(path.join(root,'LICENSE'),path.join(serverApp,'LICENSE'));
await fs.copyFile(path.join(root,'server/Node-LICENSE.txt'),path.join(serverApp,'Node-LICENSE.txt'));
await fs.writeFile(path.join(serverApp,'启动社区服务.bat'),'@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0" || exit /b 1\r\nif not exist .env copy .env.example .env >nul\r\n"%~dp0node.exe" --env-file=.env src/server.mjs\r\npause\r\n');
await fs.writeFile(path.join(serverApp,'使用说明.txt'),'幻想镇社区服务端 '+version+'\n独立运行，不需要客户端。双击 启动社区服务.bat。\n网页管理：http://127.0.0.1:8787/admin/\n账号：admin；初始随机密码在 data/初始管理员密码.txt。\n公告、聊天记录、在线用户、封禁、管理员 UUID、TURN 在网页配置。\n默认只监听本机。公网部署配置 .env、HTTPS 代理、允许来源和 TURN。\n升级时先停服，保留自己的 data 与 .env。不要把服务端密码发送给玩家。\n');
await fs.mkdir(path.join(serverApp,'docs'),{recursive:true});await fs.copyFile(path.join(root,'docs/部署与接入.md'),path.join(serverApp,'docs/部署与接入.md'));
async function digest(file,algorithm,encoding='hex'){const h=createHash(algorithm);for await(const c of createReadStream(file))h.update(c);return h.digest(encoding);}
const sha512=await digest(path.join(client,exe),'sha512','base64'),size=(await fs.stat(path.join(client,exe))).size;
await fs.writeFile(path.join(client,'latest.yml'),`version: ${version}\nfiles:\n  - url: ${JSON.stringify(exe)}\n    sha512: ${sha512}\n    size: ${size}\npath: ${JSON.stringify(exe)}\nsha512: ${sha512}\nreleaseDate: ${JSON.stringify(new Date().toISOString())}\n`);
async function zip(dir,file){await new Promise((resolve,reject)=>{const child=spawn('tar.exe',['-a','-c','-f',file,'-C',dir,'.'],{stdio:'inherit',windowsHide:true,shell:false});child.on('error',reject);child.on('close',code=>code?reject(Error('ZIP failed '+code)):resolve());});}
await Promise.all([zip(portable,path.join(client,'幻想镇启动器-'+version+'-windows-x64-便携版.zip')),zip(serverApp,path.join(server,'幻想镇社区服务端-'+version+'-windows-x64.zip'))]);
const checks=[];for(const folder of ['client','server'])for(const name of await fs.readdir(path.join(release,folder)))if(/\.(zip|exe|yml|blockmap)$/.test(name))checks.push((await digest(path.join(release,folder,name),'sha256'))+'  '+folder+'/'+name);
await fs.writeFile(path.join(release,'SHA256SUMS.txt'),checks.join('\n')+'\n');
console.log('Separate client and server releases:',release);
