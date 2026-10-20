# 幻想镇 NEXT · 0.8.2

幻想镇 Windows 启动器、Android 社区客户端及独立服务器官网。

## 使用

- Windows x64 / ia32：推荐下载 HXZ-Launcher-0.8.2-x64.exe / HXZ-Launcher-0.8.2-ia32.exe 安装器，可选目录并创建快捷方式。也保留 portable.zip，完整解压后运行「幻想镇 NEXT.exe」。
- Android：安装 HXZ-Community-Android-0.8.2-80200.apk，支持 Android 10 及以上。沿用正式应用身份和签名，可覆盖旧版，保留数据。Minecraft 游戏组件为可选的独立 ARM64 APK。
- 安装版沿用旧正式版的 %APPDATA%/幻想镇启动器，首次启动备份旧设置；便携版保存在程序旁 profile。迁移便携版时先退出程序并备份，再复制整个 profile 到对应的数据目录。游戏仍使用原 .minecraft，不必重复复制。
- 安装版支持 GitHub 与备用源的签名自动更新，可在设置关闭；正式 0.5.2 及后续安装版可通过原通道升级。便携版仍使用完整包手动升级。
- 管理员只需下载一个 HXZ-Community-0.8.2-windows-x64.zip 完整社区服务端。首次升级备份并保留 data 与 .env，使用新的启动脚本；之后可使用后台签名更新。update.zip 是更新程序使用的归档，不是第二个服务端。详见 [部署与升级](docs/0.8.2使用与升级.md)。

## 功能

桌面端支持游戏实例、安装下载、Java 管理、HXZ UP 更新、任务详情与诊断、皮肤站账号、完整社区、二十款小游戏、积分商城和音乐播放器。页面采用可拖动、缩放、隐藏的卡片，支持内容自动尺寸、网格对齐、主题、背景与动效偏好。

0.8.2 新增骰子战术与航线补给肉鸽，拓展原有三款肉鸽的构筑变化，清理旧通知、收藏与跨页卡片的退役入口。LINKING 新增第三值夜观察委托，承接两卷调查，保留原章和既有进度。实际剧情开放以社区发布状态为准。

Android 重构手机导航、账号设置、语音与音乐卡片，统一图标及窄屏布局。以社区为中心，提供聊天、语音、论坛、蓝图、公告、账号、积分、小游戏、音乐、冒险家协会、背包和 LINKING。可选游戏组件支持三服安装及启动；该功能为实验性接入，沿用已发布的游戏组件 70003，大型 PC 模组与部分 GPU 可能不兼容。详见 [Android 说明](mobile/README.md) 和 [游戏组件说明](mobile/game-engine/README.md)。

MC 直连大厅使用社区验证开房权限、展示目录及探测连通性，游戏优先直连房主或已有虚拟局域网，不可达时尝试 P2P；社区只交换授权、目录和握手，不传输 MC 游戏数据。完整社区服务端已集成直连模块，与客户端分开部署。使用条件和边界见 [联机说明](docs/MC直连大厅.md)。

MCDR 与 NeoForge 游戏服务端桥原样复用已发布的 0.8.0 附件，保留原文件名与内部版本；已有部署无需为本次客户端更新重装桥。

## 源码与构建

本项目在主仓库的 next 目录中，旧客户端和社区服务源码保留在仓库根目录。

| 目录 | 内容 |
| --- | --- |
| apps/desktop | React 桌面界面与 Electron 桥接 |
| apps/linking | LINKING 三维档案与管理编辑器 |
| packages/engine | 游戏、下载、Java、音频和直连业务 |
| packages/community、packages/mobile-ui | 社区模块与共享游戏规则 |
| mobile | Android 原生容器与 Vue 社区界面 |
| mobile/game-engine | 可选原生游戏组件的适配源码与构建说明 |
| apps/community-server | 完整社区服务端、网页后台及直连权限 |
| community-extension | 旧社区的可选增量迁移源码，新完整包无需使用 |
| apps/website | 独立官网与内容管理后台 |

Node.js 22.12+（社区服务端需要 24+），在本项目目录运行 npm ci。首次构建 LINKING 还需在 apps/linking 执行 npm ci，再从本项目目录运行 npm run linking:build；它同时生成桌面、安卓和社区后台的活动资源。

| 操作 | 命令 |
| --- | --- |
| 类型检查 | npm run typecheck |
| LINKING 构建 | npm run linking:build |
| 桌面开发 | npm run desktop:dev |
| 桌面构建 | npm run desktop:build |
| 桌面运行 | npm run desktop:start |
| Windows x64 封包 | npm run package:desktop |
| Windows ia32 封包 | npm run package:legacy |
| Windows 双架构安装器 | npm run package:installers |
| 完整社区服务端 | npm run package:server |
| 服务端更新归档与清单 | node scripts/package-community-update.mjs |
| 官网构建 / 运行 | npm run website:build / npm run website:start |

Windows 封包需在 .runtime/electron 放置 Electron 44.3.0 x64，在 .runtime/electron-ia32 放置 Electron 22.3.27 ia32 的完整运行时；随后执行对应封包命令。输出按 release/版本/windows-x64、windows-ia32、android、server、source 分类。构建安装器使用 electron-builder 26.17.0 与 NSIS；安装版保持原 appId、产品名与卸载身份，不删除用户数据。完整服务端需先在 apps/community-server 安装依赖，并使用 Windows x64 Node.js 24+ 打包。原生扩展随构建脚本打包。棋类引擎源码和许可在 third_party/maid-board-engine，使用 JDK 17+ 与 Maven 重建后运行 node scripts/sync-board-engine.mjs；服务端执行无需 Java。JDK 21 可编译 resources/direct-lobby 中的 Java 助手。Android 构建见其独立说明；私钥、账号和生成物不提交源码。

卡片开发须遵循 [UI 规范](docs/UI卡片规范.md)。本轮功能见 [0.8.2 发布说明](docs/0.8.2发布说明.md)，部署及验证范围见 [部署与验收](docs/0.8.2使用与升级.md)。

## 验证边界

本轮对退出恢复、更新重启保护、实例文件管理、LINKING 任务与奖励，以及受影响的桌面和安卓页面进行定向回归；Windows 两架构另检查最终文件包的原生启动与 IPC。验证范围及升级注意事项见 [使用与升级](docs/0.8.2使用与升级.md)。浏览器界面检查不等于安卓实机验收，ia32 在当前 Windows 运行也不等于实体 Windows 7 验收；真实 Minecraft 退出和跨运营商 NAT 仍需对应环境验证。
