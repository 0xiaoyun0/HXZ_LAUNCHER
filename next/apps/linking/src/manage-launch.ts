import {button,element,selectField} from './activity-ui';
import {continuationPreparation,hasOriginalOpening,publicationLabel} from './launch-preparation';
import './manage-launch.css';

type Meta={id:string;title:string;revision:number;liveRevision:number;published:boolean;archived:boolean};
type Options={chapters:Meta[];volumeExpansion:boolean;observerExpansion?:boolean;request:(path:string)=>Promise<any>;open:(document:any,section?:string)=>Promise<void>;refresh:()=>Promise<void>};
export function launchPreparation(options:Options){
  const section=element('section','','activity-card linking-launch');section.setAttribute('aria-label','正式上线准备');
  const heading=element('div','','activity-row');heading.append(element('h2','正式上线准备'),button('同步上线状态',options.refresh));section.append(heading,element('p','按原章 → 第一卷 → 第二卷'+(options.observerExpansion?' → 第三值夜':'')+'审阅发布。已有正式内容保持不动；这里只读取状态，不会自动创建或发布。'));
  const sources=options.chapters.filter(c=>!c.id.startsWith('linking-volume-')&&!c.id.startsWith('linking-observer-'));
  const status=element('div','','linking-launch-content');status.setAttribute('aria-live','polite');
  if(!sources.length){status.append(element('p','尚无开头章节。请先创建或导入原章，保留已有档案与任务标识。'));section.append(status);return section;}
  let source=sources.find(c=>c.id==='chapter-1f7p9oe')?.id||sources.find(c=>c.title.includes('实验记录'))?.id||sources[0].id;
  let run=0;
  selectField(section,'承接的开头章节',source,sources.map(c=>[c.id,c.title]),value=>{source=value;void load();});section.append(status);
  async function load(){
    const token=++run;section.setAttribute('aria-busy','true');status.replaceChildren(element('p','正在读取开头与两卷状态…'));
    const ids=[source,'linking-volume-01','linking-volume-02',...(options.observerExpansion?['linking-observer-01']:[])].filter(id=>options.chapters.some(c=>c.id===id));
    const results=await Promise.allSettled(ids.map(id=>options.request('/api/admin/linking/chapters/'+id)));
    if(token!==run||!section.isConnected)return;
    const documents=new Map<string,any>(),errors=new Map<string,string>();
    results.forEach((result,index)=>{if(result.status==='fulfilled')documents.set(ids[index],result.value);else errors.set(ids[index],result.reason instanceof Error?result.reason.message:'读取失败，请同步状态后重试');});
    status.replaceChildren();
    const list=element('ol','','linking-launch-list');status.append(list);
    const opening=documents.get(source),preparation=opening&&continuationPreparation(opening);
    function row(title:string,label:string,description:string,action?:HTMLElement){const item=element('li','','linking-launch-step');const head=element('div','','linking-launch-step-heading'),badge=element('span',label,'linking-launch-status');badge.dataset.published=String(label==='已发布');head.append(element('h3',title),badge);item.append(head,element('p',description));if(action)item.append(action);list.append(item);return item;}
    if(opening){
      row('1 · 开头原章',publicationLabel(opening),`正式 v${opening.liveRevision} / 草稿 v${opening.revision} · ${opening.chapter.archives.length} 份档案`,button('检查开头草稿',()=>options.open(opening)));
      const detail=preparation!.live==='unknown'?'当前服务未提供正式版本摘要，不能把草稿当作已上线；请更新服务端后同步状态。':preparation!.ready?'草稿已具备白枝、回声与灯标。模板音乐解锁点为「让回声归位」，请核对任务与外观效果。':preparation!.draft==='partial'?'接续尚未齐备，请检查缺少的白枝、回声或灯标；保留现有内容。':'原章尚无接续。追加草稿会保留原文、已有任务及玩家进度。';
      const canContinue=hasOriginalOpening(opening.chapter)||preparation!.draft!=='missing';
      row('2 · 原章接续',preparation!.label,canContinue?detail:'当前章节不是实验记录开头，请在上方选择正确原章。',canContinue?button(preparation!.ready?'审阅接续与发布':'准备原章接续',()=>options.open(opening,'continuation')):undefined);
      if(opening.published&&opening.revision!==opening.liveRevision)status.append(element('p',`原章正式 v${opening.liveRevision} 与草稿 v${opening.revision} 不同。请先核对已有未发布编辑，不要随续篇一起误发布。`,'activity-lock-reason'));
      if(!preparation!.ready&&!hasOriginalOpening(opening.chapter))status.append(element('p','当前选择未识别到两份实验原始记录。请核对原章选择，勿向其他章节追加续写。','activity-muted'));
    }else{
      row('1 · 开头原章','读取失败',errors.get(source)||'请重新选择开头章节。');row('2 · 原章接续','待核验','未读取原章，无法检查接续与创建条件。');
    }
    for(const [index,id]of ['linking-volume-01','linking-volume-02'].entries()){
      const document=documents.get(id),meta=options.chapters.find(c=>c.id===id),title=index===0?'3 · 第一卷 · 第七门的回声':'4 · 第二卷 · 迟到的北行信';
      if(document){
        const dependency=document.chapter.prerequisites?.find((p:any)=>p.task==='snow-ash-light-signal');
        const firstVolume=document.chapter.prerequisites?.some((p:any)=>p.chapter==='linking-volume-01'&&p.task==='lv1-close-rain-case');
        const detail=`正式 v${document.liveRevision} / 草稿 v${document.revision} · ${document.chapter.archives.length} 份档案。`+(!dependency?'草稿缺少模板的原章前置，请检查。':dependency.chapter!==source?'本卷承接另一原章，请核对选择。':index===0?'正式开放要求原章「留下归途的光」。':firstVolume?'还需第一卷最终归档任务完成。':'草稿缺少第一卷最终任务前置，请检查。');
        row(title,publicationLabel(document),detail,button(index===0?'审阅第一卷':'审阅第二卷',()=>options.open(document)));
      }else if(meta)row(title,'读取失败',errors.get(id)||'请同步状态后重试。');
      else{
        const ready=!!opening&&preparation!.ready&&options.volumeExpansion&&!options.chapters.some(c=>c.id.startsWith('linking-volume-'));
        const action=index===0?button('前往创建两卷草稿',()=>options.open(opening,'volumes')):undefined;if(action)action.disabled=!ready;
        row(title,'待创建',!options.volumeExpansion?'当前服务未提供两卷创建接口，请更新服务端。':options.chapters.some(c=>c.id.startsWith('linking-volume-'))?'检测到已有卷，整组创建已停用。请检查已有卷与缺失原因，系统不会覆盖现有内容。':!preparation?.ready?'先在原章准备接续，再创建两卷独立草稿。':'只创建未发布草稿；已存在的卷不会被覆盖。',action);
      }
    }
    if(options.observerExpansion){
      const observer=documents.get('linking-observer-01'),second=documents.get('linking-volume-02');
      if(observer)row('5 · 第三值夜 · 未关的观测窗',publicationLabel(observer),`正式 v${observer.liveRevision} / 草稿 v${observer.revision} · ${observer.chapter.archives.length} 份档案。完成第二卷「北行路由归档」后开放；独立成章，保留前卷与作者编辑。`,button('审阅第三值夜',()=>options.open(observer)));
      else if(options.chapters.some(c=>c.id==='linking-observer-01'))row('5 · 第三值夜 · 未关的观测窗','读取失败',errors.get('linking-observer-01')||'请同步状态后重试。');
      else{
        const ready=!!second?.published&&!second.archived&&second.liveSummary?.taskIds?.includes('lv2-deliver-morning');
        const action=button('前往准备第三值夜',()=>options.open(second,'observer'));action.disabled=!ready;
        row('5 · 第三值夜 · 未关的观测窗','待创建',ready?'新增 7 份档案、10 项可自助完成的任务及 2 件纪念物。不会修改原章或两卷草稿。':'先审阅并发布第二卷的最终任务，再准备独立的第三值夜草稿。',action);
      }
    }
    status.append(element('small','所有预览均为只读，不解锁音乐或奖励。正式发布仍在章节编辑页逐章确认，并校验最新草稿版本；玩家仍按排期与任务前置进入。'));section.setAttribute('aria-busy','false');
  }
  // Allow the caller to attach this section before the first response resolves.
  void load();return section;
}
