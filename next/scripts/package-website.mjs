import fs from 'node:fs/promises';import path from 'node:path';
const target=path.resolve('release/HXZ-NEXT-Website-0.5.2-air');
await fs.mkdir(target,{recursive:true});
for(const name of ['dist','server'])await fs.cp(path.resolve('apps/website',name),path.join(target,name),{recursive:true,force:true});
const dependencies={};for(const name of ['react','react-dom','lucide-react','sharp'])dependencies[name]=JSON.parse(await fs.readFile(path.resolve('node_modules',name,'package.json'),'utf8')).version;
await fs.writeFile(path.join(target,'package.json'),JSON.stringify({name:'hxz-next-website',version:'0.5.2-air',private:true,type:'module',engines:{node:'>=22.12'},scripts:{start:'node server/index.mjs'},dependencies},null,2));
await fs.copyFile('docs/官网部署与内容管理.md',path.join(target,'README.md'));
console.log(target);
