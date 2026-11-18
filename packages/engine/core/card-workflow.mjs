export const FLOW_ACTIONS=[
 ['pause-music','暂停音乐'],['leave-voice','退出语音房间'],['instance-folder','打开当前实例目录'],['launch-instance','启动当前实例'],['open-tasks','查看任务与日志'],
 ['page-home','前往启动游戏','/'],['page-library','前往游戏库','/library'],['page-install','前往下载与安装','/workshop/install'],['page-chat','前往文字大厅','/community'],['page-music','前往音乐播放器','/music'],['page-guild','前往冒险家协会','/guild']
];
const names=new Set(FLOW_ACTIONS.map(v=>v[0]));
export function normalizeWorkflow(value){
 const steps=[...new Set(Array.isArray(value)?value.filter(v=>typeof v==='string'&&names.has(v)):[])].slice(0,8);
 const page=steps.filter(v=>v.startsWith('page-')).at(-1);
 return [...steps.filter(v=>!v.startsWith('page-')),...page?[page]:[]];
}
/**
 * @param {string[]} steps
 * @param {(action:string)=>Promise<unknown>} execute
 * @param {{signal?:AbortSignal,progress?:(event:{index:number,action:string,status:string,error?:string})=>void}} options
 */
export async function runWorkflow(steps,execute,{signal,progress=(_value)=>{}}={}){
 const list=normalizeWorkflow(steps);if(!list.length)throw Error('请先在卡片编辑模式添加步骤');
 for(let i=0;i<list.length;i++){
  signal?.throwIfAborted();const action=list[i];progress({index:i,action,status:'running'});
  try{await execute(action);progress({index:i,action,status:'done'});}
  catch(error){progress({index:i,action,status:'failed',error:error.message});throw error;}
 }
 signal?.throwIfAborted();return {completed:list.length};
}
