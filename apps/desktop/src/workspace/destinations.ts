import {House,LibraryBig,Boxes,Network,MessagesSquare,Gamepad2,Compass,Settings2,ContactRound,Music2,ScrollText,Inbox,ShoppingBag,FolderHeart,LayoutDashboard,Trophy,BookOpen,Puzzle,LifeBuoy,Radio,TentTree,CalendarDays,ShieldCheck} from 'lucide-react';
export const destinations = [
  {path:'/',name:'启动台',icon:House,group:'游玩',rail:true,keys:'开始 游戏 首页'},
  {path:'/library',name:'游戏库',icon:LibraryBig,group:'游玩',rail:true,keys:'实例 搜索 收藏 管理 文件 存档'},
  {path:'/workshop',name:'资源工坊',icon:Boxes,group:'游玩',rail:true,keys:'资源 模组 光影 搜索 版本'},
  {path:'/workshop/install',name:'安装游戏',icon:Boxes,group:'游玩',keys:'原版 Fabric Forge NeoForge 整合包 导入'},
  {path:'/multiplayer',name:'联机大厅',icon:Network,group:'游玩',rail:true,keys:'开房 P2P 直连 邀请 中继'},
  {path:'/community',name:'社区',icon:MessagesSquare,group:'小镇',rail:true,member:true,keys:'聊天 表情 频道'},
  {path:'/arcade',name:'小游戏',icon:Gamepad2,group:'小镇',rail:true,keys:'练习 棋类 双人 肉鸽'},
  {path:'/music',name:'音乐',icon:Music2,group:'小镇',rail:true,keys:'歌单 歌词 播放'},
  {path:'/explore',name:'全部功能',icon:Compass,group:'小镇',rail:true,keys:'目录 发现'},
  {path:'/account',name:'账号与角色',icon:ContactRound,group:'个人',keys:'皮肤 登录 身份'},
  {path:'/settings',name:'设置',icon:Settings2,group:'个人',keys:'Java 下载 外观 字号 目录'},
  {path:'/cards',name:'首页插件',icon:Puzzle,group:'个人',keys:'市场 展示 扩展 卡片'},
  {path:'/workbench',name:'自定义工作台',icon:LayoutDashboard,group:'个人',keys:'卡片 布局 快捷方式'},
  {path:'/community/voice',name:'语音房间',icon:Radio,group:'社区服务',member:true,keys:'一起听 通话 连麦'},
  {path:'/community/forum',name:'论坛',icon:BookOpen,group:'社区服务',member:true,keys:'发帖 回复 收藏'},
  {path:'/community/blueprints',name:'机械动力蓝图',icon:Boxes,group:'社区服务',member:true,keys:'作品 上传 附件'},
  {path:'/community/inbox',name:'收件箱',icon:Inbox,group:'社区服务',member:true,keys:'通知 消息 提及'},
  {path:'/community/playtime',name:'游玩日历',icon:CalendarDays,group:'社区服务',member:true,keys:'时长 每周榜 奖励'},
  {path:'/guild',name:'冒险家协会',icon:ScrollText,group:'社区服务',member:true,keys:'委托 接取 积分'},
  {path:'/arcade/shop',name:'积分商城',icon:ShoppingBag,group:'社区服务',member:true,keys:'兑换 商品 交易'},
  {path:'/account/backpack',name:'我的背包',icon:FolderHeart,group:'社区服务',member:true,keys:'物品 凭证'},
  {path:'/arcade/ranking',name:'小游戏排行榜',icon:Trophy,group:'社区服务',member:true,keys:'挑战 周榜'},
  {path:'/linking',name:'LINKING 档案馆',icon:BookOpen,group:'小镇',keys:'剧情 档案 活动 任务'},
  {path:'/library/worlds',name:'世界与入服',icon:TentTree,group:'社区服务',member:true,keys:'白名单 服务器'},
  {path:'/feedback',name:'问题反馈',icon:LifeBuoy,group:'个人',member:true,keys:'崩溃 诊断 报告'},
  {path:'/manage',name:'社区管理',icon:ShieldCheck,group:'管理',admin:true,member:true,keys:'审核 管理员'},
  {path:'/community/events',name:'活动与赛事',icon:CalendarDays,group:'社区服务',member:true,keys:'比赛 参与'},
  {path:'/community/council',name:'社区议事',icon:ScrollText,group:'社区服务',member:true,keys:'提案 账本'},
  {path:'/music/watch',name:'一起看视频',icon:Radio,group:'社区服务',member:true,keys:'放映 共同观看'},
  {path:'/settings/appeals',name:'申诉与协商',icon:LifeBuoy,group:'社区服务',member:true,keys:'申诉 反馈'},
  {path:'/account/community',name:'玩家空间',icon:ContactRound,group:'社区服务',member:true,keys:'个人空间 收藏'},
  {path:'/arcade/shop/trades',name:'玩家交易',icon:ShoppingBag,group:'社区服务',member:true,keys:'集市 交易'}
];
export const currentDestination=(path:string)=>destinations.filter(d=>d.path===path || (d.path!=='/'&&path.startsWith(d.path+'/'))).sort((a,b)=>b.path.length-a.path.length)[0];
export function matches(query:string,...values:unknown[]) {
  const tokens=query.trim().toLocaleLowerCase().split(/\s+/);
  const text=values.filter(Boolean).join(' ').toLocaleLowerCase();
  return tokens.every(token=>text.includes(token));
}
