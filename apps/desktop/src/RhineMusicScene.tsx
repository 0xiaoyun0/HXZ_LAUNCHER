import { useEffect, useRef, useState } from 'react';
import type { ArchiveScene } from './rhine-music-engine/scene';
import './RhineMusicScene.css';

export type RhineMusicSceneProps = {
  selected: number;
  total: number;
  reducedMotion: boolean;
  speed: number;
  onSelect: (index: number) => void;
  active?: boolean;
  inspection?: boolean;
  onOpen?: () => void;
  title?: string;
  artist?: string;
  coverUrl?: string;
  quality?: 'performance' | 'balanced' | 'original';
  dark?: boolean;
  onWebGLUnavailable?: () => void;
};

/** React owns the music selection; the isolated renderer owns every animation frame. */
export function RhineMusicScene(props: RhineMusicSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const control = useRef<{update: () => void} | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let scene: ArchiveScene | undefined;
    let stopped = false;
    let failed = false;
    let loaded = false;
    let presented = false;
    let intersecting = true;
    let frame = 0;
    let last = 0;
    let clock = 0;
    let appliedSelection = -1;
    let appliedTotal = -1;
    let appliedInspection: boolean | undefined;
    let appliedDark: boolean | undefined;
    let appliedReduced: boolean | undefined;
    let appliedQuality: string | undefined;
    const events = new AbortController();
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => media.matches || latest.current.reducedMotion || latest.current.speed <= 0;
    const visible = () => latest.current.active !== false && !document.hidden && intersecting && element.clientWidth > 0 && element.clientHeight > 0;
    const stopFrame = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; };
    const fail = () => {
      if (stopped || failed) return;
      failed = true;
      stopFrame();
      scene?.dispose();
      scene = undefined;
      setStatus('fallback');
      latest.current.onWebGLUnavailable?.();
    };
    const draw = (now: number) => {
      frame = 0;
      if (stopped || failed || !loaded || !scene || !visible()) { last = 0; return; }
      const speed = Math.max(.2, Math.min(3, Number(latest.current.speed) || 1));
      clock += (last ? Math.min(.05, (now - last) / 1000) : .016) * speed;
      last = now;
      try {
        // Compile the first visible frame at a settled archive pose. Otherwise a
        // cold shader stall exposes a half-entered camera and clipped records.
        if (!presented) scene.setReduced(true);
        if (reduced()) scene.snapToTargets();
        if (!presented) scene.snapToTargets();
        scene.update(clock);
        if (!presented) {
          scene.setReduced(reduced());
          presented = true;
          setStatus('ready');
        }
      } catch { fail(); return; }
      // Static mode renders only on input/state/size changes. Hidden scenes never tick.
      if (!reduced()) frame = requestAnimationFrame(draw);
    };
    const invalidate = () => {
      if (!stopped && !failed && loaded && visible() && !frame) frame = requestAnimationFrame(draw);
    };
    const update = () => {
      if (!scene || !loaded || stopped) return;
      const current = latest.current;
      const total = Math.max(0, Math.floor(current.total) || 0);
      const next = total ? ((Math.floor(current.selected) % total) + total) % total : 0;
      const isReduced = reduced();
      if (isReduced !== appliedReduced) { scene.setReduced(isReduced); appliedReduced = isReduced; }
      const quality = current.quality || 'balanced';
      if (quality !== appliedQuality) {
        scene.setQuality(quality === 'original'
          ? {scale:100,pixelRatio:1.5,antialias:'off',shadows:2048,aoSamples:32,aoResolution:1,depthOfField:100,transmission:1,anisotropy:16}
          : quality === 'performance'
            ? {scale:80,pixelRatio:1,antialias:'off',shadows:1024,aoSamples:0,aoResolution:.5,depthOfField:0,transmission:.5,anisotropy:4}
            : {scale:100,pixelRatio:1.5,antialias:'off',shadows:1024,aoSamples:16,aoResolution:.5,depthOfField:45,transmission:.5,anisotropy:8});
        appliedQuality = quality;
      }
      if (total !== appliedTotal) { scene.setCatalog(total); appliedTotal = total; appliedSelection = -1; }
      if (next !== appliedSelection) { scene.select(next); appliedSelection = next; }
      const inspection = !!current.inspection && total > 0;
      if (inspection !== appliedInspection) { scene.setMode(inspection ? 'detail' : 'archive'); appliedInspection = inspection; }
      if (!!current.dark !== appliedDark || isReduced) { scene.setTheme(!!current.dark, isReduced || appliedDark === undefined); appliedDark = !!current.dark; }
      scene.setMusicLabel(current.title, current.artist);
      scene.setCover(current.coverUrl);
      element.dataset.motion = isReduced ? 'off' : 'on';
      element.dataset.empty = total ? 'false' : 'true';
      if (!visible()) { stopFrame(); scene.pauseInteraction(); }
      invalidate();
    };
    control.current = {update};
    const resize = () => {
      if (!scene || stopped || !element.clientWidth || !element.clientHeight) return;
      element.dataset.layout = element.clientWidth / element.clientHeight < 1.05 ? 'portrait' : element.clientWidth < 1100 ? 'compact' : 'desktop';
      scene.resize();
      invalidate();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      if (!visible()) { stopFrame(); scene?.pauseInteraction(); }
      else invalidate();
    });
    visibilityObserver.observe(element);
    document.addEventListener('visibilitychange', () => {
      if (!visible()) { stopFrame(); scene?.pauseInteraction(); }
      else invalidate();
    }, {signal: events.signal});
    media.addEventListener('change', update, {signal: events.signal});

    const timeout = window.setTimeout(() => { if (!loaded) fail(); }, 25000);
    setStatus('loading');
    void import('./rhine-music-engine/scene').then(async ({ArchiveScene}) => {
      if (stopped || failed) return;
      scene = new ArchiveScene(element);
      const canvas = scene.renderer.domElement;
      canvas.className = 'rhine-music-scene__canvas';
      canvas.tabIndex = -1;
      scene.setQuality({scale: 100, pixelRatio: 1.5, antialias: 'off', shadows: 1024, aoSamples: 16, aoResolution: .5, depthOfField: 45, transmission: .5, anisotropy: 8});
      scene.onSelect = (index, cell) => {
        if (!scene || !latest.current.total || latest.current.active === false) return;
        scene.select(index, cell ? {cell} : undefined);
        appliedSelection = index;
        latest.current.onSelect(index);
        invalidate();
      };
      scene.onNavigate = (axis, direction) => { if (latest.current.total && latest.current.active !== false) scene?.navigate(axis, direction); invalidate(); };
      scene.onOpen = () => { if (latest.current.total && latest.current.active !== false) latest.current.onOpen?.(); };
      scene.onInteraction = invalidate;
      canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); fail(); }, {signal: events.signal});
      resize();
      await scene.load();
      if (stopped || failed) return;
      loaded = true;
      window.clearTimeout(timeout);
      update();
    }).catch(() => { if (!stopped) fail(); });

    return () => {
      stopped = true;
      window.clearTimeout(timeout);
      stopFrame();
      events.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      control.current = null;
      scene?.dispose();
    };
  }, []);

  useEffect(() => { control.current?.update(); }, [props.selected, props.total, props.inspection, props.dark, props.reducedMotion, props.speed, props.title, props.artist, props.coverUrl, props.quality, props.active]);

  return <div ref={host} className={`rhine-music-scene${props.dark ? ' rhine-music-scene--dark' : ''}${status === 'fallback' ? ' rhine-music-scene--unavailable' : ''}`} data-active={props.active !== false} data-scene-state={status}>
    <div className="rhine-music-scene__fallback" aria-hidden="true">
      {Array.from({length: 28}, (_, index) => <i key={index} style={{'--sleeve': index} as React.CSSProperties}/>)}
    </div>
    {status !== 'ready' && <span className="rhine-music-scene__notice" role="status">{status === 'loading' ? '正在载入音乐档案' : '音乐档案 · 静态视图'}</span>}
  </div>;
}
