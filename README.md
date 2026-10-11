# 幻想镇 · 0.7.0

Windows 卡片启动器、Android 社区与可选游戏组件、完整社区服务端及独立官网。

[下载 0.7.0](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.7.0) · [源码与构建](next/README.md) · [更新内容](next/docs/0.7.0发布说明.md) · [部署与升级](next/docs/0.7.0部署与验收.md)

- Windows：x64 / ia32 安装器和完整便携包。安装版沿用签名自动更新，0.5.2 及后续安装版可升级；保留原账号、设置和游戏目录。
- [Android 0.7.0](next/mobile/README.md)：Android 10+，原签名覆盖安装。完整社区、公会、活动和小游戏；可选 ARM64 Minecraft 游戏组件为实验功能，附对应源码与许可，尚未做实体手机三服进服验收。
- [完整社区服务端](next/apps/community-server/README.md)：一个完整包即可部署。新增冒险者公会、积分托管、主线、可信游戏统计、可编辑 LINKING、语音房间设置和签名自更新。首次升级先停服并备份 data 与 .env，使用新版启动脚本。
- [LINKING 档案馆](next/docs/LINKING档案馆开发与管理.md)：章节与档案、任务解锁、玩家进度及管理员编辑；主线与可信游戏统计可以作为解锁条件。
- [卡片规范](next/docs/UI卡片规范.md)：保留卡片拖动、缩放、隐藏、对齐与个性化；新增跨页整理、便利贴、时钟、日历、搜索和快捷助手。
- [MC 联机大厅](next/docs/MC直连大厅.md) · [官网部署](next/docs/官网部署与内容管理.md)

当前源码位于 next；根目录 client / server / mobile 保留历史实现。新社区使用 next/apps/community-server，next/server 仅含共享规则。Release 保留历史版本，各平台分别下载。

---

以下为旧版使用文档：

# 幻想镇启动器 0.5.2

0.5.2 统一个性化、论坛、蓝图库和商城布局，修复蓝图下载与实例导入、小游戏排序与拖动响应，降低林间疾跑速度。头图可关闭并自适应布局，三个默认服务器实例受保护。Windows x64 为基准，同步 x86 兼容版、Android 社区版和独立社区服务端。[本版交付说明](docs/0.5.2开发与交付.md) · [官网社区接口](docs/官网社区接口-v1.md)。
