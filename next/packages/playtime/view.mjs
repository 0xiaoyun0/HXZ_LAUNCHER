// Presentation-only helpers shared by the desktop and Android calendars.
// All dates use UTC+8 rather than the device's timezone.
const DAY=86400000,SHIFT=8*3600000;
export const dateKey=(time=Date.now())=>new Date(time+SHIFT).toISOString().slice(0,10);
export function dayStart(date){const time=Date.parse(date+'T00:00:00+08:00');return Number.isFinite(time)&&dateKey(time)===date?time:NaN;}
export function duration(value){const seconds=Math.max(0,Math.floor(Number.isFinite(Number(value))?Number(value):0));if(!seconds)return '0 分钟';if(seconds<60)return seconds+' 秒';const minutes=Math.floor(seconds/60);return minutes<60?minutes+' 分钟':Math.floor(minutes/60)+' 小时'+(minutes%60?' '+minutes%60+' 分钟':'');}
export function clock(time){return new Date(time).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,hour:'2-digit',minute:'2-digit'});}
export function weekStart(time=Date.now()){const day=dayStart(dateKey(time)),weekday=new Date(day+SHIFT).getUTCDay();return day-((weekday+6)%7)*DAY;}
export function calendarView(rows=[],end=dateKey(),count=182){
 const today=dayStart(end),start=today-(count-1)*DAY,offset=(new Date(start+SHIFT).getUTCDay()+6)%7,gridStart=start-offset*DAY;
 const values=new Map(rows.filter(v=>Number.isFinite(dayStart(v.date))&&Number.isFinite(v.seconds)&&v.seconds>=0).map(v=>[v.date,Math.min(86400,v.seconds)]));
 const columns=[],months=[];let month='';
 for(let time=gridStart;time<=today;time+=7*DAY){const column=[];for(let n=0;n<7;n++){const stamp=time+n*DAY,date=dateKey(stamp),seconds=values.get(date)||0,valid=stamp>=start&&stamp<=today;column.push({date,seconds,valid,level:!seconds?0:seconds<1800?1:seconds<7200?2:seconds<14400?3:4});if(valid&&date.slice(0,7)!==month){month=date.slice(0,7);if(months.at(-1)?.column===columns.length)months.pop();months.push({column:columns.length,label:Number(date.slice(5,7))+'月'});}}columns.push(column);}
 const currentWeek=weekStart(today),currentMonth=end.slice(0,7),validRows=[...values].filter(([date])=>date>=dateKey(today-364*DAY)&&date<=end);
 return {columns,months:months.filter((m,i)=>(months[i+1]?.column??columns.length)-m.column>=3),summary:{today:values.get(end)||0,week:validRows.filter(([date])=>dayStart(date)>=currentWeek).reduce((n,[,v])=>n+v,0),month:validRows.filter(([date])=>date.startsWith(currentMonth)).reduce((n,[,v])=>n+v,0),activeDays:validRows.filter(([date,v])=>dayStart(date)>=start&&v>0).length}};
}
