const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const date=n=>new Date(n).toLocaleString('zh-CN');
function button(parent,label,fn){const b=el('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}};parent.append(b);return b;}
function field(parent,label,value='',multi=false){const l=el('label',label),i=el(multi?'textarea':'input');i.value=value;i.setAttribute('aria-label',label);l.append(i);parent.append(l);return i;}
function select(parent,label,values,current){const l=el('label',label),s=el('select');for(const [id,name]of values)s.append(new Option(name,id));s.value=current;s.setAttribute('aria-label',label);l.append(s);parent.append(l);return s;}
const statuses=[['open','待处理'],['working','处理中'],['resolved','已解决'],['ignored','已忽略']];
const card=(root,title)=>{const section=el('article');section.className='panel';section.append(el('h2',title));root.append(section);return section;};
const note=(root,text)=>root.append(el('p',text));

export async function runtime(root,api,message){
 root.replaceChildren(el('p','正在读取实际运行信息…'));
 const [value,hxzre,bridges]=await Promise.all([api('/api/admin/runtime'),api('/api/admin/hxzre'),api('/api/admin/game-access')]);root.replaceChildren();
 const info=card(root,'实际运行的社区服务');
 for(const [label,content]of [['版本',value.version],['启动时间',date(value.startedAt)],['进程',value.pid],['Node.js',value.node],['程序目录',value.programDirectory],['数据目录',value.dataDirectory],['自动重启',value.supervised?'受 supervisor 监护':'未通过新版启动脚本启动']]){const line=el('p');line.append(el('strong',label+'：'),el('span',String(content)));info.append(line);}
 note(info,'覆盖安装后以这里的版本和程序目录为准。若仍运行旧版本，先停止旧进程，再使用新包的“启动社区服务.bat”启动，保留原 data 与 .env。');
 const origins=card(root,'HXZRE 实际连接');note(origins,'“正在监听”只表示本机进程就绪。“验证 MC 双向传输”会经过 Edge → UDP Origin → MC 并读取回包；公网防火墙还需在玩家端自检。');
 if(hxzre.error)note(origins,hxzre.error);
 for(const entry of hxzre.items||[]){const row=card(origins,entry.id);note(row,[entry.state,entry.origin,entry.target,entry.pid?'PID '+entry.pid:''].filter(Boolean).join(' · '));if(entry.error)note(row,entry.error);const output=el('p',entry.verification?(entry.verification.ok?'上次传输验证成功':'上次验证失败：'+entry.verification.error):'尚未验证数据传输');row.append(output);button(row,'验证 MC 双向传输',async()=>{try{output.textContent='正在验证…';const v=await api('/api/admin/hxzre','POST',{id:entry.id});output.textContent=v.ok?'双向传输成功 · '+v.online+' 人在线 · '+v.latency+' ms':v.error;}catch(e){output.textContent=e.message;}});}
 const bridge=card(root,'MC 游戏桥');for(const item of bridges.items){note(bridge,item.server+' · '+(item.connected?'已连接':'离线或尚未安装')+' · '+(item.bridgeVersion||'旧版桥')+' · '+(item.observed?date(item.observed):'未收到心跳')+' · 协议 '+(item.protocol||'—'));}
 button(info,'刷新运行信息',()=>runtime(root,api,message));
}
export async function errors(root,api,message,filter={status:'',q:'',offset:0}){
 root.replaceChildren(el('p','正在读取错误记录…'));
 const value=await api('/api/admin/error-reports?status='+encodeURIComponent(filter.status)+'&q='+encodeURIComponent(filter.q)+'&offset='+filter.offset);root.replaceChildren();
 const controls=card(root,'自动错误诊断 · '+value.total+' 组');note(controls,'相同版本和错误合并计数；网络重试不会重复计数。已解决的问题再次出现会重新打开。');
 const status=select(controls,'状态',[['','全部'],...statuses],filter.status),q=field(controls,'版本、错误或用户',filter.q);
 const reload=()=>errors(root,api,message,{status:status.value,q:q.value,offset:0});button(controls,'查询 / 刷新',reload);
 for(const item of value.items){const box=card(root,item.message),label=statuses.find(v=>v[0]===item.status)?.[1]||item.status;
  note(box,`${label} · ${item.occurrences} 次 · ${item.version} · ${item.platform} · ${item.name}`);
  note(box,'首次 '+date(item.first_seen)+' / 最近 '+date(item.last_seen));
  const detail=el('details'),summary=el('summary','环境与诊断'),pre=el('pre',JSON.stringify(item.context,null,2)+'\n\n'+item.detail);detail.append(summary,pre);box.append(detail);
  const state=select(box,'处理状态',statuses,item.status),assignee=field(box,'处理人',item.assignee),noteInput=field(box,'处理说明',item.note,true);
  button(box,'保存处理记录',async()=>{try{await api('/api/admin/error-reports/'+item.id,'PUT',{updated:item.updated,status:state.value,assignee:assignee.value,note:noteInput.value});message('处理记录已保存');await errors(root,api,message,filter);}catch(e){message(e.message,true);}});
  button(box,'查看处理历史',async()=>{try{const result=await api('/api/admin/error-reports/'+item.id);const history=el('div');for(const row of result.history)note(history,date(row.created)+' · '+row.actor+' · '+row.status+' · '+row.note);if(!result.history.length)note(history,'暂无处理记录');box.append(history);}catch(e){message(e.message,true);}});
 }
 if(!value.items.length)note(root,'暂无此类错误记录。');
 if(filter.offset>0)button(root,'上一页',()=>errors(root,api,message,{...filter,offset:Math.max(0,filter.offset-30)}));
 if(filter.offset+30<value.total)button(root,'下一页',()=>errors(root,api,message,{...filter,offset:filter.offset+30}));
}
export async function plugins(root,api,message,offset=0){
 root.replaceChildren(el('p','正在读取插件记录…'));
 const value=await api('/api/admin/plugins?offset='+offset);root.replaceChildren();const info=card(root,'插件市场审核 · '+value.total+' 个版本');
 note(info,'插件具有完整启动器权限。审核应检查作者、文件内容与行为；批准后可公开下载，已安装插件仍需用户确认后启用。');
 button(info,'刷新列表',()=>plugins(root,api,message,offset));
 for(const item of value.items){const box=card(root,item.name+' '+item.version);note(box,item.id+' · '+item.status+' · 作者 '+item.author+' · 提交者 '+item.publisher);note(box,item.description);note(box,'SHA-256 '+item.sha256);if(item.reviewer)note(box,'上次审核：'+item.reviewer+' · '+item.reason);
  button(box,'查看提交的全部代码',async()=>{try{const p=await api('/api/admin/plugins/'+item.id+'/package');const details=el('details');details.open=true;details.append(el('summary','manifest.json'),el('pre',JSON.stringify(p.package.manifest,null,2)));for(const [name,source]of Object.entries(p.package.files)){const file=el('details');file.append(el('summary',name),el('pre',source));details.append(file);}box.append(details);}catch(e){message(e.message,true);}});
  const reason=field(box,'审核说明',item.reason,true);
  for(const [status,label]of [['approved','批准上架'],['rejected','拒绝'],['withdrawn','下架']])button(box,label,async()=>{try{await api('/api/admin/plugins/'+item.id,'PUT',{updated:item.updated,status,reason:reason.value});message('审核已保存');await plugins(root,api,message,offset);}catch(e){message(e.message,true);}});
 }
 if(offset)button(root,'上一页',()=>plugins(root,api,message,Math.max(0,offset-30)));
 if(offset+30<value.total)button(root,'下一页',()=>plugins(root,api,message,offset+30));
}
