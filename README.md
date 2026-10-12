# 幻想镇 · 0.7.1

Windows 卡片启动器、Android 社区与可选游戏组件、完整社区服务端及独立官网。

[下载 0.7.1](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.7.1) · [源码与构建](next/README.md) · [更新内容](next/docs/0.7.1发布说明.md) · [部署与升级](next/docs/0.7.1部署与验收.md)

- Windows：x64 / ia32 安装器与便携包。安装版沿用签名更新通道，0.5.2 及后续安装版可升级；保留账号、设置和游戏目录。
- [Android 社区](next/mobile/README.md)：Android 10+，0.7.1 / 70100，原签名覆盖安装。可选 ARM64 游戏组件沿用 0.7.0 / 70003，独立下载；大型 PC 模组兼容性仍取决于设备和整合包。
- [完整社区服务端](next/apps/community-server/README.md)：聊天、语音、论坛、蓝图、积分、小游戏、公会、活动及后台。升级前备份 data 和 .env；已有 0.7.0 服务可通过后台签名更新。
- 全部 15 款小游戏调整普通/专注和移动布局，飞行增益 24 种、打砖块增益 9 种；棋类落子实时同步，独立进程计算机器人。
- [MC 联机大厅](next/docs/MC直连大厅.md)：公网 IPv4/IPv6 优先，失败尝试 P2P。社区只交换握手，不中继游戏数据；网络受限时仍可能无法穿透。
- [卡片规范](next/docs/UI卡片规范.md)：可拖动、缩放、隐藏、对齐、跨页整理及个性化持久化。
- [LINKING 档案馆](next/docs/LINKING档案馆开发与管理.md) · [官网部署](next/docs/官网部署与内容管理.md)

当前源码位于 next；根目录 client / server / mobile 保留历史实现。社区使用 next/apps/community-server，next/server 仅含共享规则。棋类第三方引擎来源、许可与重建源码在 [独立模块](next/third_party/maid-board-engine/README.md)。历史 Release 保留。

---

以下为旧版使用文档：

# 幻想镇启动器 0.5.2

0.5.2 统一个性化、论坛、蓝图库和商城布局，修复蓝图下载与实例导入、小游戏排序与拖动响应，降低林间疾跑速度。头图可关闭并自适应布局，三个默认服务器实例受保护。Windows x64 为基准，同步 x86 兼容版、Android 社区版和独立社区服务端。[本版交付说明](docs/0.5.2开发与交付.md) · [官网社区接口](docs/官网社区接口-v1.md)。
