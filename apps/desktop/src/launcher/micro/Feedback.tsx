import type {CSSProperties} from 'react';

// Adapted from the React Bits orbit lattice and Status Mark. Screen-reader text stays with the actual task.
const orbit=[0,1,2,7,null,3,6,5,4];
export function LatticeGlyph(){
  return <span className="micro-lattice" aria-hidden="true">{orbit.map((step,i)=><i key={i}
    data-hole={step===null||undefined} style={step===null?undefined:{'--cell-step':step} as CSSProperties}/>)}</span>;
}

type MarkState='pending'|'running'|'done'|'failed'|'cancelled';
export function StatusMark({status,progress}:{status:MarkState;progress?:number|null}){
  const measured=status==='running'&&progress!=null&&Number.isFinite(progress);
  const arc=measured?Math.max(0,Math.min(100,progress)):64;
  const dash=status==='pending'?'4 8.5':status==='running'?arc+' '+(100-arc):undefined;
  return <svg className="micro-status" data-status={status} data-spinning={status==='running'&&!measured||undefined} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle className="mark-track" cx="12" cy="12" r="9.1"/>
    <circle className="mark-ring" cx="12" cy="12" r="9.1" pathLength="100" strokeDasharray={dash}/>
    {status==='done'&&<path className="mark-ink" pathLength="1" d="m7.5 12.25 3 3 6.25-6.5"/>}
    {status==='failed'&&<path className="mark-ink" pathLength="1" d="m9 9 6 6m0-6-6 6"/>}
    {status==='cancelled'&&<path d="M8 12h8"/>}
  </svg>;
}

// Known byte/file counts drive the liquid edge. Unknown totals keep native indeterminate semantics.
export function TransferMeter({label,value,max=100,running=true}:{label:string;value?:number;max?:number;running?:boolean}){
  const known=value!=null&&Number.isFinite(value)&&max>0;
  const fraction=known?Math.max(0,Math.min(1,value!/max)):0;
  return <span className="transfer-meter" data-known={known||undefined} data-active={running||undefined} data-mid={fraction>0&&fraction<1||undefined}
    style={{'--transfer-fill':fraction*100+'%'} as CSSProperties}>
    <progress aria-label={label} max={max>0?max:1} value={known?value:undefined}/>
    <span aria-hidden="true" className="transfer-track"><i/></span>
  </span>;
}

export function FolderGlyph(){
  return <svg className="float-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 18V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v3"/>
    <path className="folder-sheet rear" d="m7 13 1-5 8 1-1 5Z"/>
    <path className="folder-sheet front" d="m10 14 1-5 7 1-1 5Z"/>
    <path className="folder-cover" d="M3 11h18l-1.5 7.5A2 2 0 0 1 17.5 20H6a2 2 0 0 1-2-1.7Z"/>
  </svg>;
}
