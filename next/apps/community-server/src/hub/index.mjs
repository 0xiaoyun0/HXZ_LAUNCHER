import {createHubContext,fail} from './common.mjs';
import {createSocial} from './social.mjs';
import {createResources} from './resources.mjs';
import {createTrading} from './trading.mjs';
import {createSharedMedia} from './shared-media.mjs';
import {createWorkbench} from './workbench.mjs';

export function createCommunityHub(options) {
  const {auth,body,send}=options,ctx=createHubContext(options),social=createSocial(ctx);
  const resources=createResources(ctx,{social,media:options.media,gameTelemetry:options.gameTelemetry,gameBridge:options.gameBridge});
  const trading=createTrading(ctx,{social,inventory:options.inventory,points:options.points});
  const sharedMedia=createSharedMedia(ctx);
  const workbench=createWorkbench(ctx,{clients:options.clients});
  async function route(req,res,url) {
    if(!url.pathname.startsWith('/api/hub/'))return false;
    const user=auth(req),p=url.pathname.slice('/api/hub/'.length);
    ctx.limit('hub:'+(req.method==='GET'?'read:':'write:')+user.uid,req.method==='GET'?120:40);
    const input=['POST','PUT'].includes(req.method)?await body(req,300000):{};
    const result=await social.route(user,p,req.method,input,url.searchParams) ?? await resources.route(user,p,req.method,input,url.searchParams) ?? await trading.route(user,p,req.method,input,url.searchParams) ?? await sharedMedia.route(user,p,req.method,input,url.searchParams) ?? workbench.route(user,p,req.method,input,url.searchParams);
    if(result===undefined)fail('社区工作台接口不存在',404);
    send(res,200,result);return true;
  }
  return {route,social,visit:social.visit,close:social.close};
}
