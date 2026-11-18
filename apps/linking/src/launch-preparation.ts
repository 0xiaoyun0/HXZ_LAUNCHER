type Summary={archiveIds:string[];taskIds:string[]};
type ChapterShape={archives:{id:string;title?:string}[];tasks:{id:string}[]};
export type PreparationDocument={chapter:ChapterShape;revision:number;liveRevision:number;published:boolean;archived?:boolean;liveSummary?:Summary|null};
const archives=['snow-ash-whitebranch','snow-ash-resonance','snow-ash-return-signal'];
const tasks=['snow-ash-read-whitebranch','snow-ash-restore-audio','snow-ash-field-note','snow-ash-light-signal'];
function stage(summary:Summary){return archives.every(id=>summary.archiveIds.includes(id))&&tasks.every(id=>summary.taskIds.includes(id))?'ready':[...summary.archiveIds,...summary.taskIds].some(id=>id.startsWith('snow-ash-'))?'partial':'missing';}
export function continuationPreparation(document:PreparationDocument){
  const draft=stage({archiveIds:document.chapter.archives.map(a=>a.id),taskIds:document.chapter.tasks.map(t=>t.id)});
  // Older servers can prove a live document only when its revision equals the draft.
  const summary=document.liveSummary??(document.published&&document.revision===document.liveRevision?{archiveIds:document.chapter.archives.map(a=>a.id),taskIds:document.chapter.tasks.map(t=>t.id)}:undefined);
  const live=!document.published?'missing':summary?stage(summary):'unknown';
  return {draft,live,ready:draft==='ready',label:document.archived?'已归档':live==='ready'?'已发布':live==='unknown'?'正式状态待核验':draft==='ready'?'未发布':draft==='partial'?'准备中':'待创建'};
}
export function publicationLabel(document:Pick<PreparationDocument,'published'|'archived'|'revision'|'liveRevision'>){return document.archived?'已归档':!document.published?'未发布':document.revision===document.liveRevision?'已发布':'有未发布修改';}
export function hasOriginalOpening(chapter:ChapterShape){return chapter.archives.some(a=>a.title?.includes('0479')&&a.title.includes('雾间雪'))&&chapter.archives.some(a=>a.title?.includes('0480')&&a.title.includes('雾间见子'));}
