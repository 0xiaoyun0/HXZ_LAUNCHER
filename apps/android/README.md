# 幻想镇 Android

游戏使用 FCL 官方源码中的实例管理、版本安装、Java 运行时、渲染和触控。幻想镇集成层使用 Kotlin、AndroidX WebKit 和随 APK 分发的 React/TypeScript 社区页面。默认游戏目录为共享存储中的 `FantasyTown/.minecraft`。首页的「幻想镇社区」沿用当前选中的幻想镇皮肤站角色，返回键回到游戏。皮肤站令牌在原生层轮换，页面接收限于社区的会话。

从仓库根目录运行 `npm ci` 和 `npm run android:build`。构建使用 JDK 17、Gradle 8.14.4、Android SDK 35、NDK 27.0.12077973 和 CMake 3.22.1。设置 `ANDROID_HOME` 指向 SDK。默认使用上游 Gradle Wrapper；离线准备好的 Gradle 可用 `HXZ_GRADLE` 指定。传 `-- --x86_64` 构建模拟器架构。默认 ARM64 调试包独立安装在 `top.hxzmc.launcher.third.debug`。

`upstream.json` 记录仓库、提交和许可证。构建核对 Git 提交并应用 `fcl.patch`，新代码在 `src`、`res`、`community`。上游依赖、资源和补丁可由上述步骤重建。随下游分发的 FCL 和集成代码遵循 GPL-3.0-or-later，原始版权和第三方组件各自的许可证继续有效。发布 APK 时提供本仓库对应提交、补丁和固定上游的完整对应源码。

`--release` 使用发行方的 `HXZ_ANDROID_STORE`、`HXZ_ANDROID_STORE_PASSWORD`、`HXZ_ANDROID_KEY_ALIAS`、`HXZ_ANDROID_KEY_PASSWORD`。线上更新只识别幻想镇发布页上对应架构的正式包。生产社区部署的 `HXZ_ORIGINS` 若显式配置，需要包括 `https://appassets.androidplatform.net`，以允许 Android 的社区 HTTP 与 WebSocket 请求。

构建后运行 `node apps/android/verify-apk.mjs` 检查两种 APK 内的架构、四套 JRE、JNI、LWJGL、触控和上游版本记录。`npm run test:android:community` 在 390×844 视口启动临时社区服务，使用测试角色验证聊天、论坛、冒险者协会、LINKING、排行与钱包。它复用 APK 的网页构建产物。设备验收从首页选择实例，进入 Minecraft 世界并保存退出，然后在首页进入社区验证角色提示。
