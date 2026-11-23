export const el=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
export function createSurface({alive=()=>true,inlineChoices=false}={}){
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
  const controls=el('fieldset','','hub-choices');controls.setAttribute('aria-label',label);
  function choose(value){state.value=value;wrap.dispatchEvent(new Event('change',{bubbles:true}));state.onchange?.(value);}
  Object.defineProperty(state,'disabled',{get:()=>controls.disabled,set:value=>{controls.disabled=value;}});
  if(inlineChoices&&options.length<=4&&options.every(([,name])=>String(name).length<=12)){
    const choices=options.map(([value,name])=>{
      const option=button(name,()=>{choose(value);for(const [other,key] of choices)other.setAttribute('aria-pressed',String(key===state.value));});
      option.setAttribute('aria-pressed',String(value===state.value));controls.append(option);return [option,value];
    });
  }else{
    const trigger=button('',()=>{
      const menu=dialog(label);menu.node.classList.add('hub-select-dialog');
      const results=el('div','','hub-select-options');
      function draw(query){
        const matches=options.filter(([,name])=>String(name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
        results.replaceChildren();for(const [value,name] of matches){
          const option=button(name,()=>{trigger.textContent=name;menu.close();choose(value);});
          option.setAttribute('aria-pressed',String(value===state.value));results.append(option);
        }
        if(!matches.length)empty(results,'没有匹配的选项');
      }
      if(options.length>6){const search=field(menu.content,'搜索选项','','search');search.oninput=()=>draw(search.value);search.focus();}
      menu.content.append(results);draw('');
    });
    trigger.textContent=options.find(([v])=>v===state.value)?.[1]||'请选择';
    trigger.classList.add('hub-select');trigger.setAttribute('aria-label',label);trigger.setAttribute('aria-haspopup','dialog');controls.append(trigger);
  }
  wrap.append(caption,controls);parent.append(wrap);return state;
 }
 function confirm(title,text,action){const d=dialog(title);d.content.append(el('p',text));d.footer.append(button('取消',d.close),button('确认',async()=>{await action();d.close();},true));return d;}
 const empty=(parent,text)=>parent.append(el('p',text,'hub-empty'));
 const row=(title,body='')=>{const node=el('article','','hub-tile'),heading=el('h3',title);node.append(heading);if(body)node.append(el('p',body,'hub-muted'));return node;};
 return {button,field,dialog,select,confirm,empty,row,report,close:()=>{for(const d of dialogs){d.close();d.remove();}dialogs.clear();}};
}
export const beijing=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short',hour12:false}).format(value):'未设置';
export const timeValue=value=>value?new Date(value+8*3600000).toISOString().slice(0,16):'';
export const parseTime=value=>value?Date.parse(value+':00+08:00'):0;
