import {choice,integer} from './common.mjs';

// A read-only projection: handling an item still uses the original domain action.
export function personalDesk(db,user,search){
 const category=choice(search.get('category')||'action',['action','waiting','progress','done'],'待办分类');
 const offset=integer(Number(search.get('offset')||0),0,100000,'页码');
 const source=`WITH me AS (SELECT ? uid), queue AS (
  SELECT 'record:'||r.id id,r.title,r.kind section,r.id record,
   CASE WHEN r.status IN ('draft','rejected') THEN 'action' WHEN r.status='review' OR r.kind='appeal' AND r.status='published' THEN 'waiting' WHEN r.kind IN ('project','event') AND r.status='published' THEN 'progress' ELSE 'done' END category,
   r.status state,r.updated updated FROM hub_records r,me WHERE r.owner=me.uid AND r.status!='archived'
  UNION ALL
  SELECT 'joined:'||r.id,r.title,r.kind,r.id,'progress','joined',r.updated FROM hub_members m JOIN hub_records r ON r.id=m.record,me WHERE m.uid=me.uid AND m.state='active' AND r.owner!=me.uid AND r.kind IN ('project','event') AND r.status='published'
  UNION ALL
  SELECT 'invite:'||r.id,r.title,r.kind,r.id,'action','invited',m.created FROM hub_members m JOIN hub_records r ON r.id=m.record,me WHERE m.uid=me.uid AND m.state='invited' AND r.kind='project' AND r.status='published'
  UNION ALL
  SELECT 'handoff:'||h.id,json_extract(h.payload,'$.title'),'devices','','action','pending',h.updated FROM hub_handoffs h,me WHERE h.uid=me.uid AND h.status='pending'
  UNION ALL
  SELECT 'friend:'||f.requester,m.name||' · 好友申请','social','','action','invited',f.created FROM hub_friends f JOIN members m ON m.uid=f.requester,me WHERE (f.lo=me.uid OR f.hi=me.uid) AND f.requester!=me.uid AND f.state='pending'
  UNION ALL
  SELECT 'team:'||t.id,t.title||' · 小队邀请','social','','action','invited',m.created FROM hub_team_members m JOIN hub_teams t ON t.id=m.team,me WHERE m.uid=me.uid AND m.state='invited'
 ) `;
 const counts={action:0,waiting:0,progress:0,done:0};
 for(const row of db.prepare(source+'SELECT category,COUNT(*) n FROM queue GROUP BY category').all(user.uid))counts[row.category]=row.n;
 return {counts,category,total:counts[category],items:db.prepare(source+'SELECT * FROM queue WHERE category=? ORDER BY updated DESC,id LIMIT 24 OFFSET ?').all(user.uid,category,offset)};
}
