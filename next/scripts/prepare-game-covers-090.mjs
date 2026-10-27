import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ids=['alchemy','orbit','rhythm','supply'];
const destinations=[path.join(root,'public/media/games'),path.join(root,'mobile/web/public/media/games')];

for(const id of ids){
  const source=await fs.readFile(path.join(destinations[0],`${id}.svg`));
  const cover=await sharp(source)
    .resize(768,480,{fit:'cover',position:'centre'})
    .webp({quality:86,effort:6})
    .toBuffer();
  for(const destination of destinations)await fs.writeFile(path.join(destination,`${id}.webp`),cover);
}
console.log(`Generated ${ids.length} unified 768x480 WebP covers in ${destinations.length} bundles.`);
