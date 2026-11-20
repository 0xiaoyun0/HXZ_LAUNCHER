import actions from './guest-actions.json' with {type:'json'};
const local=new Set(actions);

export function checkAccess(action,authenticated) {
  if(typeof action!=='string' || !/^[a-z][a-zA-Z0-9.-]{0,95}$/.test(action)) throw Error('无效操作');
  if (!authenticated && !local.has(action)) throw Error('请先登录幻想镇账号');
}
