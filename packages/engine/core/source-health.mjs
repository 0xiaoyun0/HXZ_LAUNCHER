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
  {id:'fabric-maven',name:'Fabric Maven',type:'官方 · 国际',host:'maven.fabricmc.net',scope:'Fabric 加载器依赖',probe:'https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar'},
  {id:'quilt',name:'Quilt 元数据',type:'官方 · 国际',host:'meta.quiltmc.org',scope:'Quilt 版本与安装信息',probe:'https://meta.quiltmc.org/v3/versions/loader'},
  {id:'forge',name:'Forge Maven',type:'官方 · 国际',host:'maven.minecraftforge.net',scope:'Forge 安装器与依赖',probe:'https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.2.0/forge-1.20.1-47.2.0-installer.jar'},
  {id:'neoforge',name:'NeoForge Maven',type:'官方 · 国际',host:'maven.neoforged.net',scope:'NeoForge 安装器与依赖',probe:'https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.1/neoforge-21.1.1-installer.jar'},
  {id:'central',name:'Maven Central',type:'官方仓库 · 国际',host:'repo.maven.apache.org',scope:'Maven Central 公共依赖',probe:'https://repo.maven.apache.org/maven2'+pom},
  {id:'central-backup',name:'Maven Central 备用域名',type:'官方仓库 · 国际',host:'repo1.maven.org',scope:'Maven Central 公共依赖',probe:'https://repo1.maven.org/maven2'+pom},
  {id:'central-americas',name:'GCS Central 美洲',type:'镜像 · 美洲',host:'maven-central.storage-download.googleapis.com',scope:'Maven Central 同坐标文件；Google Cloud 运营，非官方支持产品',probe:'https://maven-central.storage-download.googleapis.com/maven2'+pom},
  {id:'central-eu',name:'GCS Central 欧洲',type:'镜像 · 欧洲',host:'maven-central-eu.storage-download.googleapis.com',scope:'Maven Central 同坐标文件；与美洲共享运营方',probe:'https://maven-central-eu.storage-download.googleapis.com/maven2'+pom},
  {id:'central-asia',name:'GCS Central 亚太',type:'镜像 · 亚太',host:'maven-central-asia.storage-download.googleapis.com',scope:'Maven Central 同坐标文件；与美洲共享运营方',probe:'https://maven-central-asia.storage-download.googleapis.com/maven2'+pom},
  {id:'jboss',name:'JBoss Central 代理',type:'镜像 · 国际',host:'repository.jboss.org',scope:'仅 Maven Central 公共依赖；不访问 JBoss 私有或重打包仓库',probe:'https://repository.jboss.org/nexus/content/repositories/central'+pom},
  {id:'eclipse',name:'Eclipse Central 缓存',type:'镜像 · 国际',host:'repo.eclipse.org',scope:'仅 Maven Central 公共依赖；新旧路径计同一来源',probe:'https://repo.eclipse.org/repository/maven-central'+pom},
  {id:'sponge',name:'Sponge 依赖缓存',type:'镜像 · 国际',host:'repo.spongepowered.org',scope:'Central 与明确登记的 Fabric/Forge/Quilt/NeoForge 各专用代理',probe:'https://repo.spongepowered.org/repository/maven-central'+pom},
  {id:'paper',name:'Paper 公共依赖缓存',type:'镜像 · 国际',host:'repo.papermc.io',scope:'公共 Maven 依赖的同坐标文件；缓存缺失时继续下一来源',probe:'https://repo.papermc.io/repository/maven-public'+pom},
  {id:'jetbrains',name:'JetBrains Central 缓存',type:'镜像 · 国际',host:'cache-redirector.jetbrains.com',scope:'仅其公开配置的 Central 文件路由；不代理任意地址',probe:'https://cache-redirector.jetbrains.com/repo.maven.apache.org/maven2'+pom},
  {id:'mulesoft',name:'MuleSoft 公共依赖缓存',type:'镜像 · 国际',host:'repository.mulesoft.org',scope:'仅公开 public 仓库中同坐标文件；不访问企业仓库',probe:'https://repository.mulesoft.org/nexus/content/repositories/public'+pom},
  {id:'netease',name:'网易 Maven',type:'镜像 · 国内',host:'mirrors.163.com',scope:'公共 Maven 依赖；仅 HTTPS，不用于游戏本体',probe:'https://mirrors.163.com/maven/repository/maven-public'+pom},
  {id:'nju',name:'南京大学 Maven',type:'镜像 · 国内',host:'repo.nju.edu.cn',scope:'官方公开的 Central 与 Gradle 插件混合镜像；仅同坐标公共依赖',probe:'https://repo.nju.edu.cn/maven'+pom},
  {id:'ustc',name:'中科大 Central 代理',type:'镜像 · 国内',host:'maven.proxy.ustclug.org',scope:'中科大公开登记的 repo1.maven.org 代理；仅公共 Central 依赖',probe:'https://maven.proxy.ustclug.org/maven2'+pom},
  {id:'reposilite',name:'Reposilite Central 缓存',type:'镜像 · 国际',host:'maven.reposilite.com',scope:'Reposilite 官方公开 maven-central 仓库中的同坐标公共依赖',probe:'https://maven.reposilite.com/maven-central'+pom},
  {id:'aliyun',name:'阿里云 Maven',type:'镜像 · 国内',host:'maven.aliyun.com',scope:'Maven 公共依赖；不用于游戏本体',probe:'https://maven.aliyun.com/repository/public'+pom},
  {id:'huawei',name:'华为云 Maven',type:'镜像 · 国内',host:'repo.huaweicloud.com',scope:'Maven 公共依赖；不用于游戏本体',probe:'https://repo.huaweicloud.com/repository/maven'+pom},
  {id:'tencent',name:'腾讯云 Maven',type:'镜像 · 国内',host:'mirrors.cloud.tencent.com',scope:'Maven Central 同坐标公共依赖；不用于游戏本体',probe:'https://mirrors.cloud.tencent.com/nexus/repository/maven-public'+pom},
  {id:'bmclapi',name:'BMCLAPI',type:'镜像 · 国内',host:'bmclapi2.bangbang93.com',scope:'Minecraft 元数据、依赖、资源与支持的加载器',probe:'https://bmclapi2.bangbang93.com/maven'+pom},
  {id:'modrinth',name:'Modrinth',type:'官方 · 国际',host:'api.modrinth.com',scope:'整合包与扩展内容元数据',probe:'https://api.modrinth.com/v2/tag/game_version'},
  {id:'mcim',name:'MCIM',type:'镜像 · 国内',host:'mod.mcimirror.top',scope:'Modrinth / CurseForge 已支持的公共接口与文件；遵守原站权限',probe:'https://mod.mcimirror.top/data/P7dR8mSH/versions/YG53rBmj/fabric-api-0.92.0%2B1.20.1.jar'},
  {id:'quilt-maven',name:'Quilt Maven',type:'官方 · 国际',host:'maven.quiltmc.org',scope:'Quilt 元数据指定的加载器依赖；Sponge 专用代理备用',probe:'https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-loader/0.26.4/quilt-loader-0.26.4.pom'},
  {id:'modrinth-cdn',name:'Modrinth 文件',type:'官方 · 国际',host:'cdn.modrinth.com',scope:'Modrinth 元数据指定的模组、资源包与整合包文件',probe:'https://cdn.modrinth.com/data/P7dR8mSH/versions/YG53rBmj/fabric-api-0.92.0%2B1.20.1.jar'},
  {id:'authlib',name:'authlib-injector 文件',type:'官方 · 国际',host:'authlib-injector.yushi.moe',scope:'皮肤站登录所需注入器；同版本 BMCLAPI 备用',probe:'https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar'},
  {id:'azul-cdn',name:'Azul Zulu Java 文件',type:'官方 · 国际',host:'cdn.azul.com',scope:'Azul 元数据与 SHA256 指定的 Java；暂无已核实同版本备用',probe:'https://cdn.azul.com/zulu/bin/zulu21.52.203-ca-fx-jre21.0.12.1-win_x64.zip'},
  {id:'github-release',name:'GitHub 发布文件',type:'官方托管 · 国际',host:'github.com',scope:'authlib-injector 同版本官方发布文件、启动器签名发布文件',probe:'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar'},
  {id:'gh-proxy',name:'GH-Proxy 发布文件镜像',type:'镜像 · 国际',host:'gh-proxy.com',scope:'仅公共 GitHub 发布文件；gh-proxy.org 为同运营方，不重复计数',probe:'https://gh-proxy.com/https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar'},
  {id:'ghproxy',name:'GHProxy 发布文件镜像',type:'镜像 · 国际',host:'ghproxy.net',scope:'仅公共 GitHub 发布文件；文件按原发布者哈希校验',probe:'https://ghproxy.net/https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar'}
].map(node=>({...node,purpose:['mojang-meta','mojang-meta-backup','fabric-meta','quilt','modrinth'].includes(node.id)?'metadata':'file'})));
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
