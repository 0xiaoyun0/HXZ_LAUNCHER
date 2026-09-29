import type {CSSProperties,ReactNode} from 'react';

/** Static collections share the same spacing/surface as draggable CardBoard cards. */
export function CardCollection({children,minWidth=260,className=''}:{children:ReactNode;minWidth?:number;className?:string}) {
 return <div className={'card-collection '+className} style={{'--collection-min':`${minWidth}px`} as CSSProperties}>{children}</div>;
}
export function ContentCard({title,media,children,footer,className=''}:{title:ReactNode;media?:ReactNode;children?:ReactNode;footer?:ReactNode;className?:string}) {
 return <article className={'content-card '+className}>{media&&<div className="content-card-media">{media}</div>}<div className="content-card-body"><h3>{title}</h3><div className="content-card-copy">{children}</div>{footer&&<footer className="card-actions">{footer}</footer>}</div></article>;
}
export function CardActions({children}:{children:ReactNode}){return <div className="card-actions">{children}</div>;}
