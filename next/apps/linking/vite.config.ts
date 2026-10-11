import {defineConfig} from 'vite';
export default defineConfig({base:'./',define:{__RHINE_NOVECENTO__:false,__RHINE_WALLPAPER__:false,__RHINE_MODELS__:JSON.stringify({})},build:{target:'chrome108',cssTarget:'chrome108'},server:{host:'127.0.0.1',port:5198}});
