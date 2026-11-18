import {renderToString} from 'react-dom/server';import {Website} from './Website';
export function render(content:any,path:string){return renderToString(<Website content={content} path={path}/>);}
