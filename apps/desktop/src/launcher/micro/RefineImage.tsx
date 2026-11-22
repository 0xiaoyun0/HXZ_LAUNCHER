import {useState,type ComponentPropsWithoutRef} from 'react';
export function RefineImage({src,onLoad,...props}:ComponentPropsWithoutRef<'img'>){
  const [loaded,setLoaded]=useState<string>();
  return <img {...props} src={src} data-refine={loaded===src?'ready':'waiting'} onLoad={e=>{setLoaded(src);onLoad?.(e);}}/>;
}
