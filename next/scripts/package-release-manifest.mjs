import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const [major,minor,patch]=version.split('.').map(Number),build=Number(process.env.HXZ_ANDROID_VERSION_CODE||major*100000+minor*10000+patch*100);
const root=path.resolve('release',version);
const verification=JSON.parse(await fs.readFile(path.join(root,'验证结果.json'),'utf8'));
if(verification.version!==version||!verification.passed)throw Error('Release verification record is required');
const rel=[
 `windows-x64/HXZ-Launcher-${version}-x64.exe`,`windows-x64/HXZ-Launcher-${version}-x64.exe.blockmap`,`windows-x64/HXZ-NEXT-${version}-windows-x64-portable.zip`,
 `windows-ia32/HXZ-Launcher-${version}-ia32.exe`,`windows-ia32/HXZ-Launcher-${version}-ia32.exe.blockmap`,`windows-ia32/HXZ-NEXT-${version}-windows-ia32-portable.zip`,
 `server/HXZ-Community-${version}-windows-x64.zip`,`server/HXZ-Community-${version}-update.zip`,
 `android/HXZ-Community-Android-${version}-${build}.apk`,`android/${build}-发布信息.json`,`source/HXZ-Launcher-${version}-source.zip`,
 `game-server/hxz-community-bridge-${version}-mcdr.mcdr`,`game-server/hxz-community-bridge-${version}-neoforge-1.21.1.jar`,`game-server/HXZ-MC-Server-Kit-${version}-windows.zip`,
 `HXZ-Plugin-SDK-${version}.zip`,
 'updates/latest.json','updates/latest-ia32.json','updates/latest.yml','updates/android-latest.json',`updates/android-${build}.json`,'updates/game-runtime-latest.json','updates/game-runtime-latest.payload.json','updates/community-update.json',
 'README.md',`${version}发布说明.md`,`${version}Windows服务器安装.md`,`${version}插件规范.md`,`${version}验证记录.md`,'验证结果.json'
];
const files=[];
for(const relPath of rel){const file=path.join(root,relPath),hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);files.push({path:relPath,size:(await fs.stat(file)).size,sha256:hash.digest('hex')});}
await fs.writeFile(path.join(root,`${version}-SHA256SUMS.txt`),files.map(x=>`${x.sha256}  ${x.path}`).join('\n')+'\n');
const info={version,tag:`v${version}`,builtAt:new Date().toISOString(),gameBridges:{version,files:files.filter(x=>x.path.startsWith('game-server/'))},androidVersionCode:build,runtimeVersionCode:80400,runtimeMinimumAppVersionCode:80400,files,verification};
await fs.writeFile(path.join(root,'发布信息.json'),JSON.stringify(info,null,2)+'\n');
await fs.writeFile(path.join(root,'正式发布信息.json'),JSON.stringify({...info,assets:files.map(x=>({name:path.basename(x.path),size:x.size,digest:`sha256:${x.sha256}`,path:x.path,url:`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v${version}/${path.basename(x.path)}`}))},null,2)+'\n');
console.log(`Release manifest: ${files.length} verified files`);
