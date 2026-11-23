import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import yauzl from 'yauzl';
import {hash,json,writeJSON,parallel,noLinks} from './io.mjs';
import {listInstanceFiles,instanceFilePaths,resolveEntry} from './instance-files.mjs';

const types={mod:'mods',resourcepack:'resources',shader:'shaders'};
const validDigest=value=>/^[a-f0-9]{128}$/.test(value);
const text=value=>typeof value==='string'?value.trim().slice(0,200):'';
function manifest(name,body){
  if(name.endsWith('.toml')){
    const first=body.split(/\[\[mods\]\]/i)[1]?.split(/\n\s*\[/)[0]||'';
    const field=k=>text(new RegExp('^\\s*'+k+'\\s*=\\s*["\']([^"\']+)','m').exec(first)?.[1]);
    return {slug:field('modId'),title:field('displayName'),version:field('version').replace(/^\$\{.*\}$/,'')};
  }
  const data=JSON.parse(body);
  if(name==='pack.mcmeta')return {title:text(data.pack?.description)||text(data.pack?.description?.text)};
  const mod=data.quilt_loader||data;
  return {slug:text(mod.id),title:text(mod.metadata?.name)||text(mod.name),version:text(mod.version)};
}
const supported=new Set(['fabric.mod.json','quilt.mod.json','META-INF/mods.toml','META-INF/neoforge.mods.toml','pack.mcmeta']);
export function embeddedResource(file,kind){
  return new Promise(resolve=>yauzl.open(file,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
    if(error)return resolve({});
    let count=0,done=false;
    const finish=value=>{if(!done){done=true;zip.close();resolve(value);}};
    zip.on('error',()=>finish({}));zip.on('end',()=>finish({}));
    zip.on('entry',entry=>{
      if(++count>50000)return finish({});
      if(!supported.has(entry.fileName)||(entry.fileName==='pack.mcmeta')===(kind==='mod')||entry.uncompressedSize>128*1024)return zip.readEntry();
      zip.openReadStream(entry,async(err,stream)=>{
        if(err)return finish({});
        try{const parts=[];for await(const part of stream)parts.push(part);
          const info=manifest(entry.fileName,Buffer.concat(parts).toString('utf8'));
          if(info.title||info.slug)return finish(info);
        }catch{}
        if(!done)zip.readEntry();
      });
    });zip.readEntry();
  }));
}
export function createResourceInventory(data,lookup){
  const fingerprints=new Map(),unknown=new Map(),directory=path.join(data,'resource-identities');
  async function record(digest,release){
    if(!validDigest(digest)||!release.project_id||!release.id)return;
    const value={project:release.project_id,release:release.id,version:text(release.version_number),releaseName:text(release.name)};
    await writeJSON(path.join(directory,digest+'.json'),value);
    return value;
  }
  async function fingerprint(file,stat,kind){
    const savedAt=path.join(data,'cache','resource-files',createHash('sha256').update(file).digest('hex')+'.json');
    const stamp=[stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
    const saved=await json(savedAt).catch(()=>null);
    if(saved?.stamp===stamp&&validDigest(saved.digest))return [saved.digest,saved.meta];
    const [digest,meta]=await Promise.all([hash(file,'sha512'),embeddedResource(file,kind)]);
    await writeJSON(savedAt,{stamp,digest,meta}).catch(()=>{});
    return [digest,meta];
  }
  async function scan(settings,instance,kind){
    const group=Object.hasOwn(types,kind)&&types[kind];if(!group)throw Error('不支持此资源类型');
    const listing=await listInstanceFiles(settings,instance,group),paths=await instanceFilePaths(settings,instance,group);
    await parallel(listing.items,async item=>{
      try{
        const {file,stat}=await resolveEntry(paths,item.key);
        if(item.folder){
          const pack=path.join(file,'pack.mcmeta');await noLinks(pack);
          const info=await fs.stat(pack).catch(()=>null);
          if(info?.isFile()&&info.size<=128*1024)Object.assign(item,manifest('pack.mcmeta',await fs.readFile(pack,'utf8')));
          return;
        }
        const key=[file,stat.size,stat.ctimeMs,stat.mtimeMs].join('|');
        if(!fingerprints.has(key)){
          if(fingerprints.size>=12000)fingerprints.delete(fingerprints.keys().next().value);
          fingerprints.set(key,fingerprint(file,stat,kind).catch(error=>{fingerprints.delete(key);throw error;}));
        }
        const [digest,meta]=await fingerprints.get(key);
        Object.assign(item,meta,{digest},await json(path.join(directory,digest+'.json')).catch(()=>({})));
      }catch{item.unreadable=true;}
    },4);
    return listing;
  }
  async function identify(settings,instance,kind){
    const {items}=await scan(settings,instance,kind),matched={};
    const missing=[...new Set(items.filter(i=>i.digest&&!i.project&&!(unknown.get(i.digest)>Date.now())).map(i=>i.digest))];
    for(let i=0;i<missing.length;i+=100){
      const group=missing.slice(i,i+100),releases=await lookup('/version_files',{hashes:group,algorithm:'sha512'});
      await parallel(group,async digest=>{
        if(releases[digest])matched[digest]=await record(digest,releases[digest]);
        else{if(unknown.size>=12000)unknown.delete(unknown.keys().next().value);unknown.set(digest,Date.now()+3600000);}
      },4);
    }
    for(const item of items)if(item.project)matched[item.digest]={project:item.project,release:item.release,version:item.version,releaseName:item.releaseName};
    return matched;
  }
  return {scan,identify,record};
}

// Compare bytes for the same release and service project IDs for other releases.
export function localRelease(items,project,fileHash){
  const exact=items.find(row=>row.digest&&row.digest===fileHash);
  if(exact)return {state:exact.enabled?'installed':'disabled',item:exact};
  const other=items.find(row=>row.project===project&&row.enabled)||items.find(row=>row.project===project);
  return other?{state:'other',item:other}:null;
}

