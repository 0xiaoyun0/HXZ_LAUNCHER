# 幻想镇 3rd

幻想镇游戏启动器 **0.10.0**。Windows 首页优先继续上次游玩的实例，游戏库、资源、联机大厅和个人积分随主程序提供。音乐、小游戏和社区可分别安装。安卓版从社区大厅进入，玩家可以点服务器公告，沿用自己的皮肤站角色，通过 FCL 启动 Minecraft Java 版并进入对应服务器。

## 开始游玩

1. 使用 [Windows x64 安装包](release/0.10.0/HXZ-3rd-0.10.0-setup-x64.exe)，或将[便携 ZIP](release/0.10.0/HXZ-3rd-0.10.0-windows-x64.zip)解压后运行，保留同目录的 `engine`。Windows 需要 WebView2 运行时。开始菜单使用「幻想镇 3rd」一个入口。在「设置 → 工作区」切换到极简版或完整工作台，下次启动沿用所选界面。两个工作区共用角色、游戏目录、游玩记录和积分。极简版从「下载 → 模组与资源」选择实例，同时查找本地文件与兼容的在线版本。
2. 首次使用可选择已有 Minecraft 游戏目录，也可从游戏库安装游戏。游客可以浏览本机实例、检查 Java、查看游玩记录，安装音乐扩展后也可以播放本地音乐。在启动游戏或参与社区活动时登录幻想镇皮肤站账号。
3. 「设置 → 游戏与 Java → 默认游戏内存」支持输入 MB。选择手动、输入数值、点击「保存内存」。实例的「管理 → 配置」支持跟随全局、自动和单独设置。首页「启动前检查」会显示内存来源和预计 Java 堆上限。
4. 首页「卡片」管理显示、顺序、锁定和尺寸，也可直接拖动、添加便利贴等小工具。首页「外观」可选择三套内置风格，另存个人方案，或单独接回本机 0.9.2 的壁纸和卡片布局。
5. 「设置 → 资料迁移 → 导入设置」可选择 0.9.2 的 `settings.json`，同时读取相邻的 `launch-history.json` 和 `game-playtime.json`。导入前设置与旧设置原件副本在新资料目录的 `imports`，账号在新客户端内登录。
6. 首页的「游玩记录」可查看本机累计时长和近一年每日统计。账号页的「检测连接」可分别检查皮肤站是否可达或当前角色能否通过验证。
7. 在「设置 → 扩展」分别安装或移除音乐、小游戏和社区，重启生效。安装社区后可从顶栏进入聊天、论坛、冒险者协会与 LINKING。也可在扩展页查看自制卡片的作者、用途和权限后导入。
8. 从完整交付目录运行或安装的启动器，可直接读取安装包旁边 `extensions` 里的同版本插件。单独分发启动器时，设置页会尝试官网，也可以点「从本地安装」选择下表中的 ZIP。安装时校验完整插件包，运行时校验所请求的资源。
9. 账号、下载和游戏异常先给出原因与处理建议。持续性服务问题可手动复制给管理员的摘要，模组冲突和未识别的可重现异常可复制给 AI 或维护者。分享只包含产品版本、诊断编号、已知原因与操作建议。

游戏与存档使用玩家选择的目录。启动器和社区插件共享当前 Windows 用户下的资料目录和同一个登录角色。

## 本地交付

| 平台 | 文件 |
| --- | --- |
| Windows 游戏启动器 x64 | [安装包](release/0.10.0/HXZ-3rd-0.10.0-setup-x64.exe) · [便携 ZIP](release/0.10.0/HXZ-3rd-0.10.0-windows-x64.zip) |
| Windows 游戏启动器 x86 | [安装包](release/0.10.0/HXZ-3rd-0.10.0-setup-ia32.exe) · [便携 ZIP](release/0.10.0/HXZ-3rd-0.10.0-windows-ia32.zip) |
| 可选桌面社区插件（x64 / x86 通用） | [可从设置导入的社区包](release/0.10.0/extensions/HXZ-Community-Plugin-0.10.0.zip) |
| 可选桌面音乐与小游戏 | [音乐扩展](release/0.10.0/extensions/HXZ-Music-Plugin-0.10.0.zip) · [小游戏扩展](release/0.10.0/extensions/HXZ-Arcade-Plugin-0.10.0.zip) |
| Android 游戏启动器 | [ARM64 手机调试包](release/0.10.0/android/HXZ-FCL-0.10.0-arm64-v8a-debug.apk) · [x86_64 模拟器调试包](release/0.10.0/android/HXZ-FCL-0.10.0-x86_64-debug.apk) |
| 部署与接入 | [社区服务端](release/0.10.0/server/HXZ-Community-0.10.0-windows-x64.zip) · [官网](release/0.10.0/website/HXZ-Website-0.10.0-windows-x64.zip) · [MCDR 和 NeoForge 1.21.1 桥](release/0.10.0/game-server/HXZ-MC-Server-Kit-0.10.0-windows.zip) |
| 完整性 | [SHA-256 清单](release/0.10.0/SHA256SUMS.txt) |

## 工程入口

| 位置 | 职责 |
| --- | --- |
| [桌面主进程](native/src/main.rs) | Rust、Tauri 和系统 WebView2。管理 Windows 窗口、Java 进程、凭据存储、本地扫描和文件选择 |
| [桌面界面](apps/desktop/src/launcher/App.tsx) | 首页、游戏库、联机、游玩记录、音乐和扩展管理。账号与角色、启动前检查和设置由正常操作入口打开 |
| [可选社区](apps/desktop/src/launcher/Social.tsx) | 聊天、论坛、冒险者协会与 LINKING。重启后按需加载 |
| [本地工作进程](engine/main.mjs) · [游戏引擎](packages/engine/core) | Minecraft 准备、安装、角色会话、游戏进程事件、资料迁移与统计。沿用兼容的版本解析和社区协议 |
| [社区服务端](apps/community-server) · [官网](apps/website) | 独立构建和部署 |
| [Android 游戏启动器](apps/android/README.md) | Kotlin、AndroidX 和固定提交的 FCL 源码，手机社区沿用桌面的服务协议 |
| [功能和验收说明](docs/功能与验收.md) | 玩家可用的入口、验证方式与数据范围 |
| [桌面界面约束](docs/桌面界面约束.md) | 窗口、卡片、搜索和操作区、窄窗顺序、阅读区及弹窗的边界 |

### 本地构建

Windows 桌面构建需要 Node.js 24、Rust MSVC、Visual C++ 生成工具及 WebView2。x86 构建另需 Rust 的 i686 MSVC 目标。源码仓库携带依赖锁文件。构建使用 SHA-256 校验过的 0.9.2 运行组件。离线环境可用 `HXZ092_SOURCE` 指向原发布文件 `HXZ-Launcher-0.9.2-source.zip`。

```powershell
npm ci
npm run desktop:build
npm run desktop:build:ia32
npm run package:installer
node scripts/package-desktop.mjs --installer --ia32
```

安装包构建通过 `MAKENSIS` 查找 NSIS，也可从 PATH 运行 makensis。开发时使用 `npm run typecheck`、`npm test`、`npm run test:engine`、`npm run test:native` 和 `npm run test:community`。真实桌面流程使用 `node scripts/check-native.mjs --fixture-account` 或另加 `--ia32`，在独立临时资料中执行。构建当前桌面后可用 `npm run test:desktop:layout` 单独复查页面与弹窗边界，或给完整桌面流程附加 `--layout`。

版本由根包清单维护。构建输出在 `release/<版本>/`。官网通过 `HXZ3_RELEASE_DIR` 或相邻版本目录发现实际交付文件。签名更新渠道使用构建时配置的 `HXZ3_UPDATE_URL` 和 `HXZ3_UPDATE_PUBLIC_KEY`，线上发布与本地打包独立。
