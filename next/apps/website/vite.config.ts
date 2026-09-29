import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import path from 'node:path';
export default defineConfig({root:path.resolve('apps/website'),publicDir:path.resolve('public'),plugins:[react()],server:{host:'127.0.0.1',port:5179,strictPort:true,proxy:{'/api':'http://127.0.0.1:4332'}},build:{outDir:'dist',manifest:true,emptyOutDir:true}});
