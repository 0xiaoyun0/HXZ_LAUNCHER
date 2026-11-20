import {createInterface} from 'node:readline';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {randomUUID} from 'node:crypto';

export function connectHost(onRequest) {
  const pending = new Map();
  const processes = new Map();
  let seq = 0;
  const send = value => process.stdout.write(JSON.stringify(value) + '\n');
  function host(action,input={}) {
    const id = ++seq;
    return new Promise((resolve,reject) => {
      pending.set(id,{resolve,reject});
      send({kind:'host',id,action,input});
    });
  }
  const lines = createInterface({input:process.stdin,crlfDelay:Infinity});
  lines.on('line', line => {
    let frame;
    try { frame=JSON.parse(line); } catch { return; }
    const {kind,id,action,input} = frame;
    if (kind==='shutdown'){lines.close();return;}
    if (kind==='hostReply') {
      const request=pending.get(id);
      if (!request) return;
      pending.delete(id);
      if (frame.error) request.reject(Error(frame.error));
      else request.resolve(frame.value);
    } else if (kind==='process') {
      const child=processes.get(frame.key);
      if (!child) return;
      if (frame.type==='spawn') {child.pid=frame.pid; child.emit('spawn');}
      else if (frame.type==='stdout' || frame.type==='stderr') child[frame.type].write(Buffer.from(frame.bytes,'base64'));
      else if (frame.type==='exit') {
        processes.delete(frame.key); child.stdout.end(); child.stderr.end();
        child.emit('exit',frame.code,null); child.emit('close',frame.code,null);
      }
    } else if (kind==='request') {
      Promise.resolve().then(()=>onRequest(action,input||{})).then(
        value=>send({kind:'response',id,value:value??null}),
        error=>send({kind:'response',id,error:error?.message||String(error)})
      );
    }
  });
  function spawnGame(command,args,{cwd}) {
    const child=new EventEmitter(), key=randomUUID();
    child.stdout=new PassThrough(); child.stderr=new PassThrough();
    child.kill=()=>{void host('game.stop',{key}).catch(error=>child.emit('error',error));return true;};
    processes.set(key,child);
    host('game.spawn',{key,command,args,cwd}).catch(error=>{
      processes.delete(key);child.stdout.end();child.stderr.end();child.emit('error',error);child.emit('close',null,null);
    });
    return child;
  }
  return {host,spawnGame,emit:value=>send({kind:'event',value}),onClose:fn=>lines.once('close',fn)};
}
