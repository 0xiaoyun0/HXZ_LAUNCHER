import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const modules=new Map([
 ['linking-volume1-reality081.mjs',{name:'realityVolume1',boundary:'\nconst first = '}],
 ['linking-volume2-reality081.mjs',{name:'realityVolume2',boundary:'\nconst scenario='}]
]);
/** Remove only the separately exported author map, never chapter content. */
export async function publicLinkingSource(relative,bytes){
 const definition=modules.get(path.basename(relative));if(!definition)return bytes;
 const original=bytes.toString('utf8').replaceAll('\r\n','\n');
 const cut=original.indexOf(definition.boundary);
 const alreadySanitized=cut<0&&/\nexport const sourceMap = \[\];\n$/.test(original);
 if(!alreadySanitized&&(cut<0||cut!==original.lastIndexOf(definition.boundary)||!original.slice(cut).includes('export const sourceMap')||original.slice(cut).includes('export const realityVolume')))throw Error('Unexpected author map boundary: '+path.basename(relative));
 const sanitized=alreadySanitized?original:original.slice(0,cut)+'\n// Author-only provenance is excluded from public releases.\nexport const sourceMap = [];\n';
 // These two content modules have no imports. Verify their real exports rather
 // than relying on a text replacement to prove preservation of all story data.
 try{
  const before=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));
  const after=await import('data:text/javascript;base64,'+Buffer.from(sanitized).toString('base64'));
  assert.deepEqual(Object.keys(before).sort(),[definition.name,'sourceMap'].sort());
  assert.deepEqual(after[definition.name],before[definition.name]);
  assert.deepEqual(after.sourceMap,[]);
  assert.equal(after[definition.name].entries.length,12);
  if(sanitized.toLowerCase().includes('hxzrpg'))throw Error('Private author reference');
 }catch{throw Error('Story export preservation check failed: '+path.basename(relative));}
 return Buffer.from(sanitized);
}
export async function sanitizeLinkingReleaseTree(folder){
 for(const filename of modules.keys()){
  const target=path.join(folder,filename),bytes=await fs.readFile(target);
  await fs.writeFile(target,await publicLinkingSource(filename,bytes));
 }
}
