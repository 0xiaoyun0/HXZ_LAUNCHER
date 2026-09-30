import fs from 'node:fs/promises';
import path from 'node:path';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const common=`幻想镇 NEXT ${version} · 独立便携版

解压完整文件夹后双击「幻想镇 NEXT.exe」，不要只复制 exe。
账号与设置保存在程序旁 profile；本包不附带任何个人账号。
需要沿用旧 NEXT 偏好时：退出新旧两个程序，再把旧目录的整个 profile 复制到新目录。
请保留旧 profile 的备份。游戏文件仍在原来的 .minecraft 路径，不用重新复制整合包。
便携版使用完整包手动升级；需要自动更新请下载对应架构的安装版。游戏与 HXZ UP 更新仍按原设置运行。

本轮修复 Minecraft 26.2 单人世界自动开放联机，兼容原有版本；歌词采用独立透明桌面窗口，支持拖动、锁定和可选后台播放。
保留收件箱、@、活动奖励、个人网易云授权与默认服在线名单。
联机优先直连或已有虚拟局域网，无法直连时可走社区管理员启用的限速中继，默认每房间 256 KB/s。
社区部署只使用一个完整社区服务端包，保留原 data 和 .env，先备份再升级。
完整步骤见「MC直连大厅.md」。
`;
for(const arch of ['x64','ia32']){
 const target=path.resolve('release',version,'windows-'+arch,'portable');
 const platform=arch==='ia32'?'32 位构建使用 Electron 22.3.27，已在本机 64 位 Windows 运行验证；未做实体 Windows 7 验收。启动器兼容不代表所有新版 Minecraft/Java 都支持旧系统。':'64 位构建使用 Electron 44。请按系统架构选择完整对应的便携包。';
 await fs.writeFile(path.join(target,'使用说明.txt'),common+platform);
 await fs.copyFile('docs/MC直连大厅.md',path.join(target,'MC直连大厅.md'));
}
console.log('Prepared portable instructions; package:server produces the single complete community server.');
