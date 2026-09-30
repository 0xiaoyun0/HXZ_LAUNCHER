import fs from 'node:fs/promises';
import path from 'node:path';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const common=`幻想镇 NEXT ${version} · 独立便携版

解压完整文件夹后双击「幻想镇 NEXT.exe」，不要只复制 exe。
账号与设置保存在程序旁 profile；本包不附带任何个人账号。
需要沿用旧 NEXT 偏好时：退出新旧两个程序，再把旧目录的整个 profile 复制到新目录。
请保留旧 profile 的备份。游戏文件仍在原来的 .minecraft 路径，不用重新复制整合包。
便携版使用完整包手动升级；需要自动更新请下载对应架构的安装版。游戏与 HXZ UP 更新仍按原设置运行。

本轮：状态栏透明度、截图中的音乐默认布局、聊天表情与历史滚动修复；
歌曲不可播放时自动尝试下一首，整轮失败后停止；MC 联机大厅及正在开放的房间卡片。
已有自定义音乐布局会保留，想应用新版默认请在音乐页选择「卡片 → 恢复默认布局」。

联机大厅由独立的完整「幻想镇社区服务端 0.6.0」提供服务，已包含权限管理，无需另装扩展。
服务端只承载权限、房间目录和连通检测，游戏数据直连房主。
异地网络需要可入站 IPv6，或能自动映射的公网 IPv4；不具备条件时会在开房前提示。
本机加密传输、权限与界面已验证，两处实网和具体游戏整合包仍需验收。
完整步骤见「MC直连大厅.md」。
`;
for(const arch of ['x64','ia32']){
 const target=path.resolve('release',version,'windows-'+arch,'portable');
 const platform=arch==='ia32'?'32 位构建使用 Electron 22.3.27，已在本机 64 位 Windows 运行验证；未做实体 Windows 7 验收。启动器兼容不代表所有新版 Minecraft/Java 都支持旧系统。':'64 位构建使用 Electron 44。请按系统架构选择完整对应的便携包。';
 await fs.writeFile(path.join(target,'使用说明.txt'),common+platform);
 await fs.copyFile('docs/MC直连大厅.md',path.join(target,'MC直连大厅.md'));
}
console.log('Prepared portable instructions; package:server produces the single complete community server.');
