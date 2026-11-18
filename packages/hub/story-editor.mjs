import {el} from './dom.mjs';

export function storyEditor(ctx,parent,initial){
 const {surface}=ctx,{button,field,select,dialog}=surface;
 let nodes=typeof initial==='string'&&initial?JSON.parse(initial):Array.isArray(initial)?JSON.parse(JSON.stringify(initial)):[{id:'start',text:'',choices:[]}],active=nodes[0].id;
 const root=el('section','','hub-story-editor'),tools=el('div','','hub-actions'),content=el('div','','hub-story-scene'),meter=el('small','','hub-muted');parent.append(root);root.append(el('h3','剧情场景'),tools,content,meter);
 const label=node=>(nodes[0]===node?'开场':'场景 '+(nodes.indexOf(node)+1))+(node.text?' · '+node.text.replace(/\s+/g,' ').slice(0,20):'');
 function changed(){meter.textContent=nodes.length+' 个场景 · '+JSON.stringify(nodes).length+' / 30000 字符';root.dispatchEvent(new Event('change',{bubbles:true}));}
 function draw(){
  tools.replaceChildren();content.replaceChildren();
  const choose=select(tools,'编辑场景',nodes.map(n=>[n.id,label(n)]),active);choose.onchange=id=>{active=id;draw();};
  const add=button('添加场景',()=>{if(nodes.length>=100)throw Error('最多 100 个场景');const n={id:'scene-'+crypto.randomUUID(),text:'',choices:[]};nodes.push(n);active=n.id;changed();draw();});tools.append(add,button('预览草稿',preview));
  const node=nodes.find(n=>n.id===active),text=field(content,'场景正文',node.text,'textarea');text.maxLength=8000;text.oninput=()=>{node.text=text.value;changed();};
  content.append(el('small',nodes[0]===node?'这是读者进入作品时看到的第一个场景。':'不添加选项即为一个结局。','hub-muted'));
  const choices=el('div','','hub-story-choices');content.append(choices);
  for(const [index,choice] of node.choices.entries()){
   const line=el('div','','hub-story-choice'),caption=field(line,'选项 '+(index+1),choice.label),target=select(line,'前往场景',nodes.map(n=>[n.id,label(n)]),choice.to);caption.maxLength=80;caption.oninput=()=>{choice.label=caption.value;changed();};target.onchange=id=>{choice.to=id;changed();};line.append(button('移除选项',()=>{node.choices.splice(index,1);changed();draw();}));choices.append(line);
  }
  const actions=el('div','','hub-actions');content.append(actions);const option=button('添加选项',()=>{if(node.choices.length>=8)throw Error('每个场景最多 8 个选项');node.choices.push({label:'',to:nodes.find(n=>n.id!==node.id)?.id||node.id});changed();draw();});option.disabled=node.choices.length>=8;actions.append(option);
  if(nodes.length>1)actions.append(button('删除场景',()=>{
   if(nodes.some(n=>n.id!==node.id&&n.choices.some(c=>c.to===node.id)))throw Error('其他场景仍连接到这里，请先修改那些选项的目标。');
   surface.confirm('删除场景？',label(node),()=>{nodes=nodes.filter(n=>n.id!==node.id);active=nodes[0].id;changed();draw();});
  }));meter.textContent=nodes.length+' 个场景 · '+JSON.stringify(nodes).length+' / 30000 字符';
 }
 function validate(){
  if(JSON.stringify(nodes).length>30000)throw Error('剧情总长度超过 30000 字符，请分成多部作品');
  if(nodes.some(n=>!n.text.trim()||n.choices.some(c=>!c.label.trim()||!nodes.some(t=>t.id===c.to))))throw Error('请补全场景正文、选项文字及目标场景');
  const visited=new Set(),queue=[nodes[0].id];while(queue.length){const id=queue.pop();if(visited.has(id))continue;visited.add(id);queue.push(...nodes.find(n=>n.id===id).choices.map(c=>c.to));}
  if(visited.size!==nodes.length)throw Error('有场景尚未连接到开场，请用选项连接它们');if(!nodes.some(n=>!n.choices.length))throw Error('请至少保留一个没有选项的结局');
 }
 function preview(){
  validate();const d=dialog('预览当前草稿'),trail=[];let current=nodes[0].id;
  const render=()=>{const node=nodes.find(n=>n.id===current);d.content.replaceChildren(el('small',label(node),'hub-muted'),el('div',node.text,'hub-prose'));for(const choice of node.choices)d.content.append(button(choice.label,()=>{trail.push(current);current=choice.to;render();},true));if(!node.choices.length)d.content.append(el('p','故事在这里告一段落。','hub-muted'));d.footer.replaceChildren();if(trail.length)d.footer.append(button('返回上一幕',()=>{current=trail.pop();render();}));d.footer.append(button('从头预览',()=>{trail.length=0;current=nodes[0].id;render();}));};render();
 }
 draw();return {get value(){validate();return JSON.stringify(nodes);}};
}
