import {chapter} from './activity';
export interface ArchiveRecord {id:string;key:string;title:string;en:string;department:string;category:string;date:string;lead:string;clearance:string;abstract:string;findings:string[];source:string;unlocked:boolean}
const convert=()=>chapter.archives.map((a,i)=>({id:'X-'+String(i+1).padStart(3,'0'),key:a.id,title:a.title,en:a.en||a.title,department:a.department,category:a.category,date:a.date,lead:a.lead,clearance:a.unlocked?'已解锁':'尚未解锁',abstract:a.body||a.summary,findings:a.notes,source:'',unlocked:a.unlocked}));
export const records:ArchiveRecord[]=convert();
export const archiveColumns=[...new Set(records.map(r=>r.category))];
export const categories=['全部档案',...archiveColumns];
window.addEventListener('linking-progress',()=>records.splice(0,records.length,...convert()));
export function columnFiles(lane:number){return records.map((record,index)=>({record,index})).filter(({record})=>record.category===archiveColumns[lane]).map(({index})=>index);}
export function fileLocation(index:number){const lane=archiveColumns.indexOf(records[index].category),row=12+columnFiles(lane).indexOf(index);return {lane,row,slot:lane*32+row};}
export function fileAtSlot(slot:number){const files=columnFiles(Math.floor(slot/32)%archiveColumns.length);return files[((slot%32)-12+files.length*32)%files.length];}
