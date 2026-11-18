import {copyFile} from 'node:fs/promises';
// Engine owns the invitation/TLS protocol; standalone server ships the same code.
await copyFile(new URL('../packages/engine/core/direct-wire.mjs',import.meta.url),new URL('../apps/community-server/src/direct-wire.mjs',import.meta.url));
