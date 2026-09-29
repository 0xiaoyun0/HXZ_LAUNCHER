import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('apps/desktop'),base:'./',publicDir:path.resolve('public'),plugins:[react()],server:{host:'127.0.0.1',port:5178,strictPort:true},build:{outDir:'dist',target:'chrome108',emptyOutDir:true}});
