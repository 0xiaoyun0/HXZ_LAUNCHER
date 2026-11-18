import path from 'node:path';
import {inside} from './io.mjs';
export function managedUpdateConfig(existing,root,id,cfg){
 if(!path.isAbsolute(root))throw Error('游戏目录必须是绝对路径');
 const instance=inside(root,'versions/'+id);
 // Imported packs may contain another machine's absolute gameDir. The launcher
 // owns these two paths; never reuse imported paths or relocate the instance.
 return {...existing,...cfg.updateConfig,gameDir:path.resolve(root),gameRunDir:cfg.isolated===false?'.':path.relative(root,instance)};
}
