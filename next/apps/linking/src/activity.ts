import {api} from './host-api';
export interface Archive {id:string;title:string;en:string;category:string;department:string;date:string;lead:string;summary:string;body?:string;notes:string[];requires:string[];unlocked:boolean;readAt:number|null;bookmarked:boolean}
export interface Task {id:string;title:string;description:string;type:'read'|'code'|'manual'|'guild'|'stat';archiveId?:string;guildId?:string;server?:string;metric?:string;value?:number;requires:string[];available:boolean;completed:boolean;submission?:{id:number;status:string;note:string;updated:number}|null}
export interface Chapter {id:string;title:string;subtitle:string;archives:Archive[];tasks:Task[];revision:number;manager:boolean;user:{uid:string;name:string};progress:{read:number;total:number;completed:number;tasks:number}}
export let chapter:Chapter;
export let host:{theme?:string;reducedMotion?:boolean;mobile?:boolean}={};
export function setHost(value:typeof host){host=value;}
export function setChapter(value:Chapter){if(chapter&&value.revision!==chapter.revision){location.reload();return;}chapter=value;window.dispatchEvent(new CustomEvent('linking-progress'));}
export async function action(kind:string,id:string,value:Record<string,unknown>={}){const response=await api(`/api/linking/chapters/${chapter.id}/action`,'POST',{kind,id,...value});setChapter(response);return response as Chapter;}
export async function refreshChapter(){setChapter(await api(`/api/linking/chapters/${chapter.id}`));}
