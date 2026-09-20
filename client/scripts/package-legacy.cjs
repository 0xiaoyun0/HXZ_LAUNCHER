// Build after the normal renderer compilation. Never change the modern Electron runtime.
const fs = require('node:fs/promises'), path = require('node:path');
const {createRequire} = require('node:module');
const root=path.resolve(__dirname,'..');
const tools=path.resolve(process.env.HXZ_LEGACY_TOOLS || path.join(root,'tools/legacy'));
const runtime=path.resolve(process.env.HXZ_LEGACY_ELECTRON || path.join(tools,'electron'));
const legacyRequire=createRequire(path.join(tools,'package.json'));
const runtimeRequire=createRequire(path.join(root,'src-electron/package.json'));
async function main(){
  if((await fs.readFile(path.join(runtime,'version'),'utf8')).trim()!=='22.3.27')throw Error('Expected Electron 22.3.27 ia32 runtime');
  const app=path.join(root,'dist/electron/LegacyApp');
  await fs.cp(path.join(root,'dist/electron/UnPackaged'),app,{recursive:true});
  await legacyRequire('esbuild').build({
    stdin:{contents:`require(${JSON.stringify(path.join(__dirname,'legacy-polyfills.cjs'))});require(${JSON.stringify(path.join(app,'electron-main.js'))});`,resolveDir:root},
    outfile:path.join(app,'electron-main.cjs'),bundle:true,platform:'node',target:'node16',format:'cjs',
    external:['electron'],nodePaths:[path.join(tools,'node_modules'),path.join(root,'node_modules')],
    define:{'import.meta.url':'__bundleUrl','import.meta.dirname':'__dirname'},
    banner:{js:'const __bundleUrl = require("node:url").pathToFileURL(__filename).href;'}
  });
  const pkg=JSON.parse(await fs.readFile(path.join(app,'package.json'),'utf8'));
  pkg.main='electron-main.cjs';pkg.type='commonjs';pkg.dependencies={};
  await fs.writeFile(path.join(app,'package.json'),JSON.stringify(pkg,null,2));
  const {build,Platform,Arch}=runtimeRequire('electron-builder');
  await build({projectDir:root,targets:Platform.WINDOWS.createTarget(['nsis','dir'],Arch.ia32),publish:'never',config:{
    appId:'top.hxzmc.launcher',productName:'幻想镇启动器',electronDist:runtime,electronVersion:'22.3.27',npmRebuild:false,
    directories:{app,output:path.join(root,'dist/electron/LegacyPackaged')},artifactName:'HXZ-Launcher-${version}-${arch}.${ext}',
    files:['**/*','!electron-main.js','!**/*.map'],extraResources:['app-update.yml','hxzup','installer'].map(name=>({from:path.join(root,'resources',name),to:name})),
    win:{icon:path.join(app,'electron-assets/icons/icon.ico')},nsis:{oneClick:false,allowToChangeInstallationDirectory:true,perMachine:false,createDesktopShortcut:true,createStartMenuShortcut:true,runAfterFinish:true}
  }});
}
main().catch(error=>{console.error(error);process.exitCode=1});
