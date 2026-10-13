# 幻想镇 · 0.7.2

Windows 卡片启动器、Android 社区与可选游戏组件、完整社区服务端及独立官网。

[下载 0.7.2](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.7.2) · [源码与构建](next/README.md) · [更新内容](next/docs/0.7.2发布说明.md) · [部署与升级](next/docs/0.7.2部署与验收.md)

- Windows x64 / ia32 安装器与便携包。安装版沿用签名更新通道，保留账号、设置与游戏目录。
- [Android 社区](next/mobile/README.md)：Android 10+，0.7.2 / 70200，原签名覆盖安装；可选 ARM64 游戏组件沿用 0.7.0 / 70003。
- 冒险家协会提供可整理的概览、进行中与委托广场；详情和交付集中展开，返回保留浏览位置。积分和材料托管，游戏内道具由双方确认交付。
- 背包支持道具、权限凭证、物品邮件与兑换码；商城默认提供联机及网易云登录凭证，使用时开始计时。
- 聊天图片/GIF、收藏表情、语音覆盖窗口与桌面游戏内聊天；快捷键可编辑。下载改善断流恢复、尾部切源和中文内容搜索。
- [完整社区服务端](next/apps/community-server/README.md)：升级前备份 data 与 .env；已有 0.7.0 及以上服务可使用后台签名更新。
- [MC 联机大厅](next/docs/MC直连大厅.md)：公网 IPv4/IPv6 优先，失败尝试 P2P；社区不传输游戏数据。
- [卡片规范](next/docs/UI卡片规范.md) · [LINKING 管理](next/docs/LINKING档案馆开发与管理.md) · [官网部署](next/docs/官网部署与内容管理.md)

当前源码位于 next；根目录 client / server / mobile 保留历史实现。社区使用 next/apps/community-server，next/server 仅含共享规则。第三方引擎的许可与重建源码位于 [独立模块](next/third_party/maid-board-engine/README.md)。历史 Release 保留。

---

以下为旧版使用文档：

# 幻想镇启动器 0.5.2

0.5.2 统一个性化、论坛、蓝图库和商城布局，修复蓝图下载与实例导入、小游戏排序与拖动响应，降低林间疾跑速度。头图可关闭并自适应布局，三个默认服务器实例受保护。Windows x64 为基准，同步 x86 兼容版、Android 社区版和独立社区服务端。[本版交付说明](docs/0.5.2开发与交付.md) · [官网社区接口](docs/官网社区接口-v1.md)。
