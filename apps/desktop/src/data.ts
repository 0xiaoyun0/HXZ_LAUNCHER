import {useCallback,useEffect,useRef,useState} from 'react';
import {communityRequest} from '../../../packages/community/client';
import {beginPageLoad} from './PageFeedback';
export const request=<T=any>(path:string,method='GET',body?:any)=>communityRequest<T>(path,body===undefined?{method}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},method!=='GET');
export function useData<T=any>(loader:()=>Promise<T>,deps:any[]=[],refreshOnReturn=false) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const active=useRef<(()=>void)|null>(null);
  const reload=useCallback(async()=>{
    const complete=beginPageLoad();
    active.current?.();
    active.current=complete;
    setLoading(true);setError('');
    try{
      const value=await loader();
      if(active.current===complete)setData(value);
      return value;
    }catch(e:any){
      if(active.current===complete)setError(e.message||String(e));
    }finally{
      complete();
      if(active.current===complete){active.current=null;setLoading(false);}
    }
  },deps);
  useEffect(()=>{
    setData(null);void reload();
    return()=>{active.current?.();active.current=null;};
  },[reload]);
  useEffect(()=>{
    if(!refreshOnReturn)return;
    let frame=0;
    const refresh=()=>{
      if(document.hidden)return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{void reload();});
    };
    window.addEventListener('focus',refresh);
    window.addEventListener('town-resume',refresh);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{
      cancelAnimationFrame(frame);
      window.removeEventListener('focus',refresh);
      window.removeEventListener('town-resume',refresh);
      document.removeEventListener('visibilitychange',refresh);
    };
  },[refreshOnReturn,reload]);
  return {data,setData,error,loading,reload};
}
