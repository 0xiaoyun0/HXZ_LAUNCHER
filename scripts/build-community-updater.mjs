import {build} from 'esbuild';
await build({entryPoints:['apps/community-server/src/update-archive-source.mjs'],bundle:true,platform:'node',format:'esm',target:'node24',outfile:'apps/community-server/src/update-archive.mjs',banner:{js:"import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);"}});
