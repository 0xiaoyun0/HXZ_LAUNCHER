// Run with ELECTRON_RUN_AS_NODE=1 using the actual Electron 22 ia32 runtime.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
if(!globalThis.fetch){const {createRequire}=require('node:module');Object.assign(globalThis,createRequire(path.resolve(__dirname,'../tools/legacy/package.json'))('undici'));}
require('../scripts/legacy-polyfills.cjs');
(async()=>{
 const {download}=await import('../src-electron/core/io.mjs');const {javaRequirement}=await import('../src-electron/core/java-policy.mjs');
 assert.equal(javaRequirement({id:'26.2'}).major,25);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-legacy-download-')),data=Buffer.alloc(16*1024*1024,37);let ranges=0;
 const server=http.createServer((req,res)=>{const [,a,b]=req.headers.range.match(/^bytes=(\d+)-(\d+)$/);ranges++;res.writeHead(206,{'Content-Length':Number(b)-Number(a)+1,'Content-Range':`bytes ${a}-${b}/${data.length}`});res.end(data.subarray(Number(a),Number(b)+1));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const file=path.join(root,'中文文件.jar');await download('http://127.0.0.1:'+server.address().port,file,{size:data.length,sha256:createHash('sha256').update(data).digest('hex')});assert.equal(ranges,4);assert.deepEqual(await fs.readFile(file),data);console.log('Verified segmented download, Unicode path and Java policy on '+process.versions.node+' '+process.arch);}
 finally{await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
