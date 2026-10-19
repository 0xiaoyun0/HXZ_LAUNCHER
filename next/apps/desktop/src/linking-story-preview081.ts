import chapters from './linking-story-preview081.json';

/** A bundled author review, independent of the community and its player data. */
export function storyPreviewRequest(path:string,method:string){
 if(method!=='GET')throw Error('剧情预览只供阅读，不保存进度、提交任务或发放奖励。');
 if(path==='/api/linking/catalog')return {
  config:{enabled:true,title:'0.8.1 剧情预览',intro:'两卷未发布的续篇 · 可自由阅读全部档案'},manager:false,
  user:{uid:'',name:'本地剧情预览'},
  chapters:chapters.map((c,i)=>({id:c.id,title:c.title,subtitle:c.subtitle,order:i,status:'open',locked:false,prerequisites:[],read:0,total:c.archives.length,completed:0,tasks:c.tasks.length}))
 };
 const id=path.match(/^\/api\/linking\/chapters\/([a-z0-9-]+)$/)?.[1];
 const chapter=chapters.find(c=>c.id===id);
 if(!chapter)throw Error('本地预览仅提供两卷续篇；请返回线上档案查看其他章节。');
 return structuredClone(chapter);
}
