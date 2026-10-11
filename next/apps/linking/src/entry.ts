import './activity.css';
import {api,hostPreferences,navigate} from './host-api';
import {chapter,setChapter,setHost,host} from './activity';
import {button,element,renderCatalog,renderHeader,renderReading,openReading} from './activity-ui';
import {t} from './localization';
const viewport=document.querySelector<HTMLElement>('#viewport')!,hostRoot=document.querySelector<HTMLElement>('#linking-host')!;
hostRoot.append(element('p',t('loading')));
async function start(){
  try{
    setHost(await hostPreferences());document.documentElement.dataset.hostTheme=host.theme||'light';document.documentElement.dataset.reduced=String(!!host.reducedMotion);
    const params=new URL(location.href).searchParams;
    if(params.has('manage')){const {startManagement}=await import('./manage');document.body.classList.add('activity-reading');hostRoot.replaceChildren(element('strong','LINKING · 管理活动'),button(t('back'),()=>navigate()));await startManagement(viewport);return;}
    const catalog=await api('/api/linking/catalog'),id=params.get('chapter');
    if(!id){document.body.classList.add('activity-reading');renderHeader(catalog.config,catalog.manager);await renderCatalog(catalog,viewport);return;}
    setChapter(await api('/api/linking/chapters/'+encodeURIComponent(id)));renderHeader(catalog.config,catalog.manager);
    const probe=document.createElement('canvas');let supports=false;
    try{const context=probe.getContext('webgl2');supports=!!context;context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
    if(params.get('mode')==='read'||!supports){document.body.classList.add('activity-reading');renderReading(viewport);window.addEventListener('linking-progress',()=>renderReading(viewport));window.addEventListener('linking-select',event=>{const a=chapter.archives.find(a=>a.id===(event as CustomEvent).detail);if(a)void openReading(a);});}
    else{document.body.classList.add('activity-three');await import('./main');}
  }catch(e){document.body.classList.add('activity-reading');hostRoot.replaceChildren(element('strong',t('title')));viewport.replaceChildren();const card=element('section','','activity-card activity-error');card.append(element('h1','暂时无法进入档案馆'),element('p',(e as Error).message),button(t('retry'),()=>location.reload(),'primary'),button(t('chapters'),()=>navigate()));viewport.append(card);}
}
void start();
