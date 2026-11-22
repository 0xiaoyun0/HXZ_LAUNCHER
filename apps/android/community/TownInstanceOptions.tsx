import {useEffect,useState} from 'react';
import {AlertTriangle,Check} from 'lucide-react';
import {invoke} from '../../desktop/src/model';
import {Modal} from '../../desktop/src/ui';

type Budget = {enabled:boolean;customHeap:boolean;baseMiB:number;extraMiB:number;limitMiB:number};
type InstanceOptions = {enabled:boolean;tier:'standard'|'large';physicalMiB:number;availableMiB:number;swapMiB:number;freeSwapMiB:number;
  customHeap:boolean;last:Budget|null;isolated:boolean;mobileGraphics:boolean;modelsAvailable:boolean;modelsEnabled:boolean;renderer:string;supportsZink:boolean;itemSearch:boolean|null};
const gib=(mib:number)=>(mib/1024).toFixed(1)+' GiB';

export function TownInstanceOptions({instance,close}:{instance:string;close:()=>void}){
  const [data,setData]=useState<InstanceOptions|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let visible=true;
    setError('');
    invoke<InstanceOptions>('android.game.options',{instance}).then(value=>{if(visible)setData(value);})
      .catch(()=>{if(visible)setError('暂时读不到实例设置，请重试。');});
    return ()=>{visible=false;};
  },[instance,attempt]);
  async function save(option:'graphics'|'swap'|'models'|'renderer'|'tier'|'itemSearch',value:boolean|string){
    setBusy(true);setError('');
    try{setData(await invoke<InstanceOptions>('android.game.options.save',{instance,option,...(typeof value==='string'?{[option]:value}:{enabled:value})}));}
    catch(e){setError(e instanceof Error?e.message:'未保存，请重试。');}
    finally{setBusy(false);}
  }
  return <Modal open title="实例设置" description={instance} onClose={close}>
    <div className="town-instance-options">
      {!data&&!error&&<p role="status">正在读取设备内存…</p>}
      {data&&<>
        <section><h3>游戏画质</h3>
          {data.isolated?<div className="town-option-row"><div><strong>手机画质</strong><p>降低渲染分辨率和视距，关闭光影。关闭此项可恢复之前的画质。</p></div>
          <button className="town-switch" type="button" role="switch" aria-label="手机画质" aria-checked={data.mobileGraphics}
            disabled={busy} onClick={()=>void save('graphics',!data.mobileGraphics)}><span>{data.mobileGraphics&&<Check size={12}/>}</span></button></div>
          :<p>这个实例与其他实例共用画质文件，可在游戏内调整。</p>}
          {(data.modelsAvailable||data.modelsEnabled)&&<div className="town-option-row"><div><strong>按需加载模型</strong><p>使用整合包内的 ModernFix 降低启动占用。首次看到方块时可能卡顿，模型异常时可关闭。</p></div>
            <button className="town-switch" type="button" role="switch" aria-label="按需加载模型" aria-checked={data.modelsEnabled}
              disabled={busy} onClick={()=>void save('models',!data.modelsEnabled)}><span>{data.modelsEnabled&&<Check size={12}/>}</span></button></div>}
          {data.itemSearch!=null&&<div className="town-option-row"><div><strong>低内存物品搜索</strong><p>让 JEI 的物品索引少占内存，搜索可能变慢。配方和物品列表照常可用。</p></div>
            <button className="town-switch" type="button" role="switch" aria-label="低内存物品搜索" aria-checked={data.itemSearch}
              disabled={busy} onClick={()=>void save('itemSearch',!data.itemSearch)}><span>{data.itemSearch&&<Check size={12}/>}</span></button></div>}
          <div><strong>图形渲染器</strong><div className="town-renderers" role="group" aria-label="图形渲染器">
            {([['default','沿用实例'],...(data.supportsZink?[['zink','Zink']]:[]),['mobileglues','MobileGlues']]).map(([value,label])=>
              <button key={value} type="button" className="small-action" aria-pressed={(data.renderer||'default')===value} disabled={busy}
                onClick={()=>void save('renderer',value)}>{label}</button>)}</div></div>
        </section>
        <section><h3>内存</h3>
          <dl className="town-memory-readout"><div><dt>物理运存</dt><dd>{gib(data.physicalMiB)}</dd></div>
            <div><dt>系统虚拟内存</dt><dd>{gib(data.swapMiB)}<small> · 当前空闲 {gib(data.freeSwapMiB)}</small></dd></div></dl>
          <div className="town-option-row"><div><strong>将系统虚拟内存计入游戏预算</strong><span className="town-risk"><AlertTriangle size={14}/>风险选项</span></div>
          <button type="button" className="town-switch" role="switch" aria-label="将系统虚拟内存计入游戏预算"
            aria-describedby="town-swap-help" aria-checked={data.enabled} disabled={busy||(!data.enabled&&(data.customHeap||data.swapMiB<=0))}
            onClick={()=>void save('swap',!data.enabled)}><span>{data.enabled&&<Check size={12}/>}</span></button></div>
          <p id="town-swap-help">默认关闭。开启后，下次启动会按可用物理运存和空闲交换空间适度提高 Java 堆上限。关闭后恢复基础预算。换页由安卓管理，游戏可能卡顿或因内存不足退出。</p>
          {data.enabled&&<div><strong>额外预算</strong><div className="town-renderers" role="group" aria-label="额外预算">
            {([['standard','标准 · 最多 1 GiB'],['large','加大 · 最多 2 GiB']] as const).map(([value,label])=>
              <button key={value} type="button" className="small-action" aria-pressed={(data.tier||'standard')===value} disabled={busy}
                onClick={()=>void save('tier',value)}>{label}</button>)}</div>
            {data.tier==='large'&&<p>加大档会使用更多空闲交换空间。实际增量以启动时的设备余量为准。</p>}</div>}
          {data.customHeap&&<p>此实例使用自定义 JVM 堆参数，移除自定义上限后可启用此项。</p>}
          {data.swapMiB<=0&&<p>安卓尚未报告交换空间。请在系统设置中查看运存扩展是否可用。</p>}
          {data.last&&<p className="town-budget" aria-label="上次启动预算">{data.last.customHeap?'上次启动使用了自定义 JVM 堆参数。':
            '上次启动的基础预算为 '+data.last.baseMiB+' MiB，额外计入 '+data.last.extraMiB+' MiB，堆上限 '+data.last.limitMiB+' MiB。'}</p>}
        </section>
      </>}
      {error&&<p role="alert" className="inline-error">{error} {!data&&<button className="small-action" onClick={()=>setAttempt(n=>n+1)}>重试</button>}</p>}
    </div>
  </Modal>;
}
