import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {build} from 'esbuild';
import yazl from 'yazl';

const {version} = JSON.parse(await fs.readFile('package.json', 'utf8'));
const dir = path.resolve('release', version, 'server-tools');
await fs.mkdir(dir, {recursive:true});
const target = path.join(dir, 'HXZ-Community-' + version + '-connection-repair.zip');
const bundle = await build({entryPoints:['scripts/repair-community-connection.mjs'], bundle:true,
  platform:'node', target:'node24', format:'esm', charset:'utf8', write:false});
const zip = new yazl.ZipFile();
const writing = pipeline(zip.outputStream, createWriteStream(target));
const add = (name, data) => zip.addBuffer(Buffer.from(data), name, {mtime:new Date('2000-01-01T12:00:00Z')});

function windowsEntry(action) {
  return ['@echo off', 'setlocal DisableDelayedExpansion', 'chcp 65001 >nul',
    'set "serverDir=%~dp0."', 'if not "%~1"=="" set "serverDir=%~f1"',
    'set "nodePath=%serverDir%\\node.exe"', 'if not exist "%nodePath%" set "nodePath=node.exe"',
    '"%nodePath%" "%~dp0community-connection.mjs" ' + action + ' "%serverDir%"',
    'set "result=%ERRORLEVEL%"', 'echo.', 'pause', 'exit /b %result%', ''].join('\r\n');
}
add('修复社区连接.bat', windowsEntry('repair'));
add('检查社区连接.bat', windowsEntry('check'));
add('community-connection.mjs', bundle.outputFiles[0].contents);
const guide = await fs.readFile('apps/community-server/docs/社区连接修复.md', 'utf8');
add('使用说明.txt', guide.replace(/^#+ /gm, '').replace(/^```[^\r\n]*\r?\n/gm, '').replaceAll('`', ''));
zip.end();
await writing;
console.log(target);
console.log('SHA-256 ' + createHash('sha256').update(await fs.readFile(target)).digest('hex'));
