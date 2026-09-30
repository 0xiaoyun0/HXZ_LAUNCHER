# 幻想镇社区服务端 0.6.0

这是一个完整、独立的社区服务端，已包含网页管理后台、聊天与语音、论坛、蓝图、公告、积分商城、小游戏与排行，以及 MC 直连大厅的权限和房间目录。只部署本包即可，不需要再安装联机扩展。不包含 Minecraft 游戏服务器，游戏流量直连房主。

Windows 包：双击「启动社区服务.bat」。首次运行会自动复制 .env.example 为 .env，仅监听 127.0.0.1:8787。网页后台：http://127.0.0.1:8787/admin/，账号 admin，初始随机密码保存在 data/初始管理员密码.txt。

Linux 或已有 Node 环境：使用 Node.js 24+，在本目录安装依赖（npm install --omit=dev），复制 .env.example 为 .env，执行 npm start。Windows 包附带的 ws 与 chess.js 均为通用 JavaScript，但 node.exe 仅供 Windows 使用。

公网部署使用已有 HTTPS 反向代理，配置 .env 中的 HOST、PORT、HXZ_DATA、HXZ_ORIGINS；语音复用同一 /ws 通道。代理例子见 nginx-community.conf.example。首次先修改后台密码。

## 从旧版升级，保留数据

1. 先停止旧服务，备份整个旧目录。
2. 解压新包到新目录，完整复制原 data 与 .env；若 HXZ_DATA 使用外部绝对路径，继续使用该路径。
3. 使用新目录启动；检查后台版本为 0.6.0，确认聊天、账号、论坛、积分和榜单都还在，再移除旧程序。
4. 不要删除 community.sqlite、session.key、admin.json 或只复制部分数据库文件。必须在停服后复制整个 data，包含 WAL 等辅助文件。

本版新增直连授权表，不重建或清空原榜单、积分和帖子。房间列表在内存中，重启后由在线房主重新登记。网页后台「联机大厅」可管理开房权限与移除公开房间条目（房主仍在线时会再次登记）；启动器中也可以管理授权。
