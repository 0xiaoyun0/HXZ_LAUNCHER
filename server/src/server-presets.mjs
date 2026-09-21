import {readFileSync,existsSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {DEFAULT_SERVERS,normalizePresets} from '../shared/server-presets.mjs';
export function createServerPresets({data,admin,body,send,broadcast}) {
  const file=join(data,'server-presets.json');
  let servers=normalizePresets(existsSync(file)?JSON.parse(readFileSync(file,'utf8')):DEFAULT_SERVERS);
  return async(req,res,url)=>{
    if(!['/api/server-presets','/api/admin/server-presets'].includes(url.pathname))return false;
    if(url.pathname.includes('/admin/'))admin(req);
    if(req.method==='GET')send(res,200,{servers});
    else if(req.method==='PUT'&&url.pathname.includes('/admin/')) {
      const next=normalizePresets((await body(req)).servers);
      writeFileSync(file+'.tmp',JSON.stringify(next,null,2));renameSync(file+'.tmp',file);servers=next;
      broadcast({type:'server-presets-changed'});send(res,200,{servers});
    } else send(res,405,{error:'不支持的操作'});
    return true;
  };
}
