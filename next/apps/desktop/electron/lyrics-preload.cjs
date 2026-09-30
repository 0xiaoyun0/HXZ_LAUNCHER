const {ipcRenderer}=require('electron');
let latest;
function render(value){latest=value;if(document.readyState==='loading')return;document.getElementById('title').textContent=value.title||'幻想镇 · 桌面歌词';document.getElementById('lyric').textContent=value.text||'暂无同步歌词';document.getElementById('translation').textContent=value.translation||'';document.getElementById('play').textContent=value.playing?'Ⅱ':'▷';document.body.classList.toggle('locked',!!value.locked);document.body.classList.toggle('motion-off',!!value.motionOff);}
ipcRenderer.on('desktop-lyrics:state',(_,value)=>render(value));
window.addEventListener('DOMContentLoaded',()=>{for(const button of document.querySelectorAll('button[data-action]'))button.addEventListener('click',()=>ipcRenderer.send('desktop-lyrics:action',button.dataset.action));if(latest)render(latest);});
