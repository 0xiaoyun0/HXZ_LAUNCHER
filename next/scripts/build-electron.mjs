import {build} from 'esbuild';import fs from 'node:fs/promises';
import {bundleNetwork} from './bundle-network.mjs';
await fs.mkdir('apps/desktop/electron-build',{recursive:true});
await build({plugins:[bundleNetwork],entryPoints:['apps/desktop/electron/main.mjs'],outfile:'apps/desktop/electron-build/main.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',external:['electron'],define:{'import.meta.dirname':'__dirname','import.meta.url':'__bundleUrl'},banner:{js:'const __bundleUrl=require("node:url").pathToFileURL(__filename).href;'},logLevel:'info'});
await fs.copyFile('apps/desktop/electron/preload.cjs','apps/desktop/electron-build/preload.cjs');
