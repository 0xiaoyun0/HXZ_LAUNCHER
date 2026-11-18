<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { selectedAccount, state } from "../lib/launcher";
import { community } from "../lib/community";
const props = defineProps<{
  name?: string | undefined;
  uid?: string | undefined;
  version?: string | undefined;
  image?: string | undefined;
}>();
const failed = ref(false);
const source = computed(() => {
  if (props.image !== undefined) return props.image;
  if (
    props.uid === selectedAccount.value?.uuid &&
    selectedAccount.value?.avatar !== undefined
  )
    return selectedAccount.value.avatar;
  const version =
    props.version ||
    community.users.find(u => u.uid === props.uid)?.avatarVersion ||
    (community.user?.uid === props.uid ? community.user?.avatarVersion : "");
  return props.uid && version
    ? state.settings.communityUrl.replace(/\/+$/, "") +
        "/api/avatars/" +
        encodeURIComponent(props.uid) +
        "?v=" +
        encodeURIComponent(version)
    : "";
});
watch(source, () => (failed.value = false));
</script>
<template>
  <span class="avatar player-avatar"
    ><img
      v-if="source && !failed"
      :src="source"
      alt=""
      @error="failed = true"
    /><span v-else>{{ name?.slice(0, 1) || "旅" }}</span></span
  >
</template>
