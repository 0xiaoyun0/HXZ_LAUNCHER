import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {FolderGlyph,LatticeGlyph} from './micro/Feedback';
import {Box,Boxes,Check,Download,FolderOpen,Search} from 'lucide-react';
import {invoke,notify,perform,state,task} from '../model';
import {useData} from '../data';
import {Modal,Select} from '../ui';
import {InstancePicker} from './LiteHome';
import {ChoiceGroup} from './ChoiceControls';
import {resolveSearchQuery} from '../../../../packages/engine/core/resource-query.mjs';

const groups={mod:'mods',resourcepack:'resources',shader:'shaders',datapack:''};
type Kind=keyof typeof groups;
type Local={key:string;name:string;enabled:boolean;folder:boolean;digest?:string;title?:string;slug?:string;version?:string;project?:string;releaseName?:string;unreadable?:boolean};
type Project={project_id:string;slug:string;title:string;description:string;icon_url:string};
type Release={id:string;version:string;name:string;filename:string;digest:string};
const none=()=>Promise.resolve([]);
function SearchStatus({error,retry}:{error:string;retry:()=>void}){
  return <div role="status" className="resource-feedback"><span>{error}</span><button className="text-action" onClick={retry}>重试</button></div>;
}
export function ResourceBrowser(){
  const s=useSnapshot(state),t=useSnapshot(task);
  const games=s.instances.filter((g:any)=>g.installed&&!g.error&&!g.placeholder);
  const game=games.find((g:any)=>g.id===s.settings.selectedInstance)||games[0];
  const [picker,setPicker]=useState(false),[kind,setKind]=useState<Kind>('mod'),[q,setQ]=useState(''),[query,setQuery]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setQuery(q.trim()),300);return()=>clearTimeout(timer);},[q]);
  return <div className="resource-browser">
    <div className="resource-target"><Box aria-hidden/><div><small>目标实例</small><strong>{game?.name||'尚无已安装实例'}</strong>{game&&<small>{[game.version===game.name||game.version===game.id?'':game.version,game.loader].filter(Boolean).join(' · ')}</small>}</div>
      <button className="small-action" disabled={!games.length||t.busy} onClick={()=>setPicker(true)}>切换实例</button></div>
    <div className="resource-toolbar"><ChoiceGroup label="资源类型" value={kind} onChange={v=>setKind(v as Kind)} options={[[ 'mod','模组'],['resourcepack','材质包'],['shader','光影'],['datapack','数据包']]}/>
    <form className="resource-search" role="search" onSubmit={e=>{e.preventDefault();setQuery(q.trim());}}><label><Search size={17}/><input aria-label="搜索本地和在线资源" type="search" value={q} placeholder="搜索名称、项目 ID 或本地文件名" onChange={e=>setQ(e.target.value)}/></label><button className="small-action">搜索</button></form></div>
    {game?<InventoryResults key={[s.settings.gameRoot,game.id,kind].join('|')} instance={game.id} kind={kind} query={query}/>:<p role="status">先在「游戏版本」安装游戏，或选择已有游戏的目录。</p>}
    {picker&&<InstancePicker initialSearch="" games={games} current={game?.id} close={()=>setPicker(false)}/>}
  </div>;
}
function InventoryResults({instance,kind,query}:{instance:string;kind:Kind;query:string}){
  const t=useSnapshot(task),localKind=groups[kind];
  const [page,setPage]=useState({query:'',n:0}),[limit,setLimit]=useState(6),[project,setProject]=useState<Project|null>(null),[world,setWorld]=useState('');
  const n=page.query===query?page.n:0;
  const local=useData(()=>localKind?invoke('addons.local',{instance,kind}):Promise.resolve({items:[]}),[instance,kind]);
  const identityKey=(local.data?.items||[]).map((r:Local)=>r.digest||r.key).join('|');
  const identity=useData(()=>identityKey?invoke('addons.identify',{instance,kind}):Promise.resolve({}),[instance,kind,identityKey]);
  const online=useData(()=>invoke(kind==='mod'?'mods.search':'addons.search',{instance,kind,query,offset:n*20}),[instance,kind,query,n]);
  const releases=useData<Release[]>(()=>project?invoke('addons.releases',{instance,kind,project:project.project_id}):none(),[instance,kind,project?.project_id]);
  const worlds=useData<string[]>(()=>kind==='datapack'?invoke('addons.worlds',{instance}):none(),[instance,kind]);
  const hits:Project[]=online.data?.hits||[],rows:Local[]=(local.data?.items||[]).map((r:Local)=>({...r,...(r.digest&&identity.data?.[r.digest])}));
  const duplicates=new Map<string,number>(),siblings=new Map<string,Set<string>>();
  for(const item of rows){
    if(!item.digest)continue;
    duplicates.set(item.digest,(duplicates.get(item.digest)||0)+1);
    const group=item.project||item.slug;if(!group)continue;
    if(!siblings.has(group))siblings.set(group,new Set());
    siblings.get(group)!.add(item.version||item.digest);
  }
  const terms=[query,resolveSearchQuery(query)].map(v=>v.trim().toLowerCase()).filter(Boolean);
  const visible=rows.filter(row=>{
    const linked=hits.find(hit=>hit.project_id===row.project);
    const description=[row.name,row.title,row.slug,row.version,row.releaseName,row.project,linked?.title,linked?.slug].filter(Boolean).join(' ').toLowerCase();
    return !terms.length||terms.some(term=>term.split(/\s+/).every(word=>description.includes(word)));
  });
  useEffect(()=>setLimit(6),[query]);
  async function toggle(row:Local){
    await invoke('instance.files.toggle',{id:instance,kind:localKind,key:row.key});
    await local.reload();
  }
  async function install(release:Release){
    if(!project)return;
    await invoke(kind==='mod'?'mods.download':'addons.install',{instance,kind,project:project.project_id,version:release.id,world});
    await local.reload();setProject(null);notify('资源已安装到当前实例');
  }
  return <>{kind==='datapack'&&<label className="resource-world">安装到存档<Select label="目标存档" value={world} options={[{value:'',label:'选择存档'},...(worlds.data||[])]} onChange={setWorld}/></label>}
    <div className="resource-results" data-paired={!!localKind||undefined}>{localKind&&<section className="resource-section" aria-label="本地资源"><header><h2><FolderGlyph/>本地资源</h2><small>{local.data?.shared?'共享游戏目录':'当前实例'} · {visible.length} 项</small></header>
      {local.error?<SearchStatus error={local.error} retry={local.reload}/>:local.loading&&!local.data?<p className="micro-wait" role="status"><LatticeGlyph/>正在识别本地文件…</p>:!visible.length?<p>本地没有匹配的文件。</p>:visible.slice(0,limit).map(row=><div className="resource-row" key={row.key}><Boxes size={17}/><div><strong>{row.title||row.releaseName||row.name}</strong><small>{[row.title||row.releaseName?row.name:'',row.version,row.enabled?'已启用':'已停用',row.digest&&(duplicates.get(row.digest)||0)>1?'有相同文件':'',(siblings.get(row.project||row.slug||'')?.size||0)>1?'本地有多个版本':'',row.unreadable?'暂时无法读取':''].filter(Boolean).join(' · ')}</small></div><button className="small-action" disabled={t.busy} onClick={()=>perform(()=>toggle(row))}>{row.enabled?'停用':'启用'}</button></div>)}
      {visible.length>limit&&<button className="text-action" onClick={()=>setLimit(limit+20)}>显示更多本地文件</button>}
      {identity.error&&<SearchStatus error="在线文件识别暂时不可用，仍可按本地名称搜索。" retry={identity.reload}/>}
    </section>}
    <section className="resource-section" aria-label="在线资源"><header><h2><Download size={17}/>在线资源</h2><small>Modrinth · 兼容此实例</small></header>
      {online.error?<SearchStatus error={online.error} retry={online.reload}/>:online.loading?<p className="micro-wait" role="status"><LatticeGlyph/>正在搜索兼容资源…</p>:!hits.length?<p>没有匹配的在线项目。</p>:hits.map(hit=>{
        const versions=rows.filter(row=>row.project===hit.project_id);
        return <div className="resource-row" key={hit.project_id}>{hit.icon_url?<img src={hit.icon_url} loading="lazy" alt=""/>:<Box size={22}/>}<div><strong>{hit.title}</strong><small>{versions.length?'本地已有 · '+versions.map(v=>v.version||v.name).join('、'):hit.description}</small></div><button className="small-action" onClick={()=>setProject(hit)}>查看版本</button></div>;
      })}
      {(n>0||online.data?.total_hits>20)&&<nav className="lite-pagination" aria-label="在线资源分页"><button className="small-action" disabled={!n} onClick={()=>setPage({query,n:n-1})}>上一页</button><span>{n+1}</span><button className="small-action" disabled={(n+1)*20>=(online.data?.total_hits||0)} onClick={()=>setPage({query,n:n+1})}>下一页</button></nav>}
    </section></div>
    <Modal open={!!project} title={project?.title||'选择版本'} onClose={()=>setProject(null)}>
      {releases.error?<SearchStatus error={releases.error} retry={releases.reload}/>:releases.loading?<p className="micro-wait" role="status"><LatticeGlyph/>正在读取兼容版本…</p>:!releases.data?.length?<p>没有适配当前实例的版本。</p>:releases.data.map(release=>{
        const same=rows.find(r=>r.digest===release.digest),other=rows.find(r=>r.enabled&&r.project===project?.project_id),conflict=kind==='mod'&&!same&&!!other;
        return <div className="resource-row release-row" key={release.id}><div><strong>{release.version||release.name}</strong><small>{same?'本地文件 · '+same.name:conflict?'请先停用 '+other!.name:release.filename}</small></div>{same?.enabled?<span className="resource-installed"><Check size={15}/>已安装</span>:<button className="small-action" disabled={t.busy||local.loading||!!local.error||conflict||kind==='datapack'&&!world} onClick={()=>perform(()=>same?toggle(same):install(release))}>{same?'启用已有文件':'安装'}</button>}</div>;
      })}
    </Modal>
  </>;
}
