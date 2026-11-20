import {Play,MessagesSquare,MessageCircle,Music2,BookOpen,ScrollText,Clock3,LibraryBig,PackageOpen,Network,Settings2,Stethoscope,UserRound} from 'lucide-react';
import {communityPages} from './community-pages';
export const pages=[
 {path:'/',label:'游戏',terms:'首页 继续 上次 游玩 启动',icon:Play,primary:true,member:false},
 {path:'/library',label:'游戏库',terms:'实例 收藏 存档 文件 管理',icon:LibraryBig,primary:true,member:false},
 {path:'/workshop',label:'资源',terms:'整合包 模组 下载',icon:PackageOpen,primary:true,member:false},
 {path:'/servers',label:'默认服务器',terms:'原版生存群组服 模组一服 模组二服 人数 名单 更新 入服 状态 监控',icon:Network,primary:false,member:false},
 {path:'/multiplayer',label:'联机大厅',terms:'邀请 房间 P2P 直连',icon:Network,primary:true,member:true},
 ...communityPages.map(p=>({...p,label:p.path==='/community'?'社区':p.label,primary:p.path==='/community',member:true})),
 {path:'/music',label:'音乐播放器',terms:'歌曲 歌单 音量 本地 音乐',icon:Music2,primary:false,member:false},
 {path:'/support',label:'帮助与反馈',terms:'工单 管理员 错误诊断 求助 AI',icon:MessagesSquare,primary:false,member:false},
 {path:'/updates',label:'更新公告',terms:'版本 历史 发布说明',icon:BookOpen,primary:false,member:false},
 {path:'/playtime',label:'游玩记录',terms:'游戏时长 统计 历史 日历',icon:Clock3,primary:false,member:false},
 {path:'/workshop/install',label:'安装游戏',terms:'原版 Forge Fabric NeoForge',icon:PackageOpen,primary:false,member:false},
 {path:'/workshop/addons',label:'扩展内容',terms:'资源包 光影 模组',icon:PackageOpen,primary:false,member:false},
 {path:'/workshop/blueprints',label:'公共蓝图',terms:'机械动力 搜索 材料 NBT 下载',icon:PackageOpen,primary:false,member:false},
 {path:'/workshop/sources',label:'下载节点',terms:'镜像 下载源',icon:Network,primary:false,member:false},
 {path:'/check',label:'启动前检查',terms:'检查 Java 缺少 文件 角色 诊断',icon:Stethoscope,primary:false,member:false},
 {path:'/account',label:'账号与角色',terms:'皮肤 身份 切换 登录',icon:UserRound,primary:false,member:false},
 {path:'/settings/extensions',label:'扩展',terms:'社区 插件 下载 安装 停用 重启',icon:PackageOpen,primary:false,member:false},
 {path:'/settings?section=appearance',label:'外观与启动器',terms:'外观 自定义 主题 风格 壁纸 透明 圆角 小镇微光 星海观测站 纸上工坊',icon:Settings2,primary:false,member:false},
 {path:'/settings',label:'设置',terms:'Java 内存 目录 迁移 下载 外观 版本',icon:Settings2,primary:false,member:false}
];
