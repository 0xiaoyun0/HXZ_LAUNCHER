import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root=path.dirname(new URL(import.meta.url).pathname).replace(/^\/(?:[A-Z]:)/,'');
const binary=process.env.HXZ_FEC_BINARY||path.join(root,'resources','hxzre','bin',process.platform==='win32'?'mc-tcp-fec.exe':'mc-tcp-fec');
const listen=process.env.HXZ_FEC_LISTEN||'0.0.0.0:40000';
const target=process.env.HXZ_FEC_TARGET||'127.0.0.1:25565';
const token=process.env.HXZ_FEC_TOKEN;
if(!token||token.length<16||/[\r\n]/.test(token))throw Error('请设置 HXZ_FEC_TOKEN（至少 16 个字符）');
const child=spawn(binary,['origin','--listen',listen,'--target',target,'--token',token],{stdio:'inherit',windowsHide:true});
child.once('error',error=>{console.error('FEC origin 启动失败：'+error.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
child.once('exit',(code,signal)=>{if(signal)console.error(`FEC origin 已由 ${signal} 停止`);process.exitCode=code??1;});
