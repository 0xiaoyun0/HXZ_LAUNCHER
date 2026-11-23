import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {filesUnder} from './archive.mjs';
import {verifyUpdateRelease} from './verify-update-release.mjs';
const {version}=JSON.parse(await fs.readFile('package.json','utf8')),dir=path.resolve('release',version);
if(process.argv.includes('--publish'))await verifyUpdateRelease(dir,version);
const files=(await filesUnder(dir)).filter(f=>/^(?:HXZ-3rd-[^/\\]+|android[/\\]HXZ-FCL-[^/\\]+|(?:updates|server|website|extensions|plugin-sdk|game-server)[/\\]HXZ-[^/\\]+)\.(zip|exe|apk)$/.test(f));
files.push(...(await filesUnder(path.join(dir,'game-server'))).filter(f=>/^hxz-community-bridge-.*\.(mcdr|jar)$/.test(f)).map(f=>path.join('game-server',f)));
if(!files.length)throw Error('没有可校验的交付物');
const lines=[];
for(const file of files){const hash=createHash('sha256');for await(const bytes of createReadStream(path.join(dir,file)))hash.update(bytes);lines.push(hash.digest('hex')+'  '+file.split(path.sep).join('/'));}
await fs.writeFile(path.join(dir,'SHA256SUMS.txt'),lines.join('\n')+'\n');
console.log(files.length+' 个交付物已校验');
