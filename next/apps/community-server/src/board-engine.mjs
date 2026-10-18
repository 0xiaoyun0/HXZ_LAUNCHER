import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {legalMoves,sameMove} from '../shared/board-games.mjs';

// The separately licensed engine is a bounded JSON subprocess, not frontend code.
export function analyseBoard(state,level=1){
 const child=spawn(process.execPath,['--max-old-space-size=96',fileURLToPath(new URL('../shared/engines/maid/driver.cjs',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 const legal=legalMoves(state);let settled=false,candidate=null,buffer='',stderr='',timer,ready=false;
 const promise=new Promise((resolve,reject)=>{
  const finish=(error,move)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();error?reject(error):resolve(move);};
  child.stdout.setEncoding('utf8');child.stdout.on('data',data=>{
   buffer+=data;if(buffer.length>65536){finish(Error('棋类引擎响应异常'));return;}
   let cut;while((cut=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,cut);buffer=buffer.slice(cut+1);try{
    const value=JSON.parse(line);if(value.type==='error'){finish(Error('棋类引擎计算失败，请重试'));return;}
    if(value.type==='ready'){if(!ready){ready=true;clearTimeout(timer);timer=setTimeout(()=>finish(candidate?null:Error('棋类引擎暂未返回走法，请重试'),candidate),[700,1000,1500,2200,3000][level-1]||3000);}continue;}
    const move=legal.find(m=>sameMove(m,value.move||{}));if(move)candidate=move;
    if(value.type==='done'){finish(candidate?null:Error('棋类引擎未返回有效走法'),candidate);return;}
   }catch{finish(Error('棋类引擎响应无法读取'));return;}}
  });
  child.stderr.on('data',b=>{stderr=(stderr+b).slice(-2048);});
  child.once('error',()=>finish(Error('无法启动棋类引擎，请检查服务端安装是否完整')));
  child.once('exit',()=>finish(candidate?null:Error('棋类引擎意外退出，请重试'),candidate));
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({state,level}));
  // Process/module startup can be slow under load; it is separate from search time.
  timer=setTimeout(()=>finish(Error('棋类引擎启动超时，请稍后重试')),5000);
 });
 return {promise,cancel(){child.kill();}};
}
export async function botMove(state,level=1){return analyseBoard(state,level).promise;}
