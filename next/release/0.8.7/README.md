# 幻想镇 0.8.7

本版本聚焦联机稳定性、在线时长榜和小游戏扩展。

## 主要变化

- 社区后台新增“允许所有用户使用完全联机功能”开关，默认关闭；管理员可配置房间数、单房间连接数、P2P 探测超时和信令协商超时。
- 联机目录、P2P 信令和探测统一使用后台参数；客户端显示全员开房状态和连接上限。
- 在线时长榜默认支持最多 500 条记录，并支持 offset/limit 分页；累计真实核验游玩每 24 小时获得 5 积分。
- 新增四个确定性小游戏：星环采集、雾港配给、霓虹节拍、秘境炼金。
- 小游戏大厅新增“简化显示”：保留卡片标题、编号、类型提示、开始与收藏操作，隐藏头图和重复说明；卡片高度按内容自动收缩并保持网格对齐。
- 联机客户端读取后台连接上限；加入房间时同时探测 P2P 与公网直连，公网探测较慢时不再阻塞可用的点对点路径；P2P 协商失败最多三次并带退避重试。
- 补充 PCL 历史联机记录、PCL N Terracotta 与 HXZ 联机实现的对照文档：`docs/0.8.7-PCL2-XPCL联机对照.md`。

## 交付文件

- `windows-x64/HXZ-Launcher-0.8.7-x64.exe`
- `windows-x64/HXZ-Launcher-0.8.7-x64.exe.blockmap`
- `windows-ia32/HXZ-Launcher-0.8.7-ia32.exe`
- `windows-ia32/HXZ-Launcher-0.8.7-ia32.exe.blockmap`
- `windows-x64/HXZ-NEXT-0.8.7-windows-x64-portable.zip`
- `windows-ia32/HXZ-NEXT-0.8.7-windows-ia32-portable.zip`
- `server/HXZ-Community-0.8.7-windows-x64.zip`
- `server/HXZ-Community-0.8.7-update.zip`
- `android/HXZ-Community-Android-0.8.7-80700.apk`
- `source/HXZ-Launcher-0.8.7-source.zip`
- `game-server/hxz-community-bridge-0.8.0-mcdr.mcdr`
- `game-server/hxz-community-bridge-0.8.0-neoforge-1.21.1.jar`
- `updates/latest.json`、`latest-ia32.json`、`latest.yml`
- `updates/android-latest.json`、`game-runtime-latest.json`、`community-update.json`

安卓 APK 为 arm64-v8a、Android API 29+，版本号 80700；未在本轮连接真实 Android 设备上做实机验收。

## 验证

- 社区服务端测试：125/125 通过。
- 引擎测试：56/56 通过（含连接上限策略与直连租约）。
- TypeScript 类型检查通过。
- 桌面 Vite/Electron 构建通过。
- 移动 Web Vite 构建通过。
- 桌面 x64 与 ia32 安装器构建通过。
