import {hydrateRoot,createRoot} from 'react-dom/client';import {Website} from './Website';import './website.css';
declare global{interface Window{__SITE__:any}}
if(window.__SITE__)hydrateRoot(document.getElementById('root')!,<Website content={window.__SITE__} path={location.pathname}/>);else fetch('/api/site').then(r=>r.json()).then(content=>createRoot(document.getElementById('root')!).render(<Website content={content} path={location.pathname}/>));
