# 幻想镇启动器 0.2.2

基于 Vue 3 / Quasar / Electron 的 Windows 桌面启动器。**客户端与社区服务端分别运行、分别打包**：client 负责游戏和社区连接，server 负责独立网页管理、公告、聊天与语音信令。客户端不启动服务端。皮肤站和 HXZ UP 继续独立运行。

0.2.0 新增：Minecraft 与加载器下载安装、Modrinth 整合包搜索、拖入 mrpack 自动配置、HXZ UP 检测、全局字号/颜色/背景/布局、国内镜像优先、独立社区网页后台与启动器自身更新；修复 Forge/NeoForge 重复依赖及 Forge 安装清单 null 字段。详见 [0.2.0 发布与使用](docs/0.2.0发布与使用.md)。

0.2.1 修复桌面社区连接：兼容 Electron WebSocket 的 file:// 来源及旧版 .env，恢复聊天、在线状态与语音信令；优化语音侧栏与文字标识，新增真实阶段进度、可展开任务详情和日志搜索。详见 [修复说明](docs/0.2.1社区连接修复.md)。

0.2.2 新增三服独立 HXZ UP 更新日志、默认开启的更新器原生弹窗开关、按角色保存和社区同步的自定义头像，扩大语音房间区域。详见 [0.2.2 开发与交付](docs/0.2.2开发与交付.md)。

## 已实现

- 无系统标题栏，内置最小化、最大化、关闭；深色/浅色；固定导航与启动区。
- 扫描 `.minecraft/versions`，实例列表、搜索、版本隔离、内存、分辨率、全屏、Java 自动检测/选择与额外 JVM 参数。
- 解析原版和继承版本的启动清单，按系统筛选依赖，校验和补全库/资源，安全提取本机库，以独立进程启动游戏。
- 幻想镇皮肤站 Yggdrasil 登录、角色选择、多账号、自动刷新令牌、系统加密保存凭据。密码不落盘。
- HXZ UP 1.0.3 随包提供；按实例设置地址、创建/安装整合包、启动前更新、维护跳过、失败阻止启动。先更新，再读取新的游戏启动参数。
- 公共聊天、在线列表、四个语音房间，每房最多 8 人；麦克风选择、静音、关闭接收声音、离开与资源释放。
- 公告主菜单及原版生存群组、模组一服、模组二服子菜单；管理员发布/删除，自动刷新。
- 有界日志、导出、任务取消、游戏结束操作。

## 玩家使用

1. 打开 `release/0.2.2/client` 中的安装程序，或解压客户端便携包运行“便携启动.bat”。管理员的独立服务端包位于 `release/0.2.2/server`。
2. 在“皮肤站账号”登录 `skin.hxzmc.top` 的账号，选择已经创建的角色。
3. 选择 `.minecraft` 游戏目录。已有实例可直接识别；新游戏在“下载与安装”选择版本、加载器和实例名安装；也可拖入 `.mrpack` 或搜索 Modrinth 整合包下载导入。
4. 新整合包：选择游戏目录 → 添加整合包 → 填实例名和管理员给的 HXZ UP **客户端接入地址**。服务端必须已发布对应游戏版本和加载器配置。
5. 设置中“保留 HXZ UP 默认更新弹窗”默认开启；关闭后在任务详情查看更新。实例配置中设置内存和“每次启动前检查 HXZ UP 更新”。也可点列表中的更新按钮单独更新。
6. 底部选择账号并启动。当前阶段的真实计数显示在固定启动区；点“任务详情”查看步骤、文件、耗时和可搜索日志，失败后仍可查看。
7. 管理员先运行独立社区服务。客户端设置中填写地址并检查连接，再进入聊天大厅；公告无需登录即可读取，发言/语音需要皮肤站角色。
8. 在“个性化”选择、预览并保存当前角色头像，也可恢复默认。调整整体字号（13–22 px）、颜色、背景图片、深浅主题与布局。mrpack 内含有效 updater/config.json 时自动启用启动前 HXZ UP 更新。

皮肤管理会打开独立的皮肤站窗口。网页 Cookie 与 Yggdrasil 游戏令牌不同：首次网页管理仍需登录一次，之后保留该账号网页会话；本版已统一游戏和社区身份，没有伪造网站登录 Cookie。

## 管理员部署

详见 [部署与接入.md](docs/部署与接入.md)。当前生产服务地址尚未提供，默认社区地址为 `http://127.0.0.1:8787`；HXZ UP 地址由实例配置提供，不内置未知生产域名。

## 本地运行与构建

需要 Node.js 24、pnpm 11，游戏需要对应 Java，编译安装组件需要 JDK 17+。现有项目目录为 `E:\hxz_la`。

```powershell
cd E:\hxz_la\server
pnpm install --frozen-lockfile
pnpm start

cd E:\hxz_la\client
pnpm install --frozen-lockfile
cd src-electron
pnpm install --frozen-lockfile
cd ..
pnpm dev:desktop
```

也可以使用根目录的 `start-community.bat`、`z-client-dev.bat`。`z-web-dev.bat` 只预览界面，浏览器不提供本地文件/账号/游戏启动权限。

```powershell
pnpm typecheck
node --test test/*.test.mjs
pnpm build:desktop
```

桌面构建输出到 `client/dist/electron`。`scripts/verify-ui.mjs` 是开发验证工具，需要 Playwright 和 Edge、已运行的 9000 端口开发页面；通过独立测试服务验证聊天/语音，不会连接生产皮肤站，也不会生成生产测试账号。

## 数据与范围

- 启动器配置与加密账号默认存放于 Electron 用户数据目录，可通过 `HXZ_LA_HOME` 指定独立目录。游戏数据放在用户选择的目录。
- 新社区服务的 SQLite、会话签名密钥在 `server/data`，与皮肤站/HXZ UP 数据分开。
- 聊天保存最近约 3000 条，客户端最多 300 条；日志最多 1000 行；资源下载默认 8 路并发、流式校验。
- 语音使用 WebRTC。局域网联调已验证实际音频数据；公网不同 NAT 下需要 TURN，不应只依赖公共 STUN。
- 本版提供独立 Minecraft/Forge/NeoForge/Fabric/Quilt 安装和 Modrinth 整合包入口，不包含微软账号登录和单独模组市场。HXZ UP 继续管理游戏文件更新策略，electron-updater 负责启动器自身更新；两者与社区服务升级互相独立。
- 已真实导入用户提供的 hxzv3.mrpack，安装并运行 NeoForge 21.1.250 / 1.21.1 和 Forge 47.4.23 / 1.20.1 至渲染阶段。没有使用真实玩家凭据入服，也没有声称完成公网语音或正式发布站跨版本升级验收。

参考 [HMCL 文档](https://docs.hmcl.net/launcher/)、[PCL](https://github.com/Meloong-Git/PCL)、[authlib-injector 启动器规范](https://yushijinhun.github.io/authlib-injector/en/launcher-technical-specification.html)。借鉴操作流程，业务代码独立实现。许可证与随包组件说明见 [第三方组件.md](docs/第三方组件.md)。
