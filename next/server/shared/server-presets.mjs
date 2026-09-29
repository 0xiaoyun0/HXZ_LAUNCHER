export const DEFAULT_SERVERS = [
  {id:"HXZ-survival",group:"survival",name:"原版生存群组服",version:"26.2",loader:"fabric",loaderVersion:"",fabricAPI:true,address:"s1.hxzmc.top",updateUrls:["https://hxzup.1szt.com/original"],autoUpdate:true,updateRequired:false,autoJoin:true,enabled:true,profileSource:"manual",packageUrl:"",packageSha256:""},
  {id:"HXZ-mod-1",group:"mod-1",name:"模组一服",version:"",loader:"",loaderVersion:"",fabricAPI:false,address:"",updateUrls:["https://hxzup.1szt.com/modv1"],autoUpdate:true,updateRequired:false,autoJoin:true,enabled:true,profileSource:"hxzup",packageUrl:"",packageSha256:""},
  {id:"HXZ-mod-2",group:"mod-2",name:"模组二服",version:"",loader:"",loaderVersion:"",fabricAPI:false,address:"",updateUrls:["https://hxzup.1szt.com/modv2"],autoUpdate:true,updateRequired:false,autoJoin:true,enabled:true,profileSource:"hxzup",packageUrl:"",packageSha256:""}
];
export function normalizeUpdateUrl(value) {
  if(typeof value!=='string'||!value.trim()||value.length>2048)throw Error('请输入有效的 HTTP(S) 地址');
  const u = new URL(value);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.hash || u.search) throw Error('下载地址必须是无凭据的 HTTP(S) 地址');
  return u.href.replace(/\/$/,'');
}
export function normalizePresets(value) {
  if (!Array.isArray(value) || value.length!==3) throw Error('需要完整配置三个默认服务器');
  return DEFAULT_SERVERS.map(base=>{
    const input=value.find(p=>p.id===base.id);
    if (!input) throw Error('缺少服务器 '+base.name);
    const p={...base};
    for (const key of ['name','version','loader','loaderVersion','address','profileSource','packageUrl','packageSha256']) {
      if (typeof input[key]!=='string' || input[key].length>2048) throw Error('服务器字段无效：'+key);
      p[key]=input[key].trim();
    }
    if (!p.name || p.name.length>50 || !['manual','hxzup','package'].includes(p.profileSource) || !['','fabric','quilt','forge','neoforge'].includes(p.loader)) throw Error('服务器名称、安装来源或加载器无效');
    for (const key of ['version','loaderVersion']) if(p[key]&&!/^[\w.+-]{1,100}$/.test(p[key]))throw Error('游戏或加载器版本格式无效');
    if(p.address&&!/^(?:[a-z0-9][a-z0-9.-]*|\[[0-9a-f:]+\])(?::\d{1,5})?$/i.test(p.address))throw Error('游戏服务器地址无效');
    if (!Array.isArray(input.updateUrls) || input.updateUrls.length>16) throw Error('每个服务器最多设置 16 个更新地址');
    p.updateUrls=[...new Set(input.updateUrls.map(normalizeUpdateUrl))];
    if (p.packageUrl) p.packageUrl=normalizeUpdateUrl(p.packageUrl);
    if (p.packageSha256 && !/^[a-f0-9]{64}$/i.test(p.packageSha256))throw Error('包体 SHA256 无效');
    if (p.profileSource==='package' && (!p.packageUrl || !p.packageSha256))throw Error('整合包安装需要下载地址和 SHA256');
    if (p.profileSource==='hxzup'&&!p.updateUrls.length)throw Error('请填写 HXZ UP 地址');
    if (p.profileSource==='manual'&&!p.version)throw Error('请填写 Minecraft 版本');
    for (const key of ['fabricAPI','autoUpdate','updateRequired','autoJoin','enabled'])p[key]=input[key]===true;
    if(p.fabricAPI&&p.loader!=='fabric')throw Error('Fabric API 需要 Fabric 加载器');
    if(p.updateRequired&&!p.updateUrls.length)throw Error('强制更新需要 HXZ UP 地址');
    return p;
  });
}
