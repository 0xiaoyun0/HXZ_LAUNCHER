# 幻想镇社区服务端 0.8.0

这是一个完整、独立的社区服务端，已包含网页管理后台、聊天与语音、论坛、蓝图、公告、积分商城、小游戏与排行，以及 MC 直连大厅的权限和房间目录。只部署本包即可，不需要再安装联机扩展。不包含 Minecraft 游戏服务器，游戏优先直连房主，不可达时尝试 WebRTC P2P，用户开启时再回退到受限的社区认证中继。

Windows 包：双击「启动社区服务.bat」。首次运行会自动复制 .env.example 为 .env，仅监听 127.0.0.1:8787。网页后台：http://127.0.0.1:8787/admin/，账号 admin，初始随机密码保存在 data/初始管理员密码.txt。

Linux 或已有 Node 环境：使用 Node.js 24+，在本目录安装依赖（npm install --omit=dev），复制 .env.example 为 .env，执行 npm start。Windows 包附带的 ws 与 chess.js 均为通用 JavaScript，但 node.exe 仅供 Windows 使用。

公网部署使用已有 HTTPS 反向代理，配置 .env 中的 HOST、PORT、HXZ_DATA、HXZ_ORIGINS；语音复用同一 /ws 通道，P2P 握手使用同一服务端的 /lobby-signal WebSocket，旧 /lobby-relay 已停用。代理例子见 nginx-community.conf.example。首次先修改后台密码。使用 Nginx 时需将 client_max_body_size 调整为至少 12m，以允许编码后的 8 MB 聊天图片请求。

## 从旧版升级，保留数据

1. 先停止旧服务，备份整个旧目录。
2. 解压新包到新目录，完整复制原 data 与 .env；若 HXZ_DATA 使用外部绝对路径，继续使用该路径。
3. 使用新目录启动；检查后台版本为 0.8.0，确认聊天、账号、论坛、积分和榜单都还在，再移除旧程序。
4. 不要删除 community.sqlite、session.key、admin.json 或只复制部分数据库文件。必须在停服后复制整个 data，包含 WAL 等辅助文件。

本版增加好友小队、活动项目、作品知识库、共享媒体、世界接力、多端待办、交易托管及审核/申诉接口。首次启动新增独立表，不重建或清空原榜单、积分和帖子。工作台与各栏目复用同一套数据。

启动入口现为 supervisor.mjs；npm start 与启动脚本均通过它运行。后台「服务维护 → 服务更新」支持校验签名、备份数据库和失败回滚；自动安装默认关闭。首次从旧版升级仍需按上面步骤迁移一次，以后可使用后台更新。

详细说明见 [0.8.0 使用与升级](docs/0.8.0使用与升级.md)、[工作台接口](docs/0.8.0工作台接口.md)、[LINKING 管理](docs/LINKING档案馆开发与管理.md)；[背包与社区接口](docs/0.7.2背包与社区接口.md)；既有 [合作游戏接口](docs/0.6.4合作游戏接口.md) 继续适用。

## 上传丢包补偿（可选）

发布包附带 `resources/mc-tcp-fec`。在每台 Minecraft 服务端旁运行 `node fec-origin.mjs`，通过 `HXZ_FEC_LISTEN`、`HXZ_FEC_TARGET` 和 `HXZ_FEC_TOKEN` 配置 origin；随后在后台的三个默认服务器配置中填写对应的 FEC origin 地址、相同 token 和分片参数。启动器设置中的“启用上传前向纠错补偿”关闭后会直接使用原服务器地址。
