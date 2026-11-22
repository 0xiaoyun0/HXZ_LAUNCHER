import {useLayoutEffect,type RefObject} from 'react';
import {verticalCompactor,type LayoutItem} from 'react-grid-layout/core';

const columns=12;
// One saved size unit is a line at the player's current text scale.
export const cardHeightEm=1.375;
export function cardHeightUnit(card:HTMLElement){
  return parseFloat(getComputedStyle(card).fontSize)*cardHeightEm;
}
export function boardMetrics(grid:HTMLElement){
  const rect=grid.getBoundingClientRect(),gap=parseFloat(getComputedStyle(grid).columnGap)||0;
  return {rect,gap,step:(rect.width+gap)/columns};
}
export function cardPositions(grid:HTMLElement){
  const {rect,gap,step}=boardMetrics(grid);
  return Array.from(grid.querySelectorAll<HTMLElement>('[data-card-id]')).filter(card=>card.closest('[data-card-grid]')===grid).map(card=>{
    const box=card.getBoundingClientRect(),w=Math.min(columns,Math.max(1,Math.round((box.width+gap)/step)));
    return {id:card.dataset.cardId!,x:Math.max(0,Math.min(columns-w,Math.round((box.left-rect.left)/step))),w,top:box.top,left:box.left,height:box.height,locked:!!card.dataset.locked};
  });
}
// Each column tracks its own bottom. A short panel can sit directly below its neighbour in that column.
export function useCardGrid(ref:RefObject<HTMLDivElement|null>,packed:boolean,signature:string){
  useLayoutEffect(()=>{
    const grid=ref.current;if(!grid||!packed)return;
    const cards=Array.from(grid.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&!!node.dataset.cardId);
    function arrange(){
      if(grid!.dataset.dragging)return;
      const style=getComputedStyle(grid!),gap=parseFloat(style.columnGap)||0;
      const rowPixels=parseFloat(style.gridAutoRows),ends=Array<number>(columns).fill(0),unit=cardHeightUnit(grid!);
      const layout:LayoutItem[]=[],heights=new Map<string,number>();
      for(const card of cards){
        const w=Number(card.style.getPropertyValue('--panel-span'))||columns;
        const tops=Array.from({length:columns-w+1},(_,x)=>Math.max(...ends.slice(x,x+w)));
        const x=card.dataset.column===undefined?tops.indexOf(Math.min(...tops)):Math.max(0,Math.min(columns-w,Number(card.dataset.column)));
        card.style.gridColumn=(x+1)+' / span '+w;
        const height=card.getBoundingClientRect().height,h=Math.max(1,Math.ceil((height+gap)/unit));
        const y=card.dataset.row===undefined?tops[x]:Number(card.dataset.row);
        heights.set(card.dataset.cardId!,height);
        layout.push({i:card.dataset.cardId!,x,y,w,h,static:!!card.dataset.locked});
        ends.fill(Math.max(tops[x],y)+h,x,x+w);
      }
      const positions=new Map(verticalCompactor.compact(layout,columns).map(item=>[item.i,item]));
      for(const card of cards){
        const id=card.dataset.cardId!,item=positions.get(id)!;
        card.style.gridRow=(Math.round(item.y*unit/rowPixels)+1)+' / span '+Math.max(1,Math.ceil(heights.get(id)!/rowPixels));
      }
    }
    arrange();const observer=new ResizeObserver(arrange);observer.observe(grid);cards.forEach(card=>observer.observe(card));
    return ()=>{observer.disconnect();for(const card of cards){card.style.removeProperty('grid-column');card.style.removeProperty('grid-row');}};
  },[ref,packed,signature]);
}
