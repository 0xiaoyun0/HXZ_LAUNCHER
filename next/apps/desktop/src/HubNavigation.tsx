import {NavLink} from 'react-router-dom';
export function LibraryTabs(){return <><NavLink to="/library" end>游戏实例</NavLink><NavLink to="/library/worlds">世界与入服</NavLink></>;}
export function AccountTabs(){return <><NavLink to="/account" end>账号与积分</NavLink><NavLink to="/account/community">玩家空间</NavLink><NavLink to="/account/backpack">背包</NavLink></>;}
