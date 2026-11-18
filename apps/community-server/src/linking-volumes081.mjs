// Additive, unpublished story templates. Source maps remain internal to the author modules.
import {realityVolume1} from './linking-volume1-reality081.mjs';
import {realityVolume2} from './linking-volume2-reality081.mjs';

export const volume081Items = [
  {id:'lv1-rain-receipt',title:'白枝复核页',description:'林苇签发的馆内复核副页。两枚铃、星片与缺帧各留在自己的证据位置。仅为调查纪念物。'},
  {id:'lv1-seventh-door-tag',title:'北偏东索引签',description:'周拾裁下空白卡纸，林苇写上方位和本次卷号；可以据此找到第七门调查记录。仅为调查纪念物。'},
  {id:'lv2-morning-postmark',title:'北行信路由片',description:'馆内缩印并签发的查阅路线，注明日期与资料架位；记下迟到信的复核经过。仅为调查纪念物。'},
  {id:'lv2-empty-envelope',title:'银门缺页夹',description:'周拾以无酸卡纸组装，林苇签发；收着两张标明未接合的轮廓副图，原件仍留馆。仅为调查纪念物。'}
];

const reward = item => ({item,quantity:1});
function createVolume({id,title,subtitle,order,prerequisites,entries,codes,finalTask,rewards}) {
  const tasks=[];
  const archives=[];
  let previous;
  for (const [index,entry] of entries.entries()) {
    const readId = index === entries.length-1 ? finalTask : `${entry.id}-read`;
    const requires=previous?[previous]:[];
    archives.push({...entry,en:'',category:'馆内调查',department:'LINKING 档案馆',date:`调查顺序 ${String(index+1).padStart(2,'0')}`,lead:'探索者、林苇、周拾、唐知衡',notes:[],requires});
    const task={id:readId,title: index === entries.length-1 ? `归档：${title}` : `阅读：${entry.title}`,description:`阅读「${entry.title}」。本项只需完成阅读；不需要人工审核。`,type:'read',archiveId:entry.id,requires};
    if (rewards?.[readId]) task.reward=reward(rewards[readId]);
    tasks.push(task);
    previous=readId;
    if(codes[index]) {
      const code={...codes[index],type:'code',requires:[readId]};
      if(rewards?.[code.id])code.reward=reward(rewards[code.id]);
      tasks.push(code);
      previous=code.id;
    }
  }
  return {id,title,subtitle,locale:'zh-CN',order,opensAt:'',closesAt:'',prerequisites,archives,tasks};
}

export const volume081Info = {
  chapterIds:['linking-volume-01','linking-volume-02'],
  chapters:[realityVolume1,realityVolume2].map((volume,index)=>({id:'linking-volume-0'+(index+1),title:volume.title,finalTask:volume.finalTask,archives:volume.entries.length})),
  archives:realityVolume1.entries.length+realityVolume2.entries.length,
  items:volume081Items.length,
  effects:[]
};

export function createStoryVolumes081({openingChapter}={}) {
  if(typeof openingChapter!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(openingChapter))throw Object.assign(Error('需要现有归途灯标所在章节的有效标识'),{status:400});
  const opening={chapter:openingChapter,task:'snow-ash-light-signal'};
  return [
    createVolume({...realityVolume1,id:'linking-volume-01',order:20,prerequisites:[opening],rewards:{'lv1-before-rain-stops-read':'lv1-rain-receipt','lv1-close-rain-case':'lv1-seventh-door-tag'}}),
    createVolume({...realityVolume2,id:'linking-volume-02',order:30,prerequisites:[{...opening},{chapter:'linking-volume-01',task:realityVolume1.finalTask}],rewards:{'lv2-morning-table-read':'lv2-morning-postmark','lv2-deliver-morning':'lv2-empty-envelope'}})
  ];
}
