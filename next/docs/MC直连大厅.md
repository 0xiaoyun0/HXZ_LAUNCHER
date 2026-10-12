# MC 联机大厅 · 0.7.1

Windows 房主使用自己的单人世界，玩家选择相同版本、加载器和模组，通过房间目录或邀请加入。社区负责开房授权、目录、连通性探测和 P2P 信令；MC 游戏数据在玩家与房主之间传输。

## 使用流程

1. 社区管理员在联机大厅授予房主创建权限。
2. 房主选择实例和网络范围，检测并启动。进入单人世界后，Java 助手自动开放本次世界；退出世界或关闭房间即断开。
3. 伙伴选择相同整合包，在公开房间或私有邀请中点击启动并加入。每个伙伴独立连接同一房主，不要求共用一台电脑。

连接优先顺序：可达的公网 IPv4 / IPv6 或已配置的虚拟局域网 → WebRTC P2P。P2P 使用 STUN 寻找地址，通过社区 /lobby-signal 交换握手，再使用有序可靠 DataChannel 传输现有加密游戏通道。不会通过社区发送 MC 游戏数据。

P2P 受 NAT、UDP 和系统防火墙影响，不能保证所有网络都成功。穿透失败会说明当前不可达；可改用公网地址或自行配置的虚拟局域网。未配置 TURN，也没有隐藏的社区游戏中继。社区仍然需要在线完成身份和初次握手。语音转发属于独立功能，继续保留。

## 配置与安全边界

- HTTPS 代理放行 /ws 和 /lobby-signal 的 WebSocket Upgrade；示例在 apps/community-server/nginx-community.conf.example。
- 游戏邀请仅本次房间有效，包含加入凭据，请私发。退出房间后凭据失效。
- 信令限制消息大小、频率、握手时间与待连接数量；拒绝二进制游戏流量和媒体/TURN 协商。MC 数据有背压和缓冲上限。
- 旧 /lobby-relay 已停用。若客户端仍显示社区中继，先更新客户端及社区至 0.7.1。
- Android 社区可以查看房间和复制邀请，本轮 P2P 宿主与加入端是 Windows Electron。

## 开发与验证

Electron 隔离隐藏窗口只运行本地 P2P 页面，无远程内容与游戏 UI；主进程只接受该窗口 IPC。代码在 apps/desktop/electron/p2p-runtime.mjs、p2p-preload.cjs、packages/engine/core/room-p2p.mjs；信令在 apps/community-server/src/lobby-signal.mjs。

本机已验证 Electron 44 x64 / 22 ia32，两名客人同时加入，分别传输 2MiB 并校验回显，以及慢读端背压。此结果只验证实现，不等于跨运营商 NAT 穿透成功。
