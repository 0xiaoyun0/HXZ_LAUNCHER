// Normalize browser-selected raster images before sending bounded JSON to the
// authenticated community API. SVG and remote URLs never enter this path.
export async function communityImage(file){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024)throw Error('请选择 12 MB 以内的 PNG、JPG 或 WebP 图片');
  const image=await createImageBitmap(file);
  try{
    let size=1200;
    for(let i=0;i<5;i++,size=Math.round(size*.72)){
      const scale=Math.min(1,size/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/png');if(data.length<1350000)return data;
    }
    throw Error('图片仍然过大，请选择较小的图片');
  }finally{image.close();}
}
