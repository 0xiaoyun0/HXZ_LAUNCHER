# 幻想镇 Android

打开应用进入社区大厅。游客可以阅读服务器公告、查看近期讨论和浏览三个社区服务器。从公告或服务器卡片点「进入服务器」，首次使用会打开原生皮肤站登录窗口。选择角色后继续进入刚才选的服。下次打开应用会恢复这个角色。点顶部的角色名可以切换角色或重新验证。

游戏使用固定提交的 FCL 实例管理、版本安装、Java 运行时、渲染和触控。启动前按服务器要求匹配游戏和加载器版本。缺少实例时，可安装服主发布的整合包、安装指定游戏版本或导入本地整合包。首页和「游戏库」都使用幻想镇界面。公告里可以选择已安装的实例，也能查看和取消安装任务。打开游戏库可下载原版、导入整合包或启动单人游戏。已授予共享存储权限的旧安装继续使用原游戏目录，新安装默认在应用专属目录保存实例和存档。

社区使用 Kotlin、AndroidX WebKit 和 APK 内置的 React/TypeScript 页面。页面共用桌面端的标题、社区栏目和卡片样式，紧凑窗口可以在聊天标题中打开在线名单。皮肤站令牌由原生层保存和轮换，社区页面只接收限于社区的会话。进服时由原生层核对角色和服务器地址，向皮肤站在线验证，并将这个服务器作为本次游戏的连接目标。

从仓库根目录运行 `npm ci` 和 `npm run android:build`。构建使用 JDK 17、Gradle 8.14.4、Android SDK 35、NDK 27.0.12077973 和 CMake 3.22.1。设置 `ANDROID_HOME` 指向 SDK。默认使用上游 Gradle Wrapper；离线准备好的 Gradle 可用 `HXZ_GRADLE` 指定。传 `-- --x86_64` 构建模拟器架构。默认 ARM64 调试包独立安装在 `top.hxzmc.launcher.third.debug`。

`upstream.json` 记录仓库、提交和许可证。构建核对 Git 提交并应用 `fcl.patch`，新代码在 `src`、`res`、`community`。上游依赖、资源和补丁可由上述步骤重建。随下游分发的 FCL 和集成代码遵循 GPL-3.0-or-later，原始版权和第三方组件各自的许可证继续有效。发布 APK 时提供本仓库对应提交、补丁和固定上游的完整对应源码。

`--release` 使用发行方的 `HXZ_ANDROID_STORE`、`HXZ_ANDROID_STORE_PASSWORD`、`HXZ_ANDROID_KEY_ALIAS`、`HXZ_ANDROID_KEY_PASSWORD`。线上更新只识别幻想镇发布页上对应架构的正式包。生产社区部署的 `HXZ_ORIGINS` 若显式配置，需要包括 `https://appassets.androidplatform.net`，以允许 Android 的社区 HTTP 与 WebSocket 请求。

构建后运行 `node apps/android/verify-apk.mjs` 检查两种 APK 内的架构、四套 JRE、JNI、LWJGL、触控和上游版本记录。`npm run test:android:community` 启动临时社区服务，检查横竖屏的导航、图标和点击区域，并在 390×844 的浏览器视口验证从公告选服、取消登录、选择实例、查看和取消下载、聊天收发和在线名单、论坛、冒险者协会、LINKING、排行与钱包。它复用 APK 的网页构建产物。设备验收应从社区公告进服，核对服务器接收的角色，退出游戏并重开应用，检查角色和社区内容。单人世界从「游戏库」启动游戏，在游戏内创建或载入世界，保存退出后回到社区。
