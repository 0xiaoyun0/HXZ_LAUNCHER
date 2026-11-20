export const WORKSPACES = [
  {id:'classic',name:'经典工作台',caption:'角色在左，实例与日历在右。',columns:[['roles','monitor','launch'],['library','playtime']]},
  {id:'library',name:'实例控制台',caption:'宽幅实例列表，配置与角色并列。',columns:[['library','playtime'],['launch','roles','monitor']]},
  {id:'journal',name:'游玩手记',caption:'先看上次游玩，再展开日历。',columns:[['library','roles','monitor'],['playtime','launch']]}
];
export const WORKSPACE_MODULES = [
  {id:'featured',name:'上次游玩焦点',caption:'在实例列表前突出显示上次的游戏。',on:true},
  {id:'quickLinks',name:'首页快捷入口',caption:'直接打开安装游戏、联机大厅和音乐。',on:false},
  {id:'shortcuts',name:'顶栏快捷导航',caption:'显示音乐和已安装社区扩展的快捷入口。',on:true},
  {id:'miniPlayer',name:'底栏音乐控制',caption:'在其他页面也能控制播放。',on:true}
];
export function workspaceLayout(id){
  return WORKSPACES.find(item=>item.id===id)||WORKSPACES[0];
}
export function workspaceModules(saved){
  return Object.fromEntries(WORKSPACE_MODULES.map(({id,on})=>[id,typeof saved?.[id]==='boolean'?saved[id]:on]));
}
export function workspaceShelf(value){
  const known=WORKSPACES.map(item=>item.id);
  const visible=Array.isArray(value)?known.filter(id=>value.includes(id)):known;
  return visible.length?visible:known;
}
export function workspacePatch(settings,input){
  const patch={};
  if(input.workspaceLayout!=null){
    if(!WORKSPACES.some(item=>item.id===input.workspaceLayout))throw Error('找不到所选工作台');
    patch.workspaceLayout=input.workspaceLayout;
  }
  if(input.libraryView!=null){
    if(!['auto','cards','list'].includes(input.libraryView))throw Error('游戏库视图无效');
    patch.libraryView=input.libraryView;
  }
  if(input.workspaceShelf!=null){
    const ids=input.workspaceShelf;
    if(!Array.isArray(ids)||!ids.length||ids.some(id=>!WORKSPACES.some(item=>item.id===id)))throw Error('请至少保留一套可用的工作台布局');
    const future=(Array.isArray(settings.workspaceShelf)?settings.workspaceShelf:[]).filter(id=>typeof id==='string'&&!WORKSPACES.some(item=>item.id===id));
    patch.workspaceShelf=[...new Set([...ids,...future])];
  }
  const visible=workspaceShelf(patch.workspaceShelf||settings.workspaceShelf);
  if(input.workspaceLayout&&!visible.includes(input.workspaceLayout))throw Error('请先在「整理布局」中添加这套工作台');
  if(patch.workspaceShelf&&!visible.includes(patch.workspaceLayout||settings.workspaceLayout))patch.workspaceLayout=visible[0];
  if(input.workspaceModules!=null){
    const changes=input.workspaceModules;
    if(typeof changes!=='object'||Array.isArray(changes)||Object.entries(changes).some(([key,value])=>
      !WORKSPACE_MODULES.some(item=>item.id===key)||typeof value!=='boolean'))throw Error('界面模块设置无效');
    patch.workspaceModules={...settings.workspaceModules,...changes};
  }
  return patch;
}
export function homeLayoutKey(layout){
  const {id}=workspaceLayout(layout);
  return id==='classic'?'home':'home.'+id;
}
