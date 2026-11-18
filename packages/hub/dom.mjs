export const el=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
export function createSurface({alive=()=>true}={}){
 const dialogs=new Set();
 function report(error,parent){if(!alive())return;const target=parent||[...dialogs].reverse().find(d=>d.open)||document.querySelector('.hub-surface');if(!target)return;let box=target.querySelector(':scope > .hub-error');if(!box){box=el('p','','hub-error');box.role='alert';target.prepend(box);}box.textContent=error?.message||String(error);}
 function button(label,action,primary=false){const node=el('button',label,'hub-button'+(primary?' hub-primary':''));node.type='button';node.onclick=async()=>{if(node.disabled)return;node.disabled=true;try{await action();}catch(e){report(e);}finally{node.disabled=false;}};return node;}
 function field(parent,label,value='',type='text'){
  const wrap=el('label','','hub-field'),caption=el('span',label),input=el(type==='textarea'?'textarea':'input');
  if(type!=='textarea')input.type=type;else input.rows=5;
  if(type==='checkbox'){input.checked=value===true;wrap.classList.add('hub-check');}else input.value=value??'';
  wrap.append(caption,input);parent.append(wrap);return input;
 }
 function dialog(title){const node=el('dialog','','hub-dialog'),header=el('header','','hub-dialog-head'),content=el('section','','hub-surface'),footer=el('footer','','hub-actions');let closeCheck;
  const close=()=>{node.close();node.remove();dialogs.delete(node);};
  const attempt=()=>{if(closeCheck)closeCheck(close);else close();};
  header.append(el('h2',title),button('关闭',attempt));node.append(header,content,footer);node.setAttribute('aria-label',title);node.addEventListener('cancel',e=>{e.preventDefault();attempt();});document.body.append(node);dialogs.add(node);node.showModal();return {node,content,footer,close,onClose:fn=>{closeCheck=fn;}};
 }
 function select(parent,label,options,current){
  const wrap=el('div','','hub-field'),caption=el('span',label),state={value:current??options[0]?.[0]??''};
  const trigger=button('',()=>{const menu=dialog(label);menu.node.classList.add('hub-select-dialog');for(const [value,name] of options){const option=button(name,()=>{state.value=value;update();menu.close();wrap.dispatchEvent(new Event('change',{bubbles:true}));state.onchange?.(value);});option.setAttribute('aria-pressed',String(value===state.value));menu.content.append(option);}});
  function update(){trigger.textContent=options.find(([v])=>v===state.value)?.[1]||'请选择';}
  update();trigger.classList.add('hub-select');trigger.setAttribute('aria-label',label);trigger.setAttribute('aria-haspopup','dialog');wrap.append(caption,trigger);parent.append(wrap);return state;
 }
 function confirm(title,text,action){const d=dialog(title);d.content.append(el('p',text));d.footer.append(button('取消',d.close),button('确认',async()=>{await action();d.close();},true));return d;}
 const empty=(parent,text)=>parent.append(el('p',text,'hub-empty'));
 const row=(title,body='')=>{const node=el('article','','hub-tile'),heading=el('h3',title);node.append(heading);if(body)node.append(el('p',body,'hub-muted'));return node;};
 return {button,field,dialog,select,confirm,empty,row,report,close:()=>{for(const d of dialogs){d.close();d.remove();}dialogs.clear();}};
}
export const beijing=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short',hour12:false}).format(value):'未设置';
export const timeValue=value=>value?new Date(value+8*3600000).toISOString().slice(0,16):'';
export const parseTime=value=>value?Date.parse(value+':00+08:00'):0;
