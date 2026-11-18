import {el,createSurface} from './dom.mjs';
import {recordUI} from './records.mjs';
import {workbenchUI} from './workbench.mjs';
import './style.css';

export function mountHubAdmin(root,options){
 let alive=true,ticket=0;const surface=createSurface({alive:()=>alive}),filter={category:'all',query:'',offset:0};
 const ctx={...options,uid:'@console',manager:true,adminMode:true,surface,alive:()=>alive,api:(path,method='GET',input)=>options.request('/api/hub/'+path,method,input),refresh:load};
 const records=recordUI(ctx);ctx.openRecord=records.detail;
 async function load(){const current=++ticket,content=el('section','','hub-surface');root.setAttribute('aria-busy','true');try{await workbenchUI(ctx,content,filter);if(alive&&current===ticket)root.replaceChildren(content);}catch(e){if(alive&&current===ticket){surface.report(e,content);content.append(surface.button('重试',load));root.replaceChildren(content);}}finally{if(alive&&current===ticket)root.removeAttribute('aria-busy');}}
 void load();return ()=>{alive=false;ticket++;surface.close();void records.dispose().catch(()=>{});root.replaceChildren();};
}
