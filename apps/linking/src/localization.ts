/** Host-interface text is separate from administrator-authored chapter content. */
export const zhCN = {
  title:'LINKING 档案馆', loading:'正在连接档案馆…', retry:'重新连接', chapters:'章节目录', tasks:'任务与进度',
  manage:'管理活动', readMode:'阅读模式', threeMode:'三维模式', refresh:'同步进度', close:'关闭', back:'返回档案馆',
  read:'阅读档案', locked:'尚未解锁', unlocked:'可以阅读', bookmarked:'取消收藏', bookmark:'收藏档案',
  submit:'提交', save:'保存草稿', publish:'发布当前草稿', archive:'归档章节', unsaved:'有尚未保存的内容。离开后将丢失本次修改，是否继续？',
  offline:'无法连接活动服务。请确认已登录社区，且社区服务端已更新。', disabled:'档案馆暂未开放', empty:'还没有发布的章节',
  waiting:'等待开放', ended:'本章已结束', complete:'已完成', pending:'等待管理员审核', blocked:'请先完成前置任务',
  readTask:'阅读对应档案后自动完成', saved:'草稿已保存，玩家界面尚未改变', published:'已发布，玩家同步后可见',
  privacy:'不要提交密码、令牌或其他私人凭据。', original:'界面基于 RhineLabUI（MIT），内容为幻想镇原创。字体：MiSans（小米）。',
};
export const t=(key:keyof typeof zhCN)=>zhCN[key];
export const formatDate=(value:string|number)=>value?new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)):'随发布开放';
