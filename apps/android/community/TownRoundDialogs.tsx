import {useEffect,useState} from 'react';
import {useBlocker,useNavigate} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ui} from '../../desktop/src/model';
import {Button,Modal} from '../../desktop/src/ui';

export function TownRoundDialogs(){
  const {confirm}=useSnapshot(ui);
  const navigate=useNavigate();
  const blocker=useBlocker(({currentLocation,nextLocation})=>
    currentLocation.pathname!==nextLocation.pathname&&!!ui.arcadeRound?.hasProgress());
  const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const leaving=blocker.state==='blocked';
  useEffect(()=>{
    if(leaving)ui.arcadeRound?.pause();
    else setFailed(false);
  },[leaving]);
  useEffect(()=>{
    const pause=()=>ui.arcadeRound?.pause();
    const back=(event:Event)=>{
      if(event.defaultPrevented||!ui.arcadeRound?.hasProgress())return;
      event.preventDefault();
      navigate('/arcade');
    };
    window.addEventListener('town-pause',pause);
    window.addEventListener('town-back',back);
    return ()=>{window.removeEventListener('town-pause',pause);window.removeEventListener('town-back',back);};
  },[navigate]);
  const close=()=>{
    if(busy)return;
    if(leaving)blocker.reset();
    else ui.confirm=null;
  };
  async function accept(){
    if(busy)return;
    setBusy(true);
    try{
      if(leaving){
        if(await ui.arcadeRound?.finish())blocker.proceed();
        else setFailed(true);
      }else if(confirm){
        await confirm.action();
        ui.confirm=null;
      }
    }finally{setBusy(false);}
  }
  return <Modal open={leaving||!!confirm} title={leaving?'结算本局并离开？':confirm?.title} onClose={close}>
    <p role={failed?'alert':undefined}>{leaving?(failed?'成绩暂未提交，可重试或返回本局。':ui.arcadeRound?.ranked()?'本局成绩将提交到社区排行榜。':'本局最好成绩会保存在手机上。'):confirm?.message}</p>
    <footer className="modal-actions">
      <button className="small-action" disabled={busy} onClick={close}>{leaving?'返回游戏':'取消'}</button>
      {leaving&&failed&&<button className="small-action" disabled={busy} onClick={blocker.proceed}>放弃提交并离开</button>}
      <Button tone="solid" disabled={busy} onClick={accept}>{leaving?(failed?'重试提交':'结算并离开'):'确认'}</Button>
    </footer>
  </Modal>;
}
