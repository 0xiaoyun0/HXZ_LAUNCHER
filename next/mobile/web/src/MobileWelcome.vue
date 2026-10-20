<script setup>
import {ref} from 'vue';
import {native} from './native.js';
import Icon from './Icon.vue';
const props=defineProps({initializing:Boolean,initialError:String});
const emit=defineEmits(['signed-in','retry']);
const username=ref(''),password=ref(''),visible=ref(false),busy=ref(false),error=ref('');
async function login(){
 if(busy.value)return;error.value='';
 if(!username.value.trim()||!password.value){error.value='请填写邮箱或用户名和密码';return;}
 busy.value=true;
 try{const result=await native('login',{username:username.value.trim(),password:password.value});if(!result?.hasAccount)throw Error('登录未完成，请重新尝试');password.value='';emit('signed-in',result);}
 catch(e){error.value=e.message;}
 finally{busy.value=false;}
}
async function register(){if(busy.value)return;error.value='';try{await native('open',{url:'https://skin.hxzmc.top/auth/register'});}catch(e){error.value=e.message;}}
</script>
<template>
<main class="mobile-welcome083" aria-label="欢迎来到幻想镇">
 <div class="welcome-grid083" aria-hidden="true"><span/><i/><b/></div>
 <div class="welcome-content083">
  <header class="welcome-intro083"><span class="welcome-coordinate083">HXZ / COMMUNITY</span><div class="welcome-emblem083" aria-hidden="true"><Icon name="archive"/></div><h1>在幻想镇，<br>与伙伴相遇。</h1><p>一起聊天、建造与冒险。<br>用你的皮肤站账号，开启这一程。</p><div class="welcome-features083" aria-hidden="true"><span>社区</span><span>游戏</span><span>LINKING</span></div></header>
  <section class="welcome-form083" aria-labelledby="welcome-title083">
   <template v-if="initializing"><span class="welcome-coordinate083">01 / CONNECT</span><h2 id="welcome-title083">正在迎接你</h2><p role="status">正在读取本机账号…</p></template>
   <template v-else-if="initialError"><h2 id="welcome-title083">暂时无法读取账号</h2><p class="welcome-error083" role="alert">{{initialError}}</p><button class="welcome-primary083" @click="emit('retry')">重新读取</button></template>
   <form v-else @submit.prevent="login" novalidate>
    <span class="welcome-coordinate083">01 / SIGN IN</span><h2 id="welcome-title083">欢迎回来</h2><p class="welcome-hint083">使用幻想镇皮肤站账号登录</p>
    <label for="welcome-user083">邮箱或用户名</label><input id="welcome-user083" v-model="username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" :disabled="busy" required>
    <label for="welcome-password083">密码</label><div class="welcome-password083"><input id="welcome-password083" v-model="password" name="password" :type="visible?'text':'password'" autocomplete="current-password" :disabled="busy" required><button type="button" :aria-pressed="visible" :aria-label="visible?'隐藏密码':'显示密码'" @click="visible=!visible">{{visible?'隐藏':'显示'}}</button></div>
    <p v-if="error" class="welcome-error083" role="alert">{{error}}</p>
    <button type="submit" class="welcome-primary083" :disabled="busy"><span>{{busy?'正在登录…':'登录幻想镇'}}</span><Icon name="chevron"/></button>
    <div class="welcome-register083"><span>还没有账号？</span><button type="button" :disabled="busy" @click="register">注册皮肤站账号 <Icon name="chevron"/></button></div>
   </form>
  </section>
  <footer class="welcome-footer083">FANTASY TOWN <span>·</span> 期待与你相遇</footer>
 </div>
</main>
</template>
<style scoped>
.mobile-welcome083{--welcome-paper:#edf3f0;--welcome-panel:#fffffff2;--welcome-ink:#203932;--welcome-muted:#60746b;--welcome-line:#ceddd4;--welcome-accent:#397363;position:relative;isolation:isolate;width:100%;height:100%;min-height:0;overflow:auto;background:var(--welcome-paper);color:var(--welcome-ink);scroll-padding:20px}
:root[data-theme=dark] .mobile-welcome083{--welcome-paper:#14211e;--welcome-panel:#20312df5;--welcome-ink:#e5eee7;--welcome-muted:#aec4b8;--welcome-line:#3b5347;--welcome-accent:#8cc8ac}
.welcome-grid083{position:fixed;inset:0;pointer-events:none;z-index:-1;background-image:linear-gradient(var(--welcome-line) 1px,transparent 1px),linear-gradient(90deg,var(--welcome-line) 1px,transparent 1px);background-size:48px 48px;opacity:.35;overflow:hidden}
.welcome-grid083>span{position:absolute;width:400px;height:400px;left:-240px;top:20%;border:1px solid var(--welcome-accent);transform:rotate(35deg);animation:welcome-drift083 28s ease-in-out infinite alternate}.welcome-grid083>i{position:absolute;width:460px;height:460px;right:-250px;top:-150px;border:1px solid var(--welcome-accent);transform:rotate(25deg)}.welcome-grid083>b{position:absolute;width:110px;height:110px;right:10%;bottom:7%;border:1px solid var(--welcome-accent);border-radius:50%;animation:welcome-drift083 32s ease-in-out infinite alternate-reverse}
.welcome-content083{position:relative;display:grid;grid-template-columns:minmax(0,1fr);align-content:center;gap:28px;width:min(100%,1050px);min-height:100%;margin:auto;padding:28px 20px;box-sizing:border-box}.welcome-intro083{min-width:0}.welcome-coordinate083{display:block;font-size:.63rem;font-weight:650;letter-spacing:.18em;line-height:1.6;color:var(--welcome-muted)}.welcome-emblem083{display:grid;place-items:center;width:45px;height:45px;margin:20px 0 14px;border:1px solid var(--welcome-accent);border-radius:12px;transform:rotate(-8deg);color:var(--welcome-accent)}.welcome-emblem083>.icon{transform:rotate(8deg);width:25px;height:25px}.welcome-intro083 h1{font-size:clamp(1.6rem,6vw,2.6rem);line-height:1.35;letter-spacing:-.03em;margin:0 0 12px;overflow-wrap:anywhere}.welcome-intro083 p{font-size:.85rem;line-height:1.8;margin:0;color:var(--welcome-muted)}.welcome-features083{display:flex;gap:14px;margin-top:20px;font-size:.64rem;letter-spacing:.08em;color:var(--welcome-muted)}.welcome-features083>span+span:before{content:'+';margin-right:14px;color:var(--welcome-accent)}
.welcome-form083{min-width:0;background:var(--welcome-panel);padding:24px;border:1px solid var(--welcome-line);border-radius:18px;box-shadow:0 12px 40px #14291e08}.welcome-form083 form{display:grid;min-width:0;gap:10px}.welcome-form083 h2{font-size:1.45rem;line-height:1.4;margin:7px 0 0;overflow-wrap:anywhere}.welcome-hint083{font-size:.8rem;line-height:1.65;margin:0 0 10px;color:var(--welcome-muted)}.welcome-form083 label{font-size:.8rem;line-height:1.6;margin-top:6px}.welcome-form083 input{display:block;width:100%;min-width:0;height:48px;min-height:48px;padding:10px 12px;background:var(--welcome-paper);color:var(--welcome-ink);border:1px solid var(--welcome-line);border-radius:8px;box-sizing:border-box;outline:none;font-size:max(16px,.85rem)}.welcome-form083 input:focus{border-color:var(--welcome-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--welcome-accent) 15%,transparent)}.welcome-password083{display:flex;position:relative;min-width:0}.welcome-password083 input{padding-right:64px}.welcome-password083>button{position:absolute;right:3px;top:3px;bottom:3px;min-width:52px;min-height:42px;padding:4px 8px;color:var(--welcome-accent);font-size:.72rem;border-radius:6px;background:none;border:0}.welcome-primary083{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;width:100%;min-height:48px;margin-top:12px;padding:10px 14px;border:1px solid var(--welcome-accent);border-radius:8px;background:var(--welcome-ink);color:var(--welcome-paper);font-size:.9rem;font-weight:600;line-height:1.5}.welcome-primary083:disabled{opacity:.6}.welcome-primary083>.icon{width:20px;height:20px}.welcome-register083{display:flex;gap:4px 8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:6px;font-size:.75rem;color:var(--welcome-muted)}.welcome-register083>button{min-height:44px;max-width:100%;padding:7px 0;display:flex;align-items:center;gap:6px;line-height:1.6;white-space:normal;color:var(--welcome-accent);background:none;border:0}.welcome-register083 .icon{width:15px;height:15px}.welcome-error083{font-size:.8rem;line-height:1.7;margin:4px 0;color:#b14e4e;overflow-wrap:anywhere}:root[data-theme=dark] .welcome-error083{color:#ffa3a3}.welcome-footer083{font-size:.6rem;color:var(--welcome-muted);line-height:1.7;letter-spacing:.08em}.welcome-footer083>span{margin:0 8px}
@keyframes welcome-drift083{to{translate:14px -12px;rotate:8deg}}:root[data-motion=off] .welcome-grid083>*{animation:none}@media(prefers-reduced-motion:reduce){.welcome-grid083>*{animation:none}}
@media(min-width:700px){.welcome-content083{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px 40px;padding:32px}.welcome-footer083{grid-column:1/-1}.welcome-intro083{align-self:center}}
@media(max-width:380px){.welcome-content083{padding:22px 14px;gap:22px}.welcome-form083{padding:20px 16px}.welcome-intro083 h1{font-size:1.65rem}.welcome-emblem083{margin:15px 0 12px}}
@media(max-height:500px){.welcome-content083{align-content:start;padding-block:20px}.welcome-intro083 h1{font-size:1.6rem}.welcome-emblem083{margin-block:10px}.welcome-features083{margin-top:12px}}
</style>
