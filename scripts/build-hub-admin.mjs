import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['packages/hub/admin.mjs'],outfile:'apps/community-server/public/hub.js',bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,legalComments:'none'});
