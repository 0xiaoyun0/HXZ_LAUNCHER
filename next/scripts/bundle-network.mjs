import fs from 'node:fs/promises';
import path from 'node:path';

// SSDP reads its own package metadata with createRequire. Inline that metadata
// while bundling, since its original ../../package.json does not exist in asar.
export const bundleNetwork={name:'bundle-ssdp-metadata',setup(build){
 build.onLoad({filter:/[\\/]@achingbrain[\\/]ssdp[\\/]dist[\\/]src[\\/]ssdp\.js$/},async({path:file})=>{
  let contents=await fs.readFile(file,'utf8');const metadata=JSON.parse(await fs.readFile(path.resolve(path.dirname(file),'../../package.json'),'utf8'));
  const target="const req = createRequire(import.meta.url);\nconst { name, version } = req('../../package.json');";
  contents=contents.replace(/\r\n/g,'\n');if(!contents.includes(target))throw Error('SSDP package metadata pattern changed; review the bundle adapter');
  return {contents:contents.replace(target,`const {name,version}=${JSON.stringify({name:metadata.name,version:metadata.version})};`),loader:'js'};
 });
 // Discovery sockets must be released once the router description is cached.
 build.onLoad({filter:/[\\/]nat-port-mapper[\\/]dist[\\/]src[\\/]discovery[\\/]index\.js$/},async({path:file})=>{
  const contents=(await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n'),target='const result = await clearable;';
  if(!contents.includes(target))throw Error('UPnP discovery pattern changed; review cleanup');
  return {contents:contents.replace(target,'let result; try { result = await clearable; } finally { await discovery.stop(); discovery = undefined; clear = undefined; }'),loader:'js'};
 });
 build.onLoad({filter:/[\\/]nat-port-mapper[\\/]dist[\\/]src[\\/]upnp[\\/]index\.js$/},async({path:file})=>{
  const contents=(await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n'),target="['NewLeaseDuration', ttl],\n            ['NewProtocol', options.protocol]";
  if(!contents.includes(target))throw Error('UPnP mapping pattern changed; review SOAP arguments');
  return {contents:contents.replace(target,"['NewLeaseDuration', ttl]"),loader:'js'};
 });
}};
