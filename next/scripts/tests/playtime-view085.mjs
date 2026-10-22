import assert from 'node:assert/strict';
import {dateKey,dayStart,weekStart,calendarView,duration} from '../../packages/playtime/view.mjs';

const DAY=86400000,SHIFT=8*3600000;
let checks=0;
function check(label,run){run();checks++;console.log('PASS '+label);}

check('Beijing dates cross midnight and year boundaries independently of device timezone',()=>{
 assert.equal(dateKey(Date.parse('2026-10-21T15:59:59.999Z')),'2026-10-21');
 assert.equal(dateKey(Date.parse('2026-10-21T16:00:00.000Z')),'2026-10-22');
 assert.equal(dateKey(Date.parse('2026-12-31T16:00:00.000Z')),'2027-01-01');
 assert.equal(dayStart('2026-10-22'),Date.parse('2026-10-21T16:00:00Z'));
 assert.equal(dateKey(dayStart('2024-02-29')),'2024-02-29');
});
check('invalid dates are rejected, including normalized February and zero-day dates',()=>{
 for(const invalid of ['','garbage','2026-02-29','2026-02-30','2026-10-00','2026-13-01','2026-1-01','2026-01-1'])assert.ok(Number.isNaN(dayStart(invalid)),invalid);
 assert.throws(()=>dateKey(NaN),RangeError);
 assert.throws(()=>calendarView([],'2026-02-30'),RangeError);
});
check('week starts at Monday Beijing midnight across all seven weekdays',()=>{
 const monday=dayStart('2026-10-19');
 for(let day=0;day<7;day++)assert.equal(weekStart(monday+day*DAY+12*3600000),monday);
 assert.equal(weekStart(Date.parse('2026-10-18T15:59:59.999Z')),dayStart('2026-10-12'));
 assert.equal(weekStart(Date.parse('2026-10-18T16:00:00.000Z')),monday);
});
check('duration handles zero, invalid values, and seconds/minutes/hours boundaries',()=>{
 for(const value of [0,-1,null,undefined,NaN,'oops',Infinity,-Infinity])assert.equal(duration(value),'0 分钟',String(value));
 for(const [value,expected] of [[1,'1 秒'],[59.9,'59 秒'],[60,'1 分钟'],[3599,'59 分钟'],[3600,'1 小时'],[3660,'1 小时 1 分钟'],[86400,'24 小时']])assert.equal(duration(value),expected);
});
for(const count of [365,364,182,91])check(`${count}-day grid has exact valid bounds and Monday-first seven-day columns`,()=>{
 const end='2026-10-22',start=dayStart(end)-(count-1)*DAY,view=calendarView([],end,count),flat=view.columns.flat(),valid=flat.filter(v=>v.valid);
 assert.equal(valid.length,count);assert.equal(new Set(valid.map(v=>v.date)).size,count);
 assert.equal(valid[0].date,dateKey(start));assert.equal(valid.at(-1).date,end);
 for(const column of view.columns){assert.equal(column.length,7);column.forEach((cell,index)=>{assert.equal(new Date(dayStart(cell.date)+SHIFT).getUTCDay(),(index+1)%7);assert.equal(cell.seconds,0);assert.equal(cell.level,0);});}
 for(const cell of flat)assert.equal(cell.valid,dayStart(cell.date)>=start&&dayStart(cell.date)<=dayStart(end));
 assert.deepEqual(view.summary,{today:0,week:0,month:0,activeDays:0});
});
check('month captions never overlap a column or repeat a transition label',()=>{
 for(const [end,count] of [['2026-03-01',31],['2026-10-22',365]]){
  const view=calendarView([],end,count);assert.equal(new Set(view.months.map(v=>v.column)).size,view.months.length);
  view.months.forEach((month,index)=>{assert.ok(month.column>=0&&month.column<view.columns.length);if(index){assert.ok(month.column>view.months[index-1].column);assert.notEqual(month.label,view.months[index-1].label);}});
 }
 // Jan 30 and Feb 1 share a Monday-first column. Keep a single visible caption.
 const overlap=calendarView([],'2026-03-01',31).months.filter(v=>v.column===0);assert.equal(overlap.length,1);assert.equal(overlap[0].label,'2月');
});
check('summaries include valid today/week/month rows and exclude invalid or future dates',()=>{
 const view=calendarView([
  {date:'2026-10-22',seconds:60},{date:'2026-10-19',seconds:120},{date:'2026-10-18',seconds:180},
  {date:'2026-09-30',seconds:240},{date:'2026-10-23',seconds:999},{date:'2025-01-01',seconds:999},
  {date:'2026-10-00',seconds:777},{date:'2026-10-21',seconds:-1},{date:'2026-10-20',seconds:NaN},
  {date:'2026-10-17',seconds:Infinity},{date:'2026-10-16',seconds:'600'}
 ],'2026-10-22',91);
 assert.deepEqual(view.summary,{today:60,week:180,month:360,activeDays:4});
});
check('heat levels use duration thresholds and cap each day at 24 hours',()=>{
 const samples=[0,1,1799,1800,7199,7200,14399,14400,999999],end='2026-10-22';
 const rows=samples.map((seconds,index)=>({date:dateKey(dayStart(end)-(samples.length-1-index)*DAY),seconds}));
 const cells=calendarView(rows,end,91).columns.flat().filter(v=>rows.some(row=>row.date===v.date));
 assert.deepEqual(cells.map(v=>v.level),[0,1,1,2,2,3,3,4,4]);assert.equal(cells.at(-1).seconds,86400);
});
console.log(`PASS ${checks} playtime presentation checks`);
