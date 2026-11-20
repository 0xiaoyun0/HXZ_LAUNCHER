import {Children,Fragment,isValidElement,type CSSProperties,type ReactElement,type ReactNode} from 'react';

export type CardSpec={id:string;title:string;content:ReactNode;w?:number;x?:number;y?:number;h?:number;minW?:number;minH?:number;maxH?:number;className?:string;plain?:boolean;fit?:boolean;origin?:{source:string;card:string;title:string;w?:number;minW?:number;widget?:boolean}};

function panels(children:ReactNode):ReactElement<any>[]{
  return Children.toArray(children).flatMap(child=>{
    if(!isValidElement<any>(child))return [];
    return child.type===Fragment?panels((child.props as {children?:ReactNode}).children):[child];
  });
}

export function CardBoard({id,cards,label,className=''}:{id:string;cards:CardSpec[];label?:string;pageTitle?:boolean;className?:string;transient?:boolean}){
  return <div className={'desktop-panels '+className} data-board={id} aria-label={label||undefined}><div className="desktop-panel-grid">
    {cards.map(card=>{
      const span=Math.min(12,Math.max(1,card.w||12));
      return <section key={card.id} className={'desktop-panel '+(card.className||'')} data-size={span<=6?'narrow':'wide'} style={{'--panel-span':span} as CSSProperties}>
        {card.title&&<h2>{card.title}</h2>}<div className="desktop-panel-body">{card.content}</div>
      </section>;
    })}
  </div></div>;
}

export function FormCards({id,children}:{id:string;children:ReactNode}){
  return <CardBoard id={id} cards={panels(children).map((node,i)=>({id:node.props['data-card']||String(i),title:node.props['data-card-title']||node.props.cardTitle||'',content:node,w:node.props['data-width']||6}))}/>;
}

export function PanelGroup({id,children,names=[],widths=[],className=''}:{id:string;children:ReactNode;names?:string[];widths?:number[];heights?:number[];maxHeights?:number[];positions?:number[][];className?:string}){
  return <CardBoard id={id} className={className} cards={panels(children).map((node,i)=>({id:node.props['data-card']||String(i),title:names[i]||'',content:node,w:widths[i]||6}))}/>;
}
