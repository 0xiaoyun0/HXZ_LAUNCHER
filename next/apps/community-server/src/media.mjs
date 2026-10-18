import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export function imageBytes(value){
  if(typeof value!=='string'||value.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('请选择不超过 1 MB 的 PNG 图片');
  const bytes=Buffer.from(value.slice(22),'base64');
  if(bytes.length<45||bytes.length>1048576||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(12,16).toString()!=='IHDR')throw Error('图片格式无效');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(!width||!height||width>1600||height>1600||width*height>2560000)throw Error('图片尺寸不能超过 1600 × 1600');
  return bytes;
}
export function createMedia({data,db,auth,admin,body,send,limit}){
  const directory=path.join(data,'media');
  db.exec('CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,owner TEXT NOT NULL,scope TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL)');
  const idOf=value=>/^\/api\/media\/([a-f0-9]{64})$/.exec(value||'')?.[1];
  function validate(value,user,scope){if(!value)return '';const id=idOf(value),item=id&&db.prepare('SELECT * FROM media WHERE id=?').get(id);if(!item||item.scope!==scope&&!(['shop','inventory'].includes(scope)&&['shop','inventory'].includes(item.scope))||!['shop','inventory'].includes(scope)&&item.owner!==user.uid)throw Error('请重新上传图片');return value;}
  function published(id){
    const url='/api/media/'+id;
    if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='hub_records'").get()&&db.prepare("SELECT 1 FROM hub_records r,json_each(r.images) i WHERE i.value=? AND r.visibility='community' AND r.status IN ('published','closed') AND r.kind NOT IN ('whitelist','appeal') LIMIT 1").get(url))return true;
    if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='inventory_items'").get()){
      if(db.prepare('SELECT 1 FROM inventory_items WHERE image=?').get(url))return true;
      // Existing rewards keep their original artwork when the item is edited.
      for(const table of ['inventory_batches','inventory_mail','inventory_codes','inventory_escrow'])if(db.prepare(`SELECT 1 FROM ${table} WHERE json_extract(snapshot,'$.image')=? LIMIT 1`).get(url))return true;
    }
    return db.prepare("SELECT 1 FROM shop_items WHERE image=? AND deleted=0 AND enabled=1").get(url)||db.prepare("SELECT 1 FROM guild_tasks WHERE status IN ('open','active','submitted','completed') AND images LIKE ?").get('%'+url+'%')||db.prepare("SELECT 1 FROM guild_claims c JOIN guild_tasks t ON t.id=c.task WHERE c.images LIKE ? AND c.status='completed' AND t.status IN ('open','active','completed')").get('%'+url+'%');
  }
  async function route(req,res,url){
    if(!url.pathname.startsWith('/api/media/'))return false;
    if(url.pathname==='/api/media/upload'&&req.method==='POST'){
      const user=auth(req);limit('media:'+user.uid,10);const input=await body(req,1450000);
      if(!['shop','guild','inventory','hub'].includes(input.scope))throw Error('图片用途无效');if(['shop','inventory'].includes(input.scope))admin(req);
      const bytes=imageBytes(input.image),id=createHash('sha256').update(user.uid+'\0'+input.scope+'\0').update(bytes).digest('hex');
      if(db.prepare('SELECT COALESCE(SUM(size),0) AS size FROM media WHERE owner=?').get(user.uid).size+bytes.length>100*1024*1024&&!db.prepare('SELECT 1 FROM media WHERE id=?').get(id))throw Error('图片空间已达 100 MB，请联系管理员整理');
      await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,id+'.png'),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
      db.prepare('INSERT OR IGNORE INTO media VALUES(?,?,?,?,?)').run(id,user.uid,input.scope,bytes.length,Date.now());
      send(res,201,{url:'/api/media/'+id});return true;
    }
    const match=url.pathname.match(/^\/api\/media\/([a-f0-9]{64})(\/data)?$/);if(!match||req.method!=='GET'){send(res,404,{error:'图片不存在'});return true;}
    const item=db.prepare('SELECT * FROM media WHERE id=?').get(match[1]);if(!item){send(res,404,{error:'图片不存在'});return true;}
    let visible=published(item.id);if(!visible)try{const user=auth(req);visible=user.uid===item.owner||db.prepare('SELECT 1 FROM guild_claims c JOIN guild_tasks t ON t.id=c.task WHERE c.images LIKE ? AND (t.owner=? OR c.uid=?)').get('%/api/media/'+item.id+'%',user.uid,user.uid);try{admin(req);visible=true;}catch{}}catch{}
    if(!visible&&item.scope==='hub')try{const user=auth(req);visible=!!db.prepare("SELECT 1 FROM hub_records r,json_each(r.images) i WHERE i.value=? AND (r.owner=? OR EXISTS(SELECT 1 FROM hub_members m WHERE m.record=r.id AND m.uid=? AND m.state='active')) LIMIT 1").get('/api/media/'+item.id,user.uid,user.uid);}catch{}
    if(!visible){send(res,403,{error:'图片尚未公开'});return true;}
    const bytes=await fs.readFile(path.join(directory,item.id+'.png'));
    if(match[2])send(res,200,{image:'data:image/png;base64,'+bytes.toString('base64')});else{res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'private,max-age=300','X-Content-Type-Options':'nosniff'});res.end(bytes);}return true;
  }
  return {route,validate};
}
