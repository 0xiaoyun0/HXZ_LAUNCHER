# 幻想镇 NEXT · 0.6.0

幻想镇 Windows 启动器、Android 社区客户端及独立服务器官网。

## 使用

- Windows x64 / ia32：从 Release 下载对应 portable.zip，完整解压后运行「幻想镇 NEXT.exe」。不能只移动 exe。
- Android：安装 HXZ-Community-Android-0.6.0-60001.apk，支持 Android 10 及以上。沿用正式应用身份和签名，可覆盖旧版，保留数据。
- Windows 账号与偏好保存在程序旁 profile。迁移旧 NEXT 时先退出两个程序，备份后复制整个 profile；游戏仍使用原 .minecraft，不必重复复制。
- 本次 Windows 为独立便携版，使用完整包手动升级，未接入旧版自动替换通道。

## 功能

桌面端支持游戏实例、安装下载、Java 管理、HXZ UP 更新、任务详情与诊断、皮肤站账号、完整社区、九款小游戏、积分商城和音乐播放器。页面采用可拖动、缩放、隐藏的卡片，支持内容自动尺寸、网格对齐、主题、背景与动效偏好。

Android 以社区为中心，提供聊天、语音、论坛、蓝图、公告、账号、积分、小游戏、音乐和联机房间列表。手机端不运行 Minecraft，平板和横屏独立适配。详见 [Android 说明](mobile/README.md)。

MC 直连大厅使用社区验证开房权限、展示目录及探测连通性，游戏流量直接连接房主。管理员需安装单独交付的社区扩展；现有社区服务与客户端分开部署。使用条件和边界见 [联机说明](docs/MC直连大厅.md)。

## 源码与构建

本项目在主仓库的 next 目录中，旧客户端和社区服务源码保留在仓库根目录。

| 目录 | 内容 |
| --- | --- |
| apps/desktop | React 桌面界面与 Electron 桥接 |
| packages/engine | 游戏、下载、Java、音频和直连业务 |
| packages/community、packages/mobile-ui | 社区模块与共享游戏规则 |
| mobile | Android 原生容器与 Vue 社区界面 |
| community-extension | 可独立安装的直连大厅服务扩展 |
| apps/website | 独立官网与内容管理后台 |

Node.js 22.12+，在本项目目录运行 npm ci。

| 操作 | 命令 |
| --- | --- |
| 类型检查 | npm run typecheck |
| 桌面开发 | npm run desktop:dev |
| 桌面构建 | npm run desktop:build |
| 桌面运行 | npm run desktop:start |
| Windows x64 封包 | npm run package:desktop |
| Windows ia32 封包 | npm run package:legacy |
| 官网构建 / 运行 | npm run website:build / npm run website:start |

Windows 封包需在 .runtime/electron 放置 Electron 44.3.0 x64，在 .runtime/electron-ia32 放置 Electron 22.3.27 ia32 的完整运行时；随后执行对应封包命令。原生扩展随构建脚本打包。JDK 21 可编译 resources/direct-lobby 中的 Java 助手。Android 构建见其独立说明；私钥、账号和生成物不提交源码。

卡片开发须遵循 [UI 规范](docs/UI卡片规范.md)。本轮功能和验证范围见 [0.6.0 发布说明](docs/0.6.0发布说明.md)。

## 验证边界

桌面两架构原生调用、卡片操作、媒体解码、社区隔离服务流程和本机加密直连已检查。Android 完成签名构建、Lint、响应式截图和隔离社区流程检查。无 Android 真机连接，手机权限、耳机、后台语音和实际覆盖安装仍需实机验收；未在实体 Windows 7、两处公网或所有大型整合包完成测试。
