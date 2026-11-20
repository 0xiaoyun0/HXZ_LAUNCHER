import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {archive,filesUnder} from './archive.mjs';
import {architecture} from './worker-runtime.mjs';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const release=path.resolve('release',version),dir=path.resolve(process.env.HXZ3_DESKTOP_DIST||path.join(release,'windows-'+architecture));
await archive(dir,path.join(release,'HXZ-3rd-'+version+'-windows-'+architecture+'.zip'));
if(process.argv.includes('--installer')) {
  const files=await filesUnder(dir);
  const dirs=[...new Set(files.flatMap(file=>{
    const parts=file.split(path.sep).slice(0,-1);
    return parts.map((_,i)=>parts.slice(0,i+1).join('\\'));
  }))].sort((a,b)=>b.length-a.length);
  const inc=path.resolve('.runtime','uninstall-files-'+architecture+'.nsh');
  const quoted=p=>p.replaceAll('$','$$').replaceAll('"','$\\"');
  await fs.writeFile(inc,'\uFEFF'+[...files.map(f=>'Delete "$INSTDIR\\'+quoted(f)+'"'),...dirs.map(d=>'RMDir "$INSTDIR\\'+quoted(d)+'"')].join('\r\n'));
  const result=spawnSync(process.env.MAKENSIS||'makensis',['/INPUTCHARSET','UTF8','/DPRODUCT_VERSION='+version,'/DAPP_ICON='+path.resolve('resources/icon.ico'),'/DSOURCE_DIR='+dir,'/DUNINSTALL_FILES='+inc,'/DOUTPUT_FILE='+path.join(release,'HXZ-3rd-'+version+'-setup-'+architecture+'.exe'),'scripts/desktop-installer.nsi'],{stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;if(result.status)process.exit(result.status);
}
