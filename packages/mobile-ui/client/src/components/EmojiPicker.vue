<script setup lang="ts">
import { ref } from "vue";
const emit = defineEmits<{ pick: [value: string] }>();
const tab = ref<"emoji" | "kaomoji">("emoji");
const emojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "🙃",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😋",
  "😎",
  "🤔",
  "🤗",
  "😴",
  "😭",
  "😤",
  "😱",
  "🤯",
  "🥳",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "❤️",
  "💔",
  "✨",
  "⭐",
  "🔥",
  "🎉",
  "🎮",
  "🌟",
  "✅",
  "❌",
  "⚡",
  "☕",
  "🌈",
  "🍀"
];
const kaomoji = [
  "(｡･ω･｡)",
  "(≧▽≦)",
  "(´▽`ʃ♡ƪ)",
  "(๑•̀ㅂ•́)و✧",
  "(ง •̀_•́)ง",
  "( •̀ ω •́ )✧",
  "(｡•̀ᴗ-)✧",
  "(´･ω･`)",
  "(｀・ω・´)",
  "(╯°□°）╯︵ ┻━┻",
  "┬─┬ノ( º _ ºノ)",
  "ヽ(•‿•)ノ",
  "٩(◕‿◕｡)۶",
  "ヾ(≧▽≦*)o",
  "o(￣▽￣)ｄ",
  "（づ￣3￣）づ╭❤～",
  "(*￣3￣)╭",
  "（￣︶￣）↗",
  "Σ(っ °Д °;)っ",
  "∑(っ°Д°;)っ",
  "ฅ^•ﻌ•^ฅ",
  "ʕ•ᴥ•ʔ",
  "(¬‿¬)",
  "(ಥ﹏ಥ)",
  "(╥﹏╥)",
  "（；´д｀）ゞ",
  "（*＾-＾*）",
  "♪(´▽｀)",
  "φ(゜▽゜*)♪",
  "ヾ(￣▽￣)Bye~Bye~",
  "(づ｡◕‿‿◕｡)づ"
];
</script>
<template>
  <q-btn flat round dense icon="sentiment_satisfied_alt" title="颜文字与 Emoji">
    <q-menu :class="['emoji-menu', { 'kaomoji-menu': tab === 'kaomoji' }]">
      <div class="emoji-tabs" role="tablist" aria-label="选择内容类型">
        <button
          type="button"
          :class="{ active: tab === 'emoji' }"
          role="tab"
          :aria-selected="tab === 'emoji'"
          @click="tab = 'emoji'"
        >
          Emoji
        </button>
        <button
          type="button"
          :class="{ active: tab === 'kaomoji' }"
          role="tab"
          :aria-selected="tab === 'kaomoji'"
          @click="tab = 'kaomoji'"
        >
          颜文字
        </button>
      </div>
      <div class="emoji-grid">
        <button
          v-for="value in tab === 'emoji' ? emojis : kaomoji"
          :key="value"
          type="button"
          @click="emit('pick', value)"
        >
          {{ value }}
        </button>
      </div>
    </q-menu>
  </q-btn>
</template>
<style scoped>
.emoji-menu {
  padding: 6px;
  max-width: min(360px, calc(100vw - 24px));
}
.emoji-tabs {
  display: flex;
  gap: 4px;
  padding: 2px 2px 7px;
  border-bottom: 1px solid var(--border);
}
.emoji-tabs button {
  flex: 1;
  padding: 7px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.emoji-tabs button.active,
.emoji-tabs button:hover {
  background: var(--panel-hover);
  color: var(--text);
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
  padding-top: 7px;
}
.emoji-grid button {
  min-width: 42px;
  min-height: 34px;
  padding: 4px 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 18px;
}
.emoji-grid button:hover {
  background: var(--panel-hover);
}
</style>
