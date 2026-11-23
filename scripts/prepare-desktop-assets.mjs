import fs from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve('.runtime','desktop-public');
await fs.mkdir(path.join(target,'media/brand'),{recursive:true});
await fs.copyFile('public/media/brand/launcher.svg',path.join(target,'media/brand/launcher.svg'));
for(const name of ['hero.webp','adventure.webp'])await fs.copyFile(path.join('public/media',name),path.join(target,'media',name));
await fs.cp('public/media/games',path.join(target,'media/games'),{recursive:true});
// This directory is generated for the base launcher only.
const legacy=path.join(target,'linking');
if(path.dirname(legacy)!==target)throw Error('Invalid desktop staging directory');
await fs.rm(legacy,{recursive:true,force:true});
