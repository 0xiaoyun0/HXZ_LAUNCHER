import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {legalMoves,sameMove} from '../shared/board-games.mjs';

// The separately licensed engine is a bounded JSON subprocess, not frontend code.
export function analyseBoard(state,level=1,{spawnEngine=spawn}={}){
 level=Math.max(1,Math.min(5,Math.trunc(level)||1));
 const legal=legalMoves(state);
 if(legal.length===1)return {promise:Promise.resolve(legal[0]),cancel(){}};
 if(!legal.length)return {promise:Promise.reject(Error('当前棋局没有合法走法')),cancel(){}};
 const child=spawnEngine(process.execPath,['--max-old-space-size=96',fileURLToPath(new URL('../shared/engines/maid/driver.cjs',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 let settled=false,candidate=null,buffer='',timer,ready=false,deadlineReached=false;
 const promise=new Promise((resolve,reject)=>{
  const finish=(error,move)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();error?reject(error):resolve(move);};
  child.stdout.setEncoding('utf8');child.stdout.on('data',data=>{
   buffer+=data;if(buffer.length>65536){finish(Error('棋类引擎响应异常'));return;}
   let cut;while((cut=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,cut);buffer=buffer.slice(cut+1);try{
    const value=JSON.parse(line);if(value.type==='error'){finish(Error('棋类引擎计算失败，请重试'));return;}
    if(value.type==='ready'){if(!ready){ready=true;clearTimeout(timer);timer=setTimeout(()=>{
     deadlineReached=true;
     if(candidate)finish(null,candidate);
     // Under CPU contention the first completed depth can arrive late. Deliver it
     // immediately, rather than failing a playable table or starting another depth.
     else timer=setTimeout(()=>finish(Error('棋类引擎暂未返回走法，请重试')),2000);
    },[220,320,450,650,850][level-1]);}continue;}
    const move=legal.find(m=>sameMove(m,value.move||{}));if(move)candidate=move;
    if(candidate&&deadlineReached){finish(null,candidate);return;}
    if(value.type==='done'){finish(candidate?null:Error('棋类引擎未返回有效走法'),candidate);return;}
   }catch{finish(Error('棋类引擎响应无法读取'));return;}}
  });
  child.stderr.resume();
  child.once('error',()=>finish(Error('无法启动棋类引擎，请检查服务端安装是否完整')));
  child.once('exit',()=>finish(candidate?null:Error('棋类引擎意外退出，请重试'),candidate));
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({state,level}));
  // Process/module startup can be slow under load; it is separate from search time.
  timer=setTimeout(()=>finish(Error('棋类引擎启动超时，请稍后重试')),5000);
 });
 return {promise,cancel(){child.kill();}};
}
export async function botMove(state,level=1){return analyseBoard(state,level).promise;}
