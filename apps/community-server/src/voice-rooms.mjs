export function createVoiceRooms({db,auth,admin,body,send,broadcast,onChange}){
  db.exec('CREATE TABLE IF NOT EXISTS voice_room_config(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL,revision INTEGER NOT NULL)');
  const initial=[{id:'lobby',name:'旅人休息室'},{id:'survival',name:'原版生存群组'},{id:'mod-1',name:'模组一服'},{id:'mod-2',name:'模组二服'},{id:'music',name:'一起听歌',kind:'music'}].map(r=>({...r,capacity:20,enabled:true,kind:r.kind||'voice'}));
  db.prepare('INSERT OR IGNORE INTO voice_room_config VALUES(1,?,1)').run(JSON.stringify(initial));
  const config=()=>{const row=db.prepare('SELECT * FROM voice_room_config WHERE id=1').get();return {rooms:JSON.parse(row.value),revision:row.revision};};
  const rooms=()=>config().rooms.filter(r=>r.enabled);
  async function route(req,res,url){
    if(!['/api/voice-config','/api/admin/voice-rooms'].includes(url.pathname))return false;
    const management=url.pathname.startsWith('/api/admin/');management?admin(req):auth(req);
    if(req.method==='GET'){send(res,200,{...(management?config():{rooms:rooms()}),transport:'ws-opus-v1',roomLimit:Math.max(2,...rooms().map(r=>r.capacity)),codec:'opus',sampleRate:48000});return true;}
    if(!management||req.method!=='PUT')throw Error('不支持的语音设置操作');const value=await body(req);
    if(!Array.isArray(value.rooms)||!value.rooms.length||value.rooms.length>24)throw Error('请设置 1–24 个房间');
    const ids=new Set();for(const room of value.rooms){
      if(!/^[a-z0-9][a-z0-9-]{0,40}$/.test(room.id)||ids.has(room.id)||typeof room.name!=='string'||!room.name.trim()||room.name.length>40||!Number.isInteger(room.capacity)||room.capacity<2||room.capacity>50||typeof room.enabled!=='boolean'||!['voice','music'].includes(room.kind))throw Error('房间标识需唯一，名称不超过 40 字，人数为 2–50');ids.add(room.id);
    }
    const normalized=value.rooms.map(r=>({id:r.id,name:r.name.trim(),capacity:r.capacity,enabled:r.enabled,kind:r.kind}));
    if(!db.prepare('UPDATE voice_room_config SET value=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(normalized),value.revision).changes)throw Error('房间已被其他管理员修改，请刷新');
    onChange?.(rooms());broadcast({type:'voice-rooms',rooms:rooms()});send(res,200,config());return true;
  }
  return {rooms,route};
}
