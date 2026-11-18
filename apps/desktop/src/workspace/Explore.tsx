import {useSnapshot} from 'valtio';
import {Link} from 'react-router-dom';
import {ChevronRight} from 'lucide-react';
import {community} from '../../../../packages/community/client';
import {destinations,matches} from './destinations';
export function Explore({query=''}:{query?:string}) {
 const user=useSnapshot(community).user;
 return <section className="third-page"><h1>更多功能</h1>{[...new Set(destinations.map(d=>d.group))].map(group=>{
   const entries=destinations.filter(d=>d.group===group&&d.path!=='/explore'&&(!d.admin||user?.admin)&&matches(query,d.name,d.keys));
   return entries.length>0&&<section className="third-section" key={group}><h2>{group}</h2><div className="feature-grid">{entries.map(d=><Link to={d.path} key={d.path}><d.icon size={19}/><span>{d.name}</span><ChevronRight size={15}/></Link>)}</div></section>;
 })}</section>;
}
