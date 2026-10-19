import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// The packaged app has an opaque origin; the local preview needs a same-origin
// bridge. Keep its upstream fixed and reject requests from other websites.
const previewOrigin='http://127.0.0.1:5178';
export default defineConfig({root:path.resolve('apps/desktop'),base:'./',publicDir:path.resolve('public'),plugins:[react()],server:{host:'127.0.0.1',port:5178,strictPort:true,proxy:{
 '/__community':{
  target:'https://qqbot.hxzmc.top',changeOrigin:true,ws:true,
  rewrite:value=>value.replace(/^\/__community(?=\/|$)/,''),
  configure(proxy){
   proxy.on('proxyReq',(outgoing,incoming,response)=>{
    if(incoming.headers.origin&&incoming.headers.origin!==previewOrigin){
     response.writeHead(403);response.end('Preview origin not allowed');outgoing.destroy();return;
    }
    outgoing.removeHeader('origin');
   });
   proxy.on('proxyReqWs',(outgoing,incoming,socket)=>{
    if(incoming.headers.origin!==previewOrigin){outgoing.destroy();socket.destroy();return;}
    outgoing.removeHeader('origin');
   });
  }
 }
}},build:{outDir:'dist',target:'chrome108',emptyOutDir:true}});
