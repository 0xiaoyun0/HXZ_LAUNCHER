import {el} from './dom.mjs';

export function memberPicker(ctx,parent,label,{friends=false,self=false,selected=null}={}) {
  const {surface,api}=ctx,state={value:selected?.uid||''};
  const wrap=el('div','','hub-field'),caption=el('span',label);
  const trigger=surface.button(selected?.name||'选择玩家',async()=>{
    const d=surface.dialog(label),form=el('form','','hub-tools');
    const query=surface.field(form,'搜索昵称'),list=el('div','','hub-list');
    let sequence=0;
    const find=async()=>{
      const ticket=++sequence;
      list.setAttribute('aria-busy','true');
      try {
        const result=await api('members?q='+encodeURIComponent(query.value)+'&friends='+Number(friends)+'&self='+Number(self));
        if(!ctx.alive()||!d.node.isConnected||ticket!==sequence)return;
        list.replaceChildren();
        for(const person of result.items){
          const choice=surface.button(person.name+(person.uid===ctx.uid?' · 自己':''),()=>{
            state.value=person.uid;trigger.textContent=person.name;d.close();
            wrap.dispatchEvent(new Event('change',{bubbles:true}));
          });
          choice.classList.add('hub-person-choice');choice.setAttribute('aria-pressed',String(state.value===person.uid));
          list.append(choice);
        }
        if(!result.items.length)surface.empty(list,friends?'没有匹配的好友。':'没有找到匹配的玩家。');
      }catch(error){if(ticket===sequence&&d.node.isConnected)surface.report(error,d.content);}
      finally{if(ticket===sequence)list.removeAttribute('aria-busy');}
    };
    form.onsubmit=event=>{event.preventDefault();void find();};
    form.append(surface.button('查找',find));d.content.append(form,list);await find();
  });
  trigger.classList.add('hub-select');trigger.setAttribute('aria-label',label);trigger.setAttribute('aria-haspopup','dialog');
  wrap.append(caption,trigger);parent.append(wrap);
  return state;
}
