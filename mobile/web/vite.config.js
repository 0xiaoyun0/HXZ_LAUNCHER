import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],resolve:{dedupe:['vue']},build:{target:'chrome74',assetsInlineLimit:0},base:'./'});
