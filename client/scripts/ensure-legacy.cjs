const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pipeline}=require('node:stream/promises'),{createWriteStream,createReadStream}=require('node:fs');
const {spawnSync}=require('node:child_process');
const directory=path.resolve(__dirname,'../tools/legacy'),file=path.join(directory,'electron22-ia32.zip');
const expected='1119ac7112590cb9c10a8c9b0bb5be65c0e11648a4f1311e6b7a5a00e497c2ce';
async function digest(){const h=crypto.createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');}
async function main(){
 await fs.mkdir(directory,{recursive:true});
 let valid=false;try{valid=await digest()===expected}catch{}
 if(!valid){let failure;for(const base of ['https://npmmirror.com/mirrors/electron/22.3.27/','https://github.com/electron/electron/releases/download/v22.3.27/']){try{const r=await fetch(base+'electron-v22.3.27-win32-ia32.zip',{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('HTTP '+r.status);await pipeline(r.body,createWriteStream(file+'.part'));await fs.rename(file+'.part',file);if(await digest()!==expected)throw Error('Electron runtime SHA256 mismatch');valid=true;break}catch(e){failure=e;await fs.rm(file+'.part',{force:true});}}if(!valid)throw failure;}
 const quote=s=>"'"+s.replaceAll("'","''")+"'";
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath ${quote(file)} -DestinationPath ${quote(path.join(directory,'electron'))} -Force`],{stdio:'inherit',windowsHide:true});
 if(result.error||result.status)throw result.error||Error('Cannot extract Electron');
 console.log('Verified Electron 22.3.27 ia32 ready');
}
main().catch(e=>{console.error(e);process.exitCode=1});
