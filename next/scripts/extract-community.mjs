import fs from 'node:fs/promises';
let src=await fs.readFile('E:/hxz_la/work/v051/client/src/lib/community.ts','utf8');
src=src.replace('import { reactive, watch } from "vue";','import {proxy as reactive} from "valtio";\nimport {watchSettings as watch} from "../../apps/desktop/src/model";').replace('from "./launcher"','from "../../apps/desktop/src/model"');
await fs.writeFile('packages/community/client.ts',src);
for(const name of ['arcade-renderer.mjs','arcade-expanded-renderer.mjs']){let text=await fs.readFile('E:/hxz_la/work/v051/client/src/lib/'+name,'utf8');text=text.replaceAll('../../../server/shared/','../../server/shared/');await fs.writeFile('packages/games/'+name,text);}
