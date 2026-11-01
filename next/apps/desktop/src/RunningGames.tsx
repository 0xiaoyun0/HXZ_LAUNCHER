import {useSnapshot} from 'valtio';
import {state,invoke,reload,notify} from './model';
import {Button} from './ui';
export function RunningGames(){const s=useSnapshot(state);if(!s.sessions?.length)return null;return <div className="setting-group"><h3>正在运行 · {s.sessions.length} 个实例</h3>{s.sessions.map((session:any)=><div className="list-line" key={session.key}><span>{session.instance} · PID {session.pid} · {new Date(session.started).toLocaleTimeString()}</span><Button onClick={async()=>{try{await invoke('game.stop',{key:session.key});await reload();}catch(e:any){notify(e.message,true);}}}>停止此实例</Button></div>)}</div>;}
