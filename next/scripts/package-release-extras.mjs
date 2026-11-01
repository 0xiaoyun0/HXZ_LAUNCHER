import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import yazl from 'yazl';
import {validatePluginPackage} from '../server/shared/plugin-package.mjs';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version,root=path.resolve('release',version);
async function zip(folder,file){const archive=new yazl.ZipFile(),writing=pipeline(archive.outputStream,createWriteStream(file));async function walk(dir,rel=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Linked release input');if(['.env','data','node_modules','__pycache__'].includes(entry.name)||entry.name.endsWith('.pyc'))continue;const name=rel+entry.name;if(entry.isDirectory())await walk(path.join(dir,entry.name),name+'/');else archive.addFile(path.join(dir,entry.name),name);}}await walk(folder);archive.end();await writing;}
const games=path.join(root,'game-server'),kit=path.join(games,'Windows安装材料'),sdk=path.join(root,'plugin-sdk');
await fs.mkdir(path.join(kit,'components'),{recursive:true});await fs.mkdir(sdk,{recursive:true});
await zip(path.resolve('integrations/game-bridge/mcdr'),path.join(games,`hxz-community-bridge-${version}-mcdr.mcdr`));
const jar=`hxz-community-bridge-${version}-neoforge-1.21.1.jar`;
await fs.copyFile(path.join('integrations/game-bridge/neoforge/build/libs',jar),path.join(games,jar));
for(const file of [jar,`hxz-community-bridge-${version}-mcdr.mcdr`])await fs.copyFile(path.join(games,file),path.join(kit,'components',file));
for(const file of ['install-windows.ps1'])await fs.copyFile(path.join('integrations/game-bridge',file),path.join(kit,file));
await fs.cp('resources/hxzre',path.join(kit,'hxzre'),{recursive:true});await fs.copyFile('integrations/game-bridge/start-origin.ps1',path.join(kit,'hxzre/start-origin.ps1'));
await fs.copyFile('scripts/verify-community.ps1',path.join(kit,'verify-community.ps1'));
await fs.copyFile(`docs/${version}Windows服务器安装.md`,path.join(kit,'安装说明.md'));
await fs.writeFile(path.join(kit,'survival-config.example.json'),JSON.stringify({enabled:false,community:'https://qqbot.hxzmc.top',server:'survival',token:'填写原版服的独立游戏桥令牌',server_directory:'server',world:'world',game_version:'26.2',chat:false,whitelist:false,interval:5},null,2));
for(const server of ['mod-1','mod-2'])await fs.writeFile(path.join(kit,server+'.example.properties'),`enabled=false\ncommunity=https://qqbot.hxzmc.top\nserver=${server}\ntoken=REPLACE_WITH_THIS_SERVER_BRIDGE_TOKEN\nchat=false\nwhitelist=false\n`);
await zip(kit,path.join(games,`HXZ-MC-Server-Kit-${version}-windows.zip`));
const sample={format:'hxz-plugin-v1',manifest:{id:'hxz-example-banner',name:'示例：启动器便签',version:'1.0.0',apiVersion:1,author:'幻想镇',description:'演示完整权限插件的主进程、界面入口与停用清理；增加一个可关闭的示例便签。',permissions:['launcher.full'],platforms:['win32-x64','win32-ia32'],main:'main.cjs',renderer:'renderer.js',style:'style.css'},files:{
 'main.cjs':'exports.activate=api=>{ console.info("["+api.id+"] activated"); return ()=>console.info("["+api.id+"] disposed"); };\n',
 'renderer.js':'const box=document.createElement("aside");box.className="hxz-example-banner";const text=document.createElement("span");text.textContent="插件 API 1 示例已启用";const close=document.createElement("button");close.textContent="关闭";close.onclick=()=>box.remove();box.append(text,close);document.body.append(box);api.onDispose(()=>box.remove());\n',
 'style.css':'.hxz-example-banner{position:fixed;bottom:22px;right:22px;z-index:99999;display:flex;gap:16px;align-items:center;padding:14px 18px;color:#fff;background:#182f42;border:1px solid #71c1f0;border-radius:14px;box-shadow:0 8px 36px #0004}.hxz-example-banner button{cursor:pointer;color:#fff;background:transparent;border:1px solid #aac;border-radius:8px;padding:4px 8px}\n'
}};
const validated=validatePluginPackage(sample);await fs.writeFile(path.join(sdk,'hxz-example-banner-1.0.0.hxzplugin'),validated.serialized);
const example=path.join(sdk,'example');await fs.mkdir(example,{recursive:true});await fs.writeFile(path.join(example,'manifest.json'),JSON.stringify(sample.manifest,null,2));for(const [name,source]of Object.entries(sample.files))await fs.writeFile(path.join(example,name),source);
await fs.copyFile('server/shared/plugin-package.mjs',path.join(sdk,'plugin-package.mjs'));
await fs.copyFile(`docs/${version}插件规范.md`,path.join(sdk,'插件规范.md'));
await fs.writeFile(path.join(sdk,'build-plugin.mjs'),`import fs from 'node:fs/promises';import path from 'node:path';import {validatePluginPackage} from './plugin-package.mjs';\nconst root=path.resolve(process.argv[2]||'example'),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),files={};async function walk(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Linked plugin input');if(['manifest.json','node_modules','.git'].includes(e.name))continue;const name=rel+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),name+'/');else files[name]=await fs.readFile(path.join(dir,e.name),'utf8');}}await walk(root);const p=validatePluginPackage({format:'hxz-plugin-v1',manifest,files}),out=path.resolve(manifest.id+'-'+manifest.version+'.hxzplugin');await fs.writeFile(out,p.serialized);console.log(out+'  sha256='+p.sha256);\n`);
await fs.writeFile(path.join(sdk,'README.md'),'# 插件开发包\n\n在启动器登录后进入「设置 → 插件与市场」，导入示例 .hxzplugin，确认完整权限后启用。修改 example 目录中的清单和代码，使用 Node.js 18+ 执行 `node build-plugin.mjs example` 生成包；发布新版本须修改版本号。提交社区市场后由管理员审核公开。详细接口见插件规范.md。\n');
await zip(sdk,path.join(root,`HXZ-Plugin-SDK-${version}.zip`));
for(const name of [`${version}发布说明.md`,`${version}Windows服务器安装.md`,`${version}插件规范.md`])await fs.copyFile(path.join('docs',name),path.join(root,name));
await fs.writeFile(path.join(root,'README.md'),`# 幻想镇 ${version} 发布目录\n\n沿用 0.8 的更新结构。\n\n| 目录 | 内容 |\n| --- | --- |\n| windows-x64 | Windows 64 位安装包与便携版 |\n| windows-ia32 | Windows 32 位兼容安装包与便携版 |\n| android | Android APK 与签名发布信息 |\n| server | 社区完整包、在线更新包、解压目录 |\n| game-server | 原版 MCDR、两个 NeoForge 1.21.1 组件与 Windows 安装材料 |\n| plugin-sdk | 插件规范、示例和包生成器 |\n| updates | 延续原签名密钥的桌面、Android、社区与游戏运行时清单 |\n| source | 当前版本源码 |\n\n社区先阅读 [Windows 部署](${version}Windows服务器安装.md)，停止旧进程后迁移完整 data 和 .env，在后台诊断核对运行版本及目录。GitHub 同时提供各平台独立资产；游戏服下载 HXZ-MC-Server-Kit-${version}-windows.zip。真实服务器与 Android 真机的上线验收需要安装后完成。\n`);
console.log('MC kit, plugin SDK and release instructions created:',root);
