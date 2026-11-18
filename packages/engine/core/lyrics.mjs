/** Parse ordinary LRC, including multiple timestamps, offset and translated lines. */
export function parseLyrics(text='') {
 const offset=Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000,rows=[];
 for(const line of String(text).slice(0,400000).split(/\r?\n/)){
  const times=[...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];if(!times.length)continue;
  const value=line.replace(/\[[^\]]*\]/g,'').trim();if(!value)continue;
  for(const m of times){const time=Math.max(0,Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0'))+offset);if(Number.isFinite(time)&&Number(m[2])<60)rows.push({time,text:value.slice(0,800)});}
 }
 return rows.sort((a,b)=>a.time-b.time).slice(0,4000);
}
export function lyricLines(original,translation){const rows=parseLyrics(original),translated=parseLyrics(translation);return rows.map(row=>({...row,translation:translated.find(v=>Math.abs(v.time-row.time)<.08)?.text||''}));}
