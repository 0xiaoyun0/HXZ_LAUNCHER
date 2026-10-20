// One inventory for both launcher's tours. Only live destinations belong here.
export const GUIDE_VERSION = 3;
export const GUIDE = [
 {id:'home',title:'选择世界，开始游戏',group:'出发',desktop:'/',mobile:'minecraft',body:'三个默认服务器会自动准备游戏。选择实例，再点“安装并开始”；已安装的实例可以直接启动。',tip:'下载与安装进度可在任务与日志中查看。'},
 {id:'instances',title:'自己的实例，自己管理',group:'出发',desktop:'/library',mobile:'minecraft',body:'管理已安装实例、切换游戏目录，或导入整合包。电脑上右键实例即可打开详情与文件管理。',tip:'模组、资源包、光影与机械动力蓝图支持导入、查看和禁用。'},
 {id:'resources',title:'找资源，也看下载节点',group:'出发',desktop:'/workshop',mobile:'minecraft',body:'电脑上可以搜索整合包、游戏版本和扩展资源。安卓的服务器页负责安装默认服务器，并管理运行组件。',tip:'下载默认优先官方源；节点失败会尝试适用的备用源，已完成文件会保留。'},
 {id:'sources',title:'知道下载进行到了哪里',group:'出发',desktop:'/workshop/sources',mobile:'minecraft',body:'查看下载节点的适用范围与连接状态。节点检测来自你当前的网络，不代表其他地区的速度。',tip:'并发数量与下载限速在设置中调整。'},
 {id:'chat',title:'从一句问好开始',group:'伙伴',desktop:'/community',mobile:'chat',body:'发送文字、图片和表情，输入 @ 提及伙伴。未读消息与回复会进入收件箱。',tip:'聊天与语音可以随时切换，离开聊天页面不会清空历史记录。'},
 {id:'voice',title:'进入语音，一起听歌',group:'伙伴',desktop:'/community/voice',mobile:'voice',body:'选择语音频道，与朋友交流。可以静音、选择按键说话，或加入专用的一起听歌房间。',tip:'麦克风和屏幕覆盖选项在设置中；首次使用需要允许设备录音。'},
 {id:'forum',title:'把讨论留下来',group:'伙伴',desktop:'/community/forum',mobile:'forum',body:'发帖、回复、收藏与点赞，也可以按时间或热度查找讨论。',tip:'在社区的蓝图栏目发现、分享和下载机械动力作品。'},
 {id:'blueprints',title:'让蓝图进入你的世界',group:'伙伴',desktop:'/community/blueprints',mobile:'blueprint',body:'按游戏版本筛选机械动力蓝图，查看作品详情。电脑可把蓝图导入已经安装机械动力的实例。',tip:'上传作品需通过审核后公开。'},
 {id:'lobby',title:'和朋友进入同一个世界',group:'伙伴',desktop:'/multiplayer',mobile:'lobby',body:'查看默认服务器玩家与公开房间，使用邀请加入伙伴。开房权限由管理员或使用凭证授予。',tip:'先检查网络条件；远程直连并不保证适用于所有运营商网络。'},
 {id:'guild',title:'在冒险家协会接一份委托',group:'探索',desktop:'/guild',mobile:'guild',body:'发布、接取和交付委托。积分委托按流程结算，游戏内道具委托按约定交付。',tip:'查看具体要求后再接取，提交凭证并等待委托方确认。'},
 {id:'arcade',title:'休息片刻，挑战自己',group:'探索',desktop:'/arcade',mobile:'games',body:'小游戏、棋类与肉鸽挑战都在这里。进入游戏后可查看规则、操作方式和排行榜。',tip:'手机支持触控操作；专注模式会给游戏更多空间。'},
 {id:'shop',title:'积分、商品与背包',group:'探索',desktop:'/arcade/shop',mobile:'shop',body:'在商城使用积分兑换商品或功能凭证。收支明细、兑换码与背包可以在账号页查看。',tip:'凭证进入背包后由你决定何时使用，注意数量与有效期。'},
 {id:'inventory',title:'收到的物品都在这里',group:'探索',desktop:'/account/backpack',mobile:'inventory',body:'查看活动奖励、委托物品和功能凭证，并按物品说明使用。',tip:'管理员邮寄和兑换获得的道具也会进入背包。'},
 {id:'linking',title:'走进 LINKING 档案馆',group:'探索',desktop:'/linking',mobile:'linking',body:'阅读档案，按章节完成任务，逐步解锁新的记录与活动奖励。',tip:'部分任务会改变启动器的外观。音乐的新界面会在对应任务完成后解锁。'},
 {id:'music',title:'让音乐继续播放',group:'探索',desktop:'/music',mobile:'music',body:'导入本地音乐或网易云歌单，查看歌词，与语音房间中的伙伴一起听。',tip:'网易云账号功能需要授权；每位用户登录自己的账号。'},
 {id:'account',title:'角色、账号与消息',group:'偏好',desktop:'/account',mobile:'me',body:'管理幻想镇皮肤站账号与角色，查看积分、背包和消息。',tip:'社区暂时断线不会删除你的本地账号或已安装游戏。'},
 {id:'inbox',title:'不错过回复与通知',group:'偏好',desktop:'/community/inbox',mobile:'inbox',body:'回复、提及、活动奖励与管理员来信都会汇总到收件箱。',tip:'电脑顶部的信封和手机“我的”都能打开这里。'},
 {id:'settings',title:'把界面调到舒适',group:'偏好',desktop:'/settings',mobile:'settings',body:'调整主题、字号、动效、语音和下载选项。电脑的卡片可以拖动、调整大小或恢复自动高度。',tip:'不需要手动整理也能使用默认布局；关闭动画后动效会停止。'},
 {id:'feedback',title:'有问题，直接告诉我们',group:'偏好',desktop:'/feedback',mobile:'feedback',body:'提交启动器、社区、服务器或崩溃问题。尽量附上操作步骤与诊断，方便管理员处理。',tip:'电脑右上角有反馈入口；手机可在“我的”中进入。'},
 {id:'admin',title:'管理员的管理入口',group:'管理',desktop:'/manage',mobile:'admin',admin:true,body:'审核内容与委托，管理商品、权限、积分、反馈和活动。LINKING 的章节与任务在档案馆内管理。',tip:'此项仅对管理员显示，普通成员看不到管理入口。'}
];
export function guideEntries({admin=false}={}) {return GUIDE.filter(item=>!item.admin||admin);}
