// Screen-space gestures emit the same validated actions as the keyboard and touch buttons.
export const GESTURE_HINTS={
 runner:'轻点画面跳跃',blocks:'轻点旋转 · 左右滑动移位 · 下滑松手落下 · 上滑暂存',
 breakout:'左右拖动控制挡板',danmaku:'拖动画面移动 · 手指不必挡住角色',
 fighter:'拖动画面驾驶 · 自动开火',maze:'滑动转向 · 可提前划向下一个路口',
 merge:'上下左右滑动合并 · 每次滑动一步',snake:'滑动转向 · 无需抬起手指',
 mines:'轻点翻开 · 长按插旗 · 点击数字展开',garden:'轻点格子建造 · 选择升级后轻点炮塔'
};
export function createSwipeInput(emit){
 let gesture=null;
 const reset=()=>{gesture=null;};
 return {reset,handle(event,game,width=360){
  if(!['blocks','merge','snake','maze'].includes(game))return false;
  const end=event.type==='pointerup',cancel=['pointercancel','lostpointercapture'].includes(event.type);
  if(event.type==='pointerdown'){
   if(!gesture)gesture={id:event.pointerId,x:event.clientX,y:event.clientY,anchorX:event.clientX,anchorY:event.clientY,time:event.timeStamp,axis:'',moved:false,done:false,last:''};
   return true;
  }
  if(!gesture||gesture.id!==event.pointerId)return true;
  if(cancel){reset();return true;}
  const g=gesture,dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))>10)g.moved=true;
  if(game==='blocks'){
   const unit=Math.max(18,width/12);
   if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=18)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
   if(g.axis==='x'){
    const distance=event.clientX-g.anchorX,steps=Math.min(4,Math.floor(Math.abs(distance)/unit));
    for(let i=0;i<steps;i++)emit(distance>0?'right':'left');
    if(steps)g.anchorX+=Math.sign(distance)*steps*unit;
   }
   if(end){if(g.axis==='y'&&Math.abs(dy)>=28)emit(dy>0?'drop':'hold');else if(!g.moved&&event.timeStamp-g.time<600)emit('rotate');}
  }else if(game==='merge'){
   if(!g.done&&Math.max(Math.abs(dx),Math.abs(dy))>=18){emit(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');g.done=true;}
  }else{
   const ax=event.clientX-g.anchorX,ay=event.clientY-g.anchorY;
   if(Math.max(Math.abs(ax),Math.abs(ay))>=18){const action=Math.abs(ax)>Math.abs(ay)?ax>0?'right':'left':ay>0?'down':'up';if(action!==g.last){emit(action);g.last=action;}g.anchorX=event.clientX;g.anchorY=event.clientY;}
  }
  if(end)reset();return true;
 }};
}
