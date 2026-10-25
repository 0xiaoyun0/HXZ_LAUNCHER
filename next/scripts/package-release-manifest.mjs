import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const [major,minor,patch]=version.split('.').map(Number);const build=Number(process.env.HXZ_ANDROID_VERSION_CODE||major*100000+minor*10000+patch*100);
const root=path.resolve('release',version);
const rel=[
 `windows-x64/HXZ-Launcher-${version}-x64.exe`,`windows-x64/HXZ-Launcher-${version}-x64.exe.blockmap`,`windows-x64/HXZ-NEXT-${version}-windows-x64-portable.zip`,
 `windows-ia32/HXZ-Launcher-${version}-ia32.exe`,`windows-ia32/HXZ-Launcher-${version}-ia32.exe.blockmap`,`windows-ia32/HXZ-NEXT-${version}-windows-ia32-portable.zip`,
 `server/HXZ-Community-${version}-windows-x64.zip`,`server/HXZ-Community-${version}-update.zip`,
 `android/HXZ-Community-Android-${version}-${build}.apk`,`source/HXZ-Launcher-${version}-source.zip`,
 'game-server/hxz-community-bridge-0.8.0-mcdr.mcdr','game-server/hxz-community-bridge-0.8.0-neoforge-1.21.1.jar',
 'updates/latest.json','updates/latest-ia32.json','updates/latest.yml','updates/android-latest.json','updates/game-runtime-latest.json','updates/game-runtime-latest.payload.json','updates/community-update.json'
];
const files=[];
for(const relPath of rel){const file=path.join(root,relPath);const data=await fs.readFile(file);files.push({path:relPath,size:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await fs.writeFile(path.join(root,`${version}-SHA256SUMS.txt`),files.map(x=>`${x.sha256}  ${x.path}`).join('\n')+'\n');
const android=files.find(x=>x.path.includes('/HXZ-Community-Android-'));
const bridges=files.filter(x=>x.path.startsWith('game-server/')).map(x=>({name:path.basename(x.path),size:x.size,sha256:x.sha256}));
const info={version,tag:`v${version}`,latest:true,draft:false,prerelease:false,deviceTested:false,publishedAt:new Date().toISOString(),gameBridges:{version:'0.8.0',reusedFrom:'0.8.0',files:bridges},androidVersionCode:build,runtimeVersionCode:80400,runtimeMinimumAppVersionCode:80400,files,verification:{engineTests:56,serverTests:125,desktopBuild:true,mobileWebBuild:true,androidBuildArtifact:true,androidDeviceTested:false,ui:['desktop and mobile bounded shell layout','safe-area and landscape viewport containment','unified card and action wrapping']}};
await fs.writeFile(path.join(root,'发布信息.json'),JSON.stringify(info,null,2)+'\n');
await fs.writeFile(path.join(root,'正式发布信息.json'),JSON.stringify({...info,assets:files.map(x=>({name:path.basename(x.path),size:x.size,digest:`sha256:${x.sha256}`,path:x.path,url:`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v${version}/${path.basename(x.path)}`}))},null,2)+'\n');
console.log(`manifest files: ${files.length}; android: ${android?.sha256}`);
