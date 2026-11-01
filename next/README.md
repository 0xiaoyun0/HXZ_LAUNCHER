# 幻想镇 NEXT · 0.9.2

Windows 启动器、Android 社区客户端及独立社区服务端。

[正式发布](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.9.2) · [发布说明](docs/0.9.2发布说明.md) · [Windows 三服安装](docs/0.9.2Windows服务器安装.md) · [插件规范](docs/0.9.2插件规范.md) · [验证记录](docs/0.9.2验证记录.md)

Windows 提供 x64 / ia32 安装器与便携版。Android APK 为 0.9.2 / 90200，覆盖安装保留原数据，游戏运行模块继续使用 80400。社区提供独立完整包及签名更新包；MC 安装套件包含原版 MCDR、两个 NeoForge 1.21.1 服所需组件。

本版统一 MC 状态查询与连接验证，修复 HXZRE 启动假成功和社区旧更新目录覆盖新安装的问题。Windows 游戏运行期间默认可继续管理其他实例，设置中可开关；新增完整权限插件 API、市场提交/审核/下载与 SDK。Windows、Android 的自动错误收集支持管理员处理状态和记录。

社区管理员先备份，停止旧进程后将完整包迁移到新目录，保留完整 data 和 .env，在后台“运行目录与连接诊断”核对 0.9.2 和实际程序路径。Windows 多开与插件不在 Android 执行，Android 保留单游戏进程；真实服务器安装及公网 UDP 连通性仍需部署后验证。

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

卡片开发须遵循 [UI 规范](docs/UI卡片规范.md)。本轮功能见 [0.8.3 发布说明](docs/0.8.3发布说明.md)，部署及验证范围见 [部署与验收](docs/0.8.3使用与升级.md)。

## 验证边界

本轮验证原版安装参数、超时切源与续传、登录门控、功能引导、卡片布局、小游戏新旧规则及结算。Windows 两架构另检查最终程序的原生启动与 IPC。验证范围及升级注意事项见 [使用与升级](docs/0.8.3使用与升级.md)。浏览器界面检查不等于安卓实机验收，ia32 在当前 Windows 运行也不等于实体 Windows 7 验收；真实 Minecraft 模组和跨运营商 NAT 仍需对应环境验证。
