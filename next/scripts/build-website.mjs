import {build} from 'esbuild';
await build({entryPoints:['apps/website/src/entry-server.tsx'],bundle:true,platform:'node',format:'esm',target:'node22',outfile:'apps/website/server/render.mjs',packages:'external',jsx:'automatic'});
