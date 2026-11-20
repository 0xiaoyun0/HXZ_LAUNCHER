import fs from 'node:fs/promises';
import path from 'node:path';
import {archive} from './archive.mjs';
const {version}=JSON.parse(await fs.readFile('package.json','utf8')),out=path.resolve('release',version,'plugin-sdk'),stage=path.resolve('.runtime','card-kit');
await fs.mkdir(stage,{recursive:true});await fs.mkdir(out,{recursive:true});
for(const [src,name] of [['docs/首页卡片.md','README.md'],['server/shared/card-plugin.mjs','validate.mjs'],['examples/worlds.hxzplugin','worlds.hxzplugin'],['LICENSE','LICENSE']])await fs.copyFile(src,path.join(stage,name));
await archive(stage,path.join(out,'HXZ-Card-SDK-'+version+'.zip'));
