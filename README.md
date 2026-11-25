# 幻想镇启动器

打开幻想镇，选一个角色，就能继续上次的世界。平时只想进服，可以用极简版。想看看朋友在做什么，也可以把社区装回同一个窗口。

## 下载

| 你的设备 | 安装包 |
| --- | --- |
| 大多数 Windows 电脑 | [Windows x64 · 0.10.0](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.10.0/HXZ-Launcher-0.10.0-x64.exe) |
| 32 位 Windows | [Windows x86（32 位）· 0.10.0](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.10.0/HXZ-Launcher-0.10.0-ia32.exe) |
| 64 位安卓手机或平板 | [Android ARM64 · 0.10.0 构建 2](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.10.0-build.2/HXZ-FCL-0.10.0-build.2-arm64-v8a-release.apk) |
| x86_64 安卓设备或模拟器 | [Android x86_64 · 0.10.0 构建 2](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.10.0-build.2/HXZ-FCL-0.10.0-build.2-x86_64-release.apk) |

Windows 安装后，从桌面的「幻想镇 3rd」打开。便携版和可选扩展见 [Windows 正式版下载页](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.10.0)。

安卓打开就是社区。可以从公告或服务器卡片进服，也可以从「游戏 → 游戏库」下载安装游戏。首次进服需要登录皮肤站。安卓版基于 Fold Craft Launcher 构建，需要 Android 8.0 或以上和支持相应 64 位 ABI 的系统。[安卓版说明](apps/android/README.md)

已装初版 0.10.0 或之前标为 0.10.1 的安卓包，请下载上方 APK，在系统安装界面点「更新」，可以沿用手机里的设置和存档。从 0.10.0 构建 2 起，打开社区就会自动检查后续构建，默认在非计费网络上下载，安装前请你确认。「我的 → 应用更新」也可以随时检查或关闭自动下载。

## 第一次打开

1. 登录幻想镇皮肤站，选中自己的游戏角色。也可以先用游客身份看看本机的游戏。
2. 在首页选一个默认服务器，跟随提示下载整合包。如果电脑里已经有游戏，去「游戏库」选择原来的游戏目录。
3. 点「启动」。下次回到首页，点「继续游玩」就能回到上次选择的实例。

工作台能拖动和调整卡片，也能换自己的壁纸。喜欢简单一点，可以在设置里切换工作区。极简版把选实例、搜模组和下载放在一起，两个工作区共用角色、实例、游玩记录和积分。

## 想一起玩的时候

联机大厅和个人积分随启动器提供。打开工作台的「设置 → 扩展」，可以单独安装下面三项。下载完成后，重启一次就会出现对应入口。

| 扩展 | 装好以后可以做什么 |
| --- | --- |
| 社区 | 聊天、逛论坛、看排行榜和积分商城，进入冒险者协会或 LINKING 档案馆 |
| 音乐播放器 | 播放本地音乐、管理歌单和查看歌词 |
| 小游戏 | 玩启动器里的小游戏，查看自己的最好成绩 |

扩展来自当前版本的 GitHub 发布页。如果下载中断，可以在原处重试，也可以选择「从本地安装」，导入同版本的扩展 ZIP。随时可以在设置中移除。

在安卓版的「社区」可以浏览论坛、活动、蓝图、交易和冒险者协会。「聊天」里有文字大厅和语音房，LINKING 有独立入口，「游戏 → 小游戏」可以玩 24 款游戏。在 Android 和 Windows 登录同一个皮肤站角色，两个设备看到的是同一份服务器在线记录、积分余额和排行榜。服务器核验的在线时间累计满 24 小时可获得 5 积分，小游戏的离线练习最好成绩保存在当前设备。

## 从 0.9.2 升级

使用 **0.9.2 Windows 安装版** 的玩家，打开自动更新后，会在新正式版上线时收到更新。也可以在旧版设置里手动检查。退出正在运行的游戏，等安装完成即可。**便携版**需要手动下载新版，在设置里选择原游戏目录或导入旧版的 `settings.json`。

新版第一次打开会读取本机已安装版的游戏目录、游玩记录和内存配置。原有存档继续放在原来的游戏目录。首次使用新版角色功能时，需要重新登录皮肤站。

**0.9.2 安卓正式版**请直接下载上面的 APK，打开后在系统安装界面选择「更新」。沿用原应用签名，可以覆盖安装并保留应用数据。旧客户端有 64 MiB 的更新包上限，这次需要手动下载。只有 32 位安卓系统的设备请继续使用 0.9.2。

自己运营社区的服主可以在后台「服务维护 → 服务更新」给原版 0.9.2 升级，也可以开启按北京时间定时备份和安装。[服务端更新说明](apps/community-server/README.md#从-092-更新) · [Windows x64 服务端完整包](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.10.0/HXZ-Community-0.10.0-windows-x64.zip)

## 遇到问题

启动失败时先看提示里的原因和处理办法。内存问题可以在「启动前检查」里核对 Java 实际会使用多少内存。持续遇到同一问题，可以从「帮助与反馈」复制诊断摘要，再附上当时点了什么。[提交问题](https://github.com/0xiaoyun0/HXZ_LAUNCHER/issues)

## 参与开发

Windows 版使用 Rust、Tauri 和 WebView2。安装 Node.js 24、Rust 的 MSVC 工具链和 Visual C++ 构建工具后，可以在仓库根目录用下面两条命令构建桌面版。

```powershell
npm ci
npm run desktop:build
```

x86 使用 `npm run desktop:build:ia32`。制作安装包另需 NSIS，`MAKENSIS` 可指向本机的 `makensis.exe`。安卓版及社区服务有各自的工程入口。[安卓版](apps/android/README.md) · [社区服务端](apps/community-server) · [桌面布局约束](docs/桌面界面约束.md) · [功能与验收](docs/功能与验收.md)
