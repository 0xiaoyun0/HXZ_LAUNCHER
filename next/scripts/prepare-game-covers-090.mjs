import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {GAMES} from '../server/shared/arcade-engine.mjs';
import {BOARD_GAMES} from '../server/shared/board-catalog.mjs';
import {WEREWOLF} from '../packages/games/werewolf-ui.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=[...GAMES,...BOARD_GAMES,WEREWOLF];
const destinations=[path.join(root,'public/media/games'),path.join(root,'mobile/web/public/media/games')];

const safe=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const escapeColor=value=>/^#[0-9a-f]{6}$/i.test(value||'')?value:'#6d8cd2';
for(const item of catalog){
  const id=item.id,sourceFile=path.join(destinations[0],`${id}.webp`);
  const base=await sharp(await fs.readFile(sourceFile)).resize(768,480,{fit:'cover',position:'centre'}).toBuffer();
  const color=escapeColor(item.color),title=safe(item.name),tag=safe(item.tag||'幻想镇小游戏');
  const overlay=Buffer.from(`<svg width="768" height="480" viewBox="0 0 768 480">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07131d" stop-opacity=".08"/><stop offset=".7" stop-color="#07131d" stop-opacity=".22"/><stop offset="1" stop-color="#07131d" stop-opacity=".94"/></linearGradient><linearGradient id="footer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07131d" stop-opacity=".05"/><stop offset=".32" stop-color="#07131d" stop-opacity=".74"/><stop offset=".55" stop-color="#07131d" stop-opacity=".94"/><stop offset="1" stop-color="#07131d" stop-opacity=".96"/></linearGradient></defs>
    <rect width="768" height="480" fill="url(#shade)"/>
    <rect x="0" y="244" width="768" height="236" fill="url(#footer)"/>
    <rect x="24" y="24" width="720" height="432" rx="22" fill="none" stroke="#ffffff" stroke-opacity=".42" stroke-width="2"/>
    <rect x="42" y="40" width="154" height="30" rx="15" fill="${color}" fill-opacity=".94"/>
    <text x="119" y="61" text-anchor="middle" font-family="Segoe UI,Microsoft YaHei,sans-serif" font-size="13" font-weight="700" letter-spacing="1.4" fill="#11202a">HXZ · ARCADE</text>
    <rect x="42" y="405" width="64" height="4" rx="2" fill="${color}"/>
    <text x="42" y="442" font-family="Segoe UI,Microsoft YaHei,sans-serif" font-size="31" font-weight="700" fill="#ffffff">${title}</text>
    <text x="42" y="467" font-family="Segoe UI,Microsoft YaHei,sans-serif" font-size="14" fill="#e5edf2">${tag}</text>
  </svg>`);
  const cover=await sharp(base).composite([{input:overlay}]).webp({quality:88,effort:6}).toBuffer();
  for(const destination of destinations)await fs.writeFile(path.join(destination,`${id}.webp`),cover);
}
console.log(`Generated ${catalog.length} unified 768x480 WebP covers in ${destinations.length} bundles.`);
