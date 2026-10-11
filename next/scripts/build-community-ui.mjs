import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:{guild:'packages/guild/ui.mjs','image-upload':'packages/community/image-upload.mjs'},bundle:true,format:'esm',target:'chrome108',outdir:'apps/community-server/public'});
await fs.copyFile('packages/guild/style.css','apps/community-server/public/guild.css');
console.log('Community shared UI built');
