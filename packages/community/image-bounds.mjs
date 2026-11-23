// Inspect dimensions before decoding so a small compressed file cannot allocate an enormous bitmap.
export async function imageBounds(blob){
 const bytes=new Uint8Array(await blob.slice(0,1024*1024).arrayBuffer()),v=new DataView(bytes.buffer),n=bytes.length,ascii=(p,s)=>p+s.length<=n&&s.split('').every((c,i)=>bytes[p+i]===c.charCodeAt(0));let width=0,height=0;
 if(n>=24&&bytes[0]===137&&ascii(1,'PNG\r\n\x1a\n')&&ascii(12,'IHDR')){width=v.getUint32(16);height=v.getUint32(20);}
 else if(n>=30&&ascii(0,'RIFF')&&ascii(8,'WEBP')){
  if(ascii(12,'VP8X')){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
  else if(ascii(12,'VP8 ')&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
  else if(ascii(12,'VP8L')&&bytes[20]===47){const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
 }else if(n>=4&&bytes[0]===255&&bytes[1]===216){
  let p=2;while(p+4<=n){if(bytes[p++]!==255)break;while(p<n&&bytes[p]===255)p++;const marker=bytes[p++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;if(p+2>n)break;const size=v.getUint16(p);if(size<2||p+size>n)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&size>=7){height=v.getUint16(p+3);width=v.getUint16(p+5);break;}p+=size;
  }
 }
 if(!width||!height)throw Error('无法读取图片尺寸，请重新保存为 PNG、JPG 或 WebP');
 if(width>16000||height>16000||width*height>24000000)throw Error('图片尺寸过大，请缩小至 2400 万像素以内');return {width,height};
}
export async function boundedBitmap(blob,max=2048){const size=await imageBounds(blob),scale=Math.min(1,max/Math.max(size.width,size.height));return createImageBitmap(blob,{resizeWidth:Math.max(1,Math.round(size.width*scale)),resizeHeight:Math.max(1,Math.round(size.height*scale)),resizeQuality:'high'});}
