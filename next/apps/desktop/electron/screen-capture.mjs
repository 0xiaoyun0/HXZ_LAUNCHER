import {desktopCapturer,session} from 'electron';

export function createScreenCapture(window){
 let selection=null,sources=new Map();const own=frame=>frame===window()?.webContents.mainFrame;
 session.defaultSession.setDisplayMediaRequestHandler(async(request,callback)=>{
  const picked=selection;selection=null;
  if(!own(request.frame)||!picked||Date.now()>picked.expires||!request.videoRequested){callback({});return;}
  try{const available=await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:0,height:0}}),source=available.find(v=>v.id===picked.id);callback(source?{video:source}:{});}catch{callback({});}
 });
 return {
  // Electron 22 and 44 request display capture as media with an empty mediaTypes list.
  // Authorize only the top frame after the user selected a source; camera requests stay denied.
  canRequest(details){return details.isMainFrame===true&&Array.isArray(details.mediaTypes)&&details.mediaTypes.length===0&&!!selection&&selection.expires>=Date.now();},
  async list(){selection=null;const list=await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:320,height:180},fetchWindowIcons:false});sources=new Map(list.slice(0,80).map(v=>[v.id,Date.now()+60000]));return list.slice(0,80).map(v=>({id:v.id,name:v.name,thumbnail:v.thumbnail.toDataURL()}));},
  select(id){if(typeof id!=='string'||(sources.get(id)||0)<Date.now())throw Error('窗口列表已过期，请重新选择');selection={id,expires:Date.now()+10000};sources.clear();return {ok:true};},
  clear(){selection=null;sources.clear();}
 };
}
