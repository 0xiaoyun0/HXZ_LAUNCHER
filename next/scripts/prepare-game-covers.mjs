// Local asset preparation only; image generation uses the built-in tool separately.
// Usage: node scripts/prepare-game-covers.mjs <JSON manifest of {id,path}> [originals directory]
import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
const manifest=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const order=['runner','blocks','breakout','gomoku','xiangqi','chess','danmaku','maze','fighter','tanks','garden','werewolf','merge','snake','mines'];
if(manifest.length!==15||new Set(manifest.map(v=>v.id)).size!==15||order.some(id=>!manifest.some(v=>v.id===id)))throw Error('Expected one cover per game');
const root=path.resolve('public/media/games');await fs.mkdir(root,{recursive:true});await fs.mkdir('mobile/web/public/media/games',{recursive:true});
let total=0;const contact=[];
for(const [i,id]of order.entries()){
 const item=manifest.find(v=>v.id===id),out=path.join(root,id+'.webp');
 const data=await sharp(item.path).rotate().resize(768,480,{fit:'cover',position:'centre'}).webp({quality:85,effort:6}).toBuffer();
 await fs.writeFile(out,data);await fs.copyFile(out,'mobile/web/public/media/games/'+id+'.webp');total+=data.length;
 if(process.argv[3]){await fs.mkdir(process.argv[3],{recursive:true});await fs.copyFile(item.path,path.join(process.argv[3],id+'.png'));}
 contact.push({input:await sharp(data).resize(320,200).png().toBuffer(),left:i%3*336,top:Math.floor(i/3)*232});
 contact.push({input:Buffer.from(`<svg width="320" height="25"><text x="8" y="18" fill="#425677" font-family="sans-serif" font-size="13">${String(i+1).padStart(2,'0')} · ${id}</text></svg>`),left:i%3*336,top:Math.floor(i/3)*232+202});
}
await fs.mkdir('.runtime/game-review064',{recursive:true});await sharp({create:{width:1008,height:1160,channels:3,background:'#edf3fc'}}).composite(contact).png().toFile('.runtime/game-review064/covers-all.png');
console.log('Prepared 15 desktop/mobile covers, 768×480, '+(total/1048576).toFixed(2)+' MB total');
