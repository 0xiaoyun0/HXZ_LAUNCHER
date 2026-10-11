# LINKING 档案馆

2026-10-11 开始，2026-10-12 纳入 0.7.0。独立替换此前活动。采用用户确认的「档案探索＋任务解锁」，不读取或复用旧活动内容及解锁逻辑。保留已发布的 0.6.4 Release。

## 入口与本地化

桌面：更多 → LINKING，或设置 → 个性化 → 进入 LINKING 档案馆；支持固定到主导航。Android：发现 → LINKING。默认中文，界面文案在 apps/linking/src/localization.ts，正文、摘要、任务描述在社区数据库。中英文档案标题可以分别填写，分类名可以中文。所有排期输入和显示明确采用北京时间。

管理员登录后，活动顶栏有「管理活动」。社区网页后台侧栏也有「LINKING 活动」入口，两处使用同一套编辑器及权限接口。普通成员看不到管理入口，直接调用接口也会被服务端拒绝。

## 编辑与持续运营

1. 进入「章节与档案」，新建或编辑章节。设置标题、介绍、顺序和可选起止时间；不设结束时间可长期开放。
2. 添加档案。目录摘要在未解锁时也可见；正文和补记只在完成解锁条件后返回客户端。内容以纯文本展示，不接受脚本或任意 HTML。
3. 添加任务：阅读指定档案、输入口令、提交手记由管理员审核；0.7.0 还支持「公会主线」和「游戏统计」。公会填写已发布主线的标识；游戏统计选择服务器并填写 metric 和阈值，来源为可信服务器采集。可选多个前置任务，全部完成后才能继续。保存时检查循环条件、重复标识及不存在的引用。
4. 保存草稿。在线玩家仍看到已发布版本。准备完成后点击「发布当前草稿」，新内容在下一次进入或同步进度时生效；同章内容版本变化时客户端重新载入，避免旧索引混用。
5. 人工任务在「待审核任务」中处理，可通过或写明原因退回。草稿/发布使用版本号防止两个管理员互相覆盖。
6. 归档关闭该章入口，但保留进度。重新发布可恢复。档案和任务标识保持不变时，改名和调整顺序不重置记录；玩法含义改变时创建新的任务，不复用旧标识。

每章最多 200 份档案、100 个任务、12 个分类；最多 1,000 个章节。这是单次响应与编辑规模限制，不是年度清空。每份正文最多 50,000 字。口令只保存加盐 scrypt 摘要，管理员查询不返回原始答案；输入新口令才替换原值。

首次部署自动提供一章原创接入示例，可直接编辑。它用于展示完整流程，不是原活动的续作或数据迁移。

## 数据与部署

服务端模块：apps/community-server/src/linking.mjs、linking-seed.mjs。

数据在现有 community.sqlite 的 linking_chapters、linking_config、linking_progress、linking_submissions、linking_audit 中。继续备份完整社区 data 目录；不要删除社区数据库。旧活动路由返回 410，旧数据库表保留但不再使用。

客户端与服务端必须同时更新本次代码。旧服务端不具备新接口，客户端会显示明确的连接错误。没有修改线上服务、线上数据或真实用户配置。

构建：先在 apps/linking 执行 npm ci，再从根目录运行 node scripts/build-linking.mjs。它把同一静态应用复制到桌面 public/linking、mobile/web/public/linking 和社区后台 public/linking。之后使用项目原有桌面、移动端、社区服务端构建流程。Android 新增本地 iframe 路由、模型/音频 MIME 与管理接口适配，不能只替换网页资源而忽略 Java 文件。

## 接口简表

全部接口要求已有社区 Bearer 会话。宿主通过受限消息桥调用，不把令牌传入活动 iframe。

| 接口 | 用途 |
| --- | --- |
| GET /api/linking/catalog | 已发布章节、排期状态、当前玩家概况 |
| GET /api/linking/chapters/:id | 可读档案与任务；锁定正文不会下发 |
| POST /api/linking/chapters/:id/action | read、bookmark、submit；服务端判定权限及前置条件 |
| GET /api/admin/linking | 配置与草稿清单 |
| PUT /api/admin/linking/config | 修改开放状态和活动名称，携带 revision |
| GET /api/admin/linking/chapters/:id | 编辑草稿 |
| PUT /api/admin/linking/chapters/:id | 保存 {chapter, revision}，新建 revision=0 |
| POST /api/admin/linking/chapters/:id/publish | 发布当前草稿，携带 revision |
| POST /api/admin/linking/chapters/:id/archive | 归档，保留进度 |
| GET /api/admin/linking/submissions | 待审核队列，支持 offset，每页 50 条 |
| POST /api/admin/linking/submissions/:id | 审核，携带 status、note、updated |

401 要求登录；403 无权限、未开放或条件不满足；404 不存在/未发布；409 并发修改冲突。玩家操作限频，口令尝试每人每章每分钟最多 12 次。

## 验证记录

本地隔离社区已验证：未登录、普通玩家管理权限、锁定正文保护、阅读/口令/人工审核完整流程、收藏、草稿与发布分离、版本冲突、循环条件、定时开放，以及内容更新后进度保留。测试数据只在 .runtime/linking-check-*。

界面证据：.runtime/linking-review。浏览器模拟桌面与 320/390 手机尺寸、横屏、深色主题的截图不等于实体设备验收。后续结果继续追加，勿将构建成功写成实机通过。

### 2026-10-12 原生验收补充

已在本机 Electron 44 / Windows 64 位的正式构建资源上验证真实皮肤站登录、本地社区会话、章节目录、三维档案与管理员入口。修复了 Electron file: 消息来源与 URL.origin 不一致造成的桥接拒绝；初次进入等待社区登录完成，短暂 WebSocket 重连不会重新加载编辑器。修复缩放舞台聚焦后自动滚动造成左侧裁切。原生检查未记录页面 JS 异常。

收尾检查修正管理员列表在 Flex 容器中的最小宽度，消除横向溢出；验证未保存编辑通过顶栏返回时会询问，选择取消后文本保持不变。对应截图 admin-final.png、admin-unsaved-final.png。

已打开新的启动器窗口供用户验收，标题为「幻想镇 NEXT · LINKING 本地验收」。本次副本使用 .runtime/linking-acceptance/profile，活动数据使用 .runtime/linking-acceptance/community，只监听本机 127.0.0.1:5239；使用正常皮肤站认证，并只在该隔离服务授予验收角色管理员权限。没有向公网服务写入活动内容。关闭本次启动器会停止该本地服务，保存的草稿与进度继续保留。

图片：.runtime/linking-review/native-catalog.png、native-management.png、native-three.png。Android 网页及原生 Debug APK 已构建成功；移动布局与接口桥做了浏览器模拟检查，尚未做 Android 实机或 Windows 7 实机验收。本次未改版本号、未发布 GitHub、未覆盖已有 0.6.4 安装包。

旧活动服务模块和静态资产已移出交付源码至 .runtime/retired-linking，作为本机可恢复历史存档；旧数据表保留，原活动路由返回 410。
