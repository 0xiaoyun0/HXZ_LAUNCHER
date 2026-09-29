import {ref} from 'vue';

const stack=[];
export const overlayCount=ref(0);
export function registerOverlay(id,close){
  unregisterOverlay(id);
  stack.push({id,close});overlayCount.value=stack.length;
  return stack.length;
}
export function unregisterOverlay(id){const i=stack.findIndex(item=>item.id===id);if(i>=0)stack.splice(i,1);overlayCount.value=stack.length;}
export const isTopOverlay=id=>stack[stack.length-1]?.id===id;
export function closeTopOverlay(){const top=stack[stack.length-1];if(!top)return false;top.close();return true;}
