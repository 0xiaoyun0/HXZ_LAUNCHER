// One accessible touch control surface shared by desktop and Android adapters.
const paths={left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',up:'m6 14 6-6 6 6',down:'m6 10 6 6 6-6',jump:'M12 20V4m-6 6 6-6 6 6',fire:'M12 2v4m0 12v4M2 12h4m12 0h4M7 7h10v10H7Z',dash:'m13 2-8 12h7l-1 8 8-12h-7Z',rotate:'M20 10a8 8 0 1 0-2 8m2-15v7h-7',drop:'M6 20h12M12 3v12m-5-5 5 5 5-5',hold:'M5 4h14v16H5ZM9 8h6v8H9Z',focus:'M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M9 12h6'};
const titles={left:'向左',right:'向右',up:'向上',down:'向下',jump:'跳跃',fire:'开火',dash:'冲刺',rotate:'旋转',drop:'落下',hold:'暂存',focus:'精准'};
const svg=action=>`<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[action]}"/></svg>`;
export function mountGameControls(root,api,id){
 root.classList.add('game-touchpad');root.dataset.game=id;root.replaceChildren();const clean=[],pressed=new Map();
 const releaseAll=()=>{for(const a of pressed.values())api.release(a);pressed.clear();root.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));};
 function button(action,parent,continuous=false){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.setAttribute('aria-label',titles[action]);b.innerHTML=svg(action)+(!['left','right','up','down'].includes(action)?`<span>${titles[action]}</span>`:'');parent.append(b);
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('held');if(continuous){pressed.set(e.pointerId,action);api.hold(action);}else api.input(action);};
  const end=e=>{if(pressed.has(e.pointerId)){const a=pressed.get(e.pointerId);pressed.delete(e.pointerId);if(![...pressed.values()].includes(a))api.release(a);}b.classList.remove('held');};b.onpointerup=b.onpointercancel=b.onlostpointercapture=end;
  b.onclick=e=>{if(e.detail===0)api.input(action);};return b;
 }
 const group=name=>{const el=document.createElement('div');el.className=name;root.append(el);return el;};
 if(id==='garden'){
  const tools=group('garden-tools');for(const [value,name] of [['build:seed','星种 45'],['build:frost','霜花 65'],['build:cannon','莓果 90'],['tower:upgrade','升级'],['tower:sell','回收']]){const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-pressed',String(api.tool.value===value));b.onclick=()=>{api.tool.value=value;tools.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};tools.append(b);}
  const wave=document.createElement('button');wave.textContent='开始下一波';wave.className='garden-wave';wave.onclick=()=>api.input('wave');root.append(wave);
 }else if(id==='runner')button('jump',group('action-pad'),false);
 else{
  const dpad=group(['maze','danmaku','fighter','contra'].includes(id)?'direction-pad':'direction-row');
  for(const a of dpad.className==='direction-pad'?['up','left','down','right']:['left','right'])button(a,dpad,true);
  const actions=group('action-pad');if(id==='blocks')for(const a of ['rotate','hold','drop'])button(a,actions);
  if(id==='contra')for(const a of ['jump','dash','fire'])button(a,actions,true);
  if(['danmaku','fighter'].includes(id))button('focus',actions,true);
  if(id==='breakout'){const note=document.createElement('small');note.textContent='也可直接拖动挡板';actions.append(note);}
 }
 const hidden=()=>{if(document.hidden)releaseAll();};window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',hidden);
 return ()=>{releaseAll();window.removeEventListener('blur',releaseAll);document.removeEventListener('visibilitychange',hidden);root.replaceChildren();};
}
