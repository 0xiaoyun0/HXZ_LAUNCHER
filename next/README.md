# 幻想镇 NEXT · 0.8.5

Windows 启动器、Android 社区客户端及独立社区服务端。

## 使用

- Windows：下载对应 x64 / ia32 安装器，已安装版可检查自动更新；便携版完整解压并保留原 profile。
- Android：覆盖安装 `HXZ-Community-Android-0.8.5-80500.apk`，保留账号、设置与存档。社区内按需准备 ARM64 游戏运行模块，无需另装引擎应用；继续兼容正式80400运行模块。
- 社区管理员：新部署下载 `HXZ-Community-0.8.5-windows-x64.zip`。已有服务可使用后台签名更新；先备份并保留 data、uploads 与 .env，不覆盖这些数据。更新包并非第二个服务。

## 0.8.5

- 游戏主页新增 GitHub 热力图形式的游玩日历，可查看当天详情。本机游戏运行记录与服务器核验在线记录独立显示。
- 新增每周在线时长榜及积分奖励，管理员可配置最低时长、每日上限及各名次奖励；按北京时间周一自动结算，去重跨服时段并避免重复发奖。
- 每个实例右侧可直接启动或安装并启动；原开始游戏卡片改为当前实例详情，保留管理、目录、运行状态与停止游戏。
- Android 同步日历、在线详情、周榜和本机计时，延续80420兼容修复与默认关闭的交换内存扩展选项。

服务器记录需要默认游戏服已接入可信游戏桥，更新后开始累计，不倒推旧数据。在线不等同于实际操作，无法完全识别挂机。大型PC模组在手机上仍可能性能不足或不兼容；本次不宣称已解决所有机型的低帧率问题。

详见 [发布说明](docs/0.8.5发布说明.md)、[游玩时长与周榜](docs/0.8.5-游玩时长与周榜.md)。

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
