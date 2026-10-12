import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import yazl from 'yazl';

const fork=path.resolve('.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf/FCL/src/main/java/up/hxz');
const dir=await fs.mkdtemp(path.resolve('.runtime/android-adaptation-check-')),gson=path.resolve('.runtime/build-tools/gradle-8.14.4/lib/gson-2.10.jar'),jdk='C:/Program Files/Java/jdk-21/bin/';
const sha=b=>createHash('sha1').update(b).digest('hex');
async function jar(text){const zip=new yazl.ZipFile(),parts=[];zip.outputStream.on('data',b=>parts.push(b));const done=once(zip.outputStream,'end');zip.addBuffer(Buffer.from(text),'META-INF/neoforge.mods.toml');zip.end();await done;return Buffer.concat(parts);}
const bad=await jar('[[mods]]\nmodId="testnative"\n'),core=await jar('[[mods]]\nmodId="gameplay"\n'),dependent=await jar('[[mods]]\nmodId="gameplay"\n[[dependencies.gameplay]]\nmodId="testnative"\ntype="required"\nversionRange="[1,)"\nside="CLIENT"\n');
const body=Buffer.alloc(720000);for(let i=0;i<body.length;i++)body[i]=(i*17+13)%251;
let resumeCalls=0,rangeSeen=0,zink=false,blockedDownloads=0;const downloads=[];
const files={'1/mods/输入法.jar':bad,'1/mods/航空学.jar':core};
const manifest={version:'one',files:Object.entries(files).map(([p,b])=>({path:p,sha1:sha(b),fileSize:b.length}))};
const profile={gameVersion:'1.21.1',loader:{type:'vanilla',version:''}};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
 if(p==='phase-zink'){zink=true;return res.end('ok');}
 if(p==='missing'){res.writeHead(404);return res.end();}
 if(p==='resume'){
  resumeCalls++;const start=Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1]||0);rangeSeen=Math.max(rangeSeen,start);
  res.writeHead(start?206:200,{'Content-Length':body.length-start,...(start?{'Content-Range':`bytes ${start}-${body.length-1}/${body.length}`}:{})});
  if(resumeCalls===1){res.write(body.subarray(0,131072));setTimeout(()=>res.destroy(),50);}else res.end(body.subarray(start));return;
 }
 if(p==='version.json')return res.end(JSON.stringify({version:'one'}));
 if(p==='manifest.json')return res.end(JSON.stringify(manifest));
 if(p==='action.json')return res.end(JSON.stringify({rules:{global:{file:'force_overwrite',directory:'strict'}}}));
 if(p==='game-profile.json')return res.end(JSON.stringify(profile));
 if(p==='changelog.json')return res.end('{}');
 if(files[p]){downloads.push(p);if(!zink&&p==='1/mods/输入法.jar')blockedDownloads++;res.setHeader('Content-Length',files[p].length);return res.end(files[p]);}
 res.writeHead(404);res.end();
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const catalog={revision:'test-1',files:[{sha1:sha(bad),ids:['testnative'],depends:[],action:'disable',renderers:['nggl4es'],reason:'fixture native'},{sha1:sha(core),ids:['gameplay'],depends:[]}]};
try{
 const java=(await fs.readdir(fork)).filter(n=>n.endsWith('.java')).map(n=>path.join(fork,n));
 execFileSync(jdk+'javac.exe',['--release','8','-encoding','UTF-8','-cp',gson,'-d',dir,...java,path.resolve('scripts/tests/fixtures/AndroidAdaptationCheck.java')],{windowsHide:true,stdio:'pipe'});
 async function run(mode,root,...args){const p=spawn(jdk+'java.exe',['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8','-cp',dir+path.delimiter+gson,'up.hxz.AndroidAdaptationCheck',mode,root,...args],{windowsHide:true});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);const timer=setTimeout(()=>p.kill(),60000);const [code]=await once(p,'close');clearTimeout(timer);assert.equal(code,0,output);console.log(output.trim().split('\n').at(-1));}
 await run('basic',path.join(dir,'基础'));
 await run('download',path.join(dir,'下载'),url,sha(body));assert.ok(rangeSeen>0,'connection reset should preserve and resume bytes');assert.equal(resumeCalls,2);
 const config=path.join(dir,'catalog.json');await fs.writeFile(config,JSON.stringify(catalog));
 const game=path.join(dir,'游戏');await fs.mkdir(path.join(game,'mods'),{recursive:true});await fs.writeFile(path.join(game,'mods/输入法.jar'),bad);
 await run('compat',game,config,url,sha(bad));assert.equal(blockedDownloads,0,'blocked file must not be downloaded before update');
 const guarded=path.join(dir,'用户依赖');await fs.mkdir(path.join(guarded,'mods'),{recursive:true});await fs.writeFile(path.join(guarded,'mods/输入法.jar'),bad);await fs.writeFile(path.join(guarded,'mods/用户添加.jar'),dependent);
 await run('guard',guarded,config,url);
 console.log('PASS Android revision: resumable SHA1 transport, mirror fallback, UTF8 logs, install receipts, pre-download filtering, recovery and required-dependency guard');
}finally{server.closeAllConnections();server.close();}
