'use strict';
const shell=window.__TAURI__, area=document.querySelector('main'),tools=document.querySelector('footer'),head=document.querySelector('#title'),hide=document.querySelector('#hide');
const call=(action,input={})=>shell.core.invoke('panel_request',{action,input});
let kind,current;
function element(tag,text,parent){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
function button(label,action){const el=element('button',label,tools);el.onclick=()=>call(action).catch(report);}
function report(e){element('p',String(e),area);}
function paint(value){current=value;document.body.classList.toggle('dark',!!value.dark);area.replaceChildren();
 if(kind==='lyrics'){head.textContent=value.title||'桌面歌词';element('strong',value.text||'暂无同步歌词',area);if(value.translation)element('p',value.translation,area);}
 if(kind==='voice'){head.textContent=value.room||'语音房间';element('p',(value.speakers||[]).map(v=>v.name).join('、')||'当前无人发言',area);}
 if(kind==='chat'){head.textContent='游戏内聊天';for(const m of (value.messages||[]).slice(-40))element('p',(m.name||'玩家')+'　'+(m.body||(m.image?'[附件]':'')),area);area.scrollTop=area.scrollHeight;}
}
async function boot(){let pending;await shell.event.listen('panel-update',e=>kind?paint(e.payload):pending=e.payload);
 const snapshot=await call('state');kind=snapshot.kind;hide.hidden=kind==='voice';hide.onclick=()=>call('hide').catch(report);
 if(kind==='lyrics'){button('上一首','previous');button('播放 / 暂停','toggle');button('下一首','next');button('锁定','lock');}
 if(kind==='chat'){const input=element('input','',tools);input.placeholder='发送消息';input.maxLength=1000;const send=element('button','发送',tools);send.onclick=async()=>{if(input.value.trim()){try{await call('send',{body:input.value});input.value='';}catch(e){report(e);}}};input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)send.click();};}
 paint(pending||snapshot.state);}
boot().catch(report);
