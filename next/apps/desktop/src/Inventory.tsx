import {useEffect,useRef} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft} from 'lucide-react';
import {community} from '../../../packages/community/client';
import {mountInventory} from '../../../packages/inventory/ui.mjs';
import '../../../packages/inventory/style.css';
import {request} from './data';
import {CardBoard} from './CardBoard';
import {Button,PageTitle} from './ui';
function Contents(){const c=useSnapshot(community),root=useRef<HTMLDivElement>(null);useEffect(()=>{if(root.current)return mountInventory(root.current,{request,canManage:!!c.user?.admin});},[c.user?.uid,c.connected]);return <div ref={root}/>;}
export function InventoryPage(){const navigate=useNavigate();return <div className="standard-page"><PageTitle title="背包" actions={<Button icon={ArrowLeft} onClick={()=>navigate('/account')}>账号与积分</Button>}/><CardBoard id="inventory" cards={[{id:'items',title:'道具与权益',w:12,minW:4,minH:12,content:<Contents/>}]}/></div>;}
