// Inventory every GLFW method reference in the real Minecraft client jar.
// A reference is an ABI requirement, not proof that a branch ran on Android.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const yauzl=require('yauzl');
const jar=process.env.HXZ_TEST_MINECRAFT_JAR||'D:/PCL/.minecraft/versions/26.2/26.2.jar';
const refs=new Map();
function inspectClass(bytes,filename){
  assert.equal(bytes.readUInt32BE(0),0xcafebabe);
  const cp=new Array(bytes.readUInt16BE(8));let offset=10;
  for(let i=1;i<cp.length;i++){
    const tag=bytes[offset++];
    if(tag===1){const length=bytes.readUInt16BE(offset);offset+=2;cp[i]=bytes.toString('utf8',offset,offset+length);offset+=length;}
    else if([7,8,16,19,20].includes(tag)){cp[i]={tag,index:bytes.readUInt16BE(offset)};offset+=2;}
    else if([9,10,11,12,17,18].includes(tag)){cp[i]={tag,a:bytes.readUInt16BE(offset),b:bytes.readUInt16BE(offset+2)};offset+=4;}
    else if(tag===3||tag===4)offset+=4;
    else if(tag===5||tag===6){offset+=8;i++;}
    else if(tag===15)offset+=3;
    else throw new Error('Unknown constant tag '+tag+' in '+filename);
  }
  for(const entry of cp){
    if(entry?.tag!==10&&entry?.tag!==11)continue;
    const owner=cp[cp[entry.a].index];const name=cp[cp[entry.b].a];
    if(!owner.startsWith('org/lwjgl/glfw/')||!name.startsWith('glfw'))continue;
    const key=owner+'.'+name;
    if(!refs.has(key))refs.set(key,new Set());
    refs.get(key).add(filename.replace(/\.class$/,''));
  }
}
await new Promise((resolve,reject)=>yauzl.open(jar,{lazyEntries:true},(error,zip)=>{
  if(error)return reject(error);
  zip.on('error',reject);zip.on('end',resolve);
  zip.on('entry',entry=>{
    if(!entry.fileName.endsWith('.class'))return zip.readEntry();
    zip.openReadStream(entry,(err,stream)=>{
      if(err)return reject(err);
      const chunks=[];stream.on('data',chunk=>chunks.push(chunk));stream.on('error',reject);
      stream.on('end',()=>{try{inspectClass(Buffer.concat(chunks),entry.fileName);zip.readEntry();}catch(failure){zip.close();reject(failure);}});
    });
  });zip.readEntry();
}));
export const minecraftGlfwSymbols=[...refs.keys()].filter(name=>/^org\/lwjgl\/glfw\/GLFW(?:Vulkan)?\./.test(name)).map(name=>name.split('.').at(-1));
const ime=Object.fromEntries([...refs].filter(([name])=>/Preedit|IME|InputMode/.test(name)).map(([name,callers])=>[name,[...callers]]));
const platformSpecific=[...refs.keys()].filter(name=>name.includes('GLFWNative'));
console.log(JSON.stringify({jar,methodReferences:refs.size,nativeCoreSymbols:minecraftGlfwSymbols.length,ime,platformSpecific,javaHelpers:[...refs.keys()].filter(name=>name.startsWith('org/lwjgl/glfw/Callbacks.'))},null,2));
assert(refs.has('org/lwjgl/glfw/GLFW.glfwSetPreeditCallback'),'Wrong client jar: expected the 26.2 IME registration');
