import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2]||'D:/PCL/.minecraft',destination=process.argv[3]||'.runtime/review080/defaults/local-profiles.json';
const entries=[];
for(const [id,server]of [['HXZ-survival','survival'],['HXZ-mod-1','mod-1'],['HXZ-mod-2','mod-2']]){
 const directory=path.join(root,'versions',id),v=JSON.parse(await fs.readFile(path.join(directory,id+'.json'),'utf8')),args=(v.arguments?.game||[]).filter(v=>typeof v==='string');
 const argument=flag=>{const index=args.indexOf(flag);return index<0?null:args[index+1];};
 const mods=(await fs.readdir(path.join(directory,'mods')).catch(()=>[])).filter(v=>v.endsWith('.jar'));
 entries.push({id,server,directory,gameVersion:argument('--fml.mcVersion')||v.patches?.find(p=>p.id==='game')?.version||v.clientVersion||v.assetIndex?.id,loader:argument('--fml.neoForgeVersion')?{type:'neoforge',version:argument('--fml.neoForgeVersion')}:{type:v.mainClass.includes('fabric')?'fabric':'vanilla',version:v.libraries?.find(v=>v.name.startsWith('net.fabricmc:fabric-loader:'))?.name.split(':').at(-1)||''},java:v.javaVersion?.majorVersion,modCount:mods.length,integrationMods:mods.filter(v=>/^(?:\[机械动力\]\s*)?create-\d|^appliedenergistics|^mekanism-|^open-parties|^ftb-chunks|^kubejs-neoforge|^fabric-api/.test(v))});
}
await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify({observed:new Date().toISOString(),source:root,entries},null,2));console.log(JSON.stringify(entries,null,2));
