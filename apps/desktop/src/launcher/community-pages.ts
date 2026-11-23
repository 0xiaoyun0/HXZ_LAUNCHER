import {AudioLines,Backpack,BookOpen,Boxes,CalendarDays,Gamepad2,Trophy,Clock3,Coins,Globe,Mail,MessageCircle,MessagesSquare,ScrollText,ShieldCheck,ShoppingBag,Star} from 'lucide-react';

export const communityPages=[
  {path:'/community',group:'常用',label:'聊天',terms:'文字大厅 伙伴 发言 消息',icon:MessageCircle},
  {path:'/community/forum',group:'常用',label:'论坛',terms:'话题 收藏 发帖 回复',icon:MessagesSquare},
  {path:'/community/voice',group:'常用',label:'语音房',terms:'麦克风 按键说话 一起听 PTT',icon:AudioLines},
  {path:'/community/inbox',group:'常用',label:'收件箱',terms:'未读 站内信 审核通知 回执',icon:Mail},
  {path:'/community/guild',group:'交流与活动',label:'冒险者协会',terms:'冒险家 委托 验收',icon:ScrollText},
  {path:'/community/linking',group:'交流与活动',label:'LINKING 档案馆',terms:'剧情 卷宗 阅读 灯标',icon:BookOpen},
  {path:'/community/playtime',group:'记录与收藏',label:'服务器在线记录',terms:'跨设备 核验 时长 积分 周榜',icon:Clock3},
  {path:'/community/ranking',group:'常用',label:'积分排行榜',terms:'排行榜 周榜 个人名次 积分榜 年度总榜 小游戏',icon:Trophy},
  {path:'/community/arcade/board/gomoku',group:'小游戏联机',label:'五子棋',terms:'社区棋桌 机器人 挑战榜',icon:Gamepad2},
  {path:'/community/arcade/board/xiangqi',group:'小游戏联机',label:'象棋对战',terms:'中国象棋 机器人 挑战榜',icon:Gamepad2},
  {path:'/community/arcade/board/chess',group:'小游戏联机',label:'国际象棋',terms:'社区棋桌 机器人 挑战榜',icon:Gamepad2},
  {path:'/community/arcade/social/werewolf',group:'小游戏联机',label:'月下圆桌',terms:'狼人杀 六人桌',icon:Gamepad2},
  {path:'/community/arcade/coop/tanks',group:'小游戏联机',label:'星堡双卫合作大厅',terms:'坦克 双人合作 房间',icon:Gamepad2},
  {path:'/community/trades',group:'账户与服务',label:'玩家交易',terms:'市集 订单 积分 商城',icon:ShoppingBag},
  {path:'/community/worlds',group:'交流与活动',label:'世界与入服',terms:'白名单 申请 空位提醒 世界下载 游戏服聊天',icon:Globe},
  {path:'/community/blueprints',group:'记录与收藏',label:'机械动力蓝图',terms:'资源 搜索 投稿 收藏 材料 nbt',icon:Boxes},
  {path:'/community/wallet',group:'账户与服务',label:'我的积分',terms:'交易流水 兑换码 余额',icon:Coins},
  {path:'/community/backpack',group:'账户与服务',label:'我的背包',terms:'领取 道具 凭证 权益 附件',icon:Backpack},
  {path:'/community/shop',group:'账户与服务',label:'积分商城',terms:'兑换 订单 交付 退款',icon:ShoppingBag},
  {path:'/community/saved',group:'记录与收藏',label:'我的收藏',terms:'订阅 玩家空间 旧收藏',icon:Star},
  {path:'/community/events',group:'交流与活动',label:'活动与赛事',terms:'报名 赛程 签到',icon:CalendarDays},
  {path:'/community/appeals',group:'账户与服务',label:'申诉与协商',terms:'交易 处理进度',icon:ShieldCheck},
] as const;

export function desktopDestination(value:string):string|null{
  let url:URL;try{url=new URL(value,'https://local.invalid');}catch{return null;}
  if(url.origin!=='https://local.invalid')return null;
  const aliases:Record<string,string>={'/library/worlds':'/community/worlds','/account/community':'/community/saved','/account/backpack':'/community/backpack','/arcade/shop':'/community/shop','/arcade/shop/trades':'/community/trades','/arcade/ranking':'/community/ranking','/arcade/workshop':'/arcade','/account':'/community/wallet','/settings/appeals':'/community/appeals','/workshop/blueprints':'/community/blueprints','/community/notices':'/updates','/guild':'/community/guild','/linking':'/community/linking'};
  const target=url.pathname==='/settings'&&url.searchParams.has('feedback')?'/support':aliases[url.pathname]||(/^\/arcade\/(?:board|social|coop)\//.test(url.pathname)?'/community'+url.pathname:url.pathname);
  const available=communityPages.some(p=>p.path===target)||/^\/community\/forum\/[\w-]+$/.test(target)||/^\/arcade\/play\/[\w-]+$/.test(target)||['/','/arcade','/library','/multiplayer','/music','/settings','/updates','/support','/workshop','/servers'].includes(target);
  return available?target+url.search:null;
}
