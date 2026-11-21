import {useEffect,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {chatView,community,type ChatMessage} from '../../../packages/community/client';
import {request} from './data';

interface HistoryPage {items:ChatMessage[];more:boolean}
interface Cursor {id:number;created:number}
type Preview={before:number;page:HistoryPage}|{before:number;failed:true};

/** A full opening batch can represent either exactly 100 messages or a longer history. */
export function useChatHistory(first:Cursor|undefined,previousTime:number|null,days:number,focus:string|null,list:RefObject<HTMLDivElement|null>) {
  const [anchor,setAnchor]=useState<HistoryPage|null>(null),[anchorError,setAnchorError]=useState(false);
  const [loaded,setLoaded]=useState<HistoryPage|null>(null),[preview,setPreview]=useState<Preview|null>(null);
  const [retry,setRetry]=useState(0),[anchorRetry,setAnchorRetry]=useState(0);
  const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
  const active=useRef(true),inFlight=useRef(false),position=useRef<{id:number;offset:number}|null>(null);
  const oldest=loaded?.items[0]??anchor?.items[0]??first;
  const cutoff=days?Date.now()-days*86400000:0;
  const before=oldest&&oldest.created>=cutoff?oldest.id:0;
  const known=loaded?loaded.more:focus?(anchor?.more?null:false):previousTime===null?null:previousTime>0&&previousTime>=cutoff;
  const session=community.id;
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(!focus||!session)return;
    let current=true;setAnchorError(false);
    void request<HistoryPage>('/api/chat/history?around='+encodeURIComponent(focus)).then(page=>{
      if(!current)return;
      chatView.atBottom=false;setAnchor(page);
    }).catch(()=>{if(current)setAnchorError(true);});
    return()=>{current=false;};
  },[focus,session,anchorRetry]);
  useLayoutEffect(()=>{
    if(anchor&&focus)list.current?.querySelector('[data-message="'+Number(focus)+'"]')?.scrollIntoView({block:'center'});
  },[anchor,focus,list]);

  useEffect(()=>{
    if(!before||known!==null||!session)return;
    let current=true;
    void request<HistoryPage>('/api/chat/history?before='+before+'&days='+days).then(page=>{
      if(current)setPreview({before,page});
    }).catch(()=>{if(current)setPreview({before,failed:true});});
    return()=>{current=false;};
  },[before,known,days,session,retry]);
  useLayoutEffect(()=>{
    const saved=position.current,el=list.current;
    if(!saved||!el)return;
    const row=el.querySelector('[data-message="'+saved.id+'"]');
    if(row)el.scrollTop+=row.getBoundingClientRect().top-saved.offset;
    position.current=null;
  },[loaded,list]);

  const cached=preview?.before===before?preview:null;
  const unavailable=anchorError||failed||!!(cached&&'failed' in cached);
  const visible=!!session&&(unavailable||!!before&&(known===true||!!(cached&&'page' in cached&&cached.page.items.length)));
  async function readEarlier(){
    if(inFlight.current||!session)return;
    if(anchorError){setAnchorRetry(n=>n+1);return;}
    if(cached&&'failed' in cached){
      setPreview(null);setRetry(n=>n+1);return;
    }
    if(!before)return;
    inFlight.current=true;setPending(true);setFailed(false);
    try {
      const page=cached&&'page' in cached?cached.page:await request<HistoryPage>('/api/chat/history?before='+before+'&days='+days);
      if(!active.current||community.id!==session)return;
      const el=list.current;
      if(el){
        const top=el.getBoundingClientRect().top;
        const row=Array.from(el.querySelectorAll<HTMLElement>('[data-message]')).find(node=>node.getBoundingClientRect().bottom>=top);
        if(row)position.current={id:Number(row.dataset.message),offset:row.getBoundingClientRect().top};
      }
      chatView.atBottom=false;
      setLoaded(prev=>({items:[...page.items,...(prev?.items??[])],more:page.more}));
    }catch{if(active.current&&community.id===session)setFailed(true);}
    finally{inFlight.current=false;if(active.current)setPending(false);}
  }
  return {anchor:anchor?.items,earlier:loaded?.items??[],visible,pending,unavailable,readEarlier};
}
