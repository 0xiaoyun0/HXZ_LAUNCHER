// Compile the production bridge with optimization and exercise the same real
// GLX dispatch as the shipped library. Counters are deterministic; host_us is
// observational only and must never be interpreted as Android FPS.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
process.argv.push('--optimized');
await import('./android-ng-render084.mjs');
