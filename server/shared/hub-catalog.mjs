// Stable content identifiers shared by desktop, Android and the community server.
export const HUB_KINDS = Object.freeze({
 event:{label:'活动与赛事',singular:'活动',icon:'calendar',moderated:true,fields:[['format','活动类型','select','casual:聚会,tournament:比赛,hunt:寻宝,irl:线下活动'],['starts','开始时间','time'],['ends','结束时间','time'],['capacity','人数上限','number'],['server','服务器','server']]},
 project:{label:'共同项目',singular:'项目',icon:'layers',fields:[['server','服务器','server']]},
 article:{label:'知识库',singular:'文章',icon:'book',moderated:true,fields:[['server','服务器','server'],['version','适用版本','text']]},
 work:{label:'作品展厅',singular:'作品',icon:'image',moderated:true,fields:[['category','作品分类','select','build:建筑,blueprint:蓝图,art:绘画,photo:摄影,video:视频'],['link','作品链接','url']]},
 world:{label:'世界体验',singular:'世界',icon:'globe',moderated:true,fields:[['version','Minecraft 版本','text'],['loader','加载器','select',':原版,fabric:Fabric,neoforge:NeoForge,forge:Forge'],['loaderVersion','加载器版本（有加载器时填写）','text'],['packageType','文件类型','select','world:单世界 ZIP,modpack:完整 Modrinth 整合包'],['mapVersion','地图版本','text'],['source','下载地址','url'],['sha256','文件 SHA-256','text'],['relay','接力模式','boolean']]},
 landmark:{label:'服务器地标',singular:'地标',icon:'pin',moderated:true,fields:[['server','服务器','server'],['dimension','维度','text'],['x','X 坐标','number'],['y','Y 坐标','number'],['z','Z 坐标','number']]},
 recipe:{label:'配方与生产计划',singular:'配方',icon:'box',moderated:true,fields:[['server','服务器','server'],['version','适用版本','text'],['output','产物 ID','text'],['quantity','产出数量','number'],['seconds','制作秒数','number'],['ingredients','材料（每行 ID=数量）','multiline']]},
 program:{label:'节目与放映',singular:'节目',icon:'music',moderated:true,fields:[['format','节目类型','select','audio:音频,video:视频直链,bilibili:B站视频'],['source','播放地址 / B站视频链接','url']]},
 story:{label:'互动作品',singular:'互动作品',icon:'game',moderated:true,fields:[['nodes','剧情节点 JSON','multiline']]},
 journal:{label:'个人记录',singular:'记录',icon:'book',fields:[['game','游戏名称','text'],['progress','游玩进度','select','planned:计划游玩,playing:正在游玩,finished:已完成'],['season','周目名称','text']]},
 proposal:{label:'社区提案',singular:'提案',icon:'message',moderated:true,fields:[['choices','选项（每行一项）','multiline'],['ends','投票截止','time']]},
 ledger:{label:'公共账本',singular:'账目',icon:'wallet',admin:true,fields:[['amount','金额（支出为负）','text'],['category','用途','text'],['receipt','凭据链接','url']]},
 whitelist:{label:'入服申请',singular:'申请',icon:'user',private:true,fields:[['server','目标服务器','server'],['player','游戏角色名','text']]},
 appeal:{label:'申诉与协商',singular:'申诉',icon:'shield',private:true,fields:[['reference','相关交易或反馈编号','text']]},
});
export const HUB_SERVERS = [['','不限'],['survival','原版生存群组'],['mod-1','模组一服'],['mod-2','模组二服']];
export const HUB_STATES = {draft:'草稿',review:'待审核',published:'已发布',closed:'已结束',rejected:'需修改',archived:'已归档'};
