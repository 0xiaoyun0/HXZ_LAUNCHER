import {labelMarkSvg} from './brand';
import {action,chapter,refreshChapter,type Archive} from './activity';
import {api,navigate} from './host-api';
import {formatDate,t} from './localization';

export function element<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''){const node=document.createElement(tag);node.textContent=text;node.className=className;return node;}
export function button(label:string,fn:()=>unknown,className=''){const node=element('button',label,className);node.type='button';node.onclick=async()=>{if(node.disabled)return;node.disabled=true;try{await fn();}catch(error){notice(error instanceof Error?error.message:String(error),true);}finally{node.disabled=false;}};return node;}
export function notice(message:string,error=false){const old=document.querySelector('.activity-toast');old?.remove();const node=element('div',message,'activity-toast'+(error?' error':''));node.role='status';document.body.append(node);setTimeout(()=>node.remove(),6000);}
let activePanelClose:(()=>void)|undefined;
export function panel(title:string,onClose?:()=>void){
  activePanelClose?.();const previous=document.activeElement as HTMLElement|null;let closed=false;
  const overlay=element('div','','activity-overlay'),card=element('section','','activity-panel');card.role='dialog';card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);
  const head=element('header');head.append(element('h2',title),button(t('close'),close));const content=element('div','','activity-panel-content');card.append(head,content);overlay.append(card);document.body.append(overlay);
  function close(){if(closed)return;closed=true;onClose?.();overlay.remove();window.removeEventListener('keydown',keys,true);if(activePanelClose===close)activePanelClose=undefined;previous?.focus({preventScroll:true});window.dispatchEvent(new CustomEvent('linking-panel',{detail:false}));}
  function keys(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}else if(event.key==='Tab'){
    const nodes=[...card.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href]')].filter(n=>n.getClientRects().length);
    if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }else event.stopPropagation();}
  activePanelClose=close;window.addEventListener('keydown',keys,true);overlay.onclick=e=>{if(e.target===overlay)close();};head.querySelector('button')?.focus({preventScroll:true});window.dispatchEvent(new CustomEvent('linking-panel',{detail:true}));return {content,close};
}
export function ask(message:string):Promise<boolean>{return new Promise(resolve=>{const p=panel('确认操作',()=>resolve(false));p.content.append(element('p',message),button('确认',()=>{resolve(true);p.close();},'primary'),button('取消',()=>{p.close();resolve(false);}));});}
export function field(root:HTMLElement,label:string,value:string,change:(value:string)=>void,options:{area?:boolean;type?:string;placeholder?:string;required?:boolean}={}){
  const wrapper=element('label',label,'activity-field'),input=document.createElement(options.area?'textarea':'input');input.value=value;input.placeholder=options.placeholder||'';
  if(input instanceof HTMLInputElement)input.type=options.type||'text';else input.rows=options.area?6:2;
  input.required=!!options.required;input.oninput=()=>change(input.value);wrapper.append(input);root.append(wrapper);return input;
}
export function selectField(root:HTMLElement,label:string,value:string,values:[string,string][],change:(value:string)=>void){
  const wrapper=element('label',label,'activity-field'),input=element('select');for(const [id,name]of values)input.append(new Option(name,id));input.value=value;input.onchange=()=>change(input.value);wrapper.append(input);root.append(wrapper);return input;
}
let recentTask='';
export function showTasks(all=false){
  const p=panel(t('tasks'));p.content.append(element('p',`${chapter.progress.completed} / ${chapter.progress.tasks} 项任务完成 · ${chapter.progress.read} / ${chapter.progress.total} 份档案已读`,'activity-muted'));
  if(chapter.preview)p.content.append(element('p','草稿只读预览 · 不保存进度、提交任务或领取奖励。','activity-preview'));
  const shown=all?chapter.tasks:chapter.tasks.filter(task=>task.id===recentTask||(!task.completed&&(task.available||task.submission?.status==='pending'))||(task.completed&&task.reward?.available&&!task.reward.claimed));
  if(!all)p.content.append(button('查看本卷全部任务与纪念物',()=>showTasks(true)));
  if(!shown.length)p.content.append(element('p','当前没有可进行的任务，可查看全部任务了解解锁条件。'));
  for(const task of shown){
    const card=element('article','','activity-card'),head=element('div','','activity-row');head.append(element('h3',task.title),element('span',chapter.preview?'草稿预览':task.completed?t('complete'):task.submission?.status==='pending'?t('pending'):task.available?'可进行':t('locked'),'activity-badge'));card.append(head,element('p',task.description));
    if(task.requires.length)card.append(element('small','前置任务：'+task.requires.map(id=>chapter.tasks.find(t=>t.id===id)?.title||id).join('、')));
    if(task.submission?.note)card.append(element('p','审核反馈：'+task.submission.note));
    if(task.effect==='music-archive')card.append(element('p',task.completed?'音乐档案界面已解锁，可从音乐栏目查看。':'完成后解锁音乐档案界面，原有歌单和播放功能继续保留。','activity-muted'));
    if(task.effect==='archive-signal')card.append(element('p',task.completed?'档案灯标已解锁，可在启动器外观中选择，不会自动替换当前标志。':'完成后获得可选的启动器标志「档案灯标」，原有主题保持不变。','activity-muted'));
    if(!task.completed&&task.available&&task.submission?.status!=='pending'){
      if(task.type==='read'){card.append(button('前往对应档案',()=>{p.close();const archive=chapter.archives.find(a=>a.id===task.archiveId);if(archive)void openReading(archive);}));}
      else if(task.type==='guild'||task.type==='stat'){card.append(element('p',task.type==='guild'?'完成冒险家协会中的对应委托后，同步进度即可解锁。':'以游戏服务器同步的统计为准，达成目标后点击同步进度。','activity-muted'));}
      else if(!chapter.preview){let value='';const input=field(card,task.type==='code'?'验证口令':'探索手记','',v=>value=v,{area:task.type==='manual'});input.maxLength=task.type==='code'?200:8000;
        if(task.type==='code'&&(chapter.id.startsWith('linking-volume-')||chapter.id.startsWith('linking-observer-')))card.append(element('small','请从已开放档案中寻找线索，按任务说明的格式输入口令；验证后直接继续，无需提交审核。'));
        card.append(button(t('submit'),async()=>{await action('submit',task.id,task.type==='code'?{answer:value}:{submission:value});recentTask=task.id;p.close();showTasks();notice(task.type==='manual'?'已提交，等待审核':'任务已完成');},'primary'));
      }
    }
    if(task.reward){const reward=element('div','','activity-row activity-task-reward');reward.append(element('span',task.reward.title+' × '+task.reward.quantity));if(task.reward.claimed)reward.append(element('small','已寄往背包'));else if(task.completed&&task.reward.available)reward.append(button('领取纪念物',async()=>{await action('claim',task.id);p.close();showTasks();notice('已寄往背包，请在账号的背包中领取');},'primary'));else reward.append(element('small',task.reward.available?'完成任务后可领取':'奖励暂不可用'));card.append(reward);}
    p.content.append(card);
  }
  if(!chapter.tasks.length)p.content.append(element('p','本章没有额外任务，自由阅读档案即可。'));
  if(!chapter.preview)p.content.append(button(t('refresh'),async()=>{await refreshChapter();p.close();showTasks();}));
}
const readingPositions=new Map<string,number>();
function readPosition(a:Archive){try{return Number(sessionStorage.getItem('linking-read:'+chapter.id+':'+a.id))||0;}catch{return readingPositions.get(a.id)||0;}}
export async function openReading(a:Archive){
  if(!a.unlocked){const p=panel(t('locked'));p.content.append(element('p',a.summary),element('p','完成任务：'+a.requires.map(id=>chapter.tasks.find(t=>t.id===id)?.title||id).join('、')),button(t('tasks'),()=>{p.close();showTasks();},'primary'));return;}
  try{sessionStorage.setItem('linking-last:'+chapter.id,a.id);}catch{}
  const p=panel(a.title);p.content.append(element('p',(chapter.preview?'草稿只读预览 · ':'')+a.category+' · '+a.department,'activity-muted'),element('div',a.body||'','activity-prose'));
  if(a.notes.length){p.content.append(element('h3','档案补记'));for(const note of a.notes)p.content.append(element('p',note));}
  const nav=element('nav','','activity-row activity-reading-nav');nav.setAttribute('aria-label','档案阅读导航');
  function readingNavigation(){
    nav.replaceChildren();const index=chapter.archives.findIndex(v=>v.id===a.id),previous=chapter.archives[index-1],next=chapter.archives[index+1];
    const current=(id:string)=>{const archive=chapter.archives.find(v=>v.id===id);if(archive)return openReading(archive);};
    if(previous)nav.append(button('上一篇 · '+previous.title,()=>current(previous.id)));
    if(next)nav.append(button((next.unlocked?'下一篇 · ':'下一篇待解锁 · ')+next.title,()=>current(next.id),'primary'));
    nav.append(button('下一步：任务与进度',()=>showTasks()));
  }
  readingNavigation();p.content.append(nav);
  if(!chapter.preview){const bookmark=button(a.bookmarked?t('bookmarked'):t('bookmark'),async()=>{await action('bookmark',a.id,{value:!chapter.archives.find(v=>v.id===a.id)?.bookmarked});bookmark.textContent=chapter.archives.find(v=>v.id===a.id)?.bookmarked?t('bookmarked'):t('bookmark');});p.content.append(bookmark);}
  requestAnimationFrame(()=>p.content.scrollTop=readPosition(a));p.content.addEventListener('scroll',()=>{readingPositions.set(a.id,p.content.scrollTop);try{sessionStorage.setItem('linking-read:'+chapter.id+':'+a.id,String(p.content.scrollTop));}catch{}});
  if(!chapter.preview)try{await action('read',a.id);readingNavigation();}catch(e){notice('阅读进度未保存：'+(e as Error).message,true);}
}
export function renderReading(root:HTMLElement){
  root.replaceChildren();const title=element('div','','activity-reader-heading');title.append(element('p','LINKING / 档案阅读','activity-eyebrow'),element('h1',chapter.title),element('p',chapter.subtitle));root.append(title);
  if(chapter.preview)title.append(element('p','草稿只读预览 · 可查看全部正文；正式玩家须依次解锁。不会记录进度、验证口令或发放奖励。','activity-preview'));
  let last='';try{last=sessionStorage.getItem('linking-last:'+chapter.id)||'';}catch{}
  const next=chapter.archives.find(a=>a.id===last&&a.unlocked)||chapter.archives.find(a=>a.unlocked&&!a.readAt)||chapter.archives.find(a=>a.unlocked);
  if(next)title.append(button('继续阅读 · '+next.title,()=>openReading(next),'primary'));
  title.append(button('本卷任务与进度',()=>showTasks()));
  const grid=element('div','','activity-grid');for(const a of chapter.archives){const card=element('article','','activity-card archive-card');card.append(element('small',a.category,'activity-eyebrow'),element('h2',a.title),element('p',a.summary),element('span',a.readAt?'已读':a.unlocked?t('unlocked'):t('locked'),'activity-badge'),button(a.unlocked?t('read'):'查看解锁条件',()=>openReading(a),a.unlocked?'primary':''));grid.append(card);}root.append(grid);
}
export function renderHeader(config:any,manager:boolean){
  const root=document.querySelector<HTMLElement>('#linking-host')!;root.replaceChildren();const brand=element('div','','activity-brand');brand.append(element('b',config.title||'LINKING'),element('span',chapter?.title||config.intro||'档案探索'));
  const actions=element('nav','','activity-actions');actions.setAttribute('aria-label','活动操作');actions.append(button(t('chapters'),()=>navigate()));if(chapter){actions.append(button(t('tasks'),showTasks,'primary'),button(new URL(location.href).searchParams.get('mode')==='read'?t('threeMode'):t('readMode'),()=>navigate({chapter:chapter.id,...(new URL(location.href).searchParams.get('mode')==='read'?{}:{mode:'read'})})));}if(manager)actions.append(button(t('manage'),()=>navigate({manage:'1'})));root.append(brand,actions);
}
export async function renderCatalog(catalog:any,root:HTMLElement){
  root.replaceChildren();const lead=element('div','','activity-reader-heading');lead.append(element('p','FANTASY TOWN / LINKING','activity-eyebrow'),element('h1',catalog.config.title),element('p',catalog.config.intro));root.append(lead);
  const grid=element('div','','activity-grid');root.append(grid);
  for(const c of catalog.chapters){const card=element('article','','activity-card chapter-card');card.append(element('small',c.status==='open'?'正在开放':c.status==='scheduled'?t('waiting'):t('ended'),'activity-eyebrow'),element('h2',c.title),element('p',c.subtitle),element('p',`${c.read} / ${c.total} 份已读 · ${c.completed} / ${c.tasks} 项任务`));if(c.opensAt)card.append(element('small',formatDate(c.opensAt)+' 开放（北京时间）'));
    card.prepend(element('small','卷序 '+(catalog.chapters.indexOf(c)+1),'activity-eyebrow'));
    card.append(element('p',c.locked?(c.lockReason||'完成前卷任务后开放。'):c.completed===c.tasks&&c.read===c.total?'本卷已完成，可重读档案或前往下一卷。':'下一步：阅读开放档案，完成本卷任务。',c.locked?'activity-lock-reason':'activity-muted'));
    if(c.locked){const prerequisite=c.prerequisites?.find((r:any)=>!r.completed);if(prerequisite)card.append(button('前往前卷完成条件',()=>navigate({chapter:prerequisite.chapter,mode:'read'})));}
    const enter=button('进入档案馆',()=>navigate({chapter:c.id}),'primary');enter.disabled=c.status!=='open'||!!c.locked;const symbol=element('div','','chapter-symbol');symbol.innerHTML=labelMarkSvg;symbol.setAttribute('aria-hidden','true');card.prepend(symbol);card.append(enter);grid.append(card);}
  if(!catalog.config.enabled||!catalog.chapters.length)grid.append(element('article',catalog.config.enabled?t('empty'):t('disabled'),'activity-card'));
  root.append(element('p',t('original'),'activity-credit'));
}
