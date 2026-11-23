import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {DEFAULT_SERVERS} from '../../server/shared/server-presets.mjs';

const {values}=parseArgs({options:{serial:{type:'string'},server:{type:'string'},instance:{type:'string'},directory:{type:'string'}}});
const preset=DEFAULT_SERVERS.find(s=>s.id===values.server&&s.profileSource==='hxzup');
assert.ok(values.serial&&preset,'指定 --serial 和 HXZUP 服务器 --server HXZ-mod-1 或 HXZ-mod-2');
const instance=values.instance||preset.id;
assert.ok(instance.length<=128&&instance!=='.'&&instance!=='..'&&!/[\\/\u0000-\u001f]/u.test(instance),'实例名无效');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
const adb=sdk?path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb'):'adb';
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
const shell=cmd=>execFileSync(adb,['-s',values.serial,'shell',cmd],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,windowsHide:true});
async function json(url){
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{const response=await fetch(url,{signal:AbortSignal.timeout(16000)});assert.ok(response.ok,'发布端返回 HTTP '+response.status);return await response.json();}
    catch(e){error=e;if(attempt<2)await delay(500*(attempt+1));}
  }
  throw error;
}
const directories=values.directory?[values.directory]:['/sdcard/FantasyTown/.minecraft/versions','/sdcard/Android/data/top.hxzmc.launcher.third.debug/files/.minecraft/versions'];
const dirs=directories.map(d=>path.posix.join(d,instance));
const run=dirs.find(dir=>shell('test -f '+quote(dir+'/modrinth.index.json')+' && echo found || true').trim()==='found');
assert.ok(run,'目标实例还没有完整的 HXZUP 安装索引。');
const installed=JSON.parse(shell('cat '+quote(run+'/modrinth.index.json')));
const urls=(await json('https://qqbot.hxzmc.top/api/server-presets')).servers.find(s=>s.id===preset.id)?.updateUrls||preset.updateUrls;
let current,lastError;
for(const base of urls){
  try{
    const u=new URL(base);assert.ok(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash);
    const read=file=>json(base.replace(/\/$/,'')+'/'+file);
    const status=await read('version.json');assert.ok(!status.maintenance,'服务器正在维护');
    const suffix='?version='+encodeURIComponent(status.version);
    const [profile,manifest]=await Promise.all([read('game-profile.json'+suffix),read('manifest.json'+suffix)]);
    current={revision:status.version,profile,manifest};break;
  }catch(e){lastError=e;}
}
if(!current)throw lastError||Error('无法读取这个服务器的 HXZUP 清单。');
assert.equal(installed.versionId,current.revision,'本机整合包发布版本与 HXZUP 不符');
assert.equal(installed.dependencies.minecraft,current.profile.gameVersion,'Minecraft 版本');
const loader=current.profile.loader,loaderKey=['fabric','quilt'].includes(loader?.type)?loader.type+'-loader':loader?.type;
if(loaderKey)assert.equal(installed.dependencies[loaderKey],loader.version,'加载器版本');
const index=new Map(installed.files.map(f=>[f.path,f.hashes?.sha1]));
const files=current.manifest.files.filter(f=>f.path.startsWith('1/')&&f.action!=='force_delete');
assert.equal(index.size,files.length,'安装索引的游戏文件数');
for(const row of files){
  const local=row.path.slice(2);
  assert.ok(local.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[\\\u0000-\u001f]/u.test(part)),'无效游戏相对路径');
  assert.equal(index.get(local),row.sha1,'安装索引与 HXZUP 摘要不符 · '+local);
}
let verified=0;
const retained=[],disabled=[],failures=[];
for(let offset=0;offset<files.length;offset+=60){
  const batch=files.slice(offset,offset+60);
  const paths=batch.map(f=>quote(f.path.slice(2))).join(' ');
  const command='cd '+quote(run)+' || exit 1\nset --\nfor p in '+paths+'; do '+
    'if [ -f "$p" ]; then set -- "$@" "$p"; elif [ -f "$p.disabled" ]; then set -- "$@" "$p.disabled"; '+
    'else printf "MISSING  %s\\n" "$p"; fi; done\n[ "$#" -eq 0 ] || toybox sha1sum "$@"';
  const hashes=new Map(shell(command).split(/\r?\n/).map(l=>l.match(/^(MISSING|[\da-f]{40})  (.+)$/)).filter(Boolean).map(match=>[match[2],match[1]]));
  for(const row of batch){
    const local=row.path.slice(2),digest=hashes.get(local);
    if(digest===row.sha1){verified++;continue;}
    if(hashes.get(local+'.disabled')===row.sha1&&/^mods\/.*(?:IMBlocker|InGameIME|InputMethodBlocker).*\.jar$/i.test(local)){
      disabled.push(local);continue;
    }
    const custom=digest&&digest!=='MISSING'&&!/\.(?:jar|class|js|zs)$/i.test(local)&&['skip_if_modified','add_if_missing'].includes(row.action);
    if(custom)retained.push(local);else failures.push(local);
  }
}
console.log(JSON.stringify({server:preset.name,revision:current.revision,game:current.profile.gameVersion,loader,verified,
  androidDisabled:disabled,retainedByPolicy:retained.length,retainedExamples:retained.slice(0,8),failed:failures.length},null,2));
assert.ok(!failures.length,'文件缺失或校验失败 · '+failures.slice(0,8).join('、'));
