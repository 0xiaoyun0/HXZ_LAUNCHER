import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('release/0.8.7');
const rel=[
'windows-x64/HXZ-Launcher-0.8.7-x64.exe','windows-x64/HXZ-Launcher-0.8.7-x64.exe.blockmap','windows-x64/HXZ-NEXT-0.8.7-windows-x64-portable.zip',
'windows-ia32/HXZ-Launcher-0.8.7-ia32.exe','windows-ia32/HXZ-Launcher-0.8.7-ia32.exe.blockmap','windows-ia32/HXZ-NEXT-0.8.7-windows-ia32-portable.zip',
'server/HXZ-Community-0.8.7-windows-x64.zip','server/HXZ-Community-0.8.7-update.zip',
'android/HXZ-Community-Android-0.8.7-80700.apk','source/HXZ-Launcher-0.8.7-source.zip',
'game-server/hxz-community-bridge-0.8.0-mcdr.mcdr','game-server/hxz-community-bridge-0.8.0-neoforge-1.21.1.jar',
'updates/latest.json','updates/latest-ia32.json','updates/latest.yml','updates/android-latest.json','updates/game-runtime-latest.json','updates/game-runtime-latest.payload.json','updates/community-update.json'
];
const files=[];
for(const relPath of rel){const file=path.join(root,relPath);const data=await fs.readFile(file);files.push({path:relPath,size:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await fs.writeFile(path.join(root,'0.8.7-SHA256SUMS.txt'),files.map(x=>`${x.sha256}  ${x.path}`).join('\n')+'\n');
const android=files.find(x=>x.path.includes('/HXZ-Community-Android-'));
const bridges=files.filter(x=>x.path.startsWith('game-server/')).map(x=>({name:path.basename(x.path),size:x.size,sha256:x.sha256}));
const info={version:'0.8.7',tag:'v0.8.7',latest:true,draft:false,prerelease:false,deviceTested:false,publishedAt:'2026-10-25T00:00:00Z',gameBridges:{version:'0.8.0',reusedFrom:'0.8.0',files:bridges},androidVersionCode:80700,runtimeVersionCode:80400,runtimeMinimumAppVersionCode:80400,files,verification:{engineTests:56,serverTests:125,desktopBuild:true,mobileWebBuild:true,androidBuildArtifact:true,androidDeviceTested:false,ui:['desktop game shelf compact/full screenshot','stable toolbar grid alignment','three-column card baseline alignment']}};
await fs.writeFile(path.join(root,'发布信息.json'),JSON.stringify(info,null,2)+'\n');
await fs.writeFile(path.join(root,'正式发布信息.json'),JSON.stringify({...info,assets:files.map(x=>({name:path.basename(x.path),size:x.size,digest:`sha256:${x.sha256}`,path:x.path,url:`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.8.7/${path.basename(x.path)}`}))},null,2)+'\n');
console.log(`manifest files: ${files.length}; android: ${android?.sha256}`);
