import fs from 'node:fs/promises';
import path from 'node:path';
import {writeJSON} from '../packages/engine/core/io.mjs';
import {validateCard as validatePluginPackage,CARD_LIMIT as PLUGIN_LIMIT} from '../server/shared/card-plugin.mjs';

export function cardPlugins({home,choose,request,emit,safeMode=false}) {
  const file=path.join(home,'cards-v2.json');
  let tail=Promise.resolve();
  async function read() {
    try { const items=JSON.parse(await fs.readFile(file,'utf8')); if(!Array.isArray(items))throw Error('卡片清单损坏'); return items; }
    catch(error) {if(error.code==='ENOENT')return [];throw error;}
  }
  async function fromFile(){
    const chosen=await choose({title:'选择幻想镇卡片插件',properties:['openFile'],filters:[{name:'卡片插件',extensions:['hxzplugin','json']}]});
    if(chosen.canceled)return null;
    const name=chosen.filePaths[0];if((await fs.stat(name)).size>PLUGIN_LIMIT)throw Error('插件超过大小限制');
    return validatePluginPackage(await fs.readFile(name,'utf8'));
  }
  async function invoke(action,input) {
    let value;
    if(action==='plugins.install'||action==='plugins.submit') {
      if(input.marketId) {
        const record=await request('/api/plugins/'+encodeURIComponent(input.marketId)+'/package');
        value=validatePluginPackage(record.package);
        if(!input.sha256 || value.sha256!==input.sha256)throw Error('下载内容与市场记录不一致');
      } else value=await fromFile();
      if(!value)return {cancelled:true};
      if(action==='plugins.submit')return request('/api/plugins','POST',{package:value.bundle});
    }
    const op=tail.then(async()=>{
      let items=await read();
      if(action==='plugins.list')return {items,safeMode,apiVersion:2};
      const index=items.findIndex(row=>row.manifest.id===input.id);
      if(action==='plugins.install'){
        items=items.filter(row=>row.manifest.id!==value.manifest.id);
        items.push({manifest:value.manifest,card:value.bundle.card,enabled:false});
      } else if(action==='plugins.disableAll')items=items.map(row=>({...row,enabled:false}));
      else if(index<0)throw Error('未找到已安装的卡片');
      else if(action==='plugins.remove')items.splice(index,1);
      else if(action==='plugins.enable'&&input.accepted===true)items[index].enabled=true;
      else if(action==='plugins.disable')items[index].enabled=false;
      else throw Error('请确认卡片权限');
      await writeJSON(file,items);emit({type:'cards-changed'});return {ok:true};
    });
    tail=op.catch(()=>{});return op;
  }
  return invoke;
}
