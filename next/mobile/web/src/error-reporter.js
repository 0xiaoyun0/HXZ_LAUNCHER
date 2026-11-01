import {version} from '../package.json';
import {sanitizeReport} from '../../../server/shared/report-sanitize.mjs';
const key='hxz-error-outbox-092';let sending=false,transport,queue=[],recent=new Map();
try{queue=JSON.parse(localStorage.getItem(key)||'[]').slice(-50);}catch{}
const enabled=()=>{try{return JSON.parse(localStorage.getItem('hxz-mobile-settings')||'{}').autoReportErrors!==false;}catch{return true;}};
const save=()=>{try{localStorage.setItem(key,JSON.stringify(queue));}catch{}};
export function captureError(error,action='renderer'){
 if(!enabled()||!error||/已取消|请先登录/.test(error.message||String(error)))return;
 const message=sanitizeReport(error.message||String(error),1000);if(Date.now()-(recent.get(message)||0)<60000)return;recent.set(message,Date.now());if(recent.size>100)recent.clear();
 queue.push({eventId:crypto.randomUUID(),message,detail:sanitizeReport(error.stack||message,16000),category:'android',version,platform:'android',context:{action,os:navigator.userAgent.slice(0,250),clientTime:new Date().toISOString()}});queue=queue.slice(-50);save();void flushErrors();
}
export async function flushErrors(){if(sending||!transport||!enabled())return;sending=true;try{for(let i=0;i<5&&queue.length;i++){await transport(queue[0]);queue.shift();save();}}catch{}finally{sending=false;}}
export function configureErrorReporting(send){transport=send;setInterval(()=>void flushErrors(),60000);window.addEventListener('error',e=>captureError(e.error||Error(e.message)));window.addEventListener('unhandledrejection',e=>captureError(e.reason));}
