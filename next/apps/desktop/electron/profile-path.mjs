import path from 'node:path';
export function profilePath({installed,packaged,exe,appData,env=process.env}){
 const override=env.HXZ_NEXT_HOME||env.HXZ_LA_HOME;
 if(override)return path.resolve(override);
 if(installed)return path.join(appData,'幻想镇启动器');
 return packaged?path.join(path.dirname(exe),'profile'):path.join(appData,'HXZ-Next');
}
