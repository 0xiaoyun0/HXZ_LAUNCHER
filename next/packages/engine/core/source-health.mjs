// Explicit, small endpoint probes. Downloads update this state; they never
// probe the entire registry for each artifact.
const pom = '/com/google/code/gson/gson/2.10.1/gson-2.10.1.pom';
export const DOWNLOAD_NODES = Object.freeze([
  {id:'mojang-meta',name:'Mojang 版本信息',type:'官方 · 国际',host:'piston-meta.mojang.com',scope:'Minecraft 版本清单与元数据',probe:'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'},
  {id:'mojang-meta-backup',name:'Mojang 备用元数据',type:'官方 · 国际',host:'launchermeta.mojang.com',scope:'Minecraft 元数据备用域名',probe:'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'},
  {id:'mojang-data',name:'Mojang 游戏文件',type:'官方 · 国际',host:'piston-data.mojang.com',scope:'游戏本体、日志配置',probe:'https://piston-data.mojang.com/v1/objects/bd65e7d2e3c237be76cfbef4c2405033d7f91521/client-1.12.xml'},
  {id:'mojang-data-backup',name:'Mojang 备用文件',type:'官方 · 国际',host:'launcher.mojang.com',scope:'游戏文件备用域名',probe:'https://launcher.mojang.com/v1/objects/bd65e7d2e3c237be76cfbef4c2405033d7f91521/client-1.12.xml'},
  {id:'minecraft-libraries',name:'Minecraft 依赖库',type:'官方 · 国际',host:'libraries.minecraft.net',scope:'游戏元数据指定的 Java 依赖',probe:'https://libraries.minecraft.net'+pom},
  {id:'minecraft-assets',name:'Minecraft 资源对象',type:'官方 · 国际',host:'resources.download.minecraft.net',scope:'游戏资源散列对象',probe:'https://resources.download.minecraft.net/9d/9dd32387135eefa7ab95996d52a5ca4cec8a3b30'},
  {id:'fabric-meta',name:'Fabric 元数据',type:'官方 · 国际',host:'meta.fabricmc.net',scope:'Fabric 加载器版本与安装信息',probe:'https://meta.fabricmc.net/v2/versions/loader'},
  {id:'fabric-maven',name:'Fabric Maven',type:'官方 · 国际',host:'maven.fabricmc.net',scope:'Fabric 加载器依赖',probe:'https://maven.fabricmc.net/net/fabricmc/fabric-loader/maven-metadata.xml'},
  {id:'quilt',name:'Quilt 元数据',type:'官方 · 国际',host:'meta.quiltmc.org',scope:'Quilt 版本与安装信息',probe:'https://meta.quiltmc.org/v3/versions/loader'},
  {id:'forge',name:'Forge Maven',type:'官方 · 国际',host:'maven.minecraftforge.net',scope:'Forge 安装器与依赖',probe:'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml'},
  {id:'neoforge',name:'NeoForge Maven',type:'官方 · 国际',host:'maven.neoforged.net',scope:'NeoForge 安装器与依赖',probe:'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml'},
  {id:'central',name:'Maven Central',type:'官方仓库 · 国际',host:'repo.maven.apache.org',scope:'Maven Central 公共依赖',probe:'https://repo.maven.apache.org/maven2'+pom},
  {id:'central-backup',name:'Maven Central 备用域名',type:'官方仓库 · 国际',host:'repo1.maven.org',scope:'Maven Central 公共依赖',probe:'https://repo1.maven.org/maven2'+pom},
  {id:'aliyun',name:'阿里云 Maven',type:'镜像 · 国内',host:'maven.aliyun.com',scope:'Maven 公共依赖；不用于游戏本体',probe:'https://maven.aliyun.com/repository/public'+pom},
  {id:'huawei',name:'华为云 Maven',type:'镜像 · 国内',host:'repo.huaweicloud.com',scope:'Maven 公共依赖；不用于游戏本体',probe:'https://repo.huaweicloud.com/repository/maven'+pom},
  {id:'bmclapi',name:'BMCLAPI',type:'镜像 · 国内',host:'bmclapi2.bangbang93.com',scope:'Minecraft 元数据、依赖、资源与支持的加载器',probe:'https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json'},
  {id:'modrinth',name:'Modrinth',type:'官方 · 国际',host:'api.modrinth.com',scope:'整合包与扩展内容元数据',probe:'https://api.modrinth.com/v2/tag/game_version'},
  {id:'mcim',name:'MCIM',type:'镜像 · 国内',host:'mod.mcimirror.top',scope:'Modrinth / CurseForge 已支持的公共接口与文件',probe:'https://mod.mcimirror.top/modrinth/v2/tag/game_version'}
]);
const states = new Map();
let running;
export function observeSource(url, value) {
  let host;try {host=new URL(url).hostname;} catch {return;}
  for (const node of DOWNLOAD_NODES) if(node.host===host){
    // An explicit in-flight probe owns its visible result until it settles.
    // Background file headers must not make an active probe look completed.
    if(states.get(node.id)?.state==='probing')continue;
    states.set(node.id,{...states.get(node.id),...value,checkedAt:Date.now()});
  }
}
export function downloadNodeStatus() {return DOWNLOAD_NODES.map(({probe,...node})=>({...node,state:'unprobed',latencyMs:null,reason:'',...states.get(node.id)}));}
export function cancelNodeProbe(){running?.controller.abort(Error('节点检测已取消'));}
export function probeDownloadNodes(ids) {
  if(running)throw Error('节点检测正在进行，请等待或停止当前检测');
  const wanted=ids==null?DOWNLOAD_NODES:DOWNLOAD_NODES.filter(n=>ids.includes(n.id));
  if(!wanted.length)throw Error('未找到下载节点');
  const controller=new AbortController();
  const promise=(async()=>{let next=0;await Promise.all(Array.from({length:Math.min(4,wanted.length)},async()=>{
    while(next<wanted.length){const node=wanted[next++];if(controller.signal.aborted)break;
      const start=Date.now();states.set(node.id,{state:'probing',latencyMs:null,reason:'',checkedAt:start,checkKind:'probe'});
      try {
        const response=await fetch(node.probe,{method:'GET',headers:{Range:'bytes=0-0','Accept-Encoding':'identity'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(6000)])});
        const latencyMs=Date.now()-start;await response.body?.cancel();
        states.set(node.id,{state:response.ok?'reachable':'error',latencyMs,reason:response.ok?'':`样本请求 HTTP ${response.status}`,checkedAt:Date.now(),checkKind:'probe'});
      } catch(error) {states.set(node.id,{state:controller.signal.aborted?'cancelled':'error',latencyMs:null,reason:controller.signal.aborted?'检测已取消':error.name==='TimeoutError'?'样本请求 6 秒超时':error.cause?.code||error.message||'连接失败',checkedAt:Date.now(),checkKind:'probe'});}
    }
  }));return downloadNodeStatus();})().finally(()=>{running=null;});
  running={controller,promise};return promise;
}
