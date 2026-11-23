import {ref,shallowRef,computed,nextTick,onMounted,onUnmounted} from 'vue';
import {createArcade} from './arcade-controller.mjs';
export function useArcade(request){const a=createArcade(request,{ref,shallowRef,computed,nextTick});onMounted(a.mount);onUnmounted(a.dispose);return a;}
