import fs from 'node:fs/promises';
import path from 'node:path';

export async function verifyDesktopArchitecture(dir,architecture){
  const machine={x64:0x8664,ia32:0x14c}[architecture];
  if(!machine)throw Error('未知 Windows 架构 '+architecture);
  if(await fs.stat(path.join(dir,'幻想镇 极简版.exe')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw Error('安装目录残留独立极简版程序');
  for(const name of ['幻想镇 3rd.exe','engine/node.exe']){
    const file=await fs.open(path.join(dir,name));
    try{
      const dos=Buffer.alloc(64),pe=Buffer.alloc(6);
      if((await file.read(dos,0,64,0)).bytesRead!==64||dos.readUInt16LE(0)!==0x5a4d)throw Error('Windows 文件头无效 '+name);
      if((await file.read(pe,0,6,dos.readUInt32LE(60))).bytesRead!==6||pe.readUInt32LE(0)!==0x4550||pe.readUInt16LE(4)!==machine)throw Error(name+' 与 '+architecture+' 架构不符');
    }finally{await file.close();}
  }
}
