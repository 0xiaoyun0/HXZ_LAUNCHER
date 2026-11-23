import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/hub.mjs';

test('retired records remain stored but cannot crowd active moderation pages or counts',async t=>{
 const {req,db}=await fixture(t);
 const old=await req('alice','/api/hub/records','POST',{kind:'article',revision:0,title:'历史知识条目',body:'历史数据必须保留',status:'review',data:{}});
 const active=await req('alice','/api/hub/records','POST',{kind:'event',revision:0,title:'本周建筑活动',body:'保留的活动审核',status:'review',data:{format:'casual',starts:Date.now()+3600000,ends:Date.now()+7200000,capacity:20}});
 const copy=db.prepare("INSERT INTO hub_records SELECT ?,kind,owner,title,summary,body,data,tags,images,visibility,status,revision,created-1000,updated FROM hub_records WHERE id=?");
 for(let i=0;i<30;i++)copy.run('retired-copy-'+i,old.id);
 const queue=await req('admin','/api/hub/workbench?category=content');
 assert.equal(queue.counts.content,1,'counts exclude retired records before pagination');
 assert.equal(queue.total,1);
 assert.deepEqual(queue.items.map(x=>x.id),[active.id]);
 assert.equal((await req('admin','/api/hub/workbench?category=content&offset=24')).items.length,0);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM hub_records WHERE kind='article'").get().n,31,'old records retained');
 assert.equal((await req('alice','/api/hub/records/'+old.id)).title,'历史知识条目','old-client read compatibility retained');
 await req('admin','/api/hub/records/'+old.id+'/review','POST',{revision:1,status:'published'});
 await req('admin','/api/hub/records/'+active.id+'/review','POST',{revision:1,status:'published'});
 const done=await req('admin','/api/hub/workbench');
 assert.equal(done.stats.publishedWeek,1,'weekly counter matches currently usable features');
 assert.equal('teams' in done.stats,false,'retired team metric does not leak back into admin UI');
 assert.equal((await req('admin','/api/hub/catalog')).kinds.article,undefined);
 assert.ok((await req('admin','/api/hub/catalog')).kinds.event);
});
