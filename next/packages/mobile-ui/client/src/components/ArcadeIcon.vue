<script setup>
defineProps({name:String});
const paths={play:'m8 5 11 7-11 7Z',pause:'M8 4v16M16 4v16',back:'m15 6-6 6 6 6M9 12h12',volume:'m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',muted:'m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6',trophy:'M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4M12 14v6M8 21h8',arrow:'m7 17 10-10M7 7h10v10'};
</script>
<template><svg class="arcade-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.play"/></svg></template>
