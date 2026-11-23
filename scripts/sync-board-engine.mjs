import fs from 'node:fs/promises';
import path from 'node:path';
const source='third_party/maid-board-engine',target='apps/community-server/shared/engines/maid';
await fs.mkdir(target,{recursive:true});
await fs.copyFile(path.join(source,'target/javascript/engine.cjs'),path.join(target,'engine.cjs'));
for(const name of ['driver.cjs','README.md','pom.xml','LICENSE-TouhouLittleMaid-MIT','LICENSE-GPL-2.0','LICENSE-GPL-3.0','LICENSE-Apache-2.0','src'])await fs.cp(path.join(source,name),path.join(target,name),{recursive:true});
for(const name of ['board-games.mjs','board-catalog.mjs'])for(const to of ['apps/community-server/shared','packages/mobile-ui/server/shared'])await fs.copyFile('server/shared/'+name,to+'/'+name);
console.log('Synced upstream board engine, rebuild sources and notices.');
