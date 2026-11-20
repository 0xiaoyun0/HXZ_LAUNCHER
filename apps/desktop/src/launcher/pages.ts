import {Play,MessagesSquare,MessageCircle,Music2,BookOpen,ScrollText,Clock3,LibraryBig,PackageOpen,Network,Settings2,Stethoscope,UserRound} from 'lucide-react';
export const pages=[
 {path:'/',label:'游戏',terms:'首页 继续 上次 游玩 启动',icon:Play,primary:true,member:false},
 {path:'/library',label:'游戏库',terms:'实例 收藏 存档 文件 管理',icon:LibraryBig,primary:true,member:false},
 {path:'/workshop',label:'资源',terms:'整合包 模组 下载',icon:PackageOpen,primary:true,member:false},
 {path:'/multiplayer',label:'联机大厅',terms:'邀请 房间 P2P 直连',icon:Network,primary:true,member:true},
 {path:'/community',label:'社区',terms:'聊天 发言 伙伴 文字大厅 消息',icon:MessageCircle,primary:true,member:false},
 {path:'/community/forum',label:'论坛',terms:'社区 话题 帖子 回复',icon:MessagesSquare,primary:false,member:true},
 {path:'/music',label:'音乐播放器',terms:'歌曲 歌单 音量 本地 音乐',icon:Music2,primary:false,member:false},
 {path:'/community/guild',label:'冒险者协会',terms:'冒险家 公会 委托 社区',icon:ScrollText,primary:false,member:true},
 {path:'/community/linking',label:'LINKING 档案馆',terms:'剧情 卷宗 阅读 档案',icon:BookOpen,primary:false,member:true},
 {path:'/playtime',label:'游玩记录',terms:'游戏时长 统计 历史 日历',icon:Clock3,primary:false,member:false},
 {path:'/workshop/install',label:'安装游戏',terms:'原版 Forge Fabric NeoForge',icon:PackageOpen,primary:false,member:false},
 {path:'/workshop/addons',label:'扩展内容',terms:'资源包 光影 模组',icon:PackageOpen,primary:false,member:false},
 {path:'/workshop/sources',label:'下载节点',terms:'镜像 下载源',icon:Network,primary:false,member:false},
 {path:'/check',label:'启动前检查',terms:'检查 Java 缺少 文件 角色 诊断',icon:Stethoscope,primary:false,member:false},
 {path:'/account',label:'账号与角色',terms:'皮肤 身份 切换 登录',icon:UserRound,primary:false,member:false},
 {path:'/settings/extensions',label:'扩展',terms:'社区 插件 下载 安装 停用 重启',icon:PackageOpen,primary:false,member:false},
 {path:'/settings',label:'设置',terms:'Java 内存 目录 迁移 下载 外观 版本',icon:Settings2,primary:false,member:false}
];
