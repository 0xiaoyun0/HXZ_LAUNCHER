# 幻想镇 · 0.6.0

Windows 卡片启动器、Android 社区客户端、完整社区服务端与独立官网。

[下载 0.6.0](https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v0.6.0) · [新版源码与构建](next/README.md) · [更新内容](next/docs/0.6.0发布说明.md)

- Windows：提供 x64 / ia32 安装器及独立便携包。安装版保留旧正式版账号与设置，支持签名自动更新；0.5.2 安装版可通过原更新通道升级。
- [Android 0.6.0](next/mobile/README.md)：Android 10+，原签名覆盖安装，完整社区功能。
- [完整社区服务端](next/apps/community-server/README.md)：只需一个包，内含全部社区业务、网页后台和直连大厅权限管理。升级前停服并完整保留 data 与 .env。
- [MC 直连大厅](next/docs/MC直连大厅.md)：社区处理授权与目录，游戏流量直连房主。
- [卡片开发规范](next/docs/UI卡片规范.md) · [官网部署](next/docs/官网部署与内容管理.md)

当前代码位于 next；根目录 client / server / mobile 保留历史实现。新社区部署使用 next/apps/community-server，next/server 仅含共享规则，不能作为服务端运行。Release 按版本保留，下载说明按平台分类。

---

以下为旧版使用文档：

# 幻想镇启动器 0.5.2

0.5.2 统一个性化、论坛、蓝图库和商城布局，修复蓝图下载与实例导入、小游戏排序与拖动响应，降低林间疾跑速度。头图可关闭并自适应布局，三个默认服务器实例受保护。Windows x64 为基准，同步 x86 兼容版、Android 社区版和独立社区服务端。[本版交付说明](docs/0.5.2开发与交付.md) · [官网社区接口](docs/官网社区接口-v1.md)。
