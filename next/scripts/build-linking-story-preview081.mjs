// Package a public-safe, read-only author preview. Never copy a community DB.
import fs from 'node:fs/promises';
import {createStoryVolumes081,volume081Items} from '../apps/community-server/src/linking-volumes081.mjs';
import {createObserverChapter082,observer082Items} from '../apps/community-server/src/linking-observer082.mjs';

const rewards=[...volume081Items,...observer082Items];
const chapters=[...createStoryVolumes081({openingChapter:'preview-opening'}),createObserverChapter082()].map(c=>({
  id:c.id,title:c.title,subtitle:c.subtitle,revision:1,manager:false,preview:true,
  user:{uid:'',name:'随包剧情只读预览'},
  archives:c.archives.map(a=>({id:a.id,title:a.title,en:a.en,category:a.category,department:a.department,date:a.date,lead:a.lead,summary:a.summary,body:a.body,notes:a.notes,requires:a.requires,unlocked:true,readAt:null,bookmarked:false})),
  tasks:c.tasks.map(t=>({id:t.id,title:t.title,description:t.description,type:t.type,archiveId:t.archiveId,requires:t.requires,available:true,completed:false,submission:null,...(t.reward?{reward:{item:t.reward.item,quantity:t.reward.quantity,title:rewards.find(i=>i.id===t.reward.item)?.title||t.reward.item,available:true,claimed:false}}:{})})),
  progress:{read:0,total:c.archives.length,completed:0,tasks:c.tasks.length}
}));
// Only allowlisted presentation fields above enter the desktop bundle. Answers,
// source maps, prerequisites and private player state must never be copied.
await fs.writeFile(new URL('../apps/desktop/src/linking-story-preview081.json',import.meta.url),JSON.stringify(chapters,null,2)+'\n');
console.log(`Packaged ${chapters.length} read-only chapters / ${chapters.reduce((n,c)=>n+c.archives.length,0)} archives.`);
