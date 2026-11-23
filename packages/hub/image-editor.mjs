import {el} from './dom.mjs';
import {boundedBitmap} from '../community/image-bounds.mjs';
export async function decodeAsset(blob){
 if(blob.size>24*1024*1024)throw Error('图片超过 24 MB，请先缩小图片');
 return boundedBitmap(blob);
}
export const canvasBlob=(canvas,type='image/png',quality=.9)=>new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('无法生成图片')),type,quality));
export function drawImageEdit(canvas,image,options={}){
 const rotation=((Math.round(options.rotation||0)%4)+4)%4,turn=rotation%2,iw=turn?image.height:image.width,ih=turn?image.width:image.height;
 const ratio=options.ratio>0?options.ratio:iw/ih,zoom=Math.max(1,Math.min(4,Number(options.zoom)||1));let cropW=Math.min(iw,ih*ratio)/zoom,cropH=cropW/ratio;
 const scale=Math.min(1,2048/Math.max(cropW,cropH));canvas.width=Math.max(1,Math.round(cropW*scale));canvas.height=Math.max(1,Math.round(cropH*scale));
 const c=canvas.getContext('2d'),cx=cropW/2+(iw-cropW)*Math.max(0,Math.min(1,options.x??.5)),cy=cropH/2+(ih-cropH)*Math.max(0,Math.min(1,options.y??.5));
 c.save();c.scale(scale,scale);c.translate(cropW/2-cx,cropH/2-cy);c.translate(iw/2,ih/2);c.rotate(rotation*Math.PI/2);c.filter=`brightness(${Math.max(.5,Math.min(1.5,options.brightness||1))}) contrast(${Math.max(.5,Math.min(1.5,options.contrast||1))})`;c.drawImage(image,-image.width/2,-image.height/2);c.restore();
 if(options.text){const font=Math.max(12,canvas.width*.035),text=String(options.text).slice(0,80);c.font=`600 ${font}px system-ui`;const width=Math.min(canvas.width*.88,c.measureText(text).width+font);c.fillStyle='#122438b8';c.fillRect(canvas.width*.04,canvas.height-font*2.3,width,font*1.7);c.fillStyle='white';c.textBaseline='middle';c.fillText(text,canvas.width*.04+font*.5,canvas.height-font*1.45,Math.max(1,width-font));}
}
export async function imageEditor(ctx,blob,name,save){
 const bitmap=await decodeAsset(blob),{surface}=ctx,{dialog,field,select,button}=surface,d=dialog('编辑截图'),canvas=el('canvas','','hub-editor-canvas'),preview=el('div','','hub-editor-preview'),controls=el('div','','hub-editor-controls'),settings={rotation:0,zoom:1,x:.5,y:.5,brightness:1,contrast:1,text:''};let frame=0,closed=false,dirty=false;
 const grid=el('div','','hub-image-editor');preview.append(canvas);grid.append(preview,controls);d.content.append(grid);
 const ratio=select(controls,'裁剪比例',[['0','原图'],['1.7777777778','16 : 9'],['1.25','5 : 4'],['1','正方形'],['0.5625','9 : 16']], '0');
 const paint=()=>{dirty=true;if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!closed)drawImageEdit(canvas,bitmap,settings);});};ratio.onchange=()=>{settings.ratio=Number(ratio.value);paint();};
 for(const [key,label,min,max,step] of [['zoom','裁剪放大',1,4,.05],['x','水平位置',0,1,.01],['y','垂直位置',0,1,.01],['brightness','亮度',.5,1.5,.01],['contrast','对比度',.5,1.5,.01]]){const input=field(controls,label,settings[key],'range');Object.assign(input,{min:String(min),max:String(max),step:String(step)});input.value=String(settings[key]);input.oninput=()=>{settings[key]=Number(input.value);paint();};}
 const text=field(controls,'图片标注');text.maxLength=80;text.oninput=()=>{settings.text=text.value;paint();};controls.append(button('向右旋转',()=>{settings.rotation++;paint();}));
 const cleanup=()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);bitmap.close();};cleanup.node=d.node;d.node.addEventListener('close',cleanup,{once:true});d.onClose(close=>dirty?surface.confirm('放弃编辑？','原始图片没有改变。',close):close());
 d.footer.append(button('保留原图，另存编辑副本',async()=>{drawImageEdit(canvas,bitmap,settings);await save(await canvasBlob(canvas),{name:name.replace(/\.[^.]+$/,'')+' · 编辑',width:canvas.width,height:canvas.height});dirty=false;d.close();},true));drawImageEdit(canvas,bitmap,settings);return cleanup;
}
