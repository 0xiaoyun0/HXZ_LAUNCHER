export const BUILTIN_PRESETS=Object.freeze([
 {id:'builtin-auto',name:'自动推荐',config:{memoryMode:'auto',memoryMB:4096,width:1280,height:720,fullscreen:false,javaMode:'auto'}},
 {id:'builtin-window',name:'宽屏窗口',config:{memoryMode:'auto',memoryMB:4096,width:1600,height:900,fullscreen:false,javaMode:'auto'}},
 {id:'builtin-full',name:'全屏游玩',config:{memoryMode:'auto',memoryMB:4096,width:1920,height:1080,fullscreen:true,javaMode:'auto'}}
]);
export function configurationPreset(value={}){
 const out={memoryMode:['auto','manual','inherit'].includes(value.memoryMode)?value.memoryMode:'auto',memoryMB:value.memoryMB??4096,width:value.width??1280,height:value.height??720,fullscreen:value.fullscreen===true,javaMode:value.javaMode==='inherit'?'inherit':'auto'};
 for(const [key,min,max]of [['memoryMB',512,131072],['width',640,7680],['height',360,4320]])if(!Number.isInteger(out[key])||out[key]<min||out[key]>max)throw Error('预设的内存或窗口尺寸无效');return out;
}
export function readPresets(value){
 if(!Array.isArray(value)||value.length>20)throw Error('最多保存 20 个自定义预设');
 const keys=new Set();return value.map(item=>{if(!/^[a-f0-9-]{36}$/.test(item.id||'')||keys.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>60)throw Error('配置预设无效');keys.add(item.id);return {id:item.id,name:item.name.trim(),config:configurationPreset(item.config)};});
}
