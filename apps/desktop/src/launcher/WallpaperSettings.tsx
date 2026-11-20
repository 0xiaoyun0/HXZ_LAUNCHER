import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {Check,Clapperboard,FileImage,FolderOpen,Image as ImageIcon,PaintBucket,RefreshCw,Trash2} from 'lucide-react';
import {ILLUSTRATIONS,wallpaperPreferences,wallpaperSource} from '../../../../packages/engine/core/desktop-wallpaper.mjs';
import {desktop,invoke,perform,saveSettings,state} from '../model';
import {retryWallpaper,wallpaperHealth} from './Wallpaper';
import {AppearanceSlider} from './AppearanceSlider';

const modes=[{id:'plain',label:'纯色',icon:PaintBucket},{id:'image',label:'静态图片',icon:ImageIcon},{id:'video',label:'动态视频',icon:Clapperboard}] as const;
export function WallpaperSettings(){
  const s=useSnapshot(state).settings,health=useSnapshot(wallpaperHealth),[picking,setPicking]=useState(false);
  const {wallpaperMode:mode,wallpaperImageSource:source}=wallpaperPreferences(s),media=wallpaperSource(s);
  const failed=mode!=='plain'&&(!media||health.failed===media.url);
  async function pick(kind:'image'|'video'){
    if(picking)return;
    setPicking(true);
    try{
      const file=await invoke('background.choose',{kind});
      if(!file)return;
      await saveSettings(kind==='image'?{wallpaperMode:kind,wallpaperImageSource:'file',backgroundImage:file}:{wallpaperMode:kind,backgroundVideo:file});retryWallpaper();
    }finally{setPicking(false);}
  }
  function select(next:'plain'|'image'|'video'){
    if(next==='video'&&!s.backgroundVideo)return perform(()=>pick('video'));
    if(next==='image'&&source==='file'&&!s.backgroundImage)return perform(()=>saveSettings({wallpaperMode:'image',wallpaperImageSource:'town'}));
    return perform(()=>saveSettings({wallpaperMode:next}));
  }
  return <><section className="preference-section wallpaper-picker"><h2>工作台背景</h2>
    <p>壁纸随玩家保存，切换布局和窗格配色时会继续使用。</p>
    <div className="wallpaper-modes">{modes.map(({id,label,icon:Icon})=><button key={id} type="button" aria-pressed={mode===id} disabled={picking||(id==='video'&&!desktop&&!s.backgroundVideo)} onClick={()=>select(id)}>
      <Icon size={18}/>{label}{mode===id&&<Check size={14}/>}</button>)}</div>
    {mode==='image'&&<div className="artwork-shelf">{ILLUSTRATIONS.map(art=><button key={art.id} aria-pressed={source===art.id} onClick={()=>perform(()=>saveSettings({wallpaperMode:'image',wallpaperImageSource:art.id}))}>
      <img src={'./media/'+art.file} alt=""/><span>{art.name}{source===art.id&&<Check size={14}/>}</span></button>)}
      {s.backgroundImage&&<button aria-pressed={source==='file'} onClick={()=>perform(()=>saveSettings({wallpaperMode:'image',wallpaperImageSource:'file'}))}><FileImage size={22}/><span>我的图片{source==='file'&&<Check size={14}/>}</span></button>}</div>}
    {desktop&&<div className="setting-line"><span><strong>本地壁纸</strong><small>图片支持 PNG、JPG、WebP，最高 8 MB。视频支持 MP4、WebM，最高 50 MB。</small></span><div className="appearance-actions">
      <button className="small-action" disabled={picking} onClick={()=>perform(()=>pick('image'))}><FolderOpen size={15}/>选择图片</button>
      <button className="small-action" disabled={picking} onClick={()=>perform(()=>pick('video'))}><Clapperboard size={15}/>选择视频</button></div></div>}
    {((mode==='image'&&source==='file'&&s.backgroundImage)||(mode==='video'&&s.backgroundVideo))&&<div className="setting-line"><span><strong>当前文件</strong><small>{mode==='video'?'我的动态视频':'我的静态图片'}</small></span>
      <button className="small-action" onClick={()=>perform(()=>saveSettings(mode==='video'?{wallpaperMode:'plain',backgroundVideo:''}:{wallpaperMode:'plain',backgroundImage:''}))}><Trash2 size={14}/>移除这张壁纸</button></div>}
    {failed&&<div className="wallpaper-recovery" role="status"><span>这张壁纸暂时无法显示。可以重新选择文件，当前使用底色。</span>
      {media&&<button className="small-action" onClick={retryWallpaper}><RefreshCw size={14}/>重试</button>}</div>}
    {mode==='video'&&<p>视频静音循环播放。启动游戏、隐藏窗口或关闭动效时暂停。</p>}
    </section><section className="preference-section"><h2>{mode==='plain'?'工作台底色':'壁纸显示'}</h2>
    <div className="setting-line"><span><strong>底色</strong></span><label className="native-color">自选底色<input type="color" aria-label="工作台底色" value={s.backgroundColor||'#e5eaf1'} onChange={e=>{const backgroundColor=e.target.value;void perform(()=>saveSettings({backgroundColor}));}}/></label>
      <button className="small-action" onClick={()=>perform(()=>saveSettings({backgroundColor:''}))}>自动底色</button></div>
    {mode!=='plain'&&<><div className="setting-line"><strong>图片与视频适配</strong><select aria-label="壁纸适配" value={s.backgroundFit||'cover'} onChange={e=>{const backgroundFit=e.target.value;void perform(()=>saveSettings({backgroundFit}));}}><option value="cover">铺满窗口</option><option value="contain">完整显示</option><option value="100% 100%">拉伸填充</option></select></div>
      <div className="appearance-sliders"><AppearanceSlider label="壁纸浓度" value={Math.round(s.backgroundOpacity*100)} min={20} max={100} unit="%" preview="--preview-strength" save={n=>saveSettings({backgroundOpacity:n/100})}/>
        {(['X','Y'] as const).map(axis=><AppearanceSlider key={axis} label={axis==='X'?'水平位置':'垂直位置'} value={s['backgroundPosition'+axis]??50} min={0} max={100} unit="%" save={n=>saveSettings({['backgroundPosition'+axis]:n})}/>)}</div></>}
    </section></>;
}
