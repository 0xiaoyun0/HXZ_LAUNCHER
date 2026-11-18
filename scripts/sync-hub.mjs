import {copyFile,mkdir} from 'node:fs/promises';
import './build-hub-admin.mjs';
await mkdir(new URL('../apps/community-server/shared/',import.meta.url),{recursive:true});
await copyFile(new URL('../server/shared/minecraft-connection.mjs',import.meta.url),new URL('../apps/community-server/shared/minecraft-connection.mjs',import.meta.url));
await copyFile(new URL('../server/shared/hub-catalog.mjs',import.meta.url),new URL('../apps/community-server/shared/hub-catalog.mjs',import.meta.url));
await copyFile(new URL('../server/shared/hub-visibility.mjs',import.meta.url),new URL('../apps/community-server/shared/hub-visibility.mjs',import.meta.url));
await copyFile(new URL('../server/shared/production-plan.mjs',import.meta.url),new URL('../apps/community-server/shared/production-plan.mjs',import.meta.url));
await copyFile(new URL('../server/shared/bilibili.mjs',import.meta.url),new URL('../apps/community-server/shared/bilibili.mjs',import.meta.url));
await copyFile(new URL('../packages/ui/file-input.css',import.meta.url),new URL('../apps/community-server/public/file-input.css',import.meta.url));

await copyFile(new URL('../server/shared/report-sanitize.mjs',import.meta.url),new URL('../apps/community-server/shared/report-sanitize.mjs',import.meta.url));

await copyFile(new URL('../server/shared/plugin-package.mjs',import.meta.url),new URL('../apps/community-server/shared/plugin-package.mjs',import.meta.url));

await copyFile(new URL('../server/shared/hxzre-tunnel.mjs',import.meta.url),new URL('../apps/community-server/shared/hxzre-tunnel.mjs',import.meta.url));

await copyFile(new URL('../server/shared/minecraft-proxy.mjs',import.meta.url),new URL('../apps/community-server/shared/minecraft-proxy.mjs',import.meta.url));
