import {useLayoutEffect,useRef} from 'react';

// A single decorative layer follows the real option. The controls keep their native layout and focus order.
export function useChoiceGlide(value:string|number){
  const group=useRef<HTMLDivElement>(null);
  const previous=useRef<{value:string|number;top:number;box:string}|null>(null);
  useLayoutEffect(()=>{
    const root=group.current;
    const selected=root?.querySelector<HTMLInputElement>('input:checked')?.parentElement;
    if(!root||!selected){if(root)delete root.dataset.glide;previous.current=null;return;}
    function measure(){
      if(!root||!selected)return;
      const {offsetLeft:left,offsetTop:top,offsetWidth:width,offsetHeight:height}=selected;
      if(!width||!height)return;
      const box=[left,top,width,height].join(',');
      const from=previous.current;
      if(from?.box===box&&from.value===value)return;
      root.dataset.glide=from&&from.value!==value&&Math.abs(from.top-top)<height/2?'moving':'ready';
      root.style.setProperty('--glide-x',left+'px');root.style.setProperty('--glide-y',top+'px');
      root.style.setProperty('--glide-width',width+'px');root.style.setProperty('--glide-height',height+'px');
      previous.current={value,top,box};
    }
    measure();
    const resize=new ResizeObserver(measure);
    resize.observe(root);for(const option of root.querySelectorAll('label'))resize.observe(option);
    return ()=>resize.disconnect();
  },[value]);
  return group;
}
