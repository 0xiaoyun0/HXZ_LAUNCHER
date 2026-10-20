import{h as In,l as em,i as tm,j as im,k as Wo,m as hf,o as nm,q as sm,n as ro,u as hh}from"./index-BqJTAU2z.js";var rm=["0","1","2","3","4","5","6","7","8","9"],fr=new Map,uf=/[\u0590-\u08ff\u200e\u200f\u202a-\u202e\u2066-\u2069\ufb1d-\ufeff]/u;function am(n={}){let e=Intl.getCanonicalLocales(n.locales),t=Object.fromEntries(Object.entries(n.format??{}).sort(([r],[a])=>r.localeCompare(a))),i=JSON.stringify([e,t]),s=fr.get(i);if(!s){s=new Intl.NumberFormat(e,t);let r=fr.keys().next().value;fr.size>=64&&r!==void 0&&fr.delete(r),fr.set(i,s)}return s}function om(n,e={}){let t=am(e),i=t.formatToParts(n),s=i.map(m=>m.value).join(""),r=t.resolvedOptions(),a=r.numberingSystem==="latn"&&r.notation==="standard"&&!uf.test(s)&&!i.some(m=>m.type==="nan"||m.type==="infinity"),o=JSON.stringify(r);if(!a)return{text:s,tokens:[],rollable:a,signature:o,magnitude:""};let l=i.filter(m=>m.type==="integer").reduce((m,v)=>m+v.value.length,0),c=-1,h=new Map,d=[],u="",f="";for(let m of i)if(m.type==="integer"||m.type==="fraction"){m.type==="integer"?u+=m.value:f+=m.value;for(let v of m.value){let p=`digit:${m.type==="integer"?--l:c--}`;d.push({key:p,identity:p,text:v,wheel:rm,index:Number(v)})}}else if(m.type==="group"){let v=`group:${l}`;d.push({key:`${v}:${m.value}`,identity:v,text:m.value})}else{let v=h.get(m.type)??0;h.set(m.type,v+1);let p=m.type==="plusSign"||m.type==="minusSign"?"sign":m.type;d.push({key:`${m.type}:${v}:${m.value}`,identity:`${p}:${v}`,text:m.value})}return{text:s,tokens:d,rollable:a,signature:o,magnitude:`${u.replace(/^0+(?=\d)/u,"")}.${f}`}}function lm(n,e){let[t="",i=""]=n.magnitude.split("."),[s="",r=""]=e.magnitude.split(".");if(t.length!==s.length)return s.length>t.length?1:-1;if(t!==s)return s>t?1:-1;let a=Math.max(i.length,r.length),o=i.padEnd(a,"0"),l=r.padEnd(a,"0");return l===o?0:l>o?1:-1}var $h=" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/&+'",pr=new Map;function cm(n){let e=pr.get(n);return e||(e=[...new Set(df(n))],pr.size>=16&&pr.delete(pr.keys().next().value),pr.set(n,e)),e}function df(n){return typeof Intl.Segmenter=="function"?[...new Intl.Segmenter(void 0,{granularity:"grapheme"}).segment(n)].map(e=>e.segment):[...n]}function hm(n,e={}){let t=e.charset??$h,i=!uf.test(n);if(!i)return{text:n,tokens:[],rollable:i,signature:"text",magnitude:""};let s=df(n).map((r,a)=>{if(e.transition==="direct")return{key:`char:${a}`,identity:`char:${a}`,text:r,wheel:[r],index:0};let o=cm(typeof t=="string"?t:t[a]??t.at(-1)??$h),l=`char:${a}`,c=o.indexOf(r);return c>=0?{key:l,identity:l,text:r,wheel:o,index:c}:{key:`${l}:${r}`,identity:l,text:r}});return{text:n,tokens:s,rollable:i,signature:`text:${e.transition??"wheel"}`,magnitude:""}}function um(n,e,t=.14){return{target:0,duration:e,points:Array.from({length:49},(i,s)=>{if(s===48)return 0;let r=Math.max(0,Math.min(1,(s/48-t)/(1-t)));return n*(1+10*r)*Math.exp(-10*r)})}}function oa(n,e){if(e<=0||n.duration<=0)return n;let t=n.duration+e,i=Math.round((n.points.length-1)*t/n.duration)+1,s=n.points[0]??n.target;return{target:n.target,duration:t,points:Array.from({length:i},(r,a)=>{if(a===i-1)return n.target;let o=a/(i-1)*t-e;return o<=0?s:ff(n,o).position})}}function fn(n,e,t,i){if(i<=0)return{points:[e,e],duration:0,target:e};let s=i/1e3,r=n-e,a=Math.max(Math.abs(r),1)*12/s,o=Math.max(-a,Math.min(a,t))*s;return{points:Array.from({length:49},(l,c)=>{if(c===48)return e;let h=c/48;return e+(r+(o+10*r)*h)*Math.exp(-10*h)}),duration:i,target:e}}function dm(n,e=0,t=24){if(n.duration<=0)return{points:[0,0],duration:0,target:0};let i=n.duration/(n.points.length-1)/1e3;return{duration:n.duration,target:0,points:n.points.map((s,r,a)=>{if(r===0)return Math.max(0,Math.min(1,e));if(r===a.length-1)return 0;let o=Math.abs((a[r+1]-a[r-1])/(2*i)),l=t/6;return Math.max(0,Math.min(1,(o-l)/(t-l)))})}}function ff(n,e){if(e>=n.duration||n.duration===0)return{position:n.target,velocity:0};let t=Math.max(0,e)/n.duration*(n.points.length-1),i=Math.min(Math.floor(t),n.points.length-2),s=n.points[i]??n.target,r=n.points[i+1]??n.target;return{position:s+(r-s)*(t-i),velocity:(r-s)*(n.points.length-1)*1e3/n.duration}}function eu(n,e,t,i=10){let s=Math.floor(n/i)*i+e;return t>0&&s<n-.001?s+=i:t<0&&s>n+.001?s-=i:t===0&&(s+=Math.round((n-s)/i)*i),s}var ao=(n,e)=>n[(e%n.length+n.length)%n.length];function fm(n,e,t){let i=Math.floor(e),s=e-i,r=[ao(n,i)];return s>1e-5&&r.push(ao(n,i+1)),r.at(-1)!==t&&r.push(t),{wheel:r,from:s,target:r.length-1}}function pm(n,e="outward"){if(e!=="outward"){let s=n.map((a,o)=>a?-1:o).filter(a=>a>=0);e==="end"&&s.reverse();let r=n.map(a=>a?0:1);return e!=="none"&&s.forEach((a,o)=>{r[a]=o+1}),r}let t=n.map((s,r)=>s?0:r+1);if(!n.includes(!0))return t;let i=-1/0;for(let s=0;s<n.length;s++)n[s]?i=s:t[s]=s-i;i=1/0;for(let s=n.length-1;s>=0;s--)n[s]?i=s:t[s]=Math.min(t[s],i-s);return t}function tu(n,e){let t=new Map,i=[],s=0;for(let r of n){let a=e.get(r);if(!a){i.push(r);continue}for(let o of i)t.set(o,a.x);i.length=0,s=a.x+a.width}for(let r of i)t.set(r,s);return t}var Xo=new WeakMap;class uh{view;media;members=new Set;pending=new Set;sizes=new WeakMap;intersections=new WeakMap;resize;intersection;frame=0;static for(e){let t=Xo.get(e);return t||(t=new uh(e),Xo.set(e,t)),t}constructor(e){this.view=e,this.media=e.matchMedia("(prefers-reduced-motion: reduce)"),this.media.addEventListener("change",this.refresh),e.document.addEventListener("visibilitychange",this.refresh),e.document.fonts?.addEventListener("loadingdone",this.refresh),e.document.fonts?.ready.then(this.refresh),e.ResizeObserver&&(this.resize=new e.ResizeObserver(t=>{for(let i of t){let s=this.sizes.get(i.target);s?.sizeChanged(i.target,i.contentRect.width,i.contentRect.height)&&s.refresh()}})),e.IntersectionObserver&&(this.intersection=new e.IntersectionObserver(t=>{for(let i of t)this.intersections.get(i.target)?.visibility(i.isIntersecting)},{rootMargin:"64px"}))}refresh=()=>{for(let e of this.members)e.refresh()};add(e,t){this.members.add(e),this.intersections.set(t,e),this.intersection?.observe(t)}watch(e,t){this.sizes.set(e,t),this.resize?.observe(e)}unwatch(e){this.resize?.unobserve(e),this.sizes.delete(e)}enqueue(e){this.pending.add(e),!this.frame&&(this.frame=this.view.requestAnimationFrame(()=>{this.frame=0;let t=[...this.pending];this.pending.clear();let i=t.map(r=>r.stage());for(let r of i)r?.();let s=t.map(r=>r.measure());for(let r of s)r?.()}))}remove(e,t){this.pending.delete(e),this.members.delete(e),this.intersection?.unobserve(t),this.intersections.delete(t),!this.members.size&&(this.view.cancelAnimationFrame(this.frame),this.resize?.disconnect(),this.intersection?.disconnect(),this.media.removeEventListener("change",this.refresh),this.view.document.removeEventListener("visibilitychange",this.refresh),this.view.document.fonts?.removeEventListener("loadingdone",this.refresh),Xo.delete(this.view))}}var iu=new WeakMap;function ws(n,e,t){let i=n.animate(e,t),s=n.ownerDocument.timeline?.currentTime;return typeof s=="number"&&i.playState==="running"&&(i.startTime=s),i}function nu(n){let e=n.ownerDocument.defaultView;if(!e)return!1;let t=iu.get(e);return t===void 0&&(t=e.CSS?.supports("animation-timing-function","linear(0, 1)")??!1,iu.set(e,t)),t}class Rs{element;property;animation;motion;value=0;constructor(e,t){this.element=e,this.property=t}read(){let e=this.animation?.currentTime;return this.animation&&this.motion?ff(this.motion,typeof e=="number"?e:0):{position:this.value,velocity:0}}set(e,t){this.cancel(),this.value=e,this.element.style.setProperty(this.property,t(e))}play(e,t,i){if(this.cancel(),this.value=e.target,this.element.style.setProperty(this.property,t(e.target)),!e.duration||e.points.every(d=>d===e.target)){i?.();return}let s=e.points[0]??e.target,r=e.target-s,a=this.property==="opacity"&&nu(this.element),o=this.property==="transform"&&Math.abs(r)>1e-5&&nu(this.element),l=a?[{opacity:0},{opacity:1}]:o?[{[this.property]:t(s)},{[this.property]:t(e.target)}]:e.points.map(d=>({[this.property]:t(d)})),c=a?`linear(${e.points.map(t).join(",")})`:o?`linear(${e.points.map(d=>Number(((d-s)/r).toFixed(6))).join(",")})`:"linear",h=ws(this.element,l,{duration:e.duration,easing:c});this.animation=h,this.motion=e,h.onfinish=()=>{this.animation===h&&(this.animation=void 0,this.motion=void 0,h.onfinish=null,h.cancel(),i?.())}}cancel(){this.animation&&(this.animation.onfinish=null,this.animation.cancel(),this.animation=void 0),this.motion=void 0}}var qo="http://www.w3.org/2000/svg",mm=0;class jo{host;layers=new Map;filter;intensity=1;constructor(e){this.host=e}filterUrl(e){if(!this.filter){let i=this.host.ownerDocument,s=i.createElementNS(qo,"svg");s.classList.add("rn-blur-defs"),s.setAttribute("aria-hidden","true"),s.setAttribute("focusable","false");let r=i.createElementNS(qo,"filter"),a;do a=`rn-vertical-blur-${++mm}`;while(i.getElementById(a));r.id=a,r.setAttribute("x","-15%"),r.setAttribute("width","130%"),r.setAttribute("color-interpolation-filters","sRGB");let o=i.createElementNS(qo,"feGaussianBlur");r.append(o),s.append(r),this.host.append(s),this.filter={svg:s,blur:o,id:a,height:0}}let t=e*.035*this.intensity;return this.filter.height!==t&&(this.filter.blur.setAttribute("stdDeviation",`0 ${t}`),this.filter.height=t),`url("#${this.filter.id}")`}apply(e,t,i,s,r="roll"){let a=dm(t,s,r==="entry"?6:24);if(a.points.every(d=>d===0))return!1;let o=this.host.ownerDocument.createElement("span");o.className="rn-sharp",o.append(...e.childNodes);let l=o.cloneNode(!0);l.className="rn-smear",l.style.filter=this.filterUrl(i),e.append(o,l);let c=new Rs(o,"opacity"),h=new Rs(l,"opacity");return this.layers.set(e,{sharp:o,sharpOpacity:c,smearOpacity:h}),c.play(a,d=>String(1-d)),h.play(a,String),!0}remove(e){let t=this.layers.get(e);if(!t)return 0;let i=t.smearOpacity.read().position;return t.sharpOpacity.cancel(),t.smearOpacity.cancel(),e.replaceChildren(...t.sharp.childNodes),this.layers.delete(e),i}destroy(){for(let e of this.layers.keys())this.remove(e);this.filter?.svg.remove(),this.filter=void 0}}function gm(n){return Math.max(45,Math.min(110,n/7))}function vm(n,e,t){let i=Math.abs(e-n);return{points:[n,e],target:e,duration:i*t}}function xm(n){let e=Array.from({length:n+1},(s,r)=>({"--rn-flap-step":String(r),offset:r/n,easing:"steps(1, end)"})),t=[],i=[];for(let s=0;s<n;s++){let r=s/n,a=(s+.5)/n,o=(s+1)/n;t.push({transform:"perspective(5em) rotateX(0deg)",filter:"brightness(1)",offset:r,easing:"cubic-bezier(.6, 0, 1, .5)"},{transform:"perspective(5em) rotateX(-90deg)",filter:"brightness(.45)",offset:a},{transform:"perspective(5em) rotateX(-90deg)",filter:"brightness(.45)",offset:o}),i.push({transform:"perspective(5em) rotateX(90deg)",filter:"brightness(.45)",offset:r},{transform:"perspective(5em) rotateX(90deg)",filter:"brightness(.45)",offset:a,easing:"linear(0, 0.58, 0.9, 1, 1.045 78%, 1)"},{transform:"perspective(5em) rotateX(0deg)",filter:"brightness(1)",offset:o})}return{index:e,falls:t,lands:i}}function _m(n){for(let e of n.querySelectorAll(".rn-flap-smear")){for(let t of e.getAnimations())t.cancel();e.remove()}for(let e of n.querySelectorAll(".rn-flap-sharp")){for(let t of e.getAnimations())t.cancel();e.classList.remove("rn-flap-sharp")}}function ym(n,e,t,i,s,r,a,o){let l=n.ownerDocument,c=Math.abs(i-t),h=i>=t?1:-1;if(!c){n.replaceChildren();return}let d=xm(c),u=Array.from({length:c+1},(T,w)=>ao(e,t+w*h)),f=[...u.slice(1),u.at(-1)],m=u.some(T=>/[\r\n\f\u2028\u2029]/u.test(T)),v=l.createElement("span");v.style.cssText=`display:block;position:relative;height:${s}px`,ws(v,d.index,{delay:a,duration:c*r,fill:"both"});let p=(T,w)=>{let R=l.createElement("span");R.className=`rn-face rn-flap rn-flap-${T}`,R.style.height=`${s}px`,R.style.overflow="hidden";let _=l.createElement("span");_.style.cssText=`display:block;white-space:pre;line-height:${s}px`;let E=w?f:u;if(m)for(let L of E){let C=l.createElement("span");C.style.cssText=`display:block;height:${s}px`,C.textContent=L,_.append(C)}else _.textContent=E.join(`
`);return R.append(_),_.style.transform=`translateY(calc(var(--rn-flap-step) * ${-s}px))`,R},g=p("bottom",!1),y=p("top",!0),S=p("top",!1),M=p("bottom",!0);if(o){let T=(w,R)=>{let _=w.firstElementChild,E=_.cloneNode(!0);_.classList.add("rn-flap-sharp");let L=l.createElement("span");L.className="rn-flap-smear",L.style.cssText="display:block;position:absolute;inset:0;overflow:hidden",L.style.filter=o,L.append(E),w.append(L);let C=R.map(k=>({offset:k.offset,easing:k.easing??"linear",opacity:k.filter==="brightness(1)"?0:1})),F={delay:a,duration:c*r,fill:"both"};ws(L,C,F),ws(_,C.map(k=>({...k,opacity:1-k.opacity})),F)};T(S,d.falls),T(M,d.lands)}S.style.transform="perspective(5em) rotateX(-90deg)",ws(S,d.falls,{delay:a,duration:c*r,fill:"backwards"}),M.style.transform="perspective(5em) rotateX(90deg)",ws(M,d.lands,{delay:a,duration:c*r,fill:"forwards"}),n.style.height=`${s}px`,v.append(g,y,M,S),n.replaceChildren(v)}var Mm=new WeakMap,Br=new WeakSet,Yo=n=>`translateX(${n}px)`,Ko=n=>`scale(${n})`,Zo=n=>String(Math.max(0,Math.min(1,n))),Jo=n=>"transition"in n&&n.transition==="direct";function pf(n){if(n.duration!==void 0&&(!Number.isFinite(n.duration)||n.duration<0||n.duration>1e4))throw RangeError("duration must be between 0 and 10000 milliseconds");if(n.flipDuration!==void 0&&(!Number.isFinite(n.flipDuration)||n.flipDuration<1||n.flipDuration>1e4))throw RangeError("flipDuration must be between 1 and 10000 milliseconds")}var bm={validate(n){if(typeof n.value!="number"&&typeof n.value!="bigint")throw TypeError("value must be a number or bigint");pf(n)},model:n=>om(n.value,n),direction:lm},Sm={validate(n){if(typeof n.text!="string")throw TypeError("text must be a string");if(n.transition!==void 0&&n.transition!=="direct"&&n.transition!=="wheel")throw RangeError("transition must be direct or wheel");if(n.transition==="direct"&&n.mode==="flap")throw RangeError("Direct text transitions require roll mode");pf(n)},model:n=>hm(n.text,n),direction:()=>1};class mf{host;source;options;target;displayed;semantic;measurement;visual;measures=new Map;columns=new Map;sizes=new Map;scheduler;enhanced=!1;destroyed=!1;visible=!0;reset=!0;measurementPending=!1;hadClass;previousLeft;blur;blurIntensity=1;constructor(e,t,i){this.host=e,this.source=i,i.validate(t),this.options={...t},this.target=this.displayed=i.model(t);let s=e.ownerDocument,r=o=>{let l=s.createElement("span");return l.className=o,l};this.semantic=r("rn-value"),this.measurement=r("rn-measure"),this.visual=r("rn-visual"),this.measurement.setAttribute("aria-hidden","true"),this.visual.setAttribute("aria-hidden","true"),this.semantic.textContent=this.target.text,this.hadClass=e.classList.contains("rn-root"),e.classList.add("rn-root"),e.replaceChildren(this.semantic,this.measurement,this.visual);let a=s.defaultView;a&&typeof a.matchMedia=="function"&&typeof a.requestAnimationFrame=="function"&&typeof e.animate=="function"&&(this.scheduler=uh.for(a),this.scheduler.add(this,e),this.scheduler.watch(this.measurement,this)),this.prepare()}canAnimate(){return!!this.scheduler&&this.options.animated!==!1&&(this.options.duration??500)>0&&!this.scheduler.media.matches&&!this.host.ownerDocument.hidden&&(this.visible||this.options.pauseOffscreen===!1)&&this.target.rollable&&this.host.isConnected}update(e){if(this.destroyed)return;let t={...this.options,...e};this.source.validate(t);let i=this.source.model(t),s=i.text===this.target.text&&i.signature===this.target.signature;if(this.options.motionBlur&&!t.motionBlur&&(this.blur?.destroy(),this.blur=void 0,_m(this.visual)),Jo(this.options)!==Jo(t)&&(this.reset=!0),this.options=t,this.target=i,!this.canAnimate()){this.finish();return}s&&this.enhanced&&!this.reset||(this.semantic.textContent=i.text,this.prepare())}prepare(){if(!this.canAnimate()){this.finish();return}this.measurementPending=!0,this.scheduler?.enqueue(this)}stage(){if(!this.destroyed)return this.canAnimate()?(this.previousLeft=this.enhanced&&!this.reset?this.measurement.getBoundingClientRect().left:void 0,()=>this.stageMeasurement()):()=>this.finish()}stageMeasurement(){let e=new Set(this.target.tokens.map(i=>i.key));for(let[i,s]of this.measures)e.has(i)||(this.scheduler?.unwatch(s),this.sizes.delete(s),s.remove(),this.measures.delete(i));let t=null;for(let i of this.target.tokens){let s=this.measures.get(i.key);s||(s=this.host.ownerDocument.createElement("span"),s.className="rn-token",this.measures.set(i.key,s),this.scheduler?.watch(s,this)),s.textContent!==i.text&&(s.textContent=i.text);let r=t?t.nextSibling:this.measurement.firstChild;s!==r&&this.measurement.insertBefore(s,r),t=s}this.host.dataset.rnMeasuring=""}measure(){if(this.destroyed)return;if(!this.canAnimate())return()=>this.finish();let e=this.measurement.getBoundingClientRect(),t=this.host.ownerDocument.defaultView;if(!t)return()=>this.finish();let i=t.getComputedStyle(this.measurement);if(i.direction==="rtl")return()=>this.finish();let s=parseFloat(i.width),r=parseFloat(i.height);if(!s||!r||!e.width||!e.height)return()=>this.finish();let a=e.width/s,o=e.height/r,l=parseFloat(i.getPropertyValue("--rn-blur"));this.blurIntensity=Number.isFinite(l)?Math.max(0,l):1,this.sizes.set(this.measurement,{width:s,height:r});let c=new Map;for(let[d,u]of this.measures){let f=u.getBoundingClientRect(),m={width:parseFloat(t.getComputedStyle(u).width),height:parseFloat(t.getComputedStyle(u).height)};this.sizes.set(u,m),c.set(d,{...m,x:(f.left-e.left)/a,y:(f.top-e.top)/o})}let h=this.previousLeft===void 0?0:(this.previousLeft-e.left)/a;return()=>this.commit(c,h)}makeColumn(e){let t=this.host.ownerDocument.createElement("span");t.className="rn-slot",t.dataset.rnKey=e.key,e.index!==void 0&&(t.dataset.rnWheel=""),this.options.mode==="flap"&&(t.dataset.rnFlap="");let i=this.host.ownerDocument.createElement("span");return i.className="rn-reel",t.append(i),this.visual.append(t),{token:e,element:t,reel:i,x:new Rs(t,"transform"),opacity:new Rs(t,"opacity"),roll:new Rs(i,"transform"),exiting:!1,height:0,width:0}}face(e,t){let i=this.host.ownerDocument.createElement("span");i.className="rn-face",i.textContent=t,i.style.height=`${e.height}px`;let s=e.reel.children.length;i.style.position="absolute",i.style.top="0",i.style.left="0",i.style.width="100%",i.style.transform=`translateY(${s*e.height}px)`,e.reel.style.height=`${(s+1)*e.height}px`,e.reel.append(i)}rest(e){this.blur?.remove(e.reel),e.reel.replaceChildren(),e.reel.style.removeProperty("height"),this.face(e,e.token.text),this.wrapInk(e),e.token.index===void 0?e.roll.set(1,Ko):e.roll.set(e.token.index,()=>"translateY(0px)")}wrapInk(e){if(this.options.mode==="flap")return;let t=this.host.ownerDocument.createElement("span");t.className="rn-ink",t.append(...e.reel.childNodes),e.reel.append(t)}finishEntry(e){e.entry&&(e.entry.blurred&&this.blur?.remove(e.reel),e.entry.track.cancel(),e.entry.element.replaceWith(e.reel),e.entry=void 0)}enter(e,t,i,s){let r=this.host.ownerDocument.createElement("span");r.className="rn-enter",e.reel.replaceWith(r),r.append(e.reel);let a=new Rs(r,"transform");e.entry={element:r,track:a,blurred:!1};let o=oa(um(e.height*(s?.entryDistance??1),s?.entryDuration??t,s?.entryHold),i);if(this.options.motionBlur&&e.token.text.trim()){this.blur??=new jo(this.host),this.blur.intensity=this.blurIntensity;let l={...o,points:o.points.map(c=>c/e.height)};e.entry.blurred=this.blur.apply(e.reel,l,e.height,0,"entry")}a.play(o,l=>`translateY(${l}px)`,()=>this.finishEntry(e))}commit(e,t){if(this.destroyed)return;this.measurementPending=!1;let i=this.enhanced&&!this.reset,s=i?this.options.duration??500:0,r=Mm.get(this.host),a=s?r?.widthDuration??s:0,o=this.options.mode==="flap",l=this.options.direction==="up"?1:this.options.direction==="down"?-1:this.source.direction(this.displayed,this.target);this.target.text!==this.displayed.text&&(this.host.dataset.rnTrend=l>0?"up":l<0?"down":"none");let c=new Map([...this.columns].map(([M,T])=>{let w=T.x.read();return[M,{...w,x:w.position,width:T.width}]})),h=tu(this.target.tokens.map(M=>M.key),c),d=[...c.keys()].sort((M,T)=>c.get(M).x-c.get(T).x),u=tu(d,e),f=new Map(this.displayed.tokens.filter(M=>M.index===void 0).map(M=>[M.identity,M.key])),m=new Map(this.target.tokens.filter(M=>M.index===void 0).map(M=>[M.identity,M.key])),v=this.options.stagger==="start"||this.options.stagger==="end",p=this.target.tokens.map(M=>{let T=this.columns.get(M.key);return!T||T.exiting||v&&M.index!==void 0&&T.token.text!==M.text}),g=pm(this.target.tokens.map((M,T)=>M.index!==void 0&&!p[T]),this.options.stagger),y=Math.max(0,...this.target.tokens.map((M,T)=>p[T]?g[T]-1:0)),S=Math.min(s*.045,s*.3/Math.max(1,y));for(let[M,T]of this.target.tokens.entries()){let w=e.get(T.key);if(!w)continue;let R=Math.max(0,g[M]-1)*S,_=f.get(T.identity),E=_!==void 0&&_!==T.key?c.get(_):void 0,L=this.columns.get(T.key),C=!L;if(!L){L=this.makeColumn(T),this.columns.set(T.key,L);let z=(E?.x??h.get(T.key)??w.x)+t;L.x.set(i?z+(w.x-z)*(E?0:r?.entryOrigin??0):w.x,Yo),L.opacity.set(i?0:1,Zo)}let F=L.token.text!==T.text,k=Math.abs(L.height-w.height)>.1,V=L.exiting;L.exiting=!1,L.element.style.width=`${w.width}px`,L.element.style.height=`${w.height}px`,L.element.style.top=`${w.y}px`;let W=c.get(T.key);if(L.x.play(fn(W?W.position+t:L.x.read().position,w.x,W?.velocity??0,a),Yo),C||V||!i){let z=L.opacity.read(),B=fn(z.position,1,z.velocity,T.index===void 0?Math.min(s,180):s?r?.fadeDuration??s:0),ie=!o&&T.identity.startsWith("group:")&&!E?(r?.entryDuration??s)*(r?.entryHold??.14):0;L.opacity.play(C?oa(B,R+ie):B,Zo)}if(L.height=w.height,L.width=w.width,(!i||k)&&this.finishEntry(L),C&&o&&T.wheel&&s&&L.roll.set(Math.max(0,T.wheel.indexOf(" ")),()=>"translateY(0px)"),o&&!k&&(F||C)&&T.index!==void 0&&T.wheel&&s&&L.roll.read().position!==T.index){let z=L.roll.read(),B=Math.round(z.position),ie=eu(B,T.index,l,T.wheel.length),K=this.options.flipDuration??gm(s);this.blur?.remove(L.reel);let ce;this.options.motionBlur&&this.blurIntensity>0&&(this.blur??=new jo(this.host),this.blur.intensity=this.blurIntensity,ce=this.blur.filterUrl(w.height)),ym(L.reel,T.wheel,B,ie,w.height,K,R,ce),L.token=T;let de=L;L.roll.play(oa(vm(B,ie,K),R),()=>"translateY(0px)",()=>this.rest(de))}else if(!C&&!k&&F&&T.index!==void 0&&T.wheel&&L.token.index!==void 0&&s){let z=L.roll.read(),B=Jo(this.options)?fm(L.token.wheel,z.position,T.text):void 0,ie=B?.from??z.position,K=B?.target??eu(z.position,T.index,l,T.wheel.length),ce=B?.wheel??T.wheel,de=B?Math.min(Math.max(0,z.velocity),(K-ie)*1e4/s):z.velocity,ue=v?oa(fn(ie,K,de,s),R):fn(ie,K,de,s),Ne=Math.floor(Math.min(...ue.points)),tt=Math.ceil(Math.max(...ue.points));L.entry&&(L.entry.blurred=!1);let Qe=this.blur?.remove(L.reel)??0;L.reel.replaceChildren();for(let ne=Ne;ne<=tt;ne++)this.face(L,ao(ce,ne));this.wrapInk(L),this.options.motionBlur&&(this.blur??=new jo(this.host),this.blur.intensity=this.blurIntensity,this.blur.apply(L.reel,ue,w.height,Qe)),L.token=B?{...T,wheel:ce,index:K}:T;let Z=L;L.roll.play(ue,ne=>`translateY(${(Ne-ne)*w.height}px)`,()=>this.rest(Z))}else(C||k||F||!i)&&(L.token=T,this.rest(L));if(C&&s&&T.index!==void 0&&!o&&this.enter(L,s,R,r),E&&s&&(C||V)){let z=L.roll.read(),B=L;L.roll.play(fn(C?.96:z.position,1,z.velocity,Math.min(s,180)),Ko,()=>this.rest(B))}}for(let[M,T]of this.columns){if(e.has(M))continue;let w=c.get(M),R=m.get(T.token.identity),_=R?e.get(R):void 0;if(T.x.play(fn(w.position+t,_?.x??u.get(M)??w.position,w.velocity,a),Yo),T.exiting)continue;if(T.exiting=!0,_&&s){let L=T.roll.read();T.roll.play(fn(L.position,1.04,L.velocity,Math.min(s,180)),Ko)}let E=T.opacity.read();T.opacity.play(fn(E.position,0,E.velocity,T.token.index===void 0?Math.min(s,180):s*.65),Zo,()=>{T.exiting&&(this.removeColumn(T),this.columns.delete(M))})}this.enhanced=!0,this.reset=!1,this.displayed=this.target,this.host.dataset.rnReady=""}removeColumn(e){this.blur?.remove(e.reel),this.finishEntry(e),e.x.cancel(),e.roll.cancel(),e.opacity.cancel(),e.element.remove()}refresh(){this.destroyed||(this.reset=!0,this.prepare())}sizeChanged(e,t,i){if(this.measurementPending||!this.host.hasAttribute("data-rn-measuring"))return!1;let s=this.sizes.get(e);return!s||Math.abs(s.width-t)>.2||Math.abs(s.height-i)>.2}visibility(e){this.visible!==e&&(this.visible=e,(e||this.options.pauseOffscreen!==!1)&&this.refresh())}finish(){if(!this.destroyed){this.measurementPending=!1;for(let e of this.columns.values())this.removeColumn(e);this.columns.clear(),this.blur?.destroy(),this.blur=void 0,this.semantic.textContent=this.target.text,delete this.host.dataset.rnReady,delete this.host.dataset.rnMeasuring,delete this.host.dataset.rnTrend,this.enhanced=!1,this.reset=!0,this.displayed=this.target}}destroy(){if(!this.destroyed){this.finish(),this.destroyed=!0;for(let e of this.measures.values())this.scheduler?.unwatch(e);this.scheduler?.unwatch(this.measurement),this.scheduler?.remove(this,this.host),this.host.replaceChildren(this.host.ownerDocument.createTextNode(this.target.text)),!this.hadClass&&this.host.classList.remove("rn-root"),Br.delete(this.host)}}}function Jr(n,e){if(Br.has(n))throw Error("A rolling number is already mounted on this element");let t=new mf(n,e,bm);return Br.add(n),t}function Qr(n,e){if(Br.has(n))throw Error("A rolling number is already mounted on this element");let t=new mf(n,e,Sm);return Br.add(n),t}function Tm(n){n.replaceChildren(),n.setAttribute("role","timer");const e=[0,1,2].map(i=>{i&&n.append(":");const s=document.createElement("span");return s.setAttribute("aria-hidden","true"),n.append(s),Jr(s,{value:0,duration:460,motionBlur:!0,locales:"en-GB",format:{minimumIntegerDigits:2,useGrouping:!1},animated:!1})});let t=!1;return(i,s)=>{const r=[i.getHours(),i.getMinutes(),i.getSeconds()];n.setAttribute("aria-label",r.map(a=>String(a).padStart(2,"0")).join(":")),e.forEach((a,o)=>{a.update({value:r[o],animated:s&&t,direction:"up"}),s||a.finish()}),t=!0}}const la=34.12,Rr=39.56,ca=1.5,Em=n=>Math.max(0,Math.min(1,n)),Fn=n=>{const e=Em(n);return e*e*e*(10+e*(-15+e*6))};function Qo(n,e){if(e<=n[0][0])return n[0][1];if(e>=n[n.length-1][0])return n[n.length-1][1];const t=c=>(n[c+1][1]-n[c][1])/(n[c+1][0]-n[c][0]),i=c=>{if(c===0||c===n.length-1)return 0;const h=t(c-1),d=t(c);if(h*d<=0)return 0;const u=n[c][0]-n[c-1][0],f=n[c+1][0]-n[c][0],m=2*f+u,v=f+2*u;return(m+v)/(m/h+v/d)};let s=0;for(;e>n[s+1][0];)s++;const r=n[s+1][0]-n[s][0],a=(e-n[s][0])/r,o=a*a,l=o*a;return(2*l-3*o+1)*n[s][1]+(l-2*o+a)*r*i(s)+(-2*l+3*o)*n[s+1][1]+(l-o)*r*i(s+1)}const wm=[[34.24,0],[34.4,.19],[34.64,.57],[34.96,.79],[35.28,.92],[35.6,.973],[36.04,1]],Am=[[38.84,0],[38.92,.28],[39,.51],[39.16,.74],[39.32,.94],[39.56,1]],Cm=[[37.72,1],[37.88,.72],[38,.38],[38.12,.22],[38.24,.14],[38.4,.075],[38.64,.024],[38.84,0]],Ps=[-1.6,.5],oo=[1.98,3.24],Rm=[[-1.88,3.2],[2.14,3.36],[-1.77,.36],[2.17,.65]];function as(n){const e=Qo(wm,n),t=Qo(Cm,n),i=[];n>=34.24&&n<36.04&&e>0?i.push([0,e*.5],[1-e*.5,1]):n>=36.04&&n<38.84&&i.push([.5-t*.5,.5+t*.5]);const s=Fn((n-34.2)/.12)*(1-Fn((n-37.76)/.56));return{time:n,intervals:i,markers:s,point:Fn((n-38.58)/.2)*(1-Fn((n-39.08)/.22)),label:Fn((n-34.32)/.36)*(1-Fn((n-37.68)/.24)),labelValue:Fn((n-35.64)/.56),clarity:Qo(Am,n),phase:n<34.24?"waiting":n<36.04?"joining":n<37.72?"connected":n<38.84?"retracting":n<Rr?"revealing":"clear"}}class Pm{clarity=0;active=!1;elapsed=null;frame=as(-1);enter(e=!1){this.active||(this.active=!0,this.elapsed=e?(Rr-la)/ca:null,e&&this.finish())}leave(){this.active=!1,this.elapsed=null,this.frame=as(-1)}select(e=0){this.leave(),this.clarity=e}finish(){this.elapsed=(Rr-la)/ca,this.clarity=1,this.frame=as(Rr)}update(e,t,i,s){if(s!==void 0){this.frame=as(s),this.clarity=this.frame.clarity;return}if(!this.active){this.clarity=i?0:this.clarity*Math.exp(-Math.max(0,e)*9),this.clarity<1e-4&&(this.clarity=0),this.frame=as(-1);return}if(i){this.finish();return}this.elapsed===null&&t?this.elapsed=0:this.elapsed!==null&&(this.elapsed=Math.min(this.elapsed+Math.max(0,e),(Rr-la)/ca)),this.elapsed!==null&&(this.frame=as(la+this.elapsed*ca),this.clarity=this.frame.clarity>this.clarity?this.frame.clarity:this.frame.phase==="clear"?1:this.clarity*Math.exp(-Math.max(0,e)*9))}}function Dm(n){const e=t=>[Ps[0]+(oo[0]-Ps[0])*t,Ps[1]+(oo[1]-Ps[1])*t];return n.intervals.map(([t,i])=>[e(t),e(i)])}class Lm{root=document.querySelector("#inspection-marks");line=this.root.querySelector("#inspection-lines");corners=this.root.querySelector("#inspection-corners");point=this.root.querySelector("#inspection-point");label=document.querySelector("#inspection-text");render(e,t,i,s=!0){const r=document.querySelector("#three-scene");this.root.setAttribute("viewBox",`0 0 ${r.clientWidth} ${r.clientHeight}`),this.root.style.opacity=s&&(e.intervals.length||e.markers>0||e.point>0)?"1":"0",this.root.dataset.phase=e.phase,this.root.dataset.referenceTime=e.time.toFixed(3),this.line.setAttribute("d",Dm(e).map(([l,c])=>`M${t(...l)}L${t(...c)}`).join("")),this.corners.style.opacity=String(e.markers),this.corners.innerHTML=e.markers>0?Rm.map(([l,c])=>{const[h,d]=t(l,c);return`<rect x="${h-4}" y="${d-4}" width="8" height="8"/>`}).join(""):"";const[a,o]=t((Ps[0]+oo[0])/2,(Ps[1]+oo[1])/2);this.point.setAttribute("cx",String(a)),this.point.setAttribute("cy",String(o)),this.point.style.opacity=String(e.point),this.label.style.opacity=String(s&&i?e.label:0),this.label.querySelector("strong").style.opacity=String(e.labelValue)}}class Im{root=null;covers=[];started=null;progress=0;reset(e,t){this.remove(),this.root=e,this.started=null,this.progress=t?1:0,this.refresh()}refresh(){if(this.remove(),!this.root||this.progress===1)return;this.root.querySelectorAll("h2, .detail-title-cn, .metadata dd, .tab-panel p, .research-notes li, .log-row").forEach(t=>{t.classList.add("document-redacted");const i=t.getBoundingClientRect(),s=i.width/t.offsetWidth;if(!s||!Number.isFinite(s))return;const r=document.createTreeWalker(t,NodeFilter.SHOW_TEXT),a=[];let o;for(;o=r.nextNode();){if(!o.textContent?.trim())continue;const l=document.createRange();l.selectNodeContents(o);for(const c of l.getClientRects()){if(!c.width||!c.height)continue;const h=(c.left-i.left)/s,d=(c.top-i.top)/s,u=(c.right-i.left)/s,f=(c.bottom-i.top)/s,m=a.find(v=>Math.abs(v.y-d)<6);m?(m.x=Math.min(m.x,h),m.y=Math.min(m.y,d),m.right=Math.max(m.right,u),m.bottom=Math.max(m.bottom,f)):a.push({x:h,y:d,right:u,bottom:f})}}for(const l of a){const c=document.createElement("span");c.className="document-redaction-window",c.setAttribute("aria-hidden","true");const h=Math.max(0,l.x-1),d=Math.min(t.clientWidth,l.right+1);c.style.cssText=`left:${h}px;top:${l.y-1}px;width:${d-h}px;height:${l.bottom-l.y+2}px`;const u=document.createElement("span");u.className="document-redaction-ink",c.append(u),t.append(c),this.covers.push({window:c,ink:u,order:this.covers.length})}}),this.paint()}update(e,t,i){!this.root||this.progress===1||(i?this.progress=1:(this.started===null&&t.clarity>0&&(this.started=e),this.started!==null&&(this.progress=Math.min(1,Math.max(0,(e-this.started)/.95)))),this.progress===1?this.remove():this.started!==null&&this.paint())}paint(){const e=Math.max(1,this.covers.length-1);for(const t of this.covers){const i=t.order/e*.22,s=Math.min(1,Math.max(0,(this.progress-i)/.78)),r=s<.2?.4*(s/.2)**2:1-.6*((1-s)/.8)**(16/3);t.ink.style.transform=`translateX(${r*101}%)`}}remove(){for(const e of this.covers)e.window.remove();this.covers=[]}}function Ht(n){return n.replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}const kr={performance:{scale:80,pixelRatio:1,antialias:"off",shadows:1024,aoSamples:0,aoResolution:.5,depthOfField:0,transmission:.5,anisotropy:4},original:{scale:100,pixelRatio:1.5,antialias:"off",shadows:2048,aoSamples:32,aoResolution:1,depthOfField:100,transmission:1,anisotropy:16},high:{scale:125,pixelRatio:2,antialias:"smaa",shadows:4096,aoSamples:32,aoResolution:1,depthOfField:100,transmission:1,anisotropy:16},ultra:{scale:150,pixelRatio:2,antialias:"smaa",shadows:4096,aoSamples:64,aoResolution:1,depthOfField:100,transmission:1,anisotropy:16}},su={performance:"性能",original:"原始",high:"高",ultra:"极高"},Bn=(n,e,t)=>e.includes(n)?n:t,ru=(n,e,t,i,s)=>typeof n=="number"&&Number.isFinite(n)?Math.min(t,Math.max(e,Math.round(n/i)*i)):s;function Jn(n,e=!0){const t=kr.original,i=n&&typeof n=="object"?n:{},s=e?t:{...t,pixelRatio:1,aoSamples:0,depthOfField:0};return{scale:ru(i.scale,50,200,5,s.scale),pixelRatio:Bn(i.pixelRatio,[1,1.5,2,3],s.pixelRatio),antialias:Bn(i.antialias,["off","smaa"],s.antialias),shadows:Bn(i.shadows,[0,1024,2048,4096],s.shadows),aoSamples:Bn(i.aoSamples,[0,16,32,64],s.aoSamples),aoResolution:Bn(i.aoResolution,[.5,.75,1],s.aoResolution),depthOfField:ru(i.depthOfField,0,150,5,s.depthOfField),transmission:Bn(i.transmission,[.25,.5,.75,1],s.transmission),anisotropy:Bn(i.anisotropy,[1,2,4,8,16],s.anisotropy)}}function gf(n){return Object.keys(kr).find(e=>Object.entries(kr[e]).every(([t,i])=>n[t]===i))??"custom"}function Nm(n,e,t,i,s,r,a=8294400){const o=Math.min(s,n.pixelRatio)*i*n.scale/100,l=Math.min(o,Math.sqrt(a/Math.max(1,e*t)),r/Math.max(1,e,t));return{ratio:l,width:Math.max(1,Math.floor(e*l)),height:Math.max(1,Math.floor(t*l)),limited:l<o-1e-4}}const $o=!1,au=()=>window.rhineWallpaperHost;function Um(n){return!0}function vf(n,e,t,i){return`<select ${n} aria-label="${e}">${i.map(([s,r])=>`<option value="${s}" ${s===t?"selected":""}>${r}</option>`).join("")}${t==="custom"?'<option value="custom" disabled selected>自定义</option>':""}</select>`}function kn(n,e,t,i,s){return`<label class="quality-control"><span>${t}<small>${i}</small></span>${vf(`data-quality="${e}"`,t,n[e],s)}</label>`}function ou(n,e,t,i,s,r){return`<label class="quality-control quality-range"><span>${t}<small>${i}</small></span><div><input type="range" data-quality="${e}" aria-label="${t}" min="${s}" max="${r}" step="5" value="${n[e]}"/><output data-quality-output="${e}">${n[e]}%</output></div></label>`}function Om(n){const e=gf(n);return`<section class="quality-settings" aria-label="画质设置">
    <div class="quality-heading"><h3>RENDER QUALITY <span>渲染画质</span></h3>${vf('id="quality-preset"',"画质预设",e,Object.keys(su).map(t=>[t,su[t]]))}</div>
    <p class="quality-summary" id="quality-summary" aria-live="polite"></p>
    <details class="quality-advanced"><summary>精细设置 <span>清晰度 / 材质 / 阴影</span></summary><div class="quality-grid">
    ${ou(n,"scale","渲染比例","相对屏幕像素，受密度上限限制；高比例改善细线",50,200)}
    ${kn(n,"pixelRatio","像素密度上限","控制高密度屏幕的原生像素倍率",[1,1.5,2,3].map(t=>[t,`${t}×`]))}
    ${kn(n,"antialias","抗锯齿","SMAA 平滑模型边缘与后处理结果",[["off","原始"],["smaa","SMAA"]])}
    ${kn(n,"anisotropy","纹理过滤","改善倾斜视角下的标签细节",[1,2,4,8,16].map(t=>[t,`${t}×`]))}
    ${kn(n,"transmission","透明材质分辨率","控制盖板折射画面的清晰度",[.25,.5,.75,1].map(t=>[t,`${t*100}%`]))}
    ${kn(n,"shadows","阴影分辨率 · 阵列","更高分辨率保留更细的投影边缘",[[0,"关闭"],[1024,"1024"],[2048,"2048"],[4096,"4096"]])}
    ${kn(n,"aoSamples","环境遮蔽 · 阵列","采样越多，接缝暗部越细腻",[[0,"关闭"],[16,"16 采样"],[32,"32 采样"],[64,"64 采样"]])}
    ${kn(n,"aoResolution","遮蔽分辨率 · 阵列","降低可减轻环境遮蔽的渲染负担",[.5,.75,1].map(t=>[t,`${t*100}%`]))}
    ${ou(n,"depthOfField","景深强度 · 阵列","0% 关闭；100% 保留原始镜头虚化",0,150)}
    </div></details><p class="quality-note">即时生效并自动保存。清晰度与材质设置同步至 360° 查看器。高渲染比例更适合静态观察；缓冲上限为 829 万像素，硬件限制时自动收敛。</p>
  </section>`}function Fm(n){const e=document.querySelector("#quality-preset");if(!e)return;const t=gf(n);if(e instanceof HTMLSelectElement){let i=e.querySelector('option[value="custom"]');t==="custom"&&!i?(i=new Option("自定义","custom"),i.disabled=!0,e.add(i)):t!=="custom"&&i?.remove()}e.value=t,document.querySelectorAll("[data-quality]").forEach(i=>{const s=i.dataset.quality;i.value=String(n[s]),i.disabled=s==="aoResolution"&&n.aoSamples===0}),document.querySelectorAll("[data-quality-choices]").forEach(i=>{const s=JSON.parse(i.dataset.qualityChoices);i.querySelector("[data-quality-label]").textContent=s.find(([r])=>String(r)===i.value)?.[1]??"自定义"}),document.querySelectorAll("[data-quality-output]").forEach(i=>{i.value=`${n[i.dataset.qualityOutput]}%`})}const Bm={scale:60,pixelRatio:1,antialias:"off",shadows:0,aoSamples:0,aoResolution:.5,depthOfField:0,transmission:.25,anisotropy:2};function km(n,e){n=Math.max(1,n),e=Math.max(1,e);const t=Math.min(e/1080,n/1280);return{width:n/t,height:e/t,scale:t,kind:"opening"}}function zm(n,e,t,i=!1){if(n=Math.max(1,n),e=Math.max(1,e),i)return{width:1920,height:1080,scale:Math.min(n/1920,e/1080),kind:"cinematic"};const s=n/e<1.05,r=s||n<1100||t&&e<600,a=r?1:e/1080;return{width:n/a,height:e/a,scale:a,kind:s?"portrait":r?"compact":"desktop"}}function Vm(n,e,t,i,s){const r=n/e,a=r<1.05,o=t+(5.9-t)*i,l=Math.max(6.3/r,3.7*e/Math.max(100,.54*e-156));return{span:a?Math.max(o,8.4/r+(l-8.4/r)*i):Math.max(o,o*(16/9)/r),portrait:a,previewY:a?.36:.5,detailX:a?.5:s?.27:550/1920,detailY:a?.27+34/e:s?.49:560/1080}}var Hm={};const lo=n=>{const e=n.replace(/^\//,"");return`./${Hm[e]??e}`};async function Gm(n){}function Wm(){return""}const dh="183",Ns={ROTATE:0,DOLLY:1,PAN:2},En={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Xm=0,lu=1,qm=2,Ka=1,xf=2,Pr=3,Xi=0,Qt=1,Bi=2,Gt=0,Us=1,cu=2,hu=3,uu=4,fh=5,ki=100,jm=101,Ym=102,Km=103,Zm=104,Zl=200,_f=201,Jm=202,Qm=203,co=204,zr=205,yf=206,$m=207,Mf=208,eg=209,tg=210,ig=211,ng=212,sg=213,rg=214,Jl=0,Ql=1,$l=2,Hs=3,ec=4,tc=5,ic=6,nc=7,ph=0,ag=1,og=2,Wi=0,mh=1,gh=2,vh=3,$r=4,xh=5,_h=6,yh=7,du="attached",lg="detached",bf=300,ts=301,Gs=302,el=303,tl=304,Ro=306,Dn=1e3,zi=1001,ho=1002,St=1003,Sf=1004,Dr=1005,It=1006,Za=1007,rn=1008,li=1009,Tf=1010,Ef=1011,Vr=1012,Mh=1013,qi=1014,ci=1015,ei=1016,bh=1017,Sh=1018,Ws=1020,wf=35902,Af=35899,Cf=1021,Rf=1022,xi=1023,cn=1026,wn=1027,Po=1028,Th=1029,Xs=1030,Eh=1031,wh=1033,Ja=33776,Qa=33777,$a=33778,eo=33779,sc=35840,rc=35841,ac=35842,oc=35843,lc=36196,cc=37492,hc=37496,uc=37488,dc=37489,fc=37490,pc=37491,mc=37808,gc=37809,vc=37810,xc=37811,_c=37812,yc=37813,Mc=37814,bc=37815,Sc=37816,Tc=37817,Ec=37818,wc=37819,Ac=37820,Cc=37821,Rc=36492,Pc=36494,Dc=36495,Lc=36283,Ic=36284,Nc=36285,Uc=36286,Hr=2300,Gr=2301,il=2302,fu=2303,pu=2400,mu=2401,gu=2402,cg=2500,hg=0,Pf=1,Oc=2,ug=3200,dg=3201,Do=0,fg=1,Sn="",Lt="srgb",ti="srgb-linear",uo="linear",lt="srgb",os=7680,vu=519,pg=512,mg=513,gg=514,Ah=515,vg=516,xg=517,Ch=518,_g=519,Fc=35044,Ds=35048,xu="300 es",Vi=2e3,Wr=2001;function yg(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Mg(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function Xr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function bg(){const n=Xr("canvas");return n.style.display="block",n}const _u={};function fo(...n){const e="THREE."+n.shift();console.log(e,...n)}function Df(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Re(...n){n=Df(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function Ue(...n){n=Df(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function po(...n){const e=n.join(" ");e in _u||(_u[e]=!0,Re(...n))}function Sg(n,e,t){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}const Tg={[Jl]:Ql,[$l]:ic,[ec]:nc,[Hs]:tc,[Ql]:Jl,[ic]:$l,[nc]:ec,[tc]:Hs};class ns{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const s=i[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const s=i.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}}const qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let yu=1234567;const Nr=Math.PI/180,qs=180/Math.PI;function Ci(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(qt[n&255]+qt[n>>8&255]+qt[n>>16&255]+qt[n>>24&255]+"-"+qt[e&255]+qt[e>>8&255]+"-"+qt[e>>16&15|64]+qt[e>>24&255]+"-"+qt[t&63|128]+qt[t>>8&255]+"-"+qt[t>>16&255]+qt[t>>24&255]+qt[i&255]+qt[i>>8&255]+qt[i>>16&255]+qt[i>>24&255]).toLowerCase()}function Ke(n,e,t){return Math.max(e,Math.min(t,n))}function Rh(n,e){return(n%e+e)%e}function Eg(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function wg(n,e,t){return n!==e?(t-n)/(e-n):0}function Ur(n,e,t){return(1-t)*n+t*e}function Ag(n,e,t,i){return Ur(n,e,1-Math.exp(-t*i))}function Cg(n,e=1){return e-Math.abs(Rh(n,e*2)-e)}function Rg(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function Pg(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function Dg(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Lg(n,e){return n+Math.random()*(e-n)}function Ig(n){return n*(.5-Math.random())}function Ng(n){n!==void 0&&(yu=n);let e=yu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Ug(n){return n*Nr}function Og(n){return n*qs}function Fg(n){return(n&n-1)===0&&n!==0}function Bg(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function kg(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function zg(n,e,t,i,s){const r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+i)/2),h=a((e+i)/2),d=r((e-i)/2),u=a((e-i)/2),f=r((i-e)/2),m=a((i-e)/2);switch(s){case"XYX":n.set(o*h,l*d,l*u,o*c);break;case"YZY":n.set(l*u,o*h,l*d,o*c);break;case"ZXZ":n.set(l*d,l*u,o*h,o*c);break;case"XZX":n.set(o*h,l*m,l*f,o*c);break;case"YXY":n.set(l*f,o*h,l*m,o*c);break;case"ZYZ":n.set(l*m,l*f,o*h,o*c);break;default:Re("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ei(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function ht(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Ie={DEG2RAD:Nr,RAD2DEG:qs,generateUUID:Ci,clamp:Ke,euclideanModulo:Rh,mapLinear:Eg,inverseLerp:wg,lerp:Ur,damp:Ag,pingpong:Cg,smoothstep:Rg,smootherstep:Pg,randInt:Dg,randFloat:Lg,randFloatSpread:Ig,seededRandom:Ng,degToRad:Ug,radToDeg:Og,isPowerOfTwo:Fg,ceilPowerOfTwo:Bg,floorPowerOfTwo:kg,setQuaternionFromProperEuler:zg,normalize:ht,denormalize:Ei};class De{constructor(e=0,t=0){De.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*i-a*s+e.x,this.y=r*s+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ri{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,r,a,o){let l=i[s+0],c=i[s+1],h=i[s+2],d=i[s+3],u=r[a+0],f=r[a+1],m=r[a+2],v=r[a+3];if(d!==v||l!==u||c!==f||h!==m){let p=l*u+c*f+h*m+d*v;p<0&&(u=-u,f=-f,m=-m,v=-v,p=-p);let g=1-o;if(p<.9995){const y=Math.acos(p),S=Math.sin(y);g=Math.sin(g*y)/S,o=Math.sin(o*y)/S,l=l*g+u*o,c=c*g+f*o,h=h*g+m*o,d=d*g+v*o}else{l=l*g+u*o,c=c*g+f*o,h=h*g+m*o,d=d*g+v*o;const y=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=y,c*=y,h*=y,d*=y}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,s,r,a){const o=i[s],l=i[s+1],c=i[s+2],h=i[s+3],d=r[a],u=r[a+1],f=r[a+2],m=r[a+3];return e[t]=o*m+h*d+l*f-c*u,e[t+1]=l*m+h*u+c*d-o*f,e[t+2]=c*m+h*f+o*u-l*d,e[t+3]=h*m-o*d-l*u-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(s/2),d=o(r/2),u=l(i/2),f=l(s/2),m=l(r/2);switch(a){case"XYZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"YZX":this._x=u*h*d+c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d-u*f*m;break;case"XZY":this._x=u*h*d-c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d+u*f*m;break;default:Re("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=i+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-s)*f}else if(i>o&&i>d){const f=2*Math.sqrt(1+i-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+c)/f}else if(o>d){const f=2*Math.sqrt(1+o-i-d);this._w=(r-c)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-i-o);this._w=(a-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ke(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=i*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-i*c,this._z=r*h+a*c+i*l-s*o,this._w=a*h-i*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let i=e._x,s=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(i=-i,s=-s,r=-r,a=-a,o=-o);let l=1-t;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(e=0,t=0,i=0){P.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Mu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Mu.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*s,this.y=r[1]*t+r[4]*i+r[7]*s,this.z=r[2]*t+r[5]*i+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*i+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*i+r[10]*s+r[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*i),h=2*(o*t-r*s),d=2*(r*i-a*t);return this.x=t+l*c+a*d-o*h,this.y=i+l*h+o*c-r*d,this.z=s+l*d+r*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s,this.y=r[1]*t+r[5]*i+r[9]*s,this.z=r[2]*t+r[6]*i+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-i*l,this.z=i*o-s*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return nl.copy(this).projectOnVector(e),this.sub(nl)}reflect(e){return this.sub(nl.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const nl=new P,Mu=new Ri;class Xe{constructor(e,t,i,s,r,a,o,l,c){Xe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,a,o,l,c)}set(e,t,i,s,r,a,o,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=l,h[6]=i,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],h=i[4],d=i[7],u=i[2],f=i[5],m=i[8],v=s[0],p=s[3],g=s[6],y=s[1],S=s[4],M=s[7],T=s[2],w=s[5],R=s[8];return r[0]=a*v+o*y+l*T,r[3]=a*p+o*S+l*w,r[6]=a*g+o*M+l*R,r[1]=c*v+h*y+d*T,r[4]=c*p+h*S+d*w,r[7]=c*g+h*M+d*R,r[2]=u*v+f*y+m*T,r[5]=u*p+f*S+m*w,r[8]=u*g+f*M+m*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-i*r*h+i*o*l+s*r*c-s*a*l}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],d=h*a-o*c,u=o*l-h*r,f=c*r-a*l,m=t*d+i*u+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/m;return e[0]=d*v,e[1]=(s*c-h*i)*v,e[2]=(o*i-s*a)*v,e[3]=u*v,e[4]=(h*t-s*l)*v,e[5]=(s*r-o*t)*v,e[6]=f*v,e[7]=(i*l-c*t)*v,e[8]=(a*t-i*r)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(sl.makeScale(e,t)),this}rotate(e){return this.premultiply(sl.makeRotation(-e)),this}translate(e,t){return this.premultiply(sl.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const sl=new Xe,bu=new Xe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Su=new Xe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vg(){const n={enabled:!0,workingColorSpace:ti,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===lt&&(s.r=on(s.r),s.g=on(s.g),s.b=on(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===lt&&(s.r=Os(s.r),s.g=Os(s.g),s.b=Os(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Sn?uo:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return po("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return po("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[ti]:{primaries:e,whitePoint:i,transfer:uo,toXYZ:bu,fromXYZ:Su,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Lt},outputColorSpaceConfig:{drawingBufferColorSpace:Lt}},[Lt]:{primaries:e,whitePoint:i,transfer:lt,toXYZ:bu,fromXYZ:Su,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Lt}}}),n}const et=Vg();function on(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Os(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let ls;class Hg{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{ls===void 0&&(ls=Xr("canvas")),ls.width=e.width,ls.height=e.height;const s=ls.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=ls}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Xr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const s=i.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=on(r[a]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(on(t[i]/255)*255):t[i]=on(t[i]);return{data:t,width:e.width,height:e.height}}else return Re("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Gg=0;class Ph{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Gg++}),this.uuid=Ci(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(rl(s[a].image)):r.push(rl(s[a]))}else r=rl(s);i.url=r}return t||(e.images[this.uuid]=i),i}}function rl(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Hg.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Re("Texture: Unable to serialize Texture."),{})}let Wg=0;const al=new P;class Et extends ns{constructor(e=Et.DEFAULT_IMAGE,t=Et.DEFAULT_MAPPING,i=zi,s=zi,r=It,a=rn,o=xi,l=li,c=Et.DEFAULT_ANISOTROPY,h=Sn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Wg++}),this.uuid=Ci(),this.name="",this.source=new Ph(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new De(0,0),this.repeat=new De(1,1),this.center=new De(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(al).x}get height(){return this.source.getSize(al).y}get depth(){return this.source.getSize(al).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Re(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Re(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==bf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Dn:e.x=e.x-Math.floor(e.x);break;case zi:e.x=e.x<0?0:1;break;case ho:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Dn:e.y=e.y-Math.floor(e.y);break;case zi:e.y=e.y<0?0:1;break;case ho:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Et.DEFAULT_IMAGE=null;Et.DEFAULT_MAPPING=bf;Et.DEFAULT_ANISOTROPY=1;class bt{constructor(e=0,t=0,i=0,s=1){bt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*i+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*i+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*i+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,r;const l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],m=l[9],v=l[2],p=l[6],g=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-v)<.01&&Math.abs(m-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+v)<.1&&Math.abs(m+p)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const S=(c+1)/2,M=(f+1)/2,T=(g+1)/2,w=(h+u)/4,R=(d+v)/4,_=(m+p)/4;return S>M&&S>T?S<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(S),s=w/i,r=R/i):M>T?M<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),i=w/s,r=_/s):T<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),i=R/r,s=_/r),this.set(i,s,r,t),this}let y=Math.sqrt((p-m)*(p-m)+(d-v)*(d-v)+(u-h)*(u-h));return Math.abs(y)<.001&&(y=1),this.x=(p-m)/y,this.y=(d-v)/y,this.z=(u-h)/y,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ke(this.x,e.x,t.x),this.y=Ke(this.y,e.y,t.y),this.z=Ke(this.z,e.z,t.z),this.w=Ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ke(this.x,e,t),this.y=Ke(this.y,e,t),this.z=Ke(this.z,e,t),this.w=Ke(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Xg extends ns{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:It,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new bt(0,0,e,t),this.scissorTest=!1,this.viewport=new bt(0,0,e,t),this.textures=[];const s={width:e,height:t,depth:i.depth},r=new Et(s),a=i.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:It,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ph(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Yt extends Xg{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Lf extends Et{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=St,this.minFilter=St,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class qg extends Et{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=St,this.minFilter=St,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ze{constructor(e,t,i,s,r,a,o,l,c,h,d,u,f,m,v,p){ze.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,a,o,l,c,h,d,u,f,m,v,p)}set(e,t,i,s,r,a,o,l,c,h,d,u,f,m,v,p){const g=this.elements;return g[0]=e,g[4]=t,g[8]=i,g[12]=s,g[1]=r,g[5]=a,g[9]=o,g[13]=l,g[2]=c,g[6]=h,g[10]=d,g[14]=u,g[3]=f,g[7]=m,g[11]=v,g[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ze().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,i=e.elements,s=1/cs.setFromMatrixColumn(e,0).length(),r=1/cs.setFromMatrixColumn(e,1).length(),a=1/cs.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,s=e.y,r=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){const u=a*h,f=a*d,m=o*h,v=o*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=u-v*c,t[9]=-o*l,t[2]=v-u*c,t[6]=m+f*c,t[10]=a*l}else if(e.order==="YXZ"){const u=l*h,f=l*d,m=c*h,v=c*d;t[0]=u+v*o,t[4]=m*o-f,t[8]=a*c,t[1]=a*d,t[5]=a*h,t[9]=-o,t[2]=f*o-m,t[6]=v+u*o,t[10]=a*l}else if(e.order==="ZXY"){const u=l*h,f=l*d,m=c*h,v=c*d;t[0]=u-v*o,t[4]=-a*d,t[8]=m+f*o,t[1]=f+m*o,t[5]=a*h,t[9]=v-u*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const u=a*h,f=a*d,m=o*h,v=o*d;t[0]=l*h,t[4]=m*c-f,t[8]=u*c+v,t[1]=l*d,t[5]=v*c+u,t[9]=f*c-m,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const u=a*l,f=a*c,m=o*l,v=o*c;t[0]=l*h,t[4]=v-u*d,t[8]=m*d+f,t[1]=d,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*d+m,t[10]=u-v*d}else if(e.order==="XZY"){const u=a*l,f=a*c,m=o*l,v=o*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+v,t[5]=a*h,t[9]=f*d-m,t[2]=m*d-f,t[6]=o*h,t[10]=v*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(jg,e,Yg)}lookAt(e,t,i){const s=this.elements;return ri.subVectors(e,t),ri.lengthSq()===0&&(ri.z=1),ri.normalize(),pn.crossVectors(i,ri),pn.lengthSq()===0&&(Math.abs(i.z)===1?ri.x+=1e-4:ri.z+=1e-4,ri.normalize(),pn.crossVectors(i,ri)),pn.normalize(),ha.crossVectors(ri,pn),s[0]=pn.x,s[4]=ha.x,s[8]=ri.x,s[1]=pn.y,s[5]=ha.y,s[9]=ri.y,s[2]=pn.z,s[6]=ha.z,s[10]=ri.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],h=i[1],d=i[5],u=i[9],f=i[13],m=i[2],v=i[6],p=i[10],g=i[14],y=i[3],S=i[7],M=i[11],T=i[15],w=s[0],R=s[4],_=s[8],E=s[12],L=s[1],C=s[5],F=s[9],k=s[13],V=s[2],W=s[6],z=s[10],B=s[14],ie=s[3],K=s[7],ce=s[11],de=s[15];return r[0]=a*w+o*L+l*V+c*ie,r[4]=a*R+o*C+l*W+c*K,r[8]=a*_+o*F+l*z+c*ce,r[12]=a*E+o*k+l*B+c*de,r[1]=h*w+d*L+u*V+f*ie,r[5]=h*R+d*C+u*W+f*K,r[9]=h*_+d*F+u*z+f*ce,r[13]=h*E+d*k+u*B+f*de,r[2]=m*w+v*L+p*V+g*ie,r[6]=m*R+v*C+p*W+g*K,r[10]=m*_+v*F+p*z+g*ce,r[14]=m*E+v*k+p*B+g*de,r[3]=y*w+S*L+M*V+T*ie,r[7]=y*R+S*C+M*W+T*K,r[11]=y*_+S*F+M*z+T*ce,r[15]=y*E+S*k+M*B+T*de,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],f=e[14],m=e[3],v=e[7],p=e[11],g=e[15],y=l*f-c*u,S=o*f-c*d,M=o*u-l*d,T=a*f-c*h,w=a*u-l*h,R=a*d-o*h;return t*(v*y-p*S+g*M)-i*(m*y-p*T+g*w)+s*(m*S-v*T+g*R)-r*(m*M-v*w+p*R)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],f=e[11],m=e[12],v=e[13],p=e[14],g=e[15],y=t*o-i*a,S=t*l-s*a,M=t*c-r*a,T=i*l-s*o,w=i*c-r*o,R=s*c-r*l,_=h*v-d*m,E=h*p-u*m,L=h*g-f*m,C=d*p-u*v,F=d*g-f*v,k=u*g-f*p,V=y*k-S*F+M*C+T*L-w*E+R*_;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const W=1/V;return e[0]=(o*k-l*F+c*C)*W,e[1]=(s*F-i*k-r*C)*W,e[2]=(v*R-p*w+g*T)*W,e[3]=(u*w-d*R-f*T)*W,e[4]=(l*L-a*k-c*E)*W,e[5]=(t*k-s*L+r*E)*W,e[6]=(p*M-m*R-g*S)*W,e[7]=(h*R-u*M+f*S)*W,e[8]=(a*F-o*L+c*_)*W,e[9]=(i*L-t*F-r*_)*W,e[10]=(m*w-v*M+g*y)*W,e[11]=(d*M-h*w-f*y)*W,e[12]=(o*E-a*C-l*_)*W,e[13]=(t*C-i*E+s*_)*W,e[14]=(v*S-m*T-p*y)*W,e[15]=(h*T-d*S+u*y)*W,this}scale(e){const t=this.elements,i=e.x,s=e.y,r=e.z;return t[0]*=i,t[4]*=s,t[8]*=r,t[1]*=i,t[5]*=s,t[9]*=r,t[2]*=i,t[6]*=s,t[10]*=r,t[3]*=i,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),s=Math.sin(t),r=1-i,a=e.x,o=e.y,l=e.z,c=r*a,h=r*o;return this.set(c*a+i,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+i,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,r,a){return this.set(1,i,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){const s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,h=a+a,d=o+o,u=r*c,f=r*h,m=r*d,v=a*h,p=a*d,g=o*d,y=l*c,S=l*h,M=l*d,T=i.x,w=i.y,R=i.z;return s[0]=(1-(v+g))*T,s[1]=(f+M)*T,s[2]=(m-S)*T,s[3]=0,s[4]=(f-M)*w,s[5]=(1-(u+g))*w,s[6]=(p+y)*w,s[7]=0,s[8]=(m+S)*R,s[9]=(p-y)*R,s[10]=(1-(u+v))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){const s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];const r=this.determinant();if(r===0)return i.set(1,1,1),t.identity(),this;let a=cs.set(s[0],s[1],s[2]).length();const o=cs.set(s[4],s[5],s[6]).length(),l=cs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),Mi.copy(this);const c=1/a,h=1/o,d=1/l;return Mi.elements[0]*=c,Mi.elements[1]*=c,Mi.elements[2]*=c,Mi.elements[4]*=h,Mi.elements[5]*=h,Mi.elements[6]*=h,Mi.elements[8]*=d,Mi.elements[9]*=d,Mi.elements[10]*=d,t.setFromRotationMatrix(Mi),i.x=a,i.y=o,i.z=l,this}makePerspective(e,t,i,s,r,a,o=Vi,l=!1){const c=this.elements,h=2*r/(t-e),d=2*r/(i-s),u=(t+e)/(t-e),f=(i+s)/(i-s);let m,v;if(l)m=r/(a-r),v=a*r/(a-r);else if(o===Vi)m=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===Wr)m=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,r,a,o=Vi,l=!1){const c=this.elements,h=2/(t-e),d=2/(i-s),u=-(t+e)/(t-e),f=-(i+s)/(i-s);let m,v;if(l)m=1/(a-r),v=a/(a-r);else if(o===Vi)m=-2/(a-r),v=-(a+r)/(a-r);else if(o===Wr)m=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const cs=new P,Mi=new ze,jg=new P(0,0,0),Yg=new P(1,1,1),pn=new P,ha=new P,ri=new P,Tu=new ze,Eu=new Ri;class Pi{constructor(e=0,t=0,i=0,s=Pi.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ke(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ke(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ke(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Re("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Tu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Tu,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Eu.setFromEuler(this),this.setFromQuaternion(Eu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Pi.DEFAULT_ORDER="XYZ";class Dh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Kg=0;const wu=new P,hs=new Ri,Ji=new ze,ua=new P,mr=new P,Zg=new P,Jg=new Ri,Au=new P(1,0,0),Cu=new P(0,1,0),Ru=new P(0,0,1),Pu={type:"added"},Qg={type:"removed"},us={type:"childadded",child:null},ol={type:"childremoved",child:null};class Mt extends ns{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Kg++}),this.uuid=Ci(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Mt.DEFAULT_UP.clone();const e=new P,t=new Pi,i=new Ri,s=new P(1,1,1);function r(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ze},normalMatrix:{value:new Xe}}),this.matrix=new ze,this.matrixWorld=new ze,this.matrixAutoUpdate=Mt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Mt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Dh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.multiply(hs),this}rotateOnWorldAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.premultiply(hs),this}rotateX(e){return this.rotateOnAxis(Au,e)}rotateY(e){return this.rotateOnAxis(Cu,e)}rotateZ(e){return this.rotateOnAxis(Ru,e)}translateOnAxis(e,t){return wu.copy(e).applyQuaternion(this.quaternion),this.position.add(wu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Au,e)}translateY(e){return this.translateOnAxis(Cu,e)}translateZ(e){return this.translateOnAxis(Ru,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ji.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?ua.copy(e):ua.set(e,t,i);const s=this.parent;this.updateWorldMatrix(!0,!1),mr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ji.lookAt(mr,ua,this.up):Ji.lookAt(ua,mr,this.up),this.quaternion.setFromRotationMatrix(Ji),s&&(Ji.extractRotation(s.matrixWorld),hs.setFromRotationMatrix(Ji),this.quaternion.premultiply(hs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ue("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Pu),us.child=e,this.dispatchEvent(us),us.child=null):Ue("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Qg),ol.child=e,this.dispatchEvent(ol),ol.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ji.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ji.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ji),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Pu),us.child=e,this.dispatchEvent(us),us.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mr,e,Zg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mr,Jg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*i-r[8]*s,r[13]+=i-r[1]*t-r[5]*i-r[9]*s,r[14]+=s-r[2]*t-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];r(e.shapes,d)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),d=a(e.shapes),u=a(e.skeletons),f=a(e.animations),m=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),u.length>0&&(i.skeletons=u),f.length>0&&(i.animations=f),m.length>0&&(i.nodes=m)}return i.object=s,i;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const s=e.children[i];this.add(s.clone())}return this}}Mt.DEFAULT_UP=new P(0,1,0);Mt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Mt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Hi extends Mt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const $g={type:"move"};class ll{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Hi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Hi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Hi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const v of e.hand.values()){const p=t.getJointPose(v,i),g=this._getHandJoint(c,v);p!==null&&(g.matrix.fromArray(p.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=p.radius),g.visible=p!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&u>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent($g)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Hi;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const If={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},mn={h:0,s:0,l:0},da={h:0,s:0,l:0};function cl(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Ae{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Lt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,et.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=et.workingColorSpace){return this.r=e,this.g=t,this.b=i,et.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=et.workingColorSpace){if(e=Rh(e,1),t=Ke(t,0,1),i=Ke(i,0,1),t===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+t):i+t-i*t,a=2*i-r;this.r=cl(a,r,e+1/3),this.g=cl(a,r,e),this.b=cl(a,r,e-1/3)}return et.colorSpaceToWorking(this,s),this}setStyle(e,t=Lt){function i(r){r!==void 0&&parseFloat(r)<1&&Re("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Re("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);Re("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Lt){const i=If[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Re("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=on(e.r),this.g=on(e.g),this.b=on(e.b),this}copyLinearToSRGB(e){return this.r=Os(e.r),this.g=Os(e.g),this.b=Os(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Lt){return et.workingToColorSpace(jt.copy(this),e),Math.round(Ke(jt.r*255,0,255))*65536+Math.round(Ke(jt.g*255,0,255))*256+Math.round(Ke(jt.b*255,0,255))}getHexString(e=Lt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=et.workingColorSpace){et.workingToColorSpace(jt.copy(this),t);const i=jt.r,s=jt.g,r=jt.b,a=Math.max(i,s,r),o=Math.min(i,s,r);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const d=a-o;switch(c=h<=.5?d/(a+o):d/(2-a-o),a){case i:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-i)/d+2;break;case r:l=(i-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=et.workingColorSpace){return et.workingToColorSpace(jt.copy(this),t),e.r=jt.r,e.g=jt.g,e.b=jt.b,e}getStyle(e=Lt){et.workingToColorSpace(jt.copy(this),e);const t=jt.r,i=jt.g,s=jt.b;return e!==Lt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(mn),this.setHSL(mn.h+e,mn.s+t,mn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(mn),e.getHSL(da);const i=Ur(mn.h,da.h,t),s=Ur(mn.s,da.s,t),r=Ur(mn.l,da.l,t);return this.setHSL(i,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*s,this.g=r[1]*t+r[4]*i+r[7]*s,this.b=r[2]*t+r[5]*i+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const jt=new Ae;Ae.NAMES=If;class Lo{constructor(e,t=1,i=1e3){this.isFog=!0,this.name="",this.color=new Ae(e),this.near=t,this.far=i}clone(){return new Lo(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Io extends Mt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pi,this.environmentIntensity=1,this.environmentRotation=new Pi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const bi=new P,Qi=new P,hl=new P,$i=new P,ds=new P,fs=new P,Du=new P,ul=new P,dl=new P,fl=new P,pl=new bt,ml=new bt,gl=new bt;class wi{constructor(e=new P,t=new P,i=new P){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),bi.subVectors(e,t),s.cross(bi);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,i,s,r){bi.subVectors(s,t),Qi.subVectors(i,t),hl.subVectors(e,t);const a=bi.dot(bi),o=bi.dot(Qi),l=bi.dot(hl),c=Qi.dot(Qi),h=Qi.dot(hl),d=a*c-o*o;if(d===0)return r.set(0,0,0),null;const u=1/d,f=(c*l-o*h)*u,m=(a*h-o*l)*u;return r.set(1-f-m,m,f)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,$i)===null?!1:$i.x>=0&&$i.y>=0&&$i.x+$i.y<=1}static getInterpolation(e,t,i,s,r,a,o,l){return this.getBarycoord(e,t,i,s,$i)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,$i.x),l.addScaledVector(a,$i.y),l.addScaledVector(o,$i.z),l)}static getInterpolatedAttribute(e,t,i,s,r,a){return pl.setScalar(0),ml.setScalar(0),gl.setScalar(0),pl.fromBufferAttribute(e,t),ml.fromBufferAttribute(e,i),gl.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(pl,r.x),a.addScaledVector(ml,r.y),a.addScaledVector(gl,r.z),a}static isFrontFacing(e,t,i,s){return bi.subVectors(i,t),Qi.subVectors(e,t),bi.cross(Qi).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return bi.subVectors(this.c,this.b),Qi.subVectors(this.a,this.b),bi.cross(Qi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return wi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return wi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,r){return wi.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}containsPoint(e){return wi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return wi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,s=this.b,r=this.c;let a,o;ds.subVectors(s,i),fs.subVectors(r,i),ul.subVectors(e,i);const l=ds.dot(ul),c=fs.dot(ul);if(l<=0&&c<=0)return t.copy(i);dl.subVectors(e,s);const h=ds.dot(dl),d=fs.dot(dl);if(h>=0&&d<=h)return t.copy(s);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(i).addScaledVector(ds,a);fl.subVectors(e,r);const f=ds.dot(fl),m=fs.dot(fl);if(m>=0&&f<=m)return t.copy(r);const v=f*c-l*m;if(v<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(i).addScaledVector(fs,o);const p=h*m-f*d;if(p<=0&&d-h>=0&&f-m>=0)return Du.subVectors(r,s),o=(d-h)/(d-h+(f-m)),t.copy(s).addScaledVector(Du,o);const g=1/(p+v+u);return a=v*g,o=u*g,t.copy(i).addScaledVector(ds,a).addScaledVector(fs,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class _i{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Si.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Si.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Si.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Si):Si.fromBufferAttribute(r,a),Si.applyMatrix4(e.matrixWorld),this.expandByPoint(Si);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),fa.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),fa.copy(i.boundingBox)),fa.applyMatrix4(e.matrixWorld),this.union(fa)}const s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Si),Si.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(gr),pa.subVectors(this.max,gr),ps.subVectors(e.a,gr),ms.subVectors(e.b,gr),gs.subVectors(e.c,gr),gn.subVectors(ms,ps),vn.subVectors(gs,ms),zn.subVectors(ps,gs);let t=[0,-gn.z,gn.y,0,-vn.z,vn.y,0,-zn.z,zn.y,gn.z,0,-gn.x,vn.z,0,-vn.x,zn.z,0,-zn.x,-gn.y,gn.x,0,-vn.y,vn.x,0,-zn.y,zn.x,0];return!vl(t,ps,ms,gs,pa)||(t=[1,0,0,0,1,0,0,0,1],!vl(t,ps,ms,gs,pa))?!1:(ma.crossVectors(gn,vn),t=[ma.x,ma.y,ma.z],vl(t,ps,ms,gs,pa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Si).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Si).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(en[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),en[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),en[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),en[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),en[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),en[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),en[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),en[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(en),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const en=[new P,new P,new P,new P,new P,new P,new P,new P],Si=new P,fa=new _i,ps=new P,ms=new P,gs=new P,gn=new P,vn=new P,zn=new P,gr=new P,pa=new P,ma=new P,Vn=new P;function vl(n,e,t,i,s){for(let r=0,a=n.length-3;r<=a;r+=3){Vn.fromArray(n,r);const o=s.x*Math.abs(Vn.x)+s.y*Math.abs(Vn.y)+s.z*Math.abs(Vn.z),l=e.dot(Vn),c=t.dot(Vn),h=i.dot(Vn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Dt=new P,ga=new De;let e0=0;class $t{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:e0++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Fc,this.updateRanges=[],this.gpuType=ci,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)ga.fromBufferAttribute(this,t),ga.applyMatrix3(e),this.setXY(t,ga.x,ga.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Dt.fromBufferAttribute(this,t),Dt.applyMatrix3(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Dt.fromBufferAttribute(this,t),Dt.applyMatrix4(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Dt.fromBufferAttribute(this,t),Dt.applyNormalMatrix(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Dt.fromBufferAttribute(this,t),Dt.transformDirection(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Ei(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ht(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ei(t,this.array)),t}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ei(t,this.array)),t}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ei(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ei(t,this.array)),t}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array),r=ht(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Fc&&(e.usage=this.usage),e}}class Nf extends $t{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Uf extends $t{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class ui extends $t{constructor(e,t,i){super(new Float32Array(e),t,i)}}const t0=new _i,vr=new P,xl=new P;class ji{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):t0.setFromPoints(e).getCenter(i);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;vr.subVectors(e,this.center);const t=vr.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(vr,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(xl.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(vr.copy(e.center).add(xl)),this.expandByPoint(vr.copy(e.center).sub(xl))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let i0=0;const pi=new ze,_l=new Mt,vs=new P,ai=new _i,xr=new _i,zt=new P;class fi extends ns{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:i0++}),this.uuid=Ci(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(yg(e)?Uf:Nf)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Xe().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return pi.makeRotationFromQuaternion(e),this.applyMatrix4(pi),this}rotateX(e){return pi.makeRotationX(e),this.applyMatrix4(pi),this}rotateY(e){return pi.makeRotationY(e),this.applyMatrix4(pi),this}rotateZ(e){return pi.makeRotationZ(e),this.applyMatrix4(pi),this}translate(e,t,i){return pi.makeTranslation(e,t,i),this.applyMatrix4(pi),this}scale(e,t,i){return pi.makeScale(e,t,i),this.applyMatrix4(pi),this}lookAt(e){return _l.lookAt(e),_l.updateMatrix(),this.applyMatrix4(_l.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(vs).negate(),this.translate(vs.x,vs.y,vs.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let s=0,r=e.length;s<r;s++){const a=e[s];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ui(i,3))}else{const i=Math.min(e.length,t.count);for(let s=0;s<i;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Re("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new _i);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ue("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){const r=t[i];ai.setFromBufferAttribute(r),this.morphTargetsRelative?(zt.addVectors(this.boundingBox.min,ai.min),this.boundingBox.expandByPoint(zt),zt.addVectors(this.boundingBox.max,ai.max),this.boundingBox.expandByPoint(zt)):(this.boundingBox.expandByPoint(ai.min),this.boundingBox.expandByPoint(ai.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ue('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ji);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ue("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(e){const i=this.boundingSphere.center;if(ai.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const o=t[r];xr.setFromBufferAttribute(o),this.morphTargetsRelative?(zt.addVectors(ai.min,xr.min),ai.expandByPoint(zt),zt.addVectors(ai.max,xr.max),ai.expandByPoint(zt)):(ai.expandByPoint(xr.min),ai.expandByPoint(xr.max))}ai.getCenter(i);let s=0;for(let r=0,a=e.count;r<a;r++)zt.fromBufferAttribute(e,r),s=Math.max(s,i.distanceToSquared(zt));if(t)for(let r=0,a=t.length;r<a;r++){const o=t[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)zt.fromBufferAttribute(o,c),l&&(vs.fromBufferAttribute(e,c),zt.add(vs)),s=Math.max(s,i.distanceToSquared(zt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Ue('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ue("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new $t(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let _=0;_<i.count;_++)o[_]=new P,l[_]=new P;const c=new P,h=new P,d=new P,u=new De,f=new De,m=new De,v=new P,p=new P;function g(_,E,L){c.fromBufferAttribute(i,_),h.fromBufferAttribute(i,E),d.fromBufferAttribute(i,L),u.fromBufferAttribute(r,_),f.fromBufferAttribute(r,E),m.fromBufferAttribute(r,L),h.sub(c),d.sub(c),f.sub(u),m.sub(u);const C=1/(f.x*m.y-m.x*f.y);isFinite(C)&&(v.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(C),p.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(C),o[_].add(v),o[E].add(v),o[L].add(v),l[_].add(p),l[E].add(p),l[L].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let _=0,E=y.length;_<E;++_){const L=y[_],C=L.start,F=L.count;for(let k=C,V=C+F;k<V;k+=3)g(e.getX(k+0),e.getX(k+1),e.getX(k+2))}const S=new P,M=new P,T=new P,w=new P;function R(_){T.fromBufferAttribute(s,_),w.copy(T);const E=o[_];S.copy(E),S.sub(T.multiplyScalar(T.dot(E))).normalize(),M.crossVectors(w,E);const C=M.dot(l[_])<0?-1:1;a.setXYZW(_,S.x,S.y,S.z,C)}for(let _=0,E=y.length;_<E;++_){const L=y[_],C=L.start,F=L.count;for(let k=C,V=C+F;k<V;k+=3)R(e.getX(k+0)),R(e.getX(k+1)),R(e.getX(k+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new $t(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let u=0,f=i.count;u<f;u++)i.setXYZ(u,0,0,0);const s=new P,r=new P,a=new P,o=new P,l=new P,c=new P,h=new P,d=new P;if(e)for(let u=0,f=e.count;u<f;u+=3){const m=e.getX(u+0),v=e.getX(u+1),p=e.getX(u+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,v),a.fromBufferAttribute(t,p),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),o.fromBufferAttribute(i,m),l.fromBufferAttribute(i,v),c.fromBufferAttribute(i,p),o.add(h),l.add(h),c.add(h),i.setXYZ(m,o.x,o.y,o.z),i.setXYZ(v,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,f=t.count;u<f;u+=3)s.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),a.fromBufferAttribute(t,u+2),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)zt.fromBufferAttribute(e,t),zt.normalize(),e.setXYZ(t,zt.x,zt.y,zt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,d=o.normalized,u=new c.constructor(l.length*h);let f=0,m=0;for(let v=0,p=l.length;v<p;v++){o.isInterleavedBufferAttribute?f=l[v]*o.data.stride+o.offset:f=l[v]*h;for(let g=0;g<h;g++)u[m++]=c[f++]}return new $t(u,h,d)}if(this.index===null)return Re("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new fi,i=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=e(l,i);t.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=e(u,i);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,h=a.length;c<h;c++){const d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}class n0{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Fc,this.updateRanges=[],this.version=0,this.uuid=Ci()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ci()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Zt=new P;class Lh{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Zt.fromBufferAttribute(this,t),Zt.applyMatrix4(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Zt.fromBufferAttribute(this,t),Zt.applyNormalMatrix(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Zt.fromBufferAttribute(this,t),Zt.transformDirection(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=Ei(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ht(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ei(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ei(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ei(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ei(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),i=ht(i,this.array),s=ht(s,this.array),r=ht(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){fo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new $t(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Lh(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){fo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}let s0=0;class di extends ns{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:s0++}),this.uuid=Ci(),this.name="",this.type="Material",this.blending=Us,this.side=Xi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=co,this.blendDst=zr,this.blendEquation=ki,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ae(0,0,0),this.blendAlpha=0,this.depthFunc=Hs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=vu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=os,this.stencilZFail=os,this.stencilZPass=os,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Re(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Re(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Us&&(i.blending=this.blending),this.side!==Xi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==co&&(i.blendSrc=this.blendSrc),this.blendDst!==zr&&(i.blendDst=this.blendDst),this.blendEquation!==ki&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Hs&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==vu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==os&&(i.stencilFail=this.stencilFail),this.stencilZFail!==os&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==os&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(t){const r=s(e.textures),a=s(e.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const s=t.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const tn=new P,yl=new P,va=new P,xn=new P,Ml=new P,xa=new P,bl=new P;class ir{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,tn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=tn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(tn.copy(this.origin).addScaledVector(this.direction,t),tn.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){yl.copy(e).add(t).multiplyScalar(.5),va.copy(t).sub(e).normalize(),xn.copy(this.origin).sub(yl);const r=e.distanceTo(t)*.5,a=-this.direction.dot(va),o=xn.dot(this.direction),l=-xn.dot(va),c=xn.lengthSq(),h=Math.abs(1-a*a);let d,u,f,m;if(h>0)if(d=a*l-o,u=a*o-l,m=r*h,d>=0)if(u>=-m)if(u<=m){const v=1/h;d*=v,u*=v,f=d*(d+a*u+2*o)+u*(a*d+u+2*l)+c}else u=r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u<=-m?(d=Math.max(0,-(-a*r+o)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=m?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(a*r+o)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=a>0?-r:r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(yl).addScaledVector(va,u),f}intersectSphere(e,t){tn.subVectors(e.center,this.origin);const i=tn.dot(this.direction),s=tn.dot(tn)-i*i,r=e.radius*e.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,r,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(i=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(i=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(r=(e.min.y-u.y)*h,a=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,a=(e.min.y-u.y)*h),i>a||r>s||((r>i||isNaN(i))&&(i=r),(a<s||isNaN(s))&&(s=a),d>=0?(o=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(o=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,tn)!==null}intersectTriangle(e,t,i,s,r){Ml.subVectors(t,e),xa.subVectors(i,e),bl.crossVectors(Ml,xa);let a=this.direction.dot(bl),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;xn.subVectors(this.origin,e);const l=o*this.direction.dot(xa.crossVectors(xn,xa));if(l<0)return null;const c=o*this.direction.dot(Ml.cross(xn));if(c<0||l+c>a)return null;const h=-o*xn.dot(bl);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Gi extends di{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ae(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.combine=ph,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Lu=new ze,Hn=new ir,_a=new ji,Iu=new P,ya=new P,Ma=new P,ba=new P,Sl=new P,Sa=new P,Nu=new P,Ta=new P;class st extends Mt{constructor(e=new fi,t=new Gi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(s,e);const o=this.morphTargetInfluences;if(r&&o){Sa.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=o[l],d=r[l];h!==0&&(Sl.fromBufferAttribute(d,e),a?Sa.addScaledVector(Sl,h):Sa.addScaledVector(Sl.sub(t),h))}t.add(Sa)}return t}raycast(e,t){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),_a.copy(i.boundingSphere),_a.applyMatrix4(r),Hn.copy(e.ray).recast(e.near),!(_a.containsPoint(Hn.origin)===!1&&(Hn.intersectSphere(_a,Iu)===null||Hn.origin.distanceToSquared(Iu)>(e.far-e.near)**2))&&(Lu.copy(r).invert(),Hn.copy(e.ray).applyMatrix4(Lu),!(i.boundingBox!==null&&Hn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Hn)))}_computeIntersections(e,t,i){let s;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,v=u.length;m<v;m++){const p=u[m],g=a[p.materialIndex],y=Math.max(p.start,f.start),S=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let M=y,T=S;M<T;M+=3){const w=o.getX(M),R=o.getX(M+1),_=o.getX(M+2);s=Ea(this,g,e,i,c,h,d,w,R,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),v=Math.min(o.count,f.start+f.count);for(let p=m,g=v;p<g;p+=3){const y=o.getX(p),S=o.getX(p+1),M=o.getX(p+2);s=Ea(this,a,e,i,c,h,d,y,S,M),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let m=0,v=u.length;m<v;m++){const p=u[m],g=a[p.materialIndex],y=Math.max(p.start,f.start),S=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let M=y,T=S;M<T;M+=3){const w=M,R=M+1,_=M+2;s=Ea(this,g,e,i,c,h,d,w,R,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),v=Math.min(l.count,f.start+f.count);for(let p=m,g=v;p<g;p+=3){const y=p,S=p+1,M=p+2;s=Ea(this,a,e,i,c,h,d,y,S,M),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}}function r0(n,e,t,i,s,r,a,o){let l;if(e.side===Qt?l=i.intersectTriangle(a,r,s,!0,o):l=i.intersectTriangle(s,r,a,e.side===Xi,o),l===null)return null;Ta.copy(o),Ta.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(Ta);return c<t.near||c>t.far?null:{distance:c,point:Ta.clone(),object:n}}function Ea(n,e,t,i,s,r,a,o,l,c){n.getVertexPosition(o,ya),n.getVertexPosition(l,Ma),n.getVertexPosition(c,ba);const h=r0(n,e,t,i,ya,Ma,ba,Nu);if(h){const d=new P;wi.getBarycoord(Nu,ya,Ma,ba,d),s&&(h.uv=wi.getInterpolatedAttribute(s,o,l,c,d,new De)),r&&(h.uv1=wi.getInterpolatedAttribute(r,o,l,c,d,new De)),a&&(h.normal=wi.getInterpolatedAttribute(a,o,l,c,d,new P),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:l,c,normal:new P,materialIndex:0};wi.getNormal(ya,Ma,ba,u.normal),h.face=u,h.barycoord=d}return h}const Uu=new P,Ou=new bt,Fu=new bt,a0=new P,Bu=new ze,wa=new P,Tl=new ji,ku=new ze,El=new ir;class o0 extends st{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=du,this.bindMatrix=new ze,this.bindMatrixInverse=new ze,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new _i),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,wa),this.boundingBox.expandByPoint(wa)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new ji),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,wa),this.boundingSphere.expandByPoint(wa)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Tl.copy(this.boundingSphere),Tl.applyMatrix4(s),e.ray.intersectsSphere(Tl)!==!1&&(ku.copy(s).invert(),El.copy(e.ray).applyMatrix4(ku),!(this.boundingBox!==null&&El.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,El)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new bt,t=this.geometry.attributes.skinWeight;for(let i=0,s=t.count;i<s;i++){e.fromBufferAttribute(t,i);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===du?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===lg?this.bindMatrixInverse.copy(this.bindMatrix).invert():Re("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const i=this.skeleton,s=this.geometry;Ou.fromBufferAttribute(s.attributes.skinIndex,e),Fu.fromBufferAttribute(s.attributes.skinWeight,e),Uu.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){const a=Fu.getComponent(r);if(a!==0){const o=Ou.getComponent(r);Bu.multiplyMatrices(i.bones[o].matrixWorld,i.boneInverses[o]),t.addScaledVector(a0.copy(Uu).applyMatrix4(Bu),a)}}return t.applyMatrix4(this.bindMatrixInverse)}}class Of extends Mt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class No extends Et{constructor(e=null,t=1,i=1,s,r,a,o,l,c=St,h=St,d,u){super(null,a,o,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const zu=new ze,l0=new ze;class Ih{constructor(e=[],t=[]){this.uuid=Ci(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Re("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new ze)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const i=new ze;this.bones[e]&&i.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&i.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){const e=this.bones,t=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let r=0,a=e.length;r<a;r++){const o=e[r]?e[r].matrixWorld:l0;zu.multiplyMatrices(o,t[r]),zu.toArray(i,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new Ih(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const i=new No(t,e,e,xi,ci);return i.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=i,this}getBoneByName(e){for(let t=0,i=this.bones.length;t<i;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let i=0,s=e.bones.length;i<s;i++){const r=e.bones[i];let a=t[r];a===void 0&&(Re("Skeleton: No bone found with UUID:",r),a=new Of),this.bones.push(a),this.boneInverses.push(new ze().fromArray(e.boneInverses[i]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,i=this.boneInverses;for(let s=0,r=t.length;s<r;s++){const a=t[s];e.bones.push(a.uuid);const o=i[s];e.boneInverses.push(o.toArray())}return e}}class Qn extends $t{constructor(e,t,i,s=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const xs=new ze,Vu=new ze,Aa=[],Hu=new _i,c0=new ze,_r=new st,yr=new ji;class $n extends st{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Qn(new Float32Array(i*16),16),this.previousInstanceMatrix=null,this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,c0)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new _i),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,xs),Hu.copy(e.boundingBox).applyMatrix4(xs),this.boundingBox.union(Hu)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ji),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,xs),yr.copy(e.boundingSphere).applyMatrix4(xs),this.boundingSphere.union(yr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.previousInstanceMatrix!==null&&(this.previousInstanceMatrix=e.previousInstanceMatrix.clone()),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const i=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=i.length+1,a=e*r+1;for(let o=0;o<i.length;o++)i[o]=s[a+o]}raycast(e,t){const i=this.matrixWorld,s=this.count;if(_r.geometry=this.geometry,_r.material=this.material,_r.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),yr.copy(this.boundingSphere),yr.applyMatrix4(i),e.ray.intersectsSphere(yr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,xs),Vu.multiplyMatrices(i,xs),_r.matrixWorld=Vu,_r.raycast(e,Aa);for(let a=0,o=Aa.length;a<o;a++){const l=Aa[a];l.instanceId=r,l.object=this,t.push(l)}Aa.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Qn(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const i=t.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new No(new Float32Array(s*this.count),s,this.count,Po,ci));const r=this.morphTexture.source.data.data;let a=0;for(let c=0;c<i.length;c++)a+=i[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=s*e;r[l]=o,r.set(i,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const wl=new P,h0=new P,u0=new Xe;class Mn{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const s=wl.subVectors(i,t).cross(h0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(wl),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||u0.getNormalMatrix(e),s=this.coplanarPoint(wl).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Gn=new ji,d0=new De(.5,.5),Ca=new P;class ea{constructor(e=new Mn,t=new Mn,i=new Mn,s=new Mn,r=new Mn,a=new Mn){this.planes=[e,t,i,s,r,a]}set(e,t,i,s,r,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Vi,i=!1){const s=this.planes,r=e.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],m=r[8],v=r[9],p=r[10],g=r[11],y=r[12],S=r[13],M=r[14],T=r[15];if(s[0].setComponents(c-a,f-h,g-m,T-y).normalize(),s[1].setComponents(c+a,f+h,g+m,T+y).normalize(),s[2].setComponents(c+o,f+d,g+v,T+S).normalize(),s[3].setComponents(c-o,f-d,g-v,T-S).normalize(),i)s[4].setComponents(l,u,p,M).normalize(),s[5].setComponents(c-l,f-u,g-p,T-M).normalize();else if(s[4].setComponents(c-l,f-u,g-p,T-M).normalize(),t===Vi)s[5].setComponents(c+l,f+u,g+p,T+M).normalize();else if(t===Wr)s[5].setComponents(l,u,p,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Gn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Gn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Gn)}intersectsSprite(e){Gn.center.set(0,0,0);const t=d0.distanceTo(e.center);return Gn.radius=.7071067811865476+t,Gn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Gn)}intersectsSphere(e){const t=this.planes,i=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const s=t[i];if(Ca.x=s.normal.x>0?e.max.x:e.min.x,Ca.y=s.normal.y>0?e.max.y:e.min.y,Ca.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Ca)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ff extends di{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ae(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const mo=new P,go=new P,Gu=new ze,Mr=new ir,Ra=new ji,Al=new P,Wu=new P;class Nh extends Mt{constructor(e=new fi,t=new Ff){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let s=1,r=t.count;s<r;s++)mo.fromBufferAttribute(t,s-1),go.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=mo.distanceTo(go);e.setAttribute("lineDistance",new ui(i,1))}else Re("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ra.copy(i.boundingSphere),Ra.applyMatrix4(s),Ra.radius+=r,e.ray.intersectsSphere(Ra)===!1)return;Gu.copy(s).invert(),Mr.copy(e.ray).applyMatrix4(Gu);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=i.index,u=i.attributes.position;if(h!==null){const f=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let v=f,p=m-1;v<p;v+=c){const g=h.getX(v),y=h.getX(v+1),S=Pa(this,e,Mr,l,g,y,v);S&&t.push(S)}if(this.isLineLoop){const v=h.getX(m-1),p=h.getX(f),g=Pa(this,e,Mr,l,v,p,m-1);g&&t.push(g)}}else{const f=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let v=f,p=m-1;v<p;v+=c){const g=Pa(this,e,Mr,l,v,v+1,v);g&&t.push(g)}if(this.isLineLoop){const v=Pa(this,e,Mr,l,m-1,f,m-1);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Pa(n,e,t,i,s,r,a){const o=n.geometry.attributes.position;if(mo.fromBufferAttribute(o,s),go.fromBufferAttribute(o,r),t.distanceSqToSegment(mo,go,Al,Wu)>i)return;Al.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Al);if(!(c<e.near||c>e.far))return{distance:c,point:Wu.clone().applyMatrix4(n.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:n}}const Xu=new P,qu=new P;class f0 extends Nh{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let s=0,r=t.count;s<r;s+=2)Xu.fromBufferAttribute(t,s),qu.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Xu.distanceTo(qu);e.setAttribute("lineDistance",new ui(i,1))}else Re("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class p0 extends Nh{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Bf extends di{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ae(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const ju=new ze,Bc=new ir,Da=new ji,La=new P;class m0 extends Mt{constructor(e=new fi,t=new Bf){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Da.copy(i.boundingSphere),Da.applyMatrix4(s),Da.radius+=r,e.ray.intersectsSphere(Da)===!1)return;ju.copy(s).invert(),Bc.copy(e.ray).applyMatrix4(ju);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=i.index,d=i.attributes.position;if(c!==null){const u=Math.max(0,a.start),f=Math.min(c.count,a.start+a.count);for(let m=u,v=f;m<v;m++){const p=c.getX(m);La.fromBufferAttribute(d,p),Yu(La,p,l,s,e,t,this)}}else{const u=Math.max(0,a.start),f=Math.min(d.count,a.start+a.count);for(let m=u,v=f;m<v;m++)La.fromBufferAttribute(d,m),Yu(La,m,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Yu(n,e,t,i,s,r,a){const o=Bc.distanceSqToPoint(n);if(o<t){const l=new P;Bc.closestPointToPoint(n,l),l.applyMatrix4(i);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class kf extends Et{constructor(e=[],t=ts,i,s,r,a,o,l,c,h){super(e,t,i,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Cl extends Et{constructor(e,t,i,s,r,a,o,l,c){super(e,t,i,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class js extends Et{constructor(e,t,i=qi,s,r,a,o=St,l=St,c,h=cn,d=1){if(h!==cn&&h!==wn)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,s,r,a,o,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ph(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class g0 extends js{constructor(e,t=qi,i=ts,s,r,a=St,o=St,l,c=cn){const h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,i,s,r,a,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class zf extends Et{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class nr extends fi{constructor(e=1,t=1,i=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],h=[],d=[];let u=0,f=0;m("z","y","x",-1,-1,i,t,e,a,r,0),m("z","y","x",1,-1,i,t,-e,a,r,1),m("x","z","y",1,1,e,i,t,s,a,2),m("x","z","y",1,-1,e,i,-t,s,a,3),m("x","y","z",1,-1,e,t,i,s,r,4),m("x","y","z",-1,-1,e,t,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new ui(c,3)),this.setAttribute("normal",new ui(h,3)),this.setAttribute("uv",new ui(d,2));function m(v,p,g,y,S,M,T,w,R,_,E){const L=M/R,C=T/_,F=M/2,k=T/2,V=w/2,W=R+1,z=_+1;let B=0,ie=0;const K=new P;for(let ce=0;ce<z;ce++){const de=ce*C-k;for(let ue=0;ue<W;ue++){const Ne=ue*L-F;K[v]=Ne*y,K[p]=de*S,K[g]=V,c.push(K.x,K.y,K.z),K[v]=0,K[p]=0,K[g]=w>0?1:-1,h.push(K.x,K.y,K.z),d.push(ue/R),d.push(1-ce/_),B+=1}}for(let ce=0;ce<_;ce++)for(let de=0;de<R;de++){const ue=u+de+W*ce,Ne=u+de+W*(ce+1),tt=u+(de+1)+W*(ce+1),Qe=u+(de+1)+W*ce;l.push(ue,Ne,Qe),l.push(Ne,tt,Qe),ie+=6}o.addGroup(f,ie,E),f+=ie,u+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new nr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class es extends fi{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};const r=e/2,a=t/2,o=Math.floor(i),l=Math.floor(s),c=o+1,h=l+1,d=e/o,u=t/l,f=[],m=[],v=[],p=[];for(let g=0;g<h;g++){const y=g*u-a;for(let S=0;S<c;S++){const M=S*d-r;m.push(M,-y,0),v.push(0,0,1),p.push(S/o),p.push(1-g/l)}}for(let g=0;g<l;g++)for(let y=0;y<o;y++){const S=y+c*g,M=y+c*(g+1),T=y+1+c*(g+1),w=y+1+c*g;f.push(S,M,w),f.push(M,T,w)}this.setIndex(f),this.setAttribute("position",new ui(m,3)),this.setAttribute("normal",new ui(v,3)),this.setAttribute("uv",new ui(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new es(e.width,e.height,e.widthSegments,e.heightSegments)}}function Ys(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const s=n[t][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Re("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone():Array.isArray(s)?e[t][i]=s.slice():e[t][i]=s}}return e}function Jt(n){const e={};for(let t=0;t<n.length;t++){const i=Ys(n[t]);for(const s in i)e[s]=i[s]}return e}function v0(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Vf(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:et.workingColorSpace}const Ai={clone:Ys,merge:Jt};var x0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,_0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Nt extends di{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=x0,this.fragmentShader=_0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ys(e.uniforms),this.uniformsGroups=v0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Hf extends Nt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Ks extends di{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ae(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ae(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Do,this.normalScale=new De(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Yi extends Ks{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new De(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ke(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ae(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ae(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ae(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class y0 extends di{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Do,this.normalScale=new De(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}}class M0 extends di{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ae(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ae(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Do,this.normalScale=new De(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.combine=ph,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Gf extends di{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ug,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class b0 extends di{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function Ia(n,e){return!n||n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function S0(n){function e(s,r){return n[s]-n[r]}const t=n.length,i=new Array(t);for(let s=0;s!==t;++s)i[s]=s;return i.sort(e),i}function Ku(n,e,t){const i=n.length,s=new n.constructor(i);for(let r=0,a=0;a!==i;++r){const o=t[r]*e;for(let l=0;l!==e;++l)s[a++]=n[o+l]}return s}function Wf(n,e,t,i){let s=1,r=n[0];for(;r!==void 0&&r[i]===void 0;)r=n[s++];if(r===void 0)return;let a=r[i];if(a!==void 0)if(Array.isArray(a))do a=r[i],a!==void 0&&(e.push(r.time),t.push(...a)),r=n[s++];while(r!==void 0);else if(a.toArray!==void 0)do a=r[i],a!==void 0&&(e.push(r.time),a.toArray(t,t.length)),r=n[s++];while(r!==void 0);else do a=r[i],a!==void 0&&(e.push(r.time),t.push(a)),r=n[s++];while(r!==void 0)}class sr{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let i=this._cachedIndex,s=t[i],r=t[i-1];i:{e:{let a;t:{n:if(!(e<s)){for(let o=i+2;;){if(s===void 0){if(e<r)break n;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(r=s,s=t[++i],e<s)break e}a=t.length;break t}if(!(e>=r)){const o=t[1];e<o&&(i=2,r=o);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=r,r=t[--i-1],e>=r)break e}a=i,i=0;break t}break i}for(;i<a;){const o=i+a>>>1;e<t[o]?a=o:i=o+1}if(s=t[i],r=t[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=i[r+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class T0 extends sr{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:pu,endingEnd:pu}}intervalChanged_(e,t,i){const s=this.parameterPositions;let r=e-2,a=e+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case mu:r=e,o=2*t-i;break;case gu:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case mu:a=e,l=2*i-t;break;case gu:a=1,l=i+s[1]-s[0];break;default:a=e-1,l=t}const c=(i-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-i),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,i,s){const r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,m=(i-t)/(s-t),v=m*m,p=v*m,g=-u*p+2*u*v-u*m,y=(1+u)*p+(-1.5-2*u)*v+(-.5+u)*m+1,S=(-1-f)*p+(1.5+f)*v+.5*m,M=f*p-f*v;for(let T=0;T!==o;++T)r[T]=g*a[h+T]+y*a[c+T]+S*a[l+T]+M*a[d+T];return r}}class E0 extends sr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(i-t)/(s-t),d=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*d+a[l+u]*h;return r}}class w0 extends sr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}}class A0 extends sr{interpolate_(e,t,i,s){const r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this.settings||this.DefaultSettings_,d=h.inTangents,u=h.outTangents;if(!d||!u){const v=(i-t)/(s-t),p=1-v;for(let g=0;g!==o;++g)r[g]=a[c+g]*p+a[l+g]*v;return r}const f=o*2,m=e-1;for(let v=0;v!==o;++v){const p=a[c+v],g=a[l+v],y=m*f+v*2,S=u[y],M=u[y+1],T=e*f+v*2,w=d[T],R=d[T+1];let _=(i-t)/(s-t),E,L,C,F,k;for(let V=0;V<8;V++){E=_*_,L=E*_,C=1-_,F=C*C,k=F*C;const z=k*t+3*F*_*S+3*C*E*w+L*s-i;if(Math.abs(z)<1e-10)break;const B=3*F*(S-t)+6*C*_*(w-S)+3*E*(s-w);if(Math.abs(B)<1e-10)break;_=_-z/B,_=Math.max(0,Math.min(1,_))}r[v]=k*p+3*F*_*M+3*C*E*R+L*g}return r}}class Li{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ia(t,this.TimeBufferType),this.values=Ia(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:Ia(e.times,Array),values:Ia(e.values,Array)};const s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new w0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new E0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new T0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new A0(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Hr:t=this.InterpolantFactoryMethodDiscrete;break;case Gr:t=this.InterpolantFactoryMethodLinear;break;case il:t=this.InterpolantFactoryMethodSmooth;break;case fu:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Re("KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Hr;case this.InterpolantFactoryMethodLinear:return Gr;case this.InterpolantFactoryMethodSmooth:return il;case this.InterpolantFactoryMethodBezier:return fu}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e}return this}trim(e,t){const i=this.times,s=i.length;let r=0,a=s-1;for(;r!==s&&i[r]<e;)++r;for(;a!==-1&&i[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);const o=this.getValueSize();this.times=i.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(Ue("KeyframeTrack: Invalid value size in track.",this),e=!1);const i=this.times,s=this.values,r=i.length;r===0&&(Ue("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){const l=i[o];if(typeof l=="number"&&isNaN(l)){Ue("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){Ue("KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(s!==void 0&&Mg(s))for(let o=0,l=s.length;o!==l;++o){const c=s[o];if(isNaN(c)){Ue("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===il,r=e.length-1;let a=1;for(let o=1;o<r;++o){let l=!1;const c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(s)l=!0;else{const d=o*i,u=d-i,f=d+i;for(let m=0;m!==i;++m){const v=t[d+m];if(v!==t[u+m]||v!==t[f+m]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];const d=o*i,u=a*i;for(let f=0;f!==i;++f)t[u+f]=t[d+f]}++a}}if(r>0){e[a]=e[r];for(let o=r*i,l=a*i,c=0;c!==i;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*i)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}}Li.prototype.ValueTypeName="";Li.prototype.TimeBufferType=Float32Array;Li.prototype.ValueBufferType=Float32Array;Li.prototype.DefaultInterpolation=Gr;class rr extends Li{constructor(e,t,i){super(e,t,i)}}rr.prototype.ValueTypeName="bool";rr.prototype.ValueBufferType=Array;rr.prototype.DefaultInterpolation=Hr;rr.prototype.InterpolantFactoryMethodLinear=void 0;rr.prototype.InterpolantFactoryMethodSmooth=void 0;class Xf extends Li{constructor(e,t,i,s){super(e,t,i,s)}}Xf.prototype.ValueTypeName="color";class Zs extends Li{constructor(e,t,i,s){super(e,t,i,s)}}Zs.prototype.ValueTypeName="number";class C0 extends sr{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){const r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(i-t)/(s-t);let c=e*o;for(let h=c+o;c!==h;c+=4)Ri.slerpFlat(r,0,a,c-o,a,c,l);return r}}class Js extends Li{constructor(e,t,i,s){super(e,t,i,s)}InterpolantFactoryMethodLinear(e){return new C0(this.times,this.values,this.getValueSize(),e)}}Js.prototype.ValueTypeName="quaternion";Js.prototype.InterpolantFactoryMethodSmooth=void 0;class ar extends Li{constructor(e,t,i){super(e,t,i)}}ar.prototype.ValueTypeName="string";ar.prototype.ValueBufferType=Array;ar.prototype.DefaultInterpolation=Hr;ar.prototype.InterpolantFactoryMethodLinear=void 0;ar.prototype.InterpolantFactoryMethodSmooth=void 0;class Qs extends Li{constructor(e,t,i,s){super(e,t,i,s)}}Qs.prototype.ValueTypeName="vector";class R0{constructor(e="",t=-1,i=[],s=cg){this.name=e,this.tracks=i,this.duration=t,this.blendMode=s,this.uuid=Ci(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],i=e.tracks,s=1/(e.fps||1);for(let a=0,o=i.length;a!==o;++a)t.push(D0(i[a]).scale(s));const r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){const t=[],i=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,a=i.length;r!==a;++r)t.push(Li.toJSON(i[r]));return s}static CreateFromMorphTargetSequence(e,t,i,s){const r=t.length,a=[];for(let o=0;o<r;o++){let l=[],c=[];l.push((o+r-1)%r,o,(o+1)%r),c.push(0,1,0);const h=S0(l);l=Ku(l,1,h),c=Ku(c,1,h),!s&&l[0]===0&&(l.push(r),c.push(c[0])),a.push(new Zs(".morphTargetInfluences["+t[o].name+"]",l,c).scale(1/i))}return new this(e,-1,a)}static findByName(e,t){let i=e;if(!Array.isArray(e)){const s=e;i=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<i.length;s++)if(i[s].name===t)return i[s];return null}static CreateClipsFromMorphTargetSequences(e,t,i){const s={},r=/^([\w-]*?)([\d]+)$/;for(let o=0,l=e.length;o<l;o++){const c=e[o],h=c.name.match(r);if(h&&h.length>1){const d=h[1];let u=s[d];u||(s[d]=u=[]),u.push(c)}}const a=[];for(const o in s)a.push(this.CreateFromMorphTargetSequence(o,s[o],t,i));return a}static parseAnimation(e,t){if(Re("AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return Ue("AnimationClip: No animation in JSONLoader data."),null;const i=function(d,u,f,m,v){if(f.length!==0){const p=[],g=[];Wf(f,p,g,m),p.length!==0&&v.push(new d(u,p,g))}},s=[],r=e.name||"default",a=e.fps||30,o=e.blendMode;let l=e.length||-1;const c=e.hierarchy||[];for(let d=0;d<c.length;d++){const u=c[d].keys;if(!(!u||u.length===0))if(u[0].morphTargets){const f={};let m;for(m=0;m<u.length;m++)if(u[m].morphTargets)for(let v=0;v<u[m].morphTargets.length;v++)f[u[m].morphTargets[v]]=-1;for(const v in f){const p=[],g=[];for(let y=0;y!==u[m].morphTargets.length;++y){const S=u[m];p.push(S.time),g.push(S.morphTarget===v?1:0)}s.push(new Zs(".morphTargetInfluence["+v+"]",p,g))}l=f.length*a}else{const f=".bones["+t[d].name+"]";i(Qs,f+".position",u,"pos",s),i(Js,f+".quaternion",u,"rot",s),i(Qs,f+".scale",u,"scl",s)}}return s.length===0?null:new this(r,l,s,o)}resetDuration(){const e=this.tracks;let t=0;for(let i=0,s=e.length;i!==s;++i){const r=this.tracks[i];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let i=0;i<this.tracks.length;i++)e.push(this.tracks[i].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function P0(n){switch(n.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Zs;case"vector":case"vector2":case"vector3":case"vector4":return Qs;case"color":return Xf;case"quaternion":return Js;case"bool":case"boolean":return rr;case"string":return ar}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+n)}function D0(n){if(n.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=P0(n.type);if(n.times===void 0){const t=[],i=[];Wf(n.keys,t,i,"value"),n.times=t,n.values=i}return e.parse!==void 0?e.parse(n):new e(n.name,n.times,n.values,n.interpolation)}const an={enabled:!1,files:{},add:function(n,e){this.enabled!==!1&&(Zu(n)||(this.files[n]=e))},get:function(n){if(this.enabled!==!1&&!Zu(n))return this.files[n]},remove:function(n){delete this.files[n]},clear:function(){this.files={}}};function Zu(n){try{const e=n.slice(n.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class L0{constructor(e,t,i){const s=this;let r=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){const d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){const f=c[d],m=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const I0=new L0;class or{constructor(e){this.manager=e!==void 0?e:I0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const i=this;return new Promise(function(s,r){i.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}or.DEFAULT_MATERIAL_NAME="__DEFAULT";const nn={};class N0 extends Error{constructor(e,t){super(e),this.response=t}}class qf extends or{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=an.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(nn[e]!==void 0){nn[e].push({onLoad:t,onProgress:i,onError:s});return}nn[e]=[],nn[e].push({onLoad:t,onProgress:i,onError:s});const a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,l=this.responseType;fetch(a).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Re("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=nn[e],d=c.body.getReader(),u=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=u?parseInt(u):0,m=f!==0;let v=0;const p=new ReadableStream({start(g){y();function y(){d.read().then(({done:S,value:M})=>{if(S)g.close();else{v+=M.byteLength;const T=new ProgressEvent("progress",{lengthComputable:m,loaded:v,total:f});for(let w=0,R=h.length;w<R;w++){const _=h[w];_.onProgress&&_.onProgress(T)}g.enqueue(M),y()}},S=>{g.error(S)})}}});return new Response(p)}else throw new N0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o==="")return c.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return c.arrayBuffer().then(m=>f.decode(m))}}}).then(c=>{an.add(`file:${e}`,c);const h=nn[e];delete nn[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=nn[e];if(h===void 0)throw this.manager.itemError(e),c;delete nn[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const _s=new WeakMap;class U0 extends or{constructor(e){super(e)}load(e,t,i,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,a=an.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0);else{let d=_s.get(a);d===void 0&&(d=[],_s.set(a,d)),d.push({onLoad:t,onError:s})}return a}const o=Xr("img");function l(){h(),t&&t(this);const d=_s.get(this)||[];for(let u=0;u<d.length;u++){const f=d[u];f.onLoad&&f.onLoad(this)}_s.delete(this),r.manager.itemEnd(e)}function c(d){h(),s&&s(d),an.remove(`image:${e}`);const u=_s.get(this)||[];for(let f=0;f<u.length;f++){const m=u[f];m.onError&&m.onError(d)}_s.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),an.add(`image:${e}`,o),r.manager.itemStart(e),o.src=e,o}}class O0 extends or{constructor(e){super(e)}load(e,t,i,s){const r=new Et,a=new U0(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},i,s),r}}class ta extends Mt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ae(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class F0 extends ta{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Mt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ae(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Rl=new ze,Ju=new P,Qu=new P;class Uh{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new De(512,512),this.mapType=li,this.map=null,this.mapPass=null,this.matrix=new ze,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ea,this._frameExtents=new De(1,1),this._viewportCount=1,this._viewports=[new bt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Ju.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ju),Qu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Qu),t.updateMatrixWorld(),Rl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Rl,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Wr||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Rl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Na=new P,Ua=new Ri,Ni=new P;class jf extends Mt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ze,this.projectionMatrix=new ze,this.projectionMatrixInverse=new ze,this.coordinateSystem=Vi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Na,Ua,Ni),Ni.x===1&&Ni.y===1&&Ni.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Na,Ua,Ni.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Na,Ua,Ni),Ni.x===1&&Ni.y===1&&Ni.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Na,Ua,Ni.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const _n=new P,$u=new De,ed=new De;class Wt extends jf{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=qs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Nr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return qs*2*Math.atan(Math.tan(Nr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){_n.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(_n.x,_n.y).multiplyScalar(-e/_n.z),_n.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(_n.x,_n.y).multiplyScalar(-e/_n.z)}getViewSize(e,t){return this.getViewBounds(e,$u,ed),t.subVectors(ed,$u)}setViewOffset(e,t,i,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Nr*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*i/c,s*=a.width/l,i*=a.height/c}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class B0 extends Uh{constructor(){super(new Wt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,i=qs*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(i!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=i,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class k0 extends ta{constructor(e,t,i=0,s=Math.PI/3,r=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Mt.DEFAULT_UP),this.updateMatrix(),this.target=new Mt,this.distance=i,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new B0}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class z0 extends Uh{constructor(){super(new Wt(90,1,.5,500)),this.isPointLightShadow=!0}}class Yf extends ta{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new z0}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class ia extends jf{constructor(e=-1,t=1,i=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-e,a=i+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class V0 extends Uh{constructor(){super(new ia(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class kc extends ta{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Mt.DEFAULT_UP),this.updateMatrix(),this.target=new Mt,this.shadow=new V0}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Or{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const Pl=new WeakMap;class H0 extends or{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Re("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Re("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,a=an.get(`image-bitmap:${e}`);if(a!==void 0){if(r.manager.itemStart(e),a.then){a.then(c=>{if(Pl.has(a)===!0)s&&s(Pl.get(a)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(c),r.manager.itemEnd(e),c});return}return setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a}const o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const l=fetch(e,o).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(c){return an.add(`image-bitmap:${e}`,c),t&&t(c),r.manager.itemEnd(e),c}).catch(function(c){s&&s(c),Pl.set(l,c),an.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});an.add(`image-bitmap:${e}`,l),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const ys=-90,Ms=1;class G0 extends Mt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Wt(ys,Ms,e,t);s.layers=this.layers,this.add(s);const r=new Wt(ys,Ms,e,t);r.layers=this.layers,this.add(r);const a=new Wt(ys,Ms,e,t);a.layers=this.layers,this.add(a);const o=new Wt(ys,Ms,e,t);o.layers=this.layers,this.add(o);const l=new Wt(ys,Ms,e,t);l.layers=this.layers,this.add(l);const c=new Wt(ys,Ms,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,s,r,a,o,l]=t;for(const c of t)this.remove(c);if(e===Vi)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Wr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const v=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(i,0,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(i,1,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,2,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,3,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),i.texture.generateMipmaps=v,e.setRenderTarget(i,5,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}}class W0 extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class X0{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=q0.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function q0(){this._document.hidden===!1&&this.reset()}const Oh="\\[\\]\\.:\\/",j0=new RegExp("["+Oh+"]","g"),Fh="[^"+Oh+"]",Y0="[^"+Oh.replace("\\.","")+"]",K0=/((?:WC+[\/:])*)/.source.replace("WC",Fh),Z0=/(WCOD+)?/.source.replace("WCOD",Y0),J0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Fh),Q0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Fh),$0=new RegExp("^"+K0+Z0+J0+Q0+"$"),ev=["material","materials","bones","map"];class tv{constructor(e,t,i){const s=i||ut.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();const i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){const i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}}class ut{constructor(e,t,i){this.path=t,this.parsedPath=i||ut.parseTrackName(t),this.node=ut.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new ut.Composite(e,t,i):new ut(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(j0,"")}static parseTrackName(e){const t=$0.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){const r=i.nodeName.substring(s+1);ev.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){const i=function(r){for(let a=0;a<r.length;a++){const o=r[a];if(o.name===t||o.uuid===t)return o;const l=i(o.children);if(l)return l}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,i=t.objectName,s=t.propertyName;let r=t.propertyIndex;if(e||(e=ut.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Re("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){Ue("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ue("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ue("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ue("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ue("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){Ue("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){Ue("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const a=e[s];if(a===void 0){const c=t.nodeName;Ue("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Ue("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ue("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}ut.Composite=tv;ut.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ut.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ut.prototype.GetterByBindingType=[ut.prototype._getValue_direct,ut.prototype._getValue_array,ut.prototype._getValue_arrayElement,ut.prototype._getValue_toArray];ut.prototype.SetterByBindingTypeAndVersioning=[[ut.prototype._setValue_direct,ut.prototype._setValue_direct_setNeedsUpdate,ut.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_array,ut.prototype._setValue_array_setNeedsUpdate,ut.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_arrayElement,ut.prototype._setValue_arrayElement_setNeedsUpdate,ut.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_fromArray,ut.prototype._setValue_fromArray_setNeedsUpdate,ut.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const td=new ze;class iv{constructor(e,t,i=0,s=1/0){this.ray=new ir(e,t),this.near=i,this.far=s,this.camera=null,this.layers=new Dh,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Ue("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return td.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(td),this}intersectObject(e,t=!0,i=[]){return zc(e,this,i,t),i.sort(id),i}intersectObjects(e,t=!0,i=[]){for(let s=0,r=e.length;s<r;s++)zc(e[s],this,i,t);return i.sort(id),i}}function id(n,e){return n.distance-e.distance}function zc(n,e,t,i){let s=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(s=!1),s===!0&&i===!0){const r=n.children;for(let a=0,o=r.length;a<o;a++)zc(r[a],e,t,!0)}}class Fr{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Ke(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Ke(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class nv extends ns{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){Re("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function nd(n,e,t,i){const s=sv(i);switch(t){case Cf:return n*e;case Po:return n*e/s.components*s.byteLength;case Th:return n*e/s.components*s.byteLength;case Xs:return n*e*2/s.components*s.byteLength;case Eh:return n*e*2/s.components*s.byteLength;case Rf:return n*e*3/s.components*s.byteLength;case xi:return n*e*4/s.components*s.byteLength;case wh:return n*e*4/s.components*s.byteLength;case Ja:case Qa:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case $a:case eo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case rc:case oc:return Math.max(n,16)*Math.max(e,8)/4;case sc:case ac:return Math.max(n,8)*Math.max(e,8)/2;case lc:case cc:case uc:case dc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case hc:case fc:case pc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case mc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case gc:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case vc:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case xc:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case _c:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case yc:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Mc:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case bc:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case Sc:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case Tc:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Ec:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case wc:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case Ac:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Cc:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Rc:case Pc:case Dc:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Lc:case Ic:return Math.ceil(n/4)*Math.ceil(e/4)*8;case Nc:case Uc:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function sv(n){switch(n){case li:case Tf:return{byteLength:1,components:1};case Vr:case Ef:case ei:return{byteLength:2,components:1};case bh:case Sh:return{byteLength:2,components:4};case qi:case Mh:case ci:return{byteLength:4,components:1};case wf:case Af:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:dh}}));typeof window<"u"&&(window.__THREE__?Re("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=dh);function Kf(){let n=null,e=!1,t=null,i=null;function s(r,a){t(r,a),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){n=r}}}function rv(n){const e=new WeakMap;function t(o,l){const c=o.array,h=o.usage,d=c.byteLength,u=n.createBuffer();n.bindBuffer(l,u),n.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){const h=l.array,d=l.updateRanges;if(n.bindBuffer(c,o),d.length===0)n.bufferSubData(c,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){const m=d[u],v=d[f];v.start<=m.start+m.count+1?m.count=Math.max(m.count,v.start+v.count-m.start):(++u,d[u]=v)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){const v=d[f];n.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var av=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ov=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,lv=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,cv=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,hv=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,uv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,dv=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,fv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,pv=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,mv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,gv=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,vv=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,xv=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,_v=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,yv=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Mv=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,bv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Sv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Tv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ev=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,wv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Av=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Cv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Rv=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Pv=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Dv=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Lv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Iv=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Nv=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Uv=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ov="gl_FragColor = linearToOutputTexel( gl_FragColor );",Fv=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Bv=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,kv=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,zv=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Vv=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Hv=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Gv=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Wv=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Xv=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,qv=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,jv=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Yv=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Kv=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Zv=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Jv=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Qv=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,$v=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ex=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,tx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ix=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,nx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,sx=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,rx=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ax=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,ox=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,cx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,hx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ux=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,dx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,fx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,px=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,mx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,vx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,xx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,_x=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,yx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Mx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,bx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Sx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Tx=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Ex=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ax=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Cx=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Rx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Px=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Dx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Lx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ix=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Nx=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Ux=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ox=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Fx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Bx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,kx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,zx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Vx=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Hx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Gx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Wx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Xx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,qx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,jx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Yx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Kx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Zx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Jx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Qx=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,$x=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,e_=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,t_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,i_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,n_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,s_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const r_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,a_=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,o_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,l_=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,c_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,h_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,u_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,d_=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,f_=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,p_=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,m_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,g_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,v_=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,x_=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,__=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,y_=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,M_=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,b_=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,S_=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,T_=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,E_=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,w_=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,A_=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,C_=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,R_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,P_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,D_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,L_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,I_=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,N_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,U_=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,O_=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,F_=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,B_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,We={alphahash_fragment:av,alphahash_pars_fragment:ov,alphamap_fragment:lv,alphamap_pars_fragment:cv,alphatest_fragment:hv,alphatest_pars_fragment:uv,aomap_fragment:dv,aomap_pars_fragment:fv,batching_pars_vertex:pv,batching_vertex:mv,begin_vertex:gv,beginnormal_vertex:vv,bsdfs:xv,iridescence_fragment:_v,bumpmap_pars_fragment:yv,clipping_planes_fragment:Mv,clipping_planes_pars_fragment:bv,clipping_planes_pars_vertex:Sv,clipping_planes_vertex:Tv,color_fragment:Ev,color_pars_fragment:wv,color_pars_vertex:Av,color_vertex:Cv,common:Rv,cube_uv_reflection_fragment:Pv,defaultnormal_vertex:Dv,displacementmap_pars_vertex:Lv,displacementmap_vertex:Iv,emissivemap_fragment:Nv,emissivemap_pars_fragment:Uv,colorspace_fragment:Ov,colorspace_pars_fragment:Fv,envmap_fragment:Bv,envmap_common_pars_fragment:kv,envmap_pars_fragment:zv,envmap_pars_vertex:Vv,envmap_physical_pars_fragment:Qv,envmap_vertex:Hv,fog_vertex:Gv,fog_pars_vertex:Wv,fog_fragment:Xv,fog_pars_fragment:qv,gradientmap_pars_fragment:jv,lightmap_pars_fragment:Yv,lights_lambert_fragment:Kv,lights_lambert_pars_fragment:Zv,lights_pars_begin:Jv,lights_toon_fragment:$v,lights_toon_pars_fragment:ex,lights_phong_fragment:tx,lights_phong_pars_fragment:ix,lights_physical_fragment:nx,lights_physical_pars_fragment:sx,lights_fragment_begin:rx,lights_fragment_maps:ax,lights_fragment_end:ox,logdepthbuf_fragment:lx,logdepthbuf_pars_fragment:cx,logdepthbuf_pars_vertex:hx,logdepthbuf_vertex:ux,map_fragment:dx,map_pars_fragment:fx,map_particle_fragment:px,map_particle_pars_fragment:mx,metalnessmap_fragment:gx,metalnessmap_pars_fragment:vx,morphinstance_vertex:xx,morphcolor_vertex:_x,morphnormal_vertex:yx,morphtarget_pars_vertex:Mx,morphtarget_vertex:bx,normal_fragment_begin:Sx,normal_fragment_maps:Tx,normal_pars_fragment:Ex,normal_pars_vertex:wx,normal_vertex:Ax,normalmap_pars_fragment:Cx,clearcoat_normal_fragment_begin:Rx,clearcoat_normal_fragment_maps:Px,clearcoat_pars_fragment:Dx,iridescence_pars_fragment:Lx,opaque_fragment:Ix,packing:Nx,premultiplied_alpha_fragment:Ux,project_vertex:Ox,dithering_fragment:Fx,dithering_pars_fragment:Bx,roughnessmap_fragment:kx,roughnessmap_pars_fragment:zx,shadowmap_pars_fragment:Vx,shadowmap_pars_vertex:Hx,shadowmap_vertex:Gx,shadowmask_pars_fragment:Wx,skinbase_vertex:Xx,skinning_pars_vertex:qx,skinning_vertex:jx,skinnormal_vertex:Yx,specularmap_fragment:Kx,specularmap_pars_fragment:Zx,tonemapping_fragment:Jx,tonemapping_pars_fragment:Qx,transmission_fragment:$x,transmission_pars_fragment:e_,uv_pars_fragment:t_,uv_pars_vertex:i_,uv_vertex:n_,worldpos_vertex:s_,background_vert:r_,background_frag:a_,backgroundCube_vert:o_,backgroundCube_frag:l_,cube_vert:c_,cube_frag:h_,depth_vert:u_,depth_frag:d_,distance_vert:f_,distance_frag:p_,equirect_vert:m_,equirect_frag:g_,linedashed_vert:v_,linedashed_frag:x_,meshbasic_vert:__,meshbasic_frag:y_,meshlambert_vert:M_,meshlambert_frag:b_,meshmatcap_vert:S_,meshmatcap_frag:T_,meshnormal_vert:E_,meshnormal_frag:w_,meshphong_vert:A_,meshphong_frag:C_,meshphysical_vert:R_,meshphysical_frag:P_,meshtoon_vert:D_,meshtoon_frag:L_,points_vert:I_,points_frag:N_,shadow_vert:U_,shadow_frag:O_,sprite_vert:F_,sprite_frag:B_},ge={common:{diffuse:{value:new Ae(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xe}},envmap:{envMap:{value:null},envMapRotation:{value:new Xe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xe},normalScale:{value:new De(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ae(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ae(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0},uvTransform:{value:new Xe}},sprite:{diffuse:{value:new Ae(16777215)},opacity:{value:1},center:{value:new De(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}}},Fi={basic:{uniforms:Jt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:We.meshbasic_vert,fragmentShader:We.meshbasic_frag},lambert:{uniforms:Jt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Ae(0)},envMapIntensity:{value:1}}]),vertexShader:We.meshlambert_vert,fragmentShader:We.meshlambert_frag},phong:{uniforms:Jt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Ae(0)},specular:{value:new Ae(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:We.meshphong_vert,fragmentShader:We.meshphong_frag},standard:{uniforms:Jt([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new Ae(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag},toon:{uniforms:Jt([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new Ae(0)}}]),vertexShader:We.meshtoon_vert,fragmentShader:We.meshtoon_frag},matcap:{uniforms:Jt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:We.meshmatcap_vert,fragmentShader:We.meshmatcap_frag},points:{uniforms:Jt([ge.points,ge.fog]),vertexShader:We.points_vert,fragmentShader:We.points_frag},dashed:{uniforms:Jt([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:We.linedashed_vert,fragmentShader:We.linedashed_frag},depth:{uniforms:Jt([ge.common,ge.displacementmap]),vertexShader:We.depth_vert,fragmentShader:We.depth_frag},normal:{uniforms:Jt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:We.meshnormal_vert,fragmentShader:We.meshnormal_frag},sprite:{uniforms:Jt([ge.sprite,ge.fog]),vertexShader:We.sprite_vert,fragmentShader:We.sprite_frag},background:{uniforms:{uvTransform:{value:new Xe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:We.background_vert,fragmentShader:We.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xe}},vertexShader:We.backgroundCube_vert,fragmentShader:We.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:We.cube_vert,fragmentShader:We.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:We.equirect_vert,fragmentShader:We.equirect_frag},distance:{uniforms:Jt([ge.common,ge.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:We.distance_vert,fragmentShader:We.distance_frag},shadow:{uniforms:Jt([ge.lights,ge.fog,{color:{value:new Ae(0)},opacity:{value:1}}]),vertexShader:We.shadow_vert,fragmentShader:We.shadow_frag}};Fi.physical={uniforms:Jt([Fi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xe},clearcoatNormalScale:{value:new De(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xe},sheen:{value:0},sheenColor:{value:new Ae(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xe},transmissionSamplerSize:{value:new De},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xe},attenuationDistance:{value:0},attenuationColor:{value:new Ae(0)},specularColor:{value:new Ae(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xe},anisotropyVector:{value:new De},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xe}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag};const Oa={r:0,b:0,g:0},Wn=new Pi,k_=new ze;function z_(n,e,t,i,s,r){const a=new Ae(0);let o=s===!0?0:1,l,c,h=null,d=0,u=null;function f(y){let S=y.isScene===!0?y.background:null;if(S&&S.isTexture){const M=y.backgroundBlurriness>0;S=e.get(S,M)}return S}function m(y){let S=!1;const M=f(y);M===null?p(a,o):M&&M.isColor&&(p(M,1),S=!0);const T=n.xr.getEnvironmentBlendMode();T==="additive"?t.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(n.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function v(y,S){const M=f(S);M&&(M.isCubeTexture||M.mapping===Ro)?(c===void 0&&(c=new st(new nr(1,1,1),new Nt({name:"BackgroundCubeMaterial",uniforms:Ys(Fi.backgroundCube.uniforms),vertexShader:Fi.backgroundCube.vertexShader,fragmentShader:Fi.backgroundCube.fragmentShader,side:Qt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,w,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),Wn.copy(S.backgroundRotation),Wn.x*=-1,Wn.y*=-1,Wn.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Wn.y*=-1,Wn.z*=-1),c.material.uniforms.envMap.value=M,c.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(k_.makeRotationFromEuler(Wn)),c.material.toneMapped=et.getTransfer(M.colorSpace)!==lt,(h!==M||d!==M.version||u!==n.toneMapping)&&(c.material.needsUpdate=!0,h=M,d=M.version,u=n.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new st(new es(2,2),new Nt({name:"BackgroundMaterial",uniforms:Ys(Fi.background.uniforms),vertexShader:Fi.background.vertexShader,fragmentShader:Fi.background.fragmentShader,side:Xi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=et.getTransfer(M.colorSpace)!==lt,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||d!==M.version||u!==n.toneMapping)&&(l.material.needsUpdate=!0,h=M,d=M.version,u=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,S){y.getRGB(Oa,Vf(n)),t.buffers.color.setClear(Oa.r,Oa.g,Oa.b,S,r)}function g(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,S=1){a.set(y),o=S,p(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(y){o=y,p(a,o)},render:m,addToRenderList:v,dispose:g}}function V_(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=u(null);let r=s,a=!1;function o(C,F,k,V,W){let z=!1;const B=d(C,V,k,F);r!==B&&(r=B,c(r.object)),z=f(C,V,k,W),z&&m(C,V,k,W),W!==null&&e.update(W,n.ELEMENT_ARRAY_BUFFER),(z||a)&&(a=!1,M(C,F,k,V),W!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(W).buffer))}function l(){return n.createVertexArray()}function c(C){return n.bindVertexArray(C)}function h(C){return n.deleteVertexArray(C)}function d(C,F,k,V){const W=V.wireframe===!0;let z=i[F.id];z===void 0&&(z={},i[F.id]=z);const B=C.isInstancedMesh===!0?C.id:0;let ie=z[B];ie===void 0&&(ie={},z[B]=ie);let K=ie[k.id];K===void 0&&(K={},ie[k.id]=K);let ce=K[W];return ce===void 0&&(ce=u(l()),K[W]=ce),ce}function u(C){const F=[],k=[],V=[];for(let W=0;W<t;W++)F[W]=0,k[W]=0,V[W]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:k,attributeDivisors:V,object:C,attributes:{},index:null}}function f(C,F,k,V){const W=r.attributes,z=F.attributes;let B=0;const ie=k.getAttributes();for(const K in ie)if(ie[K].location>=0){const de=W[K];let ue=z[K];if(ue===void 0&&(K==="instanceMatrix"&&C.instanceMatrix&&(ue=C.instanceMatrix),K==="instanceColor"&&C.instanceColor&&(ue=C.instanceColor)),de===void 0||de.attribute!==ue||ue&&de.data!==ue.data)return!0;B++}return r.attributesNum!==B||r.index!==V}function m(C,F,k,V){const W={},z=F.attributes;let B=0;const ie=k.getAttributes();for(const K in ie)if(ie[K].location>=0){let de=z[K];de===void 0&&(K==="instanceMatrix"&&C.instanceMatrix&&(de=C.instanceMatrix),K==="instanceColor"&&C.instanceColor&&(de=C.instanceColor));const ue={};ue.attribute=de,de&&de.data&&(ue.data=de.data),W[K]=ue,B++}r.attributes=W,r.attributesNum=B,r.index=V}function v(){const C=r.newAttributes;for(let F=0,k=C.length;F<k;F++)C[F]=0}function p(C){g(C,0)}function g(C,F){const k=r.newAttributes,V=r.enabledAttributes,W=r.attributeDivisors;k[C]=1,V[C]===0&&(n.enableVertexAttribArray(C),V[C]=1),W[C]!==F&&(n.vertexAttribDivisor(C,F),W[C]=F)}function y(){const C=r.newAttributes,F=r.enabledAttributes;for(let k=0,V=F.length;k<V;k++)F[k]!==C[k]&&(n.disableVertexAttribArray(k),F[k]=0)}function S(C,F,k,V,W,z,B){B===!0?n.vertexAttribIPointer(C,F,k,W,z):n.vertexAttribPointer(C,F,k,V,W,z)}function M(C,F,k,V){v();const W=V.attributes,z=k.getAttributes(),B=F.defaultAttributeValues;for(const ie in z){const K=z[ie];if(K.location>=0){let ce=W[ie];if(ce===void 0&&(ie==="instanceMatrix"&&C.instanceMatrix&&(ce=C.instanceMatrix),ie==="instanceColor"&&C.instanceColor&&(ce=C.instanceColor)),ce!==void 0){const de=ce.normalized,ue=ce.itemSize,Ne=e.get(ce);if(Ne===void 0)continue;const tt=Ne.buffer,Qe=Ne.type,Z=Ne.bytesPerElement,ne=Qe===n.INT||Qe===n.UNSIGNED_INT||ce.gpuType===Mh;if(ce.isInterleavedBufferAttribute){const se=ce.data,Se=se.stride,Me=ce.offset;if(se.isInstancedInterleavedBuffer){for(let Le=0;Le<K.locationSize;Le++)g(K.location+Le,se.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let Le=0;Le<K.locationSize;Le++)p(K.location+Le);n.bindBuffer(n.ARRAY_BUFFER,tt);for(let Le=0;Le<K.locationSize;Le++)S(K.location+Le,ue/K.locationSize,Qe,de,Se*Z,(Me+ue/K.locationSize*Le)*Z,ne)}else{if(ce.isInstancedBufferAttribute){for(let se=0;se<K.locationSize;se++)g(K.location+se,ce.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let se=0;se<K.locationSize;se++)p(K.location+se);n.bindBuffer(n.ARRAY_BUFFER,tt);for(let se=0;se<K.locationSize;se++)S(K.location+se,ue/K.locationSize,Qe,de,ue*Z,ue/K.locationSize*se*Z,ne)}}else if(B!==void 0){const de=B[ie];if(de!==void 0)switch(de.length){case 2:n.vertexAttrib2fv(K.location,de);break;case 3:n.vertexAttrib3fv(K.location,de);break;case 4:n.vertexAttrib4fv(K.location,de);break;default:n.vertexAttrib1fv(K.location,de)}}}}y()}function T(){E();for(const C in i){const F=i[C];for(const k in F){const V=F[k];for(const W in V){const z=V[W];for(const B in z)h(z[B].object),delete z[B];delete V[W]}}delete i[C]}}function w(C){if(i[C.id]===void 0)return;const F=i[C.id];for(const k in F){const V=F[k];for(const W in V){const z=V[W];for(const B in z)h(z[B].object),delete z[B];delete V[W]}}delete i[C.id]}function R(C){for(const F in i){const k=i[F];for(const V in k){const W=k[V];if(W[C.id]===void 0)continue;const z=W[C.id];for(const B in z)h(z[B].object),delete z[B];delete W[C.id]}}}function _(C){for(const F in i){const k=i[F],V=C.isInstancedMesh===!0?C.id:0,W=k[V];if(W!==void 0){for(const z in W){const B=W[z];for(const ie in B)h(B[ie].object),delete B[ie];delete W[z]}delete k[V],Object.keys(k).length===0&&delete i[F]}}}function E(){L(),a=!0,r!==s&&(r=s,c(r.object))}function L(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:E,resetDefaultState:L,dispose:T,releaseStatesOfGeometry:w,releaseStatesOfObject:_,releaseStatesOfProgram:R,initAttributes:v,enableAttribute:p,disableUnusedAttributes:y}}function H_(n,e,t){let i;function s(c){i=c}function r(c,h){n.drawArrays(i,c,h),t.update(h,i,1)}function a(c,h,d){d!==0&&(n.drawArraysInstanced(i,c,h,d),t.update(h,i,d))}function o(c,h,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,h,0,d);let f=0;for(let m=0;m<d;m++)f+=h[m];t.update(f,i,1)}function l(c,h,d,u){if(d===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<c.length;m++)a(c[m],h[m],u[m]);else{f.multiDrawArraysInstancedWEBGL(i,c,0,h,0,u,0,d);let m=0;for(let v=0;v<d;v++)m+=h[v]*u[v];t.update(m,i,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function G_(n,e,t,i){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(R){return!(R!==xi&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){const _=R===ei&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==li&&i.convert(R)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==ci&&!_)}function l(R){if(R==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Re("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),g=n.getParameter(n.MAX_VERTEX_ATTRIBS),y=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),S=n.getParameter(n.MAX_VARYING_VECTORS),M=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),T=n.getParameter(n.MAX_SAMPLES),w=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:v,maxCubemapSize:p,maxAttributes:g,maxVertexUniforms:y,maxVaryings:S,maxFragmentUniforms:M,maxSamples:T,samples:w}}function W_(n){const e=this;let t=null,i=0,s=!1,r=!1;const a=new Mn,o=new Xe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||i!==0||s;return s=u,i=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const m=d.clippingPlanes,v=d.clipIntersection,p=d.clipShadows,g=n.get(d);if(!s||m===null||m.length===0||r&&!p)r?h(null):c();else{const y=r?0:i,S=y*4;let M=g.clippingState||null;l.value=M,M=h(m,u,S,f);for(let T=0;T!==S;++T)M[T]=t[T];g.clippingState=M,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(d,u,f,m){const v=d!==null?d.length:0;let p=null;if(v!==0){if(p=l.value,m!==!0||p===null){const g=f+v*4,y=u.matrixWorldInverse;o.getNormalMatrix(y),(p===null||p.length<g)&&(p=new Float32Array(g));for(let S=0,M=f;S!==v;++S,M+=4)a.copy(d[S]).applyMatrix4(y,o),a.normal.toArray(p,M),p[M+3]=a.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,p}}const An=4,sd=[.125,.215,.35,.446,.526,.582],Kn=20,X_=256,br=new ia,rd=new Ae;let Dl=null,Ll=0,Il=0,Nl=!1;const q_=new P;class Vc{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,s=100,r={}){const{size:a=256,position:o=q_}=r;Dl=this._renderer.getRenderTarget(),Ll=this._renderer.getActiveCubeFace(),Il=this._renderer.getActiveMipmapLevel(),Nl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ld(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=od(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Dl,Ll,Il),this._renderer.xr.enabled=Nl,e.scissorTest=!1,bs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ts||e.mapping===Gs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Dl=this._renderer.getRenderTarget(),Ll=this._renderer.getActiveCubeFace(),Il=this._renderer.getActiveMipmapLevel(),Nl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:It,minFilter:It,generateMipmaps:!1,type:ei,format:xi,colorSpace:ti,depthBuffer:!1},s=ad(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ad(e,t,i);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=j_(r)),this._blurMaterial=K_(r,e,t),this._ggxMaterial=Y_(r,e,t)}return s}_compileMaterial(e){const t=new st(new fi,e);this._renderer.compile(t,br)}_sceneToCubeUV(e,t,i,s,r){const l=new Wt(90,1,t,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(rd),d.toneMapping=Wi,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new st(new nr,new Gi({name:"PMREM.Background",side:Qt,depthWrite:!1,depthTest:!1})));const v=this._backgroundBox,p=v.material;let g=!1;const y=e.background;y?y.isColor&&(p.color.copy(y),e.background=null,g=!0):(p.color.copy(rd),g=!0);for(let S=0;S<6;S++){const M=S%3;M===0?(l.up.set(0,c[S],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[S],r.y,r.z)):M===1?(l.up.set(0,0,c[S]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[S],r.z)):(l.up.set(0,c[S],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[S]));const T=this._cubeSize;bs(s,M*T,S>2?T:0,T,T),d.setRenderTarget(s),g&&d.render(v,l),d.render(e,l)}d.toneMapping=f,d.autoClear=u,e.background=y}_textureToCubeUV(e,t){const i=this._renderer,s=e.mapping===ts||e.mapping===Gs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=ld()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=od());const r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;const o=r.uniforms;o.envMap.value=e;const l=this._cubeSize;bs(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,br)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=i}_applyGGXFilter(e,t,i){const s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[i];o.material=a;const l=a.uniforms,c=i/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,f=d*u,{_lodMax:m}=this,v=this._sizeLods[i],p=3*v*(i>m-An?i-m+An:0),g=4*(this._cubeSize-v);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,bs(r,p,g,3*v,2*v),s.setRenderTarget(r),s.render(o,br),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-i,bs(e,p,g,3*v,2*v),s.setRenderTarget(e),s.render(o,br)}_blur(e,t,i,s,r){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,s,"latitudinal",r),this._halfBlur(a,e,i,i,s,"longitudinal",r)}_halfBlur(e,t,i,s,r,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&Ue("blur direction must be either latitudinal or longitudinal!");const h=3,d=this._lodMeshes[s];d.material=c;const u=c.uniforms,f=this._sizeLods[i]-1,m=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Kn-1),v=r/m,p=isFinite(r)?1+Math.floor(h*v):Kn;p>Kn&&Re(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Kn}`);const g=[];let y=0;for(let R=0;R<Kn;++R){const _=R/v,E=Math.exp(-_*_/2);g.push(E),R===0?y+=E:R<p&&(y+=2*E)}for(let R=0;R<g.length;R++)g[R]=g[R]/y;u.envMap.value=e.texture,u.samples.value=p,u.weights.value=g,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:S}=this;u.dTheta.value=m,u.mipInt.value=S-i;const M=this._sizeLods[s],T=3*M*(s>S-An?s-S+An:0),w=4*(this._cubeSize-M);bs(t,T,w,3*M,2*M),l.setRenderTarget(t),l.render(d,br)}}function j_(n){const e=[],t=[],i=[];let s=n;const r=n-An+1+sd.length;for(let a=0;a<r;a++){const o=Math.pow(2,s);e.push(o);let l=1/o;a>n-An?l=sd[a-n+An-1]:a===0&&(l=0),t.push(l);const c=1/(o-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,m=6,v=3,p=2,g=1,y=new Float32Array(v*m*f),S=new Float32Array(p*m*f),M=new Float32Array(g*m*f);for(let w=0;w<f;w++){const R=w%3*2/3-1,_=w>2?0:-1,E=[R,_,0,R+2/3,_,0,R+2/3,_+1,0,R,_,0,R+2/3,_+1,0,R,_+1,0];y.set(E,v*m*w),S.set(u,p*m*w);const L=[w,w,w,w,w,w];M.set(L,g*m*w)}const T=new fi;T.setAttribute("position",new $t(y,v)),T.setAttribute("uv",new $t(S,p)),T.setAttribute("faceIndex",new $t(M,g)),i.push(new st(T,null)),s>An&&s--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function ad(n,e,t){const i=new Yt(n,e,t);return i.texture.mapping=Ro,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function bs(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function Y_(n,e,t){return new Nt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:X_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Uo(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Gt,depthTest:!1,depthWrite:!1})}function K_(n,e,t){const i=new Float32Array(Kn),s=new P(0,1,0);return new Nt({name:"SphericalGaussianBlur",defines:{n:Kn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Uo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Gt,depthTest:!1,depthWrite:!1})}function od(){return new Nt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Uo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Gt,depthTest:!1,depthWrite:!1})}function ld(){return new Nt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Uo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gt,depthTest:!1,depthWrite:!1})}function Uo(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class Zf extends Yt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new kf(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new nr(5,5,5),r=new Nt({name:"CubemapFromEquirect",uniforms:Ys(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Qt,blending:Gt});r.uniforms.tEquirect.value=t;const a=new st(s,r),o=t.minFilter;return t.minFilter===rn&&(t.minFilter=It),new G0(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){const r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,s);e.setRenderTarget(r)}}function Z_(n){let e=new WeakMap,t=new WeakMap,i=null;function s(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){const f=u.mapping;if(f===el||f===tl)if(e.has(u)){const m=e.get(u).texture;return o(m,u.mapping)}else{const m=u.image;if(m&&m.height>0){const v=new Zf(m.height);return v.fromEquirectangularTexture(n,u),e.set(u,v),u.addEventListener("dispose",c),o(v.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){const f=u.mapping,m=f===el||f===tl,v=f===ts||f===Gs;if(m||v){let p=t.get(u);const g=p!==void 0?p.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==g)return i===null&&(i=new Vc(n)),p=m?i.fromEquirectangular(u,p):i.fromCubemap(u,p),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),p.texture;if(p!==void 0)return p.texture;{const y=u.image;return m&&y&&y.height>0||v&&y&&l(y)?(i===null&&(i=new Vc(n)),p=m?i.fromEquirectangular(u):i.fromCubemap(u),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),u.addEventListener("dispose",h),p.texture):null}}}return u}function o(u,f){return f===el?u.mapping=ts:f===tl&&(u.mapping=Gs),u}function l(u){let f=0;const m=6;for(let v=0;v<m;v++)u[v]!==void 0&&f++;return f===m}function c(u){const f=u.target;f.removeEventListener("dispose",c);const m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function h(u){const f=u.target;f.removeEventListener("dispose",h);const m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:d}}function J_(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const s=n.getExtension(i);return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&po("WebGLRenderer: "+i+" extension not supported."),s}}}function Q_(n,e,t,i){const s={},r=new WeakMap;function a(d){const u=d.target;u.index!==null&&e.remove(u.index);for(const m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",a),delete s[u.id];const f=r.get(u);f&&(e.remove(f),r.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(d,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,t.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)e.update(u[f],n.ARRAY_BUFFER)}function c(d){const u=[],f=d.index,m=d.attributes.position;let v=0;if(m===void 0)return;if(f!==null){const y=f.array;v=f.version;for(let S=0,M=y.length;S<M;S+=3){const T=y[S+0],w=y[S+1],R=y[S+2];u.push(T,w,w,R,R,T)}}else{const y=m.array;v=m.version;for(let S=0,M=y.length/3-1;S<M;S+=3){const T=S+0,w=S+1,R=S+2;u.push(T,w,w,R,R,T)}}const p=new(m.count>=65535?Uf:Nf)(u,1);p.version=v;const g=r.get(d);g&&e.remove(g),r.set(d,p)}function h(d){const u=r.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function $_(n,e,t){let i;function s(u){i=u}let r,a;function o(u){r=u.type,a=u.bytesPerElement}function l(u,f){n.drawElements(i,f,r,u*a),t.update(f,i,1)}function c(u,f,m){m!==0&&(n.drawElementsInstanced(i,f,r,u*a,m),t.update(f,i,m))}function h(u,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,r,u,0,m);let p=0;for(let g=0;g<m;g++)p+=f[g];t.update(p,i,1)}function d(u,f,m,v){if(m===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<u.length;g++)c(u[g]/a,f[g],v[g]);else{p.multiDrawElementsInstancedWEBGL(i,f,0,r,u,0,v,0,m);let g=0;for(let y=0;y<m;y++)g+=f[y]*v[y];t.update(g,i,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function ey(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(r/3);break;case n.LINES:t.lines+=o*(r/2);break;case n.LINE_STRIP:t.lines+=o*(r-1);break;case n.LINE_LOOP:t.lines+=o*r;break;case n.POINTS:t.points+=o*r;break;default:Ue("WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function ty(n,e,t){const i=new WeakMap,s=new bt;function r(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let u=i.get(o);if(u===void 0||u.count!==d){let E=function(){R.dispose(),i.delete(o),o.removeEventListener("dispose",E)};u!==void 0&&u.texture.dispose();const f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],g=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let S=0;f===!0&&(S=1),m===!0&&(S=2),v===!0&&(S=3);let M=o.attributes.position.count*S,T=1;M>e.maxTextureSize&&(T=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);const w=new Float32Array(M*T*4*d),R=new Lf(w,M,T,d);R.type=ci,R.needsUpdate=!0;const _=S*4;for(let L=0;L<d;L++){const C=p[L],F=g[L],k=y[L],V=M*T*4*L;for(let W=0;W<C.count;W++){const z=W*_;f===!0&&(s.fromBufferAttribute(C,W),w[V+z+0]=s.x,w[V+z+1]=s.y,w[V+z+2]=s.z,w[V+z+3]=0),m===!0&&(s.fromBufferAttribute(F,W),w[V+z+4]=s.x,w[V+z+5]=s.y,w[V+z+6]=s.z,w[V+z+7]=0),v===!0&&(s.fromBufferAttribute(k,W),w[V+z+8]=s.x,w[V+z+9]=s.y,w[V+z+10]=s.z,w[V+z+11]=k.itemSize===4?s.w:1)}}u={count:d,texture:R,size:new De(M,T)},i.set(o,u),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let f=0;for(let v=0;v<c.length;v++)f+=c[v];const m=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(n,"morphTargetBaseInfluence",m),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",u.size)}return{update:r}}function iy(n,e,t,i,s){let r=new WeakMap;function a(c){const h=s.render.frame,d=c.geometry,u=e.get(c,d);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:a,dispose:o}}const ny={[mh]:"LINEAR_TONE_MAPPING",[gh]:"REINHARD_TONE_MAPPING",[vh]:"CINEON_TONE_MAPPING",[$r]:"ACES_FILMIC_TONE_MAPPING",[_h]:"AGX_TONE_MAPPING",[yh]:"NEUTRAL_TONE_MAPPING",[xh]:"CUSTOM_TONE_MAPPING"};function sy(n,e,t,i,s){const r=new Yt(e,t,{type:n,depthBuffer:i,stencilBuffer:s}),a=new Yt(e,t,{type:ei,depthBuffer:!1,stencilBuffer:!1}),o=new fi;o.setAttribute("position",new ui([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new ui([0,2,0,0,2,0],2));const l=new Hf({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new st(o,l),h=new ia(-1,1,1,-1,0,1);let d=null,u=null,f=!1,m,v=null,p=[],g=!1;this.setSize=function(y,S){r.setSize(y,S),a.setSize(y,S);for(let M=0;M<p.length;M++){const T=p[M];T.setSize&&T.setSize(y,S)}},this.setEffects=function(y){p=y,g=p.length>0&&p[0].isRenderPass===!0;const S=r.width,M=r.height;for(let T=0;T<p.length;T++){const w=p[T];w.setSize&&w.setSize(S,M)}},this.begin=function(y,S){if(f||y.toneMapping===Wi&&p.length===0)return!1;if(v=S,S!==null){const M=S.width,T=S.height;(r.width!==M||r.height!==T)&&this.setSize(M,T)}return g===!1&&y.setRenderTarget(r),m=y.toneMapping,y.toneMapping=Wi,!0},this.hasRenderPass=function(){return g},this.end=function(y,S){y.toneMapping=m,f=!0;let M=r,T=a;for(let w=0;w<p.length;w++){const R=p[w];if(R.enabled!==!1&&(R.render(y,T,M,S),R.needsSwap!==!1)){const _=M;M=T,T=_}}if(d!==y.outputColorSpace||u!==y.toneMapping){d=y.outputColorSpace,u=y.toneMapping,l.defines={},et.getTransfer(d)===lt&&(l.defines.SRGB_TRANSFER="");const w=ny[u];w&&(l.defines[w]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=M.texture,y.setRenderTarget(v),y.render(c,h),v=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){r.dispose(),a.dispose(),o.dispose(),l.dispose()}}const Jf=new Et,Hc=new js(1,1),Qf=new Lf,$f=new qg,ep=new kf,cd=[],hd=[],ud=new Float32Array(16),dd=new Float32Array(9),fd=new Float32Array(4);function lr(n,e,t){const i=n[0];if(i<=0||i>0)return n;const s=e*t;let r=cd[s];if(r===void 0&&(r=new Float32Array(s),cd[s]=r),e!==0){i.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(r,o)}return r}function Ft(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Bt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Oo(n,e){let t=hd[e];t===void 0&&(t=new Int32Array(e),hd[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function ry(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function ay(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;n.uniform2fv(this.addr,e),Bt(t,e)}}function oy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ft(t,e))return;n.uniform3fv(this.addr,e),Bt(t,e)}}function ly(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;n.uniform4fv(this.addr,e),Bt(t,e)}}function cy(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Ft(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Bt(t,e)}else{if(Ft(t,i))return;fd.set(i),n.uniformMatrix2fv(this.addr,!1,fd),Bt(t,i)}}function hy(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Ft(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Bt(t,e)}else{if(Ft(t,i))return;dd.set(i),n.uniformMatrix3fv(this.addr,!1,dd),Bt(t,i)}}function uy(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Ft(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Bt(t,e)}else{if(Ft(t,i))return;ud.set(i),n.uniformMatrix4fv(this.addr,!1,ud),Bt(t,i)}}function dy(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function fy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;n.uniform2iv(this.addr,e),Bt(t,e)}}function py(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ft(t,e))return;n.uniform3iv(this.addr,e),Bt(t,e)}}function my(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;n.uniform4iv(this.addr,e),Bt(t,e)}}function gy(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function vy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;n.uniform2uiv(this.addr,e),Bt(t,e)}}function xy(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ft(t,e))return;n.uniform3uiv(this.addr,e),Bt(t,e)}}function _y(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;n.uniform4uiv(this.addr,e),Bt(t,e)}}function yy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(Hc.compareFunction=t.isReversedDepthBuffer()?Ch:Ah,r=Hc):r=Jf,t.setTexture2D(e||r,s)}function My(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||$f,s)}function by(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||ep,s)}function Sy(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||Qf,s)}function Ty(n){switch(n){case 5126:return ry;case 35664:return ay;case 35665:return oy;case 35666:return ly;case 35674:return cy;case 35675:return hy;case 35676:return uy;case 5124:case 35670:return dy;case 35667:case 35671:return fy;case 35668:case 35672:return py;case 35669:case 35673:return my;case 5125:return gy;case 36294:return vy;case 36295:return xy;case 36296:return _y;case 35678:case 36198:case 36298:case 36306:case 35682:return yy;case 35679:case 36299:case 36307:return My;case 35680:case 36300:case 36308:case 36293:return by;case 36289:case 36303:case 36311:case 36292:return Sy}}function Ey(n,e){n.uniform1fv(this.addr,e)}function wy(n,e){const t=lr(e,this.size,2);n.uniform2fv(this.addr,t)}function Ay(n,e){const t=lr(e,this.size,3);n.uniform3fv(this.addr,t)}function Cy(n,e){const t=lr(e,this.size,4);n.uniform4fv(this.addr,t)}function Ry(n,e){const t=lr(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function Py(n,e){const t=lr(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function Dy(n,e){const t=lr(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function Ly(n,e){n.uniform1iv(this.addr,e)}function Iy(n,e){n.uniform2iv(this.addr,e)}function Ny(n,e){n.uniform3iv(this.addr,e)}function Uy(n,e){n.uniform4iv(this.addr,e)}function Oy(n,e){n.uniform1uiv(this.addr,e)}function Fy(n,e){n.uniform2uiv(this.addr,e)}function By(n,e){n.uniform3uiv(this.addr,e)}function ky(n,e){n.uniform4uiv(this.addr,e)}function zy(n,e,t){const i=this.cache,s=e.length,r=Oo(t,s);Ft(i,r)||(n.uniform1iv(this.addr,r),Bt(i,r));let a;this.type===n.SAMPLER_2D_SHADOW?a=Hc:a=Jf;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||a,r[o])}function Vy(n,e,t){const i=this.cache,s=e.length,r=Oo(t,s);Ft(i,r)||(n.uniform1iv(this.addr,r),Bt(i,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||$f,r[a])}function Hy(n,e,t){const i=this.cache,s=e.length,r=Oo(t,s);Ft(i,r)||(n.uniform1iv(this.addr,r),Bt(i,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||ep,r[a])}function Gy(n,e,t){const i=this.cache,s=e.length,r=Oo(t,s);Ft(i,r)||(n.uniform1iv(this.addr,r),Bt(i,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Qf,r[a])}function Wy(n){switch(n){case 5126:return Ey;case 35664:return wy;case 35665:return Ay;case 35666:return Cy;case 35674:return Ry;case 35675:return Py;case 35676:return Dy;case 5124:case 35670:return Ly;case 35667:case 35671:return Iy;case 35668:case 35672:return Ny;case 35669:case 35673:return Uy;case 5125:return Oy;case 36294:return Fy;case 36295:return By;case 36296:return ky;case 35678:case 36198:case 36298:case 36306:case 35682:return zy;case 35679:case 36299:case 36307:return Vy;case 35680:case 36300:case 36308:case 36293:return Hy;case 36289:case 36303:case 36311:case 36292:return Gy}}class Xy{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Ty(t.type)}}class qy{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Wy(t.type)}}class jy{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(e,t[o.id],i)}}}const Ul=/(\w+)(\])?(\[|\.)?/g;function pd(n,e){n.seq.push(e),n.map[e.id]=e}function Yy(n,e,t){const i=n.name,s=i.length;for(Ul.lastIndex=0;;){const r=Ul.exec(i),a=Ul.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){pd(t,c===void 0?new Xy(o,n,e):new qy(o,n,e));break}else{let d=t.map[o];d===void 0&&(d=new jy(o),pd(t,d)),t=d}}}class to{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){const o=e.getActiveUniform(t,a),l=e.getUniformLocation(t,o.name);Yy(o,l,this)}const s=[],r=[];for(const a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,i,s){const r=this.map[t];r!==void 0&&r.setValue(e,i,s)}setOptional(e,t,i){const s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let r=0,a=t.length;r!==a;++r){const o=t[r],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){const i=[];for(let s=0,r=e.length;s!==r;++s){const a=e[s];a.id in t&&i.push(a)}return i}}function md(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const Ky=37297;let Zy=0;function Jy(n,e){const t=n.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}const gd=new Xe;function Qy(n){et._getMatrix(gd,et.workingColorSpace,n);const e=`mat3( ${gd.elements.map(t=>t.toFixed(4))} )`;switch(et.getTransfer(n)){case uo:return[e,"LinearTransferOETF"];case lt:return[e,"sRGBTransferOETF"];default:return Re("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function vd(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=(n.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+Jy(n.getShaderSource(e),o)}else return r}function $y(n,e){const t=Qy(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const eM={[mh]:"Linear",[gh]:"Reinhard",[vh]:"Cineon",[$r]:"ACESFilmic",[_h]:"AgX",[yh]:"Neutral",[xh]:"Custom"};function tM(n,e){const t=eM[e];return t===void 0?(Re("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Fa=new P;function iM(){et.getLuminanceCoefficients(Fa);const n=Fa.x.toFixed(4),e=Fa.y.toFixed(4),t=Fa.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function nM(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Lr).join(`
`)}function sM(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function rM(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(e,s),a=r.name;let o=1;r.type===n.FLOAT_MAT2&&(o=2),r.type===n.FLOAT_MAT3&&(o=3),r.type===n.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function Lr(n){return n!==""}function xd(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function _d(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const aM=/^[ \t]*#include +<([\w\d./]+)>/gm;function Gc(n){return n.replace(aM,lM)}const oM=new Map;function lM(n,e){let t=We[e];if(t===void 0){const i=oM.get(e);if(i!==void 0)t=We[i],Re('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Gc(t)}const cM=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function yd(n){return n.replace(cM,hM)}function hM(n,e,t,i){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Md(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const uM={[Ka]:"SHADOWMAP_TYPE_PCF",[Pr]:"SHADOWMAP_TYPE_VSM"};function dM(n){return uM[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const fM={[ts]:"ENVMAP_TYPE_CUBE",[Gs]:"ENVMAP_TYPE_CUBE",[Ro]:"ENVMAP_TYPE_CUBE_UV"};function pM(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":fM[n.envMapMode]||"ENVMAP_TYPE_CUBE"}const mM={[Gs]:"ENVMAP_MODE_REFRACTION"};function gM(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":mM[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const vM={[ph]:"ENVMAP_BLENDING_MULTIPLY",[ag]:"ENVMAP_BLENDING_MIX",[og]:"ENVMAP_BLENDING_ADD"};function xM(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":vM[n.combine]||"ENVMAP_BLENDING_NONE"}function _M(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function yM(n,e,t,i){const s=n.getContext(),r=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=dM(t),c=pM(t),h=gM(t),d=xM(t),u=_M(t),f=nM(t),m=sM(r),v=s.createProgram();let p,g,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Lr).join(`
`),p.length>0&&(p+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Lr).join(`
`),g.length>0&&(g+=`
`)):(p=[Md(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Lr).join(`
`),g=[Md(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Wi?"#define TONE_MAPPING":"",t.toneMapping!==Wi?We.tonemapping_pars_fragment:"",t.toneMapping!==Wi?tM("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",We.colorspace_pars_fragment,$y("linearToOutputTexel",t.outputColorSpace),iM(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Lr).join(`
`)),a=Gc(a),a=xd(a,t),a=_d(a,t),o=Gc(o),o=xd(o,t),o=_d(o,t),a=yd(a),o=yd(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,g=["#define varying in",t.glslVersion===xu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===xu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const S=y+p+a,M=y+g+o,T=md(s,s.VERTEX_SHADER,S),w=md(s,s.FRAGMENT_SHADER,M);s.attachShader(v,T),s.attachShader(v,w),t.index0AttributeName!==void 0?s.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(v,0,"position"),s.linkProgram(v);function R(C){if(n.debug.checkShaderErrors){const F=s.getProgramInfoLog(v)||"",k=s.getShaderInfoLog(T)||"",V=s.getShaderInfoLog(w)||"",W=F.trim(),z=k.trim(),B=V.trim();let ie=!0,K=!0;if(s.getProgramParameter(v,s.LINK_STATUS)===!1)if(ie=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,v,T,w);else{const ce=vd(s,T,"vertex"),de=vd(s,w,"fragment");Ue("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(v,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+W+`
`+ce+`
`+de)}else W!==""?Re("WebGLProgram: Program Info Log:",W):(z===""||B==="")&&(K=!1);K&&(C.diagnostics={runnable:ie,programLog:W,vertexShader:{log:z,prefix:p},fragmentShader:{log:B,prefix:g}})}s.deleteShader(T),s.deleteShader(w),_=new to(s,v),E=rM(s,v)}let _;this.getUniforms=function(){return _===void 0&&R(this),_};let E;this.getAttributes=function(){return E===void 0&&R(this),E};let L=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=s.getProgramParameter(v,Ky)),L},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(v),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Zy++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=T,this.fragmentShader=w,this}let MM=0;class bM{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new SM(e),t.set(e,i)),i}}class SM{constructor(e){this.id=MM++,this.code=e,this.usedTimes=0}}function TM(n,e,t,i,s,r){const a=new Dh,o=new bM,l=new Set,c=[],h=new Map,d=i.logarithmicDepthBuffer;let u=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(_){return l.add(_),_===0?"uv":`uv${_}`}function v(_,E,L,C,F){const k=C.fog,V=F.geometry,W=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?C.environment:null,z=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,B=e.get(_.envMap||W,z),ie=B&&B.mapping===Ro?B.image.height:null,K=f[_.type];_.precision!==null&&(u=i.getMaxPrecision(_.precision),u!==_.precision&&Re("WebGLProgram.getParameters:",_.precision,"not supported, using",u,"instead."));const ce=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,de=ce!==void 0?ce.length:0;let ue=0;V.morphAttributes.position!==void 0&&(ue=1),V.morphAttributes.normal!==void 0&&(ue=2),V.morphAttributes.color!==void 0&&(ue=3);let Ne,tt,Qe,Z;if(K){const ct=Fi[K];Ne=ct.vertexShader,tt=ct.fragmentShader}else Ne=_.vertexShader,tt=_.fragmentShader,o.update(_),Qe=o.getVertexShaderID(_),Z=o.getFragmentShaderID(_);const ne=n.getRenderTarget(),se=n.state.buffers.depth.getReversed(),Se=F.isInstancedMesh===!0,Me=F.isBatchedMesh===!0,Le=!!_.map,Tt=!!_.matcap,Ge=!!B,je=!!_.aoMap,it=!!_.lightMap,ke=!!_.bumpMap,dt=!!_.normalMap,D=!!_.displacementMap,_t=!!_.emissiveMap,$e=!!_.metalnessMap,rt=!!_.roughnessMap,_e=_.anisotropy>0,A=_.clearcoat>0,x=_.dispersion>0,U=_.iridescence>0,J=_.sheen>0,$=_.transmission>0,q=_e&&!!_.anisotropyMap,pe=A&&!!_.clearcoatMap,N=A&&!!_.clearcoatNormalMap,G=A&&!!_.clearcoatRoughnessMap,oe=U&&!!_.iridescenceMap,Q=U&&!!_.iridescenceThicknessMap,ee=J&&!!_.sheenColorMap,fe=J&&!!_.sheenRoughnessMap,me=!!_.specularMap,he=!!_.specularColorMap,Oe=!!_.specularIntensityMap,I=$&&!!_.transmissionMap,le=$&&!!_.thicknessMap,re=!!_.gradientMap,be=!!_.alphaMap,ae=_.alphaTest>0,Y=!!_.alphaHash,Te=!!_.extensions;let Ve=Wi;_.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(Ve=n.toneMapping);const yt={shaderID:K,shaderType:_.type,shaderName:_.name,vertexShader:Ne,fragmentShader:tt,defines:_.defines,customVertexShaderID:Qe,customFragmentShaderID:Z,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:u,batching:Me,batchingColor:Me&&F._colorsTexture!==null,instancing:Se,instancingColor:Se&&F.instanceColor!==null,instancingMorph:Se&&F.morphTexture!==null,outputColorSpace:ne===null?n.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:ti,alphaToCoverage:!!_.alphaToCoverage,map:Le,matcap:Tt,envMap:Ge,envMapMode:Ge&&B.mapping,envMapCubeUVHeight:ie,aoMap:je,lightMap:it,bumpMap:ke,normalMap:dt,displacementMap:D,emissiveMap:_t,normalMapObjectSpace:dt&&_.normalMapType===fg,normalMapTangentSpace:dt&&_.normalMapType===Do,metalnessMap:$e,roughnessMap:rt,anisotropy:_e,anisotropyMap:q,clearcoat:A,clearcoatMap:pe,clearcoatNormalMap:N,clearcoatRoughnessMap:G,dispersion:x,iridescence:U,iridescenceMap:oe,iridescenceThicknessMap:Q,sheen:J,sheenColorMap:ee,sheenRoughnessMap:fe,specularMap:me,specularColorMap:he,specularIntensityMap:Oe,transmission:$,transmissionMap:I,thicknessMap:le,gradientMap:re,opaque:_.transparent===!1&&_.blending===Us&&_.alphaToCoverage===!1,alphaMap:be,alphaTest:ae,alphaHash:Y,combine:_.combine,mapUv:Le&&m(_.map.channel),aoMapUv:je&&m(_.aoMap.channel),lightMapUv:it&&m(_.lightMap.channel),bumpMapUv:ke&&m(_.bumpMap.channel),normalMapUv:dt&&m(_.normalMap.channel),displacementMapUv:D&&m(_.displacementMap.channel),emissiveMapUv:_t&&m(_.emissiveMap.channel),metalnessMapUv:$e&&m(_.metalnessMap.channel),roughnessMapUv:rt&&m(_.roughnessMap.channel),anisotropyMapUv:q&&m(_.anisotropyMap.channel),clearcoatMapUv:pe&&m(_.clearcoatMap.channel),clearcoatNormalMapUv:N&&m(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:G&&m(_.clearcoatRoughnessMap.channel),iridescenceMapUv:oe&&m(_.iridescenceMap.channel),iridescenceThicknessMapUv:Q&&m(_.iridescenceThicknessMap.channel),sheenColorMapUv:ee&&m(_.sheenColorMap.channel),sheenRoughnessMapUv:fe&&m(_.sheenRoughnessMap.channel),specularMapUv:me&&m(_.specularMap.channel),specularColorMapUv:he&&m(_.specularColorMap.channel),specularIntensityMapUv:Oe&&m(_.specularIntensityMap.channel),transmissionMapUv:I&&m(_.transmissionMap.channel),thicknessMapUv:le&&m(_.thicknessMap.channel),alphaMapUv:be&&m(_.alphaMap.channel),vertexTangents:!!V.attributes.tangent&&(dt||_e),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!V.attributes.uv&&(Le||be),fog:!!k,useFog:_.fog===!0,fogExp2:!!k&&k.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||V.attributes.normal===void 0&&dt===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:se,skinning:F.isSkinnedMesh===!0,morphTargets:V.morphAttributes.position!==void 0,morphNormals:V.morphAttributes.normal!==void 0,morphColors:V.morphAttributes.color!==void 0,morphTargetsCount:de,morphTextureStride:ue,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&L.length>0,shadowMapType:n.shadowMap.type,toneMapping:Ve,decodeVideoTexture:Le&&_.map.isVideoTexture===!0&&et.getTransfer(_.map.colorSpace)===lt,decodeVideoTextureEmissive:_t&&_.emissiveMap.isVideoTexture===!0&&et.getTransfer(_.emissiveMap.colorSpace)===lt,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Bi,flipSided:_.side===Qt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Te&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Te&&_.extensions.multiDraw===!0||Me)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return yt.vertexUv1s=l.has(1),yt.vertexUv2s=l.has(2),yt.vertexUv3s=l.has(3),l.clear(),yt}function p(_){const E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(const L in _.defines)E.push(L),E.push(_.defines[L]);return _.isRawShaderMaterial===!1&&(g(E,_),y(E,_),E.push(n.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function g(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapCubeUVHeight),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.morphAttributeCount),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function y(_,E){a.disableAll(),E.instancing&&a.enable(0),E.instancingColor&&a.enable(1),E.instancingMorph&&a.enable(2),E.matcap&&a.enable(3),E.envMap&&a.enable(4),E.normalMapObjectSpace&&a.enable(5),E.normalMapTangentSpace&&a.enable(6),E.clearcoat&&a.enable(7),E.iridescence&&a.enable(8),E.alphaTest&&a.enable(9),E.vertexColors&&a.enable(10),E.vertexAlphas&&a.enable(11),E.vertexUv1s&&a.enable(12),E.vertexUv2s&&a.enable(13),E.vertexUv3s&&a.enable(14),E.vertexTangents&&a.enable(15),E.anisotropy&&a.enable(16),E.alphaHash&&a.enable(17),E.batching&&a.enable(18),E.dispersion&&a.enable(19),E.batchingColor&&a.enable(20),E.gradientMap&&a.enable(21),_.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reversedDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),_.push(a.mask)}function S(_){const E=f[_.type];let L;if(E){const C=Fi[E];L=Ai.clone(C.uniforms)}else L=_.uniforms;return L}function M(_,E){let L=h.get(E);return L!==void 0?++L.usedTimes:(L=new yM(n,E,_,s),c.push(L),h.set(E,L)),L}function T(_){if(--_.usedTimes===0){const E=c.indexOf(_);c[E]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function w(_){o.remove(_)}function R(){o.dispose()}return{getParameters:v,getProgramCacheKey:p,getUniforms:S,acquireProgram:M,releaseProgram:T,releaseShaderCache:w,programs:c,dispose:R}}function EM(){let n=new WeakMap;function e(a){return n.has(a)}function t(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function s(a,o,l){n.get(a)[o]=l}function r(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:r}}function wM(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function bd(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Sd(){const n=[];let e=0;const t=[],i=[],s=[];function r(){e=0,t.length=0,i.length=0,s.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,m,v,p,g){let y=n[e];return y===void 0?(y={id:u.id,object:u,geometry:f,material:m,materialVariant:a(u),groupOrder:v,renderOrder:u.renderOrder,z:p,group:g},n[e]=y):(y.id=u.id,y.object=u,y.geometry=f,y.material=m,y.materialVariant=a(u),y.groupOrder=v,y.renderOrder=u.renderOrder,y.z=p,y.group=g),e++,y}function l(u,f,m,v,p,g){const y=o(u,f,m,v,p,g);m.transmission>0?i.push(y):m.transparent===!0?s.push(y):t.push(y)}function c(u,f,m,v,p,g){const y=o(u,f,m,v,p,g);m.transmission>0?i.unshift(y):m.transparent===!0?s.unshift(y):t.unshift(y)}function h(u,f){t.length>1&&t.sort(u||wM),i.length>1&&i.sort(f||bd),s.length>1&&s.sort(f||bd)}function d(){for(let u=e,f=n.length;u<f;u++){const m=n[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function AM(){let n=new WeakMap;function e(i,s){const r=n.get(i);let a;return r===void 0?(a=new Sd,n.set(i,[a])):s>=r.length?(a=new Sd,r.push(a)):a=r[s],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function CM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new Ae};break;case"SpotLight":t={position:new P,direction:new P,color:new Ae,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new Ae,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new Ae,groundColor:new Ae};break;case"RectAreaLight":t={color:new Ae,position:new P,halfWidth:new P,halfHeight:new P};break}return n[e.id]=t,t}}}function RM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new De};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new De};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new De,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let PM=0;function DM(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function LM(n){const e=new CM,t=RM(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new P);const s=new P,r=new ze,a=new ze;function o(c){let h=0,d=0,u=0;for(let E=0;E<9;E++)i.probe[E].set(0,0,0);let f=0,m=0,v=0,p=0,g=0,y=0,S=0,M=0,T=0,w=0,R=0;c.sort(DM);for(let E=0,L=c.length;E<L;E++){const C=c[E],F=C.color,k=C.intensity,V=C.distance;let W=null;if(C.shadow&&C.shadow.map&&(C.shadow.map.texture.format===Xs?W=C.shadow.map.texture:W=C.shadow.map.depthTexture||C.shadow.map.texture),C.isAmbientLight)h+=F.r*k,d+=F.g*k,u+=F.b*k;else if(C.isLightProbe){for(let z=0;z<9;z++)i.probe[z].addScaledVector(C.sh.coefficients[z],k);R++}else if(C.isDirectionalLight){const z=e.get(C);if(z.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const B=C.shadow,ie=t.get(C);ie.shadowIntensity=B.intensity,ie.shadowBias=B.bias,ie.shadowNormalBias=B.normalBias,ie.shadowRadius=B.radius,ie.shadowMapSize=B.mapSize,i.directionalShadow[f]=ie,i.directionalShadowMap[f]=W,i.directionalShadowMatrix[f]=C.shadow.matrix,y++}i.directional[f]=z,f++}else if(C.isSpotLight){const z=e.get(C);z.position.setFromMatrixPosition(C.matrixWorld),z.color.copy(F).multiplyScalar(k),z.distance=V,z.coneCos=Math.cos(C.angle),z.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),z.decay=C.decay,i.spot[v]=z;const B=C.shadow;if(C.map&&(i.spotLightMap[T]=C.map,T++,B.updateMatrices(C),C.castShadow&&w++),i.spotLightMatrix[v]=B.matrix,C.castShadow){const ie=t.get(C);ie.shadowIntensity=B.intensity,ie.shadowBias=B.bias,ie.shadowNormalBias=B.normalBias,ie.shadowRadius=B.radius,ie.shadowMapSize=B.mapSize,i.spotShadow[v]=ie,i.spotShadowMap[v]=W,M++}v++}else if(C.isRectAreaLight){const z=e.get(C);z.color.copy(F).multiplyScalar(k),z.halfWidth.set(C.width*.5,0,0),z.halfHeight.set(0,C.height*.5,0),i.rectArea[p]=z,p++}else if(C.isPointLight){const z=e.get(C);if(z.color.copy(C.color).multiplyScalar(C.intensity),z.distance=C.distance,z.decay=C.decay,C.castShadow){const B=C.shadow,ie=t.get(C);ie.shadowIntensity=B.intensity,ie.shadowBias=B.bias,ie.shadowNormalBias=B.normalBias,ie.shadowRadius=B.radius,ie.shadowMapSize=B.mapSize,ie.shadowCameraNear=B.camera.near,ie.shadowCameraFar=B.camera.far,i.pointShadow[m]=ie,i.pointShadowMap[m]=W,i.pointShadowMatrix[m]=C.shadow.matrix,S++}i.point[m]=z,m++}else if(C.isHemisphereLight){const z=e.get(C);z.skyColor.copy(C.color).multiplyScalar(k),z.groundColor.copy(C.groundColor).multiplyScalar(k),i.hemi[g]=z,g++}}p>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ge.LTC_FLOAT_1,i.rectAreaLTC2=ge.LTC_FLOAT_2):(i.rectAreaLTC1=ge.LTC_HALF_1,i.rectAreaLTC2=ge.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=u;const _=i.hash;(_.directionalLength!==f||_.pointLength!==m||_.spotLength!==v||_.rectAreaLength!==p||_.hemiLength!==g||_.numDirectionalShadows!==y||_.numPointShadows!==S||_.numSpotShadows!==M||_.numSpotMaps!==T||_.numLightProbes!==R)&&(i.directional.length=f,i.spot.length=v,i.rectArea.length=p,i.point.length=m,i.hemi.length=g,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=S,i.pointShadowMap.length=S,i.spotShadow.length=M,i.spotShadowMap.length=M,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=S,i.spotLightMatrix.length=M+T-w,i.spotLightMap.length=T,i.numSpotLightShadowsWithMaps=w,i.numLightProbes=R,_.directionalLength=f,_.pointLength=m,_.spotLength=v,_.rectAreaLength=p,_.hemiLength=g,_.numDirectionalShadows=y,_.numPointShadows=S,_.numSpotShadows=M,_.numSpotMaps=T,_.numLightProbes=R,i.version=PM++)}function l(c,h){let d=0,u=0,f=0,m=0,v=0;const p=h.matrixWorldInverse;for(let g=0,y=c.length;g<y;g++){const S=c[g];if(S.isDirectionalLight){const M=i.directional[d];M.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(p),d++}else if(S.isSpotLight){const M=i.spot[f];M.position.setFromMatrixPosition(S.matrixWorld),M.position.applyMatrix4(p),M.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(p),f++}else if(S.isRectAreaLight){const M=i.rectArea[m];M.position.setFromMatrixPosition(S.matrixWorld),M.position.applyMatrix4(p),a.identity(),r.copy(S.matrixWorld),r.premultiply(p),a.extractRotation(r),M.halfWidth.set(S.width*.5,0,0),M.halfHeight.set(0,S.height*.5,0),M.halfWidth.applyMatrix4(a),M.halfHeight.applyMatrix4(a),m++}else if(S.isPointLight){const M=i.point[u];M.position.setFromMatrixPosition(S.matrixWorld),M.position.applyMatrix4(p),u++}else if(S.isHemisphereLight){const M=i.hemi[v];M.direction.setFromMatrixPosition(S.matrixWorld),M.direction.transformDirection(p),v++}}}return{setup:o,setupView:l,state:i}}function Td(n){const e=new LM(n),t=[],i=[];function s(h){c.camera=h,t.length=0,i.length=0}function r(h){t.push(h)}function a(h){i.push(h)}function o(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function IM(n){let e=new WeakMap;function t(s,r=0){const a=e.get(s);let o;return a===void 0?(o=new Td(n),e.set(s,[o])):r>=a.length?(o=new Td(n),a.push(o)):o=a[r],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const NM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,UM=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,OM=[new P(1,0,0),new P(-1,0,0),new P(0,1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1)],FM=[new P(0,-1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1),new P(0,-1,0),new P(0,-1,0)],Ed=new ze,Sr=new P,Ol=new P;function BM(n,e,t){let i=new ea;const s=new De,r=new De,a=new bt,o=new Gf,l=new b0,c={},h=t.maxTextureSize,d={[Xi]:Qt,[Qt]:Xi,[Bi]:Bi},u=new Nt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new De},radius:{value:4}},vertexShader:NM,fragmentShader:UM}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const m=new fi;m.setAttribute("position",new $t(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new st(m,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ka;let g=this.type;this.render=function(w,R,_){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===xf&&(Re("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Ka);const E=n.getRenderTarget(),L=n.getActiveCubeFace(),C=n.getActiveMipmapLevel(),F=n.state;F.setBlending(Gt),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const k=g!==this.type;k&&R.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(W=>W.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,W=w.length;V<W;V++){const z=w[V],B=z.shadow;if(B===void 0){Re("WebGLShadowMap:",z,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;s.copy(B.mapSize);const ie=B.getFrameExtents();s.multiply(ie),r.copy(B.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ie.x),s.x=r.x*ie.x,B.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ie.y),s.y=r.y*ie.y,B.mapSize.y=r.y));const K=n.state.buffers.depth.getReversed();if(B.camera._reversedDepth=K,B.map===null||k===!0){if(B.map!==null&&(B.map.depthTexture!==null&&(B.map.depthTexture.dispose(),B.map.depthTexture=null),B.map.dispose()),this.type===Pr){if(z.isPointLight){Re("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}B.map=new Yt(s.x,s.y,{format:Xs,type:ei,minFilter:It,magFilter:It,generateMipmaps:!1}),B.map.texture.name=z.name+".shadowMap",B.map.depthTexture=new js(s.x,s.y,ci),B.map.depthTexture.name=z.name+".shadowMapDepth",B.map.depthTexture.format=cn,B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=St,B.map.depthTexture.magFilter=St}else z.isPointLight?(B.map=new Zf(s.x),B.map.depthTexture=new g0(s.x,qi)):(B.map=new Yt(s.x,s.y),B.map.depthTexture=new js(s.x,s.y,qi)),B.map.depthTexture.name=z.name+".shadowMap",B.map.depthTexture.format=cn,this.type===Ka?(B.map.depthTexture.compareFunction=K?Ch:Ah,B.map.depthTexture.minFilter=It,B.map.depthTexture.magFilter=It):(B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=St,B.map.depthTexture.magFilter=St);B.camera.updateProjectionMatrix()}const ce=B.map.isWebGLCubeRenderTarget?6:1;for(let de=0;de<ce;de++){if(B.map.isWebGLCubeRenderTarget)n.setRenderTarget(B.map,de),n.clear();else{de===0&&(n.setRenderTarget(B.map),n.clear());const ue=B.getViewport(de);a.set(r.x*ue.x,r.y*ue.y,r.x*ue.z,r.y*ue.w),F.viewport(a)}if(z.isPointLight){const ue=B.camera,Ne=B.matrix,tt=z.distance||ue.far;tt!==ue.far&&(ue.far=tt,ue.updateProjectionMatrix()),Sr.setFromMatrixPosition(z.matrixWorld),ue.position.copy(Sr),Ol.copy(ue.position),Ol.add(OM[de]),ue.up.copy(FM[de]),ue.lookAt(Ol),ue.updateMatrixWorld(),Ne.makeTranslation(-Sr.x,-Sr.y,-Sr.z),Ed.multiplyMatrices(ue.projectionMatrix,ue.matrixWorldInverse),B._frustum.setFromProjectionMatrix(Ed,ue.coordinateSystem,ue.reversedDepth)}else B.updateMatrices(z);i=B.getFrustum(),M(R,_,B.camera,z,this.type)}B.isPointLightShadow!==!0&&this.type===Pr&&y(B,_),B.needsUpdate=!1}g=this.type,p.needsUpdate=!1,n.setRenderTarget(E,L,C)};function y(w,R){const _=e.update(v);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new Yt(s.x,s.y,{format:Xs,type:ei})),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(R,null,_,u,v,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(R,null,_,f,v,null)}function S(w,R,_,E){let L=null;const C=_.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(C!==void 0)L=C;else if(L=_.isPointLight===!0?l:o,n.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const F=L.uuid,k=R.uuid;let V=c[F];V===void 0&&(V={},c[F]=V);let W=V[k];W===void 0&&(W=L.clone(),V[k]=W,R.addEventListener("dispose",T)),L=W}if(L.visible=R.visible,L.wireframe=R.wireframe,E===Pr?L.side=R.shadowSide!==null?R.shadowSide:R.side:L.side=R.shadowSide!==null?R.shadowSide:d[R.side],L.alphaMap=R.alphaMap,L.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,L.map=R.map,L.clipShadows=R.clipShadows,L.clippingPlanes=R.clippingPlanes,L.clipIntersection=R.clipIntersection,L.displacementMap=R.displacementMap,L.displacementScale=R.displacementScale,L.displacementBias=R.displacementBias,L.wireframeLinewidth=R.wireframeLinewidth,L.linewidth=R.linewidth,_.isPointLight===!0&&L.isMeshDistanceMaterial===!0){const F=n.properties.get(L);F.light=_}return L}function M(w,R,_,E,L){if(w.visible===!1)return;if(w.layers.test(R.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&L===Pr)&&(!w.frustumCulled||i.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,w.matrixWorld);const k=e.update(w),V=w.material;if(Array.isArray(V)){const W=k.groups;for(let z=0,B=W.length;z<B;z++){const ie=W[z],K=V[ie.materialIndex];if(K&&K.visible){const ce=S(w,K,E,L);w.onBeforeShadow(n,w,R,_,k,ce,ie),n.renderBufferDirect(_,null,k,ce,w,ie),w.onAfterShadow(n,w,R,_,k,ce,ie)}}}else if(V.visible){const W=S(w,V,E,L);w.onBeforeShadow(n,w,R,_,k,W,null),n.renderBufferDirect(_,null,k,W,w,null),w.onAfterShadow(n,w,R,_,k,W,null)}}const F=w.children;for(let k=0,V=F.length;k<V;k++)M(F[k],R,_,E,L)}function T(w){w.target.removeEventListener("dispose",T);for(const _ in c){const E=c[_],L=w.target.uuid;L in E&&(E[L].dispose(),delete E[L])}}}function kM(n,e){function t(){let I=!1;const le=new bt;let re=null;const be=new bt(0,0,0,0);return{setMask:function(ae){re!==ae&&!I&&(n.colorMask(ae,ae,ae,ae),re=ae)},setLocked:function(ae){I=ae},setClear:function(ae,Y,Te,Ve,yt){yt===!0&&(ae*=Ve,Y*=Ve,Te*=Ve),le.set(ae,Y,Te,Ve),be.equals(le)===!1&&(n.clearColor(ae,Y,Te,Ve),be.copy(le))},reset:function(){I=!1,re=null,be.set(-1,0,0,0)}}}function i(){let I=!1,le=!1,re=null,be=null,ae=null;return{setReversed:function(Y){if(le!==Y){const Te=e.get("EXT_clip_control");Y?Te.clipControlEXT(Te.LOWER_LEFT_EXT,Te.ZERO_TO_ONE_EXT):Te.clipControlEXT(Te.LOWER_LEFT_EXT,Te.NEGATIVE_ONE_TO_ONE_EXT),le=Y;const Ve=ae;ae=null,this.setClear(Ve)}},getReversed:function(){return le},setTest:function(Y){Y?ne(n.DEPTH_TEST):se(n.DEPTH_TEST)},setMask:function(Y){re!==Y&&!I&&(n.depthMask(Y),re=Y)},setFunc:function(Y){if(le&&(Y=Tg[Y]),be!==Y){switch(Y){case Jl:n.depthFunc(n.NEVER);break;case Ql:n.depthFunc(n.ALWAYS);break;case $l:n.depthFunc(n.LESS);break;case Hs:n.depthFunc(n.LEQUAL);break;case ec:n.depthFunc(n.EQUAL);break;case tc:n.depthFunc(n.GEQUAL);break;case ic:n.depthFunc(n.GREATER);break;case nc:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}be=Y}},setLocked:function(Y){I=Y},setClear:function(Y){ae!==Y&&(ae=Y,le&&(Y=1-Y),n.clearDepth(Y))},reset:function(){I=!1,re=null,be=null,ae=null,le=!1}}}function s(){let I=!1,le=null,re=null,be=null,ae=null,Y=null,Te=null,Ve=null,yt=null;return{setTest:function(ct){I||(ct?ne(n.STENCIL_TEST):se(n.STENCIL_TEST))},setMask:function(ct){le!==ct&&!I&&(n.stencilMask(ct),le=ct)},setFunc:function(ct,Ki,Zi){(re!==ct||be!==Ki||ae!==Zi)&&(n.stencilFunc(ct,Ki,Zi),re=ct,be=Ki,ae=Zi)},setOp:function(ct,Ki,Zi){(Y!==ct||Te!==Ki||Ve!==Zi)&&(n.stencilOp(ct,Ki,Zi),Y=ct,Te=Ki,Ve=Zi)},setLocked:function(ct){I=ct},setClear:function(ct){yt!==ct&&(n.clearStencil(ct),yt=ct)},reset:function(){I=!1,le=null,re=null,be=null,ae=null,Y=null,Te=null,Ve=null,yt=null}}}const r=new t,a=new i,o=new s,l=new WeakMap,c=new WeakMap;let h={},d={},u=new WeakMap,f=[],m=null,v=!1,p=null,g=null,y=null,S=null,M=null,T=null,w=null,R=new Ae(0,0,0),_=0,E=!1,L=null,C=null,F=null,k=null,V=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let z=!1,B=0;const ie=n.getParameter(n.VERSION);ie.indexOf("WebGL")!==-1?(B=parseFloat(/^WebGL (\d)/.exec(ie)[1]),z=B>=1):ie.indexOf("OpenGL ES")!==-1&&(B=parseFloat(/^OpenGL ES (\d)/.exec(ie)[1]),z=B>=2);let K=null,ce={};const de=n.getParameter(n.SCISSOR_BOX),ue=n.getParameter(n.VIEWPORT),Ne=new bt().fromArray(de),tt=new bt().fromArray(ue);function Qe(I,le,re,be){const ae=new Uint8Array(4),Y=n.createTexture();n.bindTexture(I,Y),n.texParameteri(I,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(I,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Te=0;Te<re;Te++)I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?n.texImage3D(le,0,n.RGBA,1,1,be,0,n.RGBA,n.UNSIGNED_BYTE,ae):n.texImage2D(le+Te,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ae);return Y}const Z={};Z[n.TEXTURE_2D]=Qe(n.TEXTURE_2D,n.TEXTURE_2D,1),Z[n.TEXTURE_CUBE_MAP]=Qe(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[n.TEXTURE_2D_ARRAY]=Qe(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Z[n.TEXTURE_3D]=Qe(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ne(n.DEPTH_TEST),a.setFunc(Hs),ke(!1),dt(lu),ne(n.CULL_FACE),je(Gt);function ne(I){h[I]!==!0&&(n.enable(I),h[I]=!0)}function se(I){h[I]!==!1&&(n.disable(I),h[I]=!1)}function Se(I,le){return d[I]!==le?(n.bindFramebuffer(I,le),d[I]=le,I===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=le),I===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=le),!0):!1}function Me(I,le){let re=f,be=!1;if(I){re=u.get(le),re===void 0&&(re=[],u.set(le,re));const ae=I.textures;if(re.length!==ae.length||re[0]!==n.COLOR_ATTACHMENT0){for(let Y=0,Te=ae.length;Y<Te;Y++)re[Y]=n.COLOR_ATTACHMENT0+Y;re.length=ae.length,be=!0}}else re[0]!==n.BACK&&(re[0]=n.BACK,be=!0);be&&n.drawBuffers(re)}function Le(I){return m!==I?(n.useProgram(I),m=I,!0):!1}const Tt={[ki]:n.FUNC_ADD,[jm]:n.FUNC_SUBTRACT,[Ym]:n.FUNC_REVERSE_SUBTRACT};Tt[Km]=n.MIN,Tt[Zm]=n.MAX;const Ge={[Zl]:n.ZERO,[_f]:n.ONE,[Jm]:n.SRC_COLOR,[co]:n.SRC_ALPHA,[tg]:n.SRC_ALPHA_SATURATE,[Mf]:n.DST_COLOR,[yf]:n.DST_ALPHA,[Qm]:n.ONE_MINUS_SRC_COLOR,[zr]:n.ONE_MINUS_SRC_ALPHA,[eg]:n.ONE_MINUS_DST_COLOR,[$m]:n.ONE_MINUS_DST_ALPHA,[ig]:n.CONSTANT_COLOR,[ng]:n.ONE_MINUS_CONSTANT_COLOR,[sg]:n.CONSTANT_ALPHA,[rg]:n.ONE_MINUS_CONSTANT_ALPHA};function je(I,le,re,be,ae,Y,Te,Ve,yt,ct){if(I===Gt){v===!0&&(se(n.BLEND),v=!1);return}if(v===!1&&(ne(n.BLEND),v=!0),I!==fh){if(I!==p||ct!==E){if((g!==ki||M!==ki)&&(n.blendEquation(n.FUNC_ADD),g=ki,M=ki),ct)switch(I){case Us:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case cu:n.blendFunc(n.ONE,n.ONE);break;case hu:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case uu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Ue("WebGLState: Invalid blending: ",I);break}else switch(I){case Us:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case cu:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case hu:Ue("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case uu:Ue("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ue("WebGLState: Invalid blending: ",I);break}y=null,S=null,T=null,w=null,R.set(0,0,0),_=0,p=I,E=ct}return}ae=ae||le,Y=Y||re,Te=Te||be,(le!==g||ae!==M)&&(n.blendEquationSeparate(Tt[le],Tt[ae]),g=le,M=ae),(re!==y||be!==S||Y!==T||Te!==w)&&(n.blendFuncSeparate(Ge[re],Ge[be],Ge[Y],Ge[Te]),y=re,S=be,T=Y,w=Te),(Ve.equals(R)===!1||yt!==_)&&(n.blendColor(Ve.r,Ve.g,Ve.b,yt),R.copy(Ve),_=yt),p=I,E=!1}function it(I,le){I.side===Bi?se(n.CULL_FACE):ne(n.CULL_FACE);let re=I.side===Qt;le&&(re=!re),ke(re),I.blending===Us&&I.transparent===!1?je(Gt):je(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),a.setFunc(I.depthFunc),a.setTest(I.depthTest),a.setMask(I.depthWrite),r.setMask(I.colorWrite);const be=I.stencilWrite;o.setTest(be),be&&(o.setMask(I.stencilWriteMask),o.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),o.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),_t(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?ne(n.SAMPLE_ALPHA_TO_COVERAGE):se(n.SAMPLE_ALPHA_TO_COVERAGE)}function ke(I){L!==I&&(I?n.frontFace(n.CW):n.frontFace(n.CCW),L=I)}function dt(I){I!==Xm?(ne(n.CULL_FACE),I!==C&&(I===lu?n.cullFace(n.BACK):I===qm?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):se(n.CULL_FACE),C=I}function D(I){I!==F&&(z&&n.lineWidth(I),F=I)}function _t(I,le,re){I?(ne(n.POLYGON_OFFSET_FILL),(k!==le||V!==re)&&(k=le,V=re,a.getReversed()&&(le=-le),n.polygonOffset(le,re))):se(n.POLYGON_OFFSET_FILL)}function $e(I){I?ne(n.SCISSOR_TEST):se(n.SCISSOR_TEST)}function rt(I){I===void 0&&(I=n.TEXTURE0+W-1),K!==I&&(n.activeTexture(I),K=I)}function _e(I,le,re){re===void 0&&(K===null?re=n.TEXTURE0+W-1:re=K);let be=ce[re];be===void 0&&(be={type:void 0,texture:void 0},ce[re]=be),(be.type!==I||be.texture!==le)&&(K!==re&&(n.activeTexture(re),K=re),n.bindTexture(I,le||Z[I]),be.type=I,be.texture=le)}function A(){const I=ce[K];I!==void 0&&I.type!==void 0&&(n.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function x(){try{n.compressedTexImage2D(...arguments)}catch(I){Ue("WebGLState:",I)}}function U(){try{n.compressedTexImage3D(...arguments)}catch(I){Ue("WebGLState:",I)}}function J(){try{n.texSubImage2D(...arguments)}catch(I){Ue("WebGLState:",I)}}function $(){try{n.texSubImage3D(...arguments)}catch(I){Ue("WebGLState:",I)}}function q(){try{n.compressedTexSubImage2D(...arguments)}catch(I){Ue("WebGLState:",I)}}function pe(){try{n.compressedTexSubImage3D(...arguments)}catch(I){Ue("WebGLState:",I)}}function N(){try{n.texStorage2D(...arguments)}catch(I){Ue("WebGLState:",I)}}function G(){try{n.texStorage3D(...arguments)}catch(I){Ue("WebGLState:",I)}}function oe(){try{n.texImage2D(...arguments)}catch(I){Ue("WebGLState:",I)}}function Q(){try{n.texImage3D(...arguments)}catch(I){Ue("WebGLState:",I)}}function ee(I){Ne.equals(I)===!1&&(n.scissor(I.x,I.y,I.z,I.w),Ne.copy(I))}function fe(I){tt.equals(I)===!1&&(n.viewport(I.x,I.y,I.z,I.w),tt.copy(I))}function me(I,le){let re=c.get(le);re===void 0&&(re=new WeakMap,c.set(le,re));let be=re.get(I);be===void 0&&(be=n.getUniformBlockIndex(le,I.name),re.set(I,be))}function he(I,le){const be=c.get(le).get(I);l.get(le)!==be&&(n.uniformBlockBinding(le,be,I.__bindingPointIndex),l.set(le,be))}function Oe(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),h={},K=null,ce={},d={},u=new WeakMap,f=[],m=null,v=!1,p=null,g=null,y=null,S=null,M=null,T=null,w=null,R=new Ae(0,0,0),_=0,E=!1,L=null,C=null,F=null,k=null,V=null,Ne.set(0,0,n.canvas.width,n.canvas.height),tt.set(0,0,n.canvas.width,n.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:ne,disable:se,bindFramebuffer:Se,drawBuffers:Me,useProgram:Le,setBlending:je,setMaterial:it,setFlipSided:ke,setCullFace:dt,setLineWidth:D,setPolygonOffset:_t,setScissorTest:$e,activeTexture:rt,bindTexture:_e,unbindTexture:A,compressedTexImage2D:x,compressedTexImage3D:U,texImage2D:oe,texImage3D:Q,updateUBOMapping:me,uniformBlockBinding:he,texStorage2D:N,texStorage3D:G,texSubImage2D:J,texSubImage3D:$,compressedTexSubImage2D:q,compressedTexSubImage3D:pe,scissor:ee,viewport:fe,reset:Oe}}function zM(n,e,t,i,s,r,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new De,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(A,x){return f?new OffscreenCanvas(A,x):Xr("canvas")}function v(A,x,U){let J=1;const $=_e(A);if(($.width>U||$.height>U)&&(J=U/Math.max($.width,$.height)),J<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const q=Math.floor(J*$.width),pe=Math.floor(J*$.height);d===void 0&&(d=m(q,pe));const N=x?m(q,pe):d;return N.width=q,N.height=pe,N.getContext("2d").drawImage(A,0,0,q,pe),Re("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+q+"x"+pe+")."),N}else return"data"in A&&Re("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),A;return A}function p(A){return A.generateMipmaps}function g(A){n.generateMipmap(A)}function y(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function S(A,x,U,J,$=!1){if(A!==null){if(n[A]!==void 0)return n[A];Re("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let q=x;if(x===n.RED&&(U===n.FLOAT&&(q=n.R32F),U===n.HALF_FLOAT&&(q=n.R16F),U===n.UNSIGNED_BYTE&&(q=n.R8)),x===n.RED_INTEGER&&(U===n.UNSIGNED_BYTE&&(q=n.R8UI),U===n.UNSIGNED_SHORT&&(q=n.R16UI),U===n.UNSIGNED_INT&&(q=n.R32UI),U===n.BYTE&&(q=n.R8I),U===n.SHORT&&(q=n.R16I),U===n.INT&&(q=n.R32I)),x===n.RG&&(U===n.FLOAT&&(q=n.RG32F),U===n.HALF_FLOAT&&(q=n.RG16F),U===n.UNSIGNED_BYTE&&(q=n.RG8)),x===n.RG_INTEGER&&(U===n.UNSIGNED_BYTE&&(q=n.RG8UI),U===n.UNSIGNED_SHORT&&(q=n.RG16UI),U===n.UNSIGNED_INT&&(q=n.RG32UI),U===n.BYTE&&(q=n.RG8I),U===n.SHORT&&(q=n.RG16I),U===n.INT&&(q=n.RG32I)),x===n.RGB_INTEGER&&(U===n.UNSIGNED_BYTE&&(q=n.RGB8UI),U===n.UNSIGNED_SHORT&&(q=n.RGB16UI),U===n.UNSIGNED_INT&&(q=n.RGB32UI),U===n.BYTE&&(q=n.RGB8I),U===n.SHORT&&(q=n.RGB16I),U===n.INT&&(q=n.RGB32I)),x===n.RGBA_INTEGER&&(U===n.UNSIGNED_BYTE&&(q=n.RGBA8UI),U===n.UNSIGNED_SHORT&&(q=n.RGBA16UI),U===n.UNSIGNED_INT&&(q=n.RGBA32UI),U===n.BYTE&&(q=n.RGBA8I),U===n.SHORT&&(q=n.RGBA16I),U===n.INT&&(q=n.RGBA32I)),x===n.RGB&&(U===n.UNSIGNED_INT_5_9_9_9_REV&&(q=n.RGB9_E5),U===n.UNSIGNED_INT_10F_11F_11F_REV&&(q=n.R11F_G11F_B10F)),x===n.RGBA){const pe=$?uo:et.getTransfer(J);U===n.FLOAT&&(q=n.RGBA32F),U===n.HALF_FLOAT&&(q=n.RGBA16F),U===n.UNSIGNED_BYTE&&(q=pe===lt?n.SRGB8_ALPHA8:n.RGBA8),U===n.UNSIGNED_SHORT_4_4_4_4&&(q=n.RGBA4),U===n.UNSIGNED_SHORT_5_5_5_1&&(q=n.RGB5_A1)}return(q===n.R16F||q===n.R32F||q===n.RG16F||q===n.RG32F||q===n.RGBA16F||q===n.RGBA32F)&&e.get("EXT_color_buffer_float"),q}function M(A,x){let U;return A?x===null||x===qi||x===Ws?U=n.DEPTH24_STENCIL8:x===ci?U=n.DEPTH32F_STENCIL8:x===Vr&&(U=n.DEPTH24_STENCIL8,Re("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===qi||x===Ws?U=n.DEPTH_COMPONENT24:x===ci?U=n.DEPTH_COMPONENT32F:x===Vr&&(U=n.DEPTH_COMPONENT16),U}function T(A,x){return p(A)===!0||A.isFramebufferTexture&&A.minFilter!==St&&A.minFilter!==It?Math.log2(Math.max(x.width,x.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?x.mipmaps.length:1}function w(A){const x=A.target;x.removeEventListener("dispose",w),_(x),x.isVideoTexture&&h.delete(x)}function R(A){const x=A.target;x.removeEventListener("dispose",R),L(x)}function _(A){const x=i.get(A);if(x.__webglInit===void 0)return;const U=A.source,J=u.get(U);if(J){const $=J[x.__cacheKey];$.usedTimes--,$.usedTimes===0&&E(A),Object.keys(J).length===0&&u.delete(U)}i.remove(A)}function E(A){const x=i.get(A);n.deleteTexture(x.__webglTexture);const U=A.source,J=u.get(U);delete J[x.__cacheKey],a.memory.textures--}function L(A){const x=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(x.__webglFramebuffer[J]))for(let $=0;$<x.__webglFramebuffer[J].length;$++)n.deleteFramebuffer(x.__webglFramebuffer[J][$]);else n.deleteFramebuffer(x.__webglFramebuffer[J]);x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer[J])}else{if(Array.isArray(x.__webglFramebuffer))for(let J=0;J<x.__webglFramebuffer.length;J++)n.deleteFramebuffer(x.__webglFramebuffer[J]);else n.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&n.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&n.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let J=0;J<x.__webglColorRenderbuffer.length;J++)x.__webglColorRenderbuffer[J]&&n.deleteRenderbuffer(x.__webglColorRenderbuffer[J]);x.__webglDepthRenderbuffer&&n.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const U=A.textures;for(let J=0,$=U.length;J<$;J++){const q=i.get(U[J]);q.__webglTexture&&(n.deleteTexture(q.__webglTexture),a.memory.textures--),i.remove(U[J])}i.remove(A)}let C=0;function F(){C=0}function k(){const A=C;return A>=s.maxTextures&&Re("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),C+=1,A}function V(A){const x=[];return x.push(A.wrapS),x.push(A.wrapT),x.push(A.wrapR||0),x.push(A.magFilter),x.push(A.minFilter),x.push(A.anisotropy),x.push(A.internalFormat),x.push(A.format),x.push(A.type),x.push(A.generateMipmaps),x.push(A.premultiplyAlpha),x.push(A.flipY),x.push(A.unpackAlignment),x.push(A.colorSpace),x.join()}function W(A,x){const U=i.get(A);if(A.isVideoTexture&&$e(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&U.__version!==A.version){const J=A.image;if(J===null)Re("WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)Re("WebGLRenderer: Texture marked for update but image is incomplete");else{Z(U,A,x);return}}else A.isExternalTexture&&(U.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,U.__webglTexture,n.TEXTURE0+x)}function z(A,x){const U=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&U.__version!==A.version){Z(U,A,x);return}else A.isExternalTexture&&(U.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,U.__webglTexture,n.TEXTURE0+x)}function B(A,x){const U=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&U.__version!==A.version){Z(U,A,x);return}t.bindTexture(n.TEXTURE_3D,U.__webglTexture,n.TEXTURE0+x)}function ie(A,x){const U=i.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&U.__version!==A.version){ne(U,A,x);return}t.bindTexture(n.TEXTURE_CUBE_MAP,U.__webglTexture,n.TEXTURE0+x)}const K={[Dn]:n.REPEAT,[zi]:n.CLAMP_TO_EDGE,[ho]:n.MIRRORED_REPEAT},ce={[St]:n.NEAREST,[Sf]:n.NEAREST_MIPMAP_NEAREST,[Dr]:n.NEAREST_MIPMAP_LINEAR,[It]:n.LINEAR,[Za]:n.LINEAR_MIPMAP_NEAREST,[rn]:n.LINEAR_MIPMAP_LINEAR},de={[pg]:n.NEVER,[_g]:n.ALWAYS,[mg]:n.LESS,[Ah]:n.LEQUAL,[gg]:n.EQUAL,[Ch]:n.GEQUAL,[vg]:n.GREATER,[xg]:n.NOTEQUAL};function ue(A,x){if(x.type===ci&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===It||x.magFilter===Za||x.magFilter===Dr||x.magFilter===rn||x.minFilter===It||x.minFilter===Za||x.minFilter===Dr||x.minFilter===rn)&&Re("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,K[x.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,K[x.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,K[x.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,ce[x.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,ce[x.minFilter]),x.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,de[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===St||x.minFilter!==Dr&&x.minFilter!==rn||x.type===ci&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||i.get(x).__currentAnisotropy){const U=e.get("EXT_texture_filter_anisotropic");n.texParameterf(A,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),i.get(x).__currentAnisotropy=x.anisotropy}}}function Ne(A,x){let U=!1;A.__webglInit===void 0&&(A.__webglInit=!0,x.addEventListener("dispose",w));const J=x.source;let $=u.get(J);$===void 0&&($={},u.set(J,$));const q=V(x);if(q!==A.__cacheKey){$[q]===void 0&&($[q]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,U=!0),$[q].usedTimes++;const pe=$[A.__cacheKey];pe!==void 0&&($[A.__cacheKey].usedTimes--,pe.usedTimes===0&&E(x)),A.__cacheKey=q,A.__webglTexture=$[q].texture}return U}function tt(A,x,U){return Math.floor(Math.floor(A/U)/x)}function Qe(A,x,U,J){const q=A.updateRanges;if(q.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,x.width,x.height,U,J,x.data);else{q.sort((Q,ee)=>Q.start-ee.start);let pe=0;for(let Q=1;Q<q.length;Q++){const ee=q[pe],fe=q[Q],me=ee.start+ee.count,he=tt(fe.start,x.width,4),Oe=tt(ee.start,x.width,4);fe.start<=me+1&&he===Oe&&tt(fe.start+fe.count-1,x.width,4)===he?ee.count=Math.max(ee.count,fe.start+fe.count-ee.start):(++pe,q[pe]=fe)}q.length=pe+1;const N=n.getParameter(n.UNPACK_ROW_LENGTH),G=n.getParameter(n.UNPACK_SKIP_PIXELS),oe=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,x.width);for(let Q=0,ee=q.length;Q<ee;Q++){const fe=q[Q],me=Math.floor(fe.start/4),he=Math.ceil(fe.count/4),Oe=me%x.width,I=Math.floor(me/x.width),le=he,re=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,Oe),n.pixelStorei(n.UNPACK_SKIP_ROWS,I),t.texSubImage2D(n.TEXTURE_2D,0,Oe,I,le,re,U,J,x.data)}A.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,N),n.pixelStorei(n.UNPACK_SKIP_PIXELS,G),n.pixelStorei(n.UNPACK_SKIP_ROWS,oe)}}function Z(A,x,U){let J=n.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(J=n.TEXTURE_2D_ARRAY),x.isData3DTexture&&(J=n.TEXTURE_3D);const $=Ne(A,x),q=x.source;t.bindTexture(J,A.__webglTexture,n.TEXTURE0+U);const pe=i.get(q);if(q.version!==pe.__version||$===!0){t.activeTexture(n.TEXTURE0+U);const N=et.getPrimaries(et.workingColorSpace),G=x.colorSpace===Sn?null:et.getPrimaries(x.colorSpace),oe=x.colorSpace===Sn||N===G?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,oe);let Q=v(x.image,!1,s.maxTextureSize);Q=rt(x,Q);const ee=r.convert(x.format,x.colorSpace),fe=r.convert(x.type);let me=S(x.internalFormat,ee,fe,x.colorSpace,x.isVideoTexture);ue(J,x);let he;const Oe=x.mipmaps,I=x.isVideoTexture!==!0,le=pe.__version===void 0||$===!0,re=q.dataReady,be=T(x,Q);if(x.isDepthTexture)me=M(x.format===wn,x.type),le&&(I?t.texStorage2D(n.TEXTURE_2D,1,me,Q.width,Q.height):t.texImage2D(n.TEXTURE_2D,0,me,Q.width,Q.height,0,ee,fe,null));else if(x.isDataTexture)if(Oe.length>0){I&&le&&t.texStorage2D(n.TEXTURE_2D,be,me,Oe[0].width,Oe[0].height);for(let ae=0,Y=Oe.length;ae<Y;ae++)he=Oe[ae],I?re&&t.texSubImage2D(n.TEXTURE_2D,ae,0,0,he.width,he.height,ee,fe,he.data):t.texImage2D(n.TEXTURE_2D,ae,me,he.width,he.height,0,ee,fe,he.data);x.generateMipmaps=!1}else I?(le&&t.texStorage2D(n.TEXTURE_2D,be,me,Q.width,Q.height),re&&Qe(x,Q,ee,fe)):t.texImage2D(n.TEXTURE_2D,0,me,Q.width,Q.height,0,ee,fe,Q.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){I&&le&&t.texStorage3D(n.TEXTURE_2D_ARRAY,be,me,Oe[0].width,Oe[0].height,Q.depth);for(let ae=0,Y=Oe.length;ae<Y;ae++)if(he=Oe[ae],x.format!==xi)if(ee!==null)if(I){if(re)if(x.layerUpdates.size>0){const Te=nd(he.width,he.height,x.format,x.type);for(const Ve of x.layerUpdates){const yt=he.data.subarray(Ve*Te/he.data.BYTES_PER_ELEMENT,(Ve+1)*Te/he.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ae,0,0,Ve,he.width,he.height,1,ee,yt)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ae,0,0,0,he.width,he.height,Q.depth,ee,he.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ae,me,he.width,he.height,Q.depth,0,he.data,0,0);else Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else I?re&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ae,0,0,0,he.width,he.height,Q.depth,ee,fe,he.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ae,me,he.width,he.height,Q.depth,0,ee,fe,he.data)}else{I&&le&&t.texStorage2D(n.TEXTURE_2D,be,me,Oe[0].width,Oe[0].height);for(let ae=0,Y=Oe.length;ae<Y;ae++)he=Oe[ae],x.format!==xi?ee!==null?I?re&&t.compressedTexSubImage2D(n.TEXTURE_2D,ae,0,0,he.width,he.height,ee,he.data):t.compressedTexImage2D(n.TEXTURE_2D,ae,me,he.width,he.height,0,he.data):Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):I?re&&t.texSubImage2D(n.TEXTURE_2D,ae,0,0,he.width,he.height,ee,fe,he.data):t.texImage2D(n.TEXTURE_2D,ae,me,he.width,he.height,0,ee,fe,he.data)}else if(x.isDataArrayTexture)if(I){if(le&&t.texStorage3D(n.TEXTURE_2D_ARRAY,be,me,Q.width,Q.height,Q.depth),re)if(x.layerUpdates.size>0){const ae=nd(Q.width,Q.height,x.format,x.type);for(const Y of x.layerUpdates){const Te=Q.data.subarray(Y*ae/Q.data.BYTES_PER_ELEMENT,(Y+1)*ae/Q.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Y,Q.width,Q.height,1,ee,fe,Te)}x.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,ee,fe,Q.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,me,Q.width,Q.height,Q.depth,0,ee,fe,Q.data);else if(x.isData3DTexture)I?(le&&t.texStorage3D(n.TEXTURE_3D,be,me,Q.width,Q.height,Q.depth),re&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,ee,fe,Q.data)):t.texImage3D(n.TEXTURE_3D,0,me,Q.width,Q.height,Q.depth,0,ee,fe,Q.data);else if(x.isFramebufferTexture){if(le)if(I)t.texStorage2D(n.TEXTURE_2D,be,me,Q.width,Q.height);else{let ae=Q.width,Y=Q.height;for(let Te=0;Te<be;Te++)t.texImage2D(n.TEXTURE_2D,Te,me,ae,Y,0,ee,fe,null),ae>>=1,Y>>=1}}else if(Oe.length>0){if(I&&le){const ae=_e(Oe[0]);t.texStorage2D(n.TEXTURE_2D,be,me,ae.width,ae.height)}for(let ae=0,Y=Oe.length;ae<Y;ae++)he=Oe[ae],I?re&&t.texSubImage2D(n.TEXTURE_2D,ae,0,0,ee,fe,he):t.texImage2D(n.TEXTURE_2D,ae,me,ee,fe,he);x.generateMipmaps=!1}else if(I){if(le){const ae=_e(Q);t.texStorage2D(n.TEXTURE_2D,be,me,ae.width,ae.height)}re&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ee,fe,Q)}else t.texImage2D(n.TEXTURE_2D,0,me,ee,fe,Q);p(x)&&g(J),pe.__version=q.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function ne(A,x,U){if(x.image.length!==6)return;const J=Ne(A,x),$=x.source;t.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+U);const q=i.get($);if($.version!==q.__version||J===!0){t.activeTexture(n.TEXTURE0+U);const pe=et.getPrimaries(et.workingColorSpace),N=x.colorSpace===Sn?null:et.getPrimaries(x.colorSpace),G=x.colorSpace===Sn||pe===N?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,G);const oe=x.isCompressedTexture||x.image[0].isCompressedTexture,Q=x.image[0]&&x.image[0].isDataTexture,ee=[];for(let Y=0;Y<6;Y++)!oe&&!Q?ee[Y]=v(x.image[Y],!0,s.maxCubemapSize):ee[Y]=Q?x.image[Y].image:x.image[Y],ee[Y]=rt(x,ee[Y]);const fe=ee[0],me=r.convert(x.format,x.colorSpace),he=r.convert(x.type),Oe=S(x.internalFormat,me,he,x.colorSpace),I=x.isVideoTexture!==!0,le=q.__version===void 0||J===!0,re=$.dataReady;let be=T(x,fe);ue(n.TEXTURE_CUBE_MAP,x);let ae;if(oe){I&&le&&t.texStorage2D(n.TEXTURE_CUBE_MAP,be,Oe,fe.width,fe.height);for(let Y=0;Y<6;Y++){ae=ee[Y].mipmaps;for(let Te=0;Te<ae.length;Te++){const Ve=ae[Te];x.format!==xi?me!==null?I?re&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te,0,0,Ve.width,Ve.height,me,Ve.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te,Oe,Ve.width,Ve.height,0,Ve.data):Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):I?re&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te,0,0,Ve.width,Ve.height,me,he,Ve.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te,Oe,Ve.width,Ve.height,0,me,he,Ve.data)}}}else{if(ae=x.mipmaps,I&&le){ae.length>0&&be++;const Y=_e(ee[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,be,Oe,Y.width,Y.height)}for(let Y=0;Y<6;Y++)if(Q){I?re&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,ee[Y].width,ee[Y].height,me,he,ee[Y].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,Oe,ee[Y].width,ee[Y].height,0,me,he,ee[Y].data);for(let Te=0;Te<ae.length;Te++){const yt=ae[Te].image[Y].image;I?re&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te+1,0,0,yt.width,yt.height,me,he,yt.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te+1,Oe,yt.width,yt.height,0,me,he,yt.data)}}else{I?re&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,me,he,ee[Y]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,Oe,me,he,ee[Y]);for(let Te=0;Te<ae.length;Te++){const Ve=ae[Te];I?re&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te+1,0,0,me,he,Ve.image[Y]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Te+1,Oe,me,he,Ve.image[Y])}}}p(x)&&g(n.TEXTURE_CUBE_MAP),q.__version=$.version,x.onUpdate&&x.onUpdate(x)}A.__version=x.version}function se(A,x,U,J,$,q){const pe=r.convert(U.format,U.colorSpace),N=r.convert(U.type),G=S(U.internalFormat,pe,N,U.colorSpace),oe=i.get(x),Q=i.get(U);if(Q.__renderTarget=x,!oe.__hasExternalTextures){const ee=Math.max(1,x.width>>q),fe=Math.max(1,x.height>>q);$===n.TEXTURE_3D||$===n.TEXTURE_2D_ARRAY?t.texImage3D($,q,G,ee,fe,x.depth,0,pe,N,null):t.texImage2D($,q,G,ee,fe,0,pe,N,null)}t.bindFramebuffer(n.FRAMEBUFFER,A),_t(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,J,$,Q.__webglTexture,0,D(x)):($===n.TEXTURE_2D||$>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,J,$,Q.__webglTexture,q),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Se(A,x,U){if(n.bindRenderbuffer(n.RENDERBUFFER,A),x.depthBuffer){const J=x.depthTexture,$=J&&J.isDepthTexture?J.type:null,q=M(x.stencilBuffer,$),pe=x.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;_t(x)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,D(x),q,x.width,x.height):U?n.renderbufferStorageMultisample(n.RENDERBUFFER,D(x),q,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,q,x.width,x.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,pe,n.RENDERBUFFER,A)}else{const J=x.textures;for(let $=0;$<J.length;$++){const q=J[$],pe=r.convert(q.format,q.colorSpace),N=r.convert(q.type),G=S(q.internalFormat,pe,N,q.colorSpace);_t(x)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,D(x),G,x.width,x.height):U?n.renderbufferStorageMultisample(n.RENDERBUFFER,D(x),G,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,G,x.width,x.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Me(A,x,U){const J=x.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,A),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const $=i.get(x.depthTexture);if($.__renderTarget=x,(!$.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),J){if($.__webglInit===void 0&&($.__webglInit=!0,x.depthTexture.addEventListener("dispose",w)),$.__webglTexture===void 0){$.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,$.__webglTexture),ue(n.TEXTURE_CUBE_MAP,x.depthTexture);const oe=r.convert(x.depthTexture.format),Q=r.convert(x.depthTexture.type);let ee;x.depthTexture.format===cn?ee=n.DEPTH_COMPONENT24:x.depthTexture.format===wn&&(ee=n.DEPTH24_STENCIL8);for(let fe=0;fe<6;fe++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,ee,x.width,x.height,0,oe,Q,null)}}else W(x.depthTexture,0);const q=$.__webglTexture,pe=D(x),N=J?n.TEXTURE_CUBE_MAP_POSITIVE_X+U:n.TEXTURE_2D,G=x.depthTexture.format===wn?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(x.depthTexture.format===cn)_t(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,G,N,q,0,pe):n.framebufferTexture2D(n.FRAMEBUFFER,G,N,q,0);else if(x.depthTexture.format===wn)_t(x)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,G,N,q,0,pe):n.framebufferTexture2D(n.FRAMEBUFFER,G,N,q,0);else throw new Error("Unknown depthTexture format")}function Le(A){const x=i.get(A),U=A.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==A.depthTexture){const J=A.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),J){const $=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,J.removeEventListener("dispose",$)};J.addEventListener("dispose",$),x.__depthDisposeCallback=$}x.__boundDepthTexture=J}if(A.depthTexture&&!x.__autoAllocateDepthBuffer)if(U)for(let J=0;J<6;J++)Me(x.__webglFramebuffer[J],A,J);else{const J=A.texture.mipmaps;J&&J.length>0?Me(x.__webglFramebuffer[0],A,0):Me(x.__webglFramebuffer,A,0)}else if(U){x.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[J]),x.__webglDepthbuffer[J]===void 0)x.__webglDepthbuffer[J]=n.createRenderbuffer(),Se(x.__webglDepthbuffer[J],A,!1);else{const $=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,q=x.__webglDepthbuffer[J];n.bindRenderbuffer(n.RENDERBUFFER,q),n.framebufferRenderbuffer(n.FRAMEBUFFER,$,n.RENDERBUFFER,q)}}else{const J=A.texture.mipmaps;if(J&&J.length>0?t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=n.createRenderbuffer(),Se(x.__webglDepthbuffer,A,!1);else{const $=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,q=x.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,q),n.framebufferRenderbuffer(n.FRAMEBUFFER,$,n.RENDERBUFFER,q)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function Tt(A,x,U){const J=i.get(A);x!==void 0&&se(J.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),U!==void 0&&Le(A)}function Ge(A){const x=A.texture,U=i.get(A),J=i.get(x);A.addEventListener("dispose",R);const $=A.textures,q=A.isWebGLCubeRenderTarget===!0,pe=$.length>1;if(pe||(J.__webglTexture===void 0&&(J.__webglTexture=n.createTexture()),J.__version=x.version,a.memory.textures++),q){U.__webglFramebuffer=[];for(let N=0;N<6;N++)if(x.mipmaps&&x.mipmaps.length>0){U.__webglFramebuffer[N]=[];for(let G=0;G<x.mipmaps.length;G++)U.__webglFramebuffer[N][G]=n.createFramebuffer()}else U.__webglFramebuffer[N]=n.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){U.__webglFramebuffer=[];for(let N=0;N<x.mipmaps.length;N++)U.__webglFramebuffer[N]=n.createFramebuffer()}else U.__webglFramebuffer=n.createFramebuffer();if(pe)for(let N=0,G=$.length;N<G;N++){const oe=i.get($[N]);oe.__webglTexture===void 0&&(oe.__webglTexture=n.createTexture(),a.memory.textures++)}if(A.samples>0&&_t(A)===!1){U.__webglMultisampledFramebuffer=n.createFramebuffer(),U.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let N=0;N<$.length;N++){const G=$[N];U.__webglColorRenderbuffer[N]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,U.__webglColorRenderbuffer[N]);const oe=r.convert(G.format,G.colorSpace),Q=r.convert(G.type),ee=S(G.internalFormat,oe,Q,G.colorSpace,A.isXRRenderTarget===!0),fe=D(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,fe,ee,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+N,n.RENDERBUFFER,U.__webglColorRenderbuffer[N])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(U.__webglDepthRenderbuffer=n.createRenderbuffer(),Se(U.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(q){t.bindTexture(n.TEXTURE_CUBE_MAP,J.__webglTexture),ue(n.TEXTURE_CUBE_MAP,x);for(let N=0;N<6;N++)if(x.mipmaps&&x.mipmaps.length>0)for(let G=0;G<x.mipmaps.length;G++)se(U.__webglFramebuffer[N][G],A,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+N,G);else se(U.__webglFramebuffer[N],A,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+N,0);p(x)&&g(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(pe){for(let N=0,G=$.length;N<G;N++){const oe=$[N],Q=i.get(oe);let ee=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(ee=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ee,Q.__webglTexture),ue(ee,oe),se(U.__webglFramebuffer,A,oe,n.COLOR_ATTACHMENT0+N,ee,0),p(oe)&&g(ee)}t.unbindTexture()}else{let N=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(N=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(N,J.__webglTexture),ue(N,x),x.mipmaps&&x.mipmaps.length>0)for(let G=0;G<x.mipmaps.length;G++)se(U.__webglFramebuffer[G],A,x,n.COLOR_ATTACHMENT0,N,G);else se(U.__webglFramebuffer,A,x,n.COLOR_ATTACHMENT0,N,0);p(x)&&g(N),t.unbindTexture()}A.depthBuffer&&Le(A)}function je(A){const x=A.textures;for(let U=0,J=x.length;U<J;U++){const $=x[U];if(p($)){const q=y(A),pe=i.get($).__webglTexture;t.bindTexture(q,pe),g(q),t.unbindTexture()}}}const it=[],ke=[];function dt(A){if(A.samples>0){if(_t(A)===!1){const x=A.textures,U=A.width,J=A.height;let $=n.COLOR_BUFFER_BIT;const q=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,pe=i.get(A),N=x.length>1;if(N)for(let oe=0;oe<x.length;oe++)t.bindFramebuffer(n.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+oe,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,pe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+oe,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,pe.__webglMultisampledFramebuffer);const G=A.texture.mipmaps;G&&G.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,pe.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,pe.__webglFramebuffer);for(let oe=0;oe<x.length;oe++){if(A.resolveDepthBuffer&&(A.depthBuffer&&($|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&($|=n.STENCIL_BUFFER_BIT)),N){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,pe.__webglColorRenderbuffer[oe]);const Q=i.get(x[oe]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Q,0)}n.blitFramebuffer(0,0,U,J,0,0,U,J,$,n.NEAREST),l===!0&&(it.length=0,ke.length=0,it.push(n.COLOR_ATTACHMENT0+oe),A.depthBuffer&&A.resolveDepthBuffer===!1&&(it.push(q),ke.push(q),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,ke)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,it))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),N)for(let oe=0;oe<x.length;oe++){t.bindFramebuffer(n.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+oe,n.RENDERBUFFER,pe.__webglColorRenderbuffer[oe]);const Q=i.get(x[oe]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,pe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+oe,n.TEXTURE_2D,Q,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,pe.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const x=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[x])}}}function D(A){return Math.min(s.maxSamples,A.samples)}function _t(A){const x=i.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function $e(A){const x=a.render.frame;h.get(A)!==x&&(h.set(A,x),A.update())}function rt(A,x){const U=A.colorSpace,J=A.format,$=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||U!==ti&&U!==Sn&&(et.getTransfer(U)===lt?(J!==xi||$!==li)&&Re("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ue("WebGLTextures: Unsupported texture color space:",U)),x}function _e(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=k,this.resetTextureUnits=F,this.setTexture2D=W,this.setTexture2DArray=z,this.setTexture3D=B,this.setTextureCube=ie,this.rebindTextures=Tt,this.setupRenderTarget=Ge,this.updateRenderTargetMipmap=je,this.updateMultisampleRenderTarget=dt,this.setupDepthRenderbuffer=Le,this.setupFrameBufferTexture=se,this.useMultisampledRTT=_t,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function VM(n,e){function t(i,s=Sn){let r;const a=et.getTransfer(s);if(i===li)return n.UNSIGNED_BYTE;if(i===bh)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Sh)return n.UNSIGNED_SHORT_5_5_5_1;if(i===wf)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Af)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Tf)return n.BYTE;if(i===Ef)return n.SHORT;if(i===Vr)return n.UNSIGNED_SHORT;if(i===Mh)return n.INT;if(i===qi)return n.UNSIGNED_INT;if(i===ci)return n.FLOAT;if(i===ei)return n.HALF_FLOAT;if(i===Cf)return n.ALPHA;if(i===Rf)return n.RGB;if(i===xi)return n.RGBA;if(i===cn)return n.DEPTH_COMPONENT;if(i===wn)return n.DEPTH_STENCIL;if(i===Po)return n.RED;if(i===Th)return n.RED_INTEGER;if(i===Xs)return n.RG;if(i===Eh)return n.RG_INTEGER;if(i===wh)return n.RGBA_INTEGER;if(i===Ja||i===Qa||i===$a||i===eo)if(a===lt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Ja)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Qa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===$a)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===eo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Ja)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Qa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===$a)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===eo)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===sc||i===rc||i===ac||i===oc)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===sc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===rc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ac)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===oc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===lc||i===cc||i===hc||i===uc||i===dc||i===fc||i===pc)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===lc||i===cc)return a===lt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===hc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===uc)return r.COMPRESSED_R11_EAC;if(i===dc)return r.COMPRESSED_SIGNED_R11_EAC;if(i===fc)return r.COMPRESSED_RG11_EAC;if(i===pc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===mc||i===gc||i===vc||i===xc||i===_c||i===yc||i===Mc||i===bc||i===Sc||i===Tc||i===Ec||i===wc||i===Ac||i===Cc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===mc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===gc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===vc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===xc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===_c)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===yc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Mc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===bc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Sc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Tc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Ec)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===wc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Ac)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Cc)return a===lt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Rc||i===Pc||i===Dc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===Rc)return a===lt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Pc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Dc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Lc||i===Ic||i===Nc||i===Uc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===Lc)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Ic)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Nc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Uc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ws?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const HM=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,GM=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class WM{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new zf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Nt({vertexShader:HM,fragmentShader:GM,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new st(new es(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class XM extends ns{constructor(e,t){super();const i=this;let s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,m=null;const v=typeof XRWebGLBinding<"u",p=new WM,g={},y=t.getContextAttributes();let S=null,M=null;const T=[],w=[],R=new De;let _=null;const E=new Wt;E.viewport=new bt;const L=new Wt;L.viewport=new bt;const C=[E,L],F=new W0;let k=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let ne=T[Z];return ne===void 0&&(ne=new ll,T[Z]=ne),ne.getTargetRaySpace()},this.getControllerGrip=function(Z){let ne=T[Z];return ne===void 0&&(ne=new ll,T[Z]=ne),ne.getGripSpace()},this.getHand=function(Z){let ne=T[Z];return ne===void 0&&(ne=new ll,T[Z]=ne),ne.getHandSpace()};function W(Z){const ne=w.indexOf(Z.inputSource);if(ne===-1)return;const se=T[ne];se!==void 0&&(se.update(Z.inputSource,Z.frame,c||a),se.dispatchEvent({type:Z.type,data:Z.inputSource}))}function z(){s.removeEventListener("select",W),s.removeEventListener("selectstart",W),s.removeEventListener("selectend",W),s.removeEventListener("squeeze",W),s.removeEventListener("squeezestart",W),s.removeEventListener("squeezeend",W),s.removeEventListener("end",z),s.removeEventListener("inputsourceschange",B);for(let Z=0;Z<T.length;Z++){const ne=w[Z];ne!==null&&(w[Z]=null,T[Z].disconnect(ne))}k=null,V=null,p.reset();for(const Z in g)delete g[Z];e.setRenderTarget(S),f=null,u=null,d=null,s=null,M=null,Qe.stop(),i.isPresenting=!1,e.setPixelRatio(_),e.setSize(R.width,R.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,i.isPresenting===!0&&Re("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,i.isPresenting===!0&&Re("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Z){c=Z},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(S=e.getRenderTarget(),s.addEventListener("select",W),s.addEventListener("selectstart",W),s.addEventListener("selectend",W),s.addEventListener("squeeze",W),s.addEventListener("squeezestart",W),s.addEventListener("squeezeend",W),s.addEventListener("end",z),s.addEventListener("inputsourceschange",B),y.xrCompatible!==!0&&await t.makeXRCompatible(),_=e.getPixelRatio(),e.getSize(R),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let se=null,Se=null,Me=null;y.depth&&(Me=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,se=y.stencil?wn:cn,Se=y.stencil?Ws:qi);const Le={colorFormat:t.RGBA8,depthFormat:Me,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Le),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),M=new Yt(u.textureWidth,u.textureHeight,{format:xi,type:li,depthTexture:new js(u.textureWidth,u.textureHeight,Se,void 0,void 0,void 0,void 0,void 0,void 0,se),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const se={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,se),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new Yt(f.framebufferWidth,f.framebufferHeight,{format:xi,type:li,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Qe.setContext(s),Qe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function B(Z){for(let ne=0;ne<Z.removed.length;ne++){const se=Z.removed[ne],Se=w.indexOf(se);Se>=0&&(w[Se]=null,T[Se].disconnect(se))}for(let ne=0;ne<Z.added.length;ne++){const se=Z.added[ne];let Se=w.indexOf(se);if(Se===-1){for(let Le=0;Le<T.length;Le++)if(Le>=w.length){w.push(se),Se=Le;break}else if(w[Le]===null){w[Le]=se,Se=Le;break}if(Se===-1)break}const Me=T[Se];Me&&Me.connect(se)}}const ie=new P,K=new P;function ce(Z,ne,se){ie.setFromMatrixPosition(ne.matrixWorld),K.setFromMatrixPosition(se.matrixWorld);const Se=ie.distanceTo(K),Me=ne.projectionMatrix.elements,Le=se.projectionMatrix.elements,Tt=Me[14]/(Me[10]-1),Ge=Me[14]/(Me[10]+1),je=(Me[9]+1)/Me[5],it=(Me[9]-1)/Me[5],ke=(Me[8]-1)/Me[0],dt=(Le[8]+1)/Le[0],D=Tt*ke,_t=Tt*dt,$e=Se/(-ke+dt),rt=$e*-ke;if(ne.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(rt),Z.translateZ($e),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),Me[10]===-1)Z.projectionMatrix.copy(ne.projectionMatrix),Z.projectionMatrixInverse.copy(ne.projectionMatrixInverse);else{const _e=Tt+$e,A=Ge+$e,x=D-rt,U=_t+(Se-rt),J=je*Ge/A*_e,$=it*Ge/A*_e;Z.projectionMatrix.makePerspective(x,U,J,$,_e,A),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function de(Z,ne){ne===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(ne.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let ne=Z.near,se=Z.far;p.texture!==null&&(p.depthNear>0&&(ne=p.depthNear),p.depthFar>0&&(se=p.depthFar)),F.near=L.near=E.near=ne,F.far=L.far=E.far=se,(k!==F.near||V!==F.far)&&(s.updateRenderState({depthNear:F.near,depthFar:F.far}),k=F.near,V=F.far),F.layers.mask=Z.layers.mask|6,E.layers.mask=F.layers.mask&-5,L.layers.mask=F.layers.mask&-3;const Se=Z.parent,Me=F.cameras;de(F,Se);for(let Le=0;Le<Me.length;Le++)de(Me[Le],Se);Me.length===2?ce(F,E,L):F.projectionMatrix.copy(E.projectionMatrix),ue(Z,F,Se)};function ue(Z,ne,se){se===null?Z.matrix.copy(ne.matrixWorld):(Z.matrix.copy(se.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(ne.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(ne.projectionMatrix),Z.projectionMatrixInverse.copy(ne.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=qs*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(Z){l=Z,u!==null&&(u.fixedFoveation=Z),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Z)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(F)},this.getCameraTexture=function(Z){return g[Z]};let Ne=null;function tt(Z,ne){if(h=ne.getViewerPose(c||a),m=ne,h!==null){const se=h.views;f!==null&&(e.setRenderTargetFramebuffer(M,f.framebuffer),e.setRenderTarget(M));let Se=!1;se.length!==F.cameras.length&&(F.cameras.length=0,Se=!0);for(let Ge=0;Ge<se.length;Ge++){const je=se[Ge];let it=null;if(f!==null)it=f.getViewport(je);else{const dt=d.getViewSubImage(u,je);it=dt.viewport,Ge===0&&(e.setRenderTargetTextures(M,dt.colorTexture,dt.depthStencilTexture),e.setRenderTarget(M))}let ke=C[Ge];ke===void 0&&(ke=new Wt,ke.layers.enable(Ge),ke.viewport=new bt,C[Ge]=ke),ke.matrix.fromArray(je.transform.matrix),ke.matrix.decompose(ke.position,ke.quaternion,ke.scale),ke.projectionMatrix.fromArray(je.projectionMatrix),ke.projectionMatrixInverse.copy(ke.projectionMatrix).invert(),ke.viewport.set(it.x,it.y,it.width,it.height),Ge===0&&(F.matrix.copy(ke.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),Se===!0&&F.cameras.push(ke)}const Me=s.enabledFeatures;if(Me&&Me.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&v){d=i.getBinding();const Ge=d.getDepthInformation(se[0]);Ge&&Ge.isValid&&Ge.texture&&p.init(Ge,s.renderState)}if(Me&&Me.includes("camera-access")&&v){e.state.unbindTexture(),d=i.getBinding();for(let Ge=0;Ge<se.length;Ge++){const je=se[Ge].camera;if(je){let it=g[je];it||(it=new zf,g[je]=it);const ke=d.getCameraImage(je);it.sourceTexture=ke}}}}for(let se=0;se<T.length;se++){const Se=w[se],Me=T[se];Se!==null&&Me!==void 0&&Me.update(Se,ne,c||a)}Ne&&Ne(Z,ne),ne.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ne}),m=null}const Qe=new Kf;Qe.setAnimationLoop(tt),this.setAnimationLoop=function(Z){Ne=Z},this.dispose=function(){}}}const Xn=new Pi,qM=new ze;function jM(n,e){function t(p,g){p.matrixAutoUpdate===!0&&p.updateMatrix(),g.value.copy(p.matrix)}function i(p,g){g.color.getRGB(p.fogColor.value,Vf(n)),g.isFog?(p.fogNear.value=g.near,p.fogFar.value=g.far):g.isFogExp2&&(p.fogDensity.value=g.density)}function s(p,g,y,S,M){g.isMeshBasicMaterial?r(p,g):g.isMeshLambertMaterial?(r(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshToonMaterial?(r(p,g),d(p,g)):g.isMeshPhongMaterial?(r(p,g),h(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshStandardMaterial?(r(p,g),u(p,g),g.isMeshPhysicalMaterial&&f(p,g,M)):g.isMeshMatcapMaterial?(r(p,g),m(p,g)):g.isMeshDepthMaterial?r(p,g):g.isMeshDistanceMaterial?(r(p,g),v(p,g)):g.isMeshNormalMaterial?r(p,g):g.isLineBasicMaterial?(a(p,g),g.isLineDashedMaterial&&o(p,g)):g.isPointsMaterial?l(p,g,y,S):g.isSpriteMaterial?c(p,g):g.isShadowMaterial?(p.color.value.copy(g.color),p.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function r(p,g){p.opacity.value=g.opacity,g.color&&p.diffuse.value.copy(g.color),g.emissive&&p.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.bumpMap&&(p.bumpMap.value=g.bumpMap,t(g.bumpMap,p.bumpMapTransform),p.bumpScale.value=g.bumpScale,g.side===Qt&&(p.bumpScale.value*=-1)),g.normalMap&&(p.normalMap.value=g.normalMap,t(g.normalMap,p.normalMapTransform),p.normalScale.value.copy(g.normalScale),g.side===Qt&&p.normalScale.value.negate()),g.displacementMap&&(p.displacementMap.value=g.displacementMap,t(g.displacementMap,p.displacementMapTransform),p.displacementScale.value=g.displacementScale,p.displacementBias.value=g.displacementBias),g.emissiveMap&&(p.emissiveMap.value=g.emissiveMap,t(g.emissiveMap,p.emissiveMapTransform)),g.specularMap&&(p.specularMap.value=g.specularMap,t(g.specularMap,p.specularMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest);const y=e.get(g),S=y.envMap,M=y.envMapRotation;S&&(p.envMap.value=S,Xn.copy(M),Xn.x*=-1,Xn.y*=-1,Xn.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(Xn.y*=-1,Xn.z*=-1),p.envMapRotation.value.setFromMatrix4(qM.makeRotationFromEuler(Xn)),p.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=g.reflectivity,p.ior.value=g.ior,p.refractionRatio.value=g.refractionRatio),g.lightMap&&(p.lightMap.value=g.lightMap,p.lightMapIntensity.value=g.lightMapIntensity,t(g.lightMap,p.lightMapTransform)),g.aoMap&&(p.aoMap.value=g.aoMap,p.aoMapIntensity.value=g.aoMapIntensity,t(g.aoMap,p.aoMapTransform))}function a(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform))}function o(p,g){p.dashSize.value=g.dashSize,p.totalSize.value=g.dashSize+g.gapSize,p.scale.value=g.scale}function l(p,g,y,S){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.size.value=g.size*y,p.scale.value=S*.5,g.map&&(p.map.value=g.map,t(g.map,p.uvTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function c(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.rotation.value=g.rotation,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function h(p,g){p.specular.value.copy(g.specular),p.shininess.value=Math.max(g.shininess,1e-4)}function d(p,g){g.gradientMap&&(p.gradientMap.value=g.gradientMap)}function u(p,g){p.metalness.value=g.metalness,g.metalnessMap&&(p.metalnessMap.value=g.metalnessMap,t(g.metalnessMap,p.metalnessMapTransform)),p.roughness.value=g.roughness,g.roughnessMap&&(p.roughnessMap.value=g.roughnessMap,t(g.roughnessMap,p.roughnessMapTransform)),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)}function f(p,g,y){p.ior.value=g.ior,g.sheen>0&&(p.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),p.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(p.sheenColorMap.value=g.sheenColorMap,t(g.sheenColorMap,p.sheenColorMapTransform)),g.sheenRoughnessMap&&(p.sheenRoughnessMap.value=g.sheenRoughnessMap,t(g.sheenRoughnessMap,p.sheenRoughnessMapTransform))),g.clearcoat>0&&(p.clearcoat.value=g.clearcoat,p.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(p.clearcoatMap.value=g.clearcoatMap,t(g.clearcoatMap,p.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,t(g.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(p.clearcoatNormalMap.value=g.clearcoatNormalMap,t(g.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Qt&&p.clearcoatNormalScale.value.negate())),g.dispersion>0&&(p.dispersion.value=g.dispersion),g.iridescence>0&&(p.iridescence.value=g.iridescence,p.iridescenceIOR.value=g.iridescenceIOR,p.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(p.iridescenceMap.value=g.iridescenceMap,t(g.iridescenceMap,p.iridescenceMapTransform)),g.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=g.iridescenceThicknessMap,t(g.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),g.transmission>0&&(p.transmission.value=g.transmission,p.transmissionSamplerMap.value=y.texture,p.transmissionSamplerSize.value.set(y.width,y.height),g.transmissionMap&&(p.transmissionMap.value=g.transmissionMap,t(g.transmissionMap,p.transmissionMapTransform)),p.thickness.value=g.thickness,g.thicknessMap&&(p.thicknessMap.value=g.thicknessMap,t(g.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=g.attenuationDistance,p.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(p.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(p.anisotropyMap.value=g.anisotropyMap,t(g.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=g.specularIntensity,p.specularColor.value.copy(g.specularColor),g.specularColorMap&&(p.specularColorMap.value=g.specularColorMap,t(g.specularColorMap,p.specularColorMapTransform)),g.specularIntensityMap&&(p.specularIntensityMap.value=g.specularIntensityMap,t(g.specularIntensityMap,p.specularIntensityMapTransform))}function m(p,g){g.matcap&&(p.matcap.value=g.matcap)}function v(p,g){const y=e.get(g).light;p.referencePosition.value.setFromMatrixPosition(y.matrixWorld),p.nearDistance.value=y.shadow.camera.near,p.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function YM(n,e,t,i){let s={},r={},a=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,S){const M=S.program;i.uniformBlockBinding(y,M)}function c(y,S){let M=s[y.id];M===void 0&&(m(y),M=h(y),s[y.id]=M,y.addEventListener("dispose",p));const T=S.program;i.updateUBOMapping(y,T);const w=e.render.frame;r[y.id]!==w&&(u(y),r[y.id]=w)}function h(y){const S=d();y.__bindingPointIndex=S;const M=n.createBuffer(),T=y.__size,w=y.usage;return n.bindBuffer(n.UNIFORM_BUFFER,M),n.bufferData(n.UNIFORM_BUFFER,T,w),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,S,M),M}function d(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return Ue("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const S=s[y.id],M=y.uniforms,T=y.__cache;n.bindBuffer(n.UNIFORM_BUFFER,S);for(let w=0,R=M.length;w<R;w++){const _=Array.isArray(M[w])?M[w]:[M[w]];for(let E=0,L=_.length;E<L;E++){const C=_[E];if(f(C,w,E,T)===!0){const F=C.__offset,k=Array.isArray(C.value)?C.value:[C.value];let V=0;for(let W=0;W<k.length;W++){const z=k[W],B=v(z);typeof z=="number"||typeof z=="boolean"?(C.__data[0]=z,n.bufferSubData(n.UNIFORM_BUFFER,F+V,C.__data)):z.isMatrix3?(C.__data[0]=z.elements[0],C.__data[1]=z.elements[1],C.__data[2]=z.elements[2],C.__data[3]=0,C.__data[4]=z.elements[3],C.__data[5]=z.elements[4],C.__data[6]=z.elements[5],C.__data[7]=0,C.__data[8]=z.elements[6],C.__data[9]=z.elements[7],C.__data[10]=z.elements[8],C.__data[11]=0):(z.toArray(C.__data,V),V+=B.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,F,C.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(y,S,M,T){const w=y.value,R=S+"_"+M;if(T[R]===void 0)return typeof w=="number"||typeof w=="boolean"?T[R]=w:T[R]=w.clone(),!0;{const _=T[R];if(typeof w=="number"||typeof w=="boolean"){if(_!==w)return T[R]=w,!0}else if(_.equals(w)===!1)return _.copy(w),!0}return!1}function m(y){const S=y.uniforms;let M=0;const T=16;for(let R=0,_=S.length;R<_;R++){const E=Array.isArray(S[R])?S[R]:[S[R]];for(let L=0,C=E.length;L<C;L++){const F=E[L],k=Array.isArray(F.value)?F.value:[F.value];for(let V=0,W=k.length;V<W;V++){const z=k[V],B=v(z),ie=M%T,K=ie%B.boundary,ce=ie+K;M+=K,ce!==0&&T-ce<B.storage&&(M+=T-ce),F.__data=new Float32Array(B.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=M,M+=B.storage}}}const w=M%T;return w>0&&(M+=T-w),y.__size=M,y.__cache={},this}function v(y){const S={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(S.boundary=4,S.storage=4):y.isVector2?(S.boundary=8,S.storage=8):y.isVector3||y.isColor?(S.boundary=16,S.storage=12):y.isVector4?(S.boundary=16,S.storage=16):y.isMatrix3?(S.boundary=48,S.storage=48):y.isMatrix4?(S.boundary=64,S.storage=64):y.isTexture?Re("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Re("WebGLRenderer: Unsupported uniform value type.",y),S}function p(y){const S=y.target;S.removeEventListener("dispose",p);const M=a.indexOf(S.__bindingPointIndex);a.splice(M,1),n.deleteBuffer(s[S.id]),delete s[S.id],delete r[S.id]}function g(){for(const y in s)n.deleteBuffer(s[y]);a=[],s={},r={}}return{bind:l,update:c,dispose:g}}const KM=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Ui=null;function ZM(){return Ui===null&&(Ui=new No(KM,16,16,Xs,ei),Ui.name="DFG_LUT",Ui.minFilter=It,Ui.magFilter=It,Ui.wrapS=zi,Ui.wrapT=zi,Ui.generateMipmaps=!1,Ui.needsUpdate=!0),Ui}class tp{constructor(e={}){const{canvas:t=bg(),context:i=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=li}=e;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=a;const v=f,p=new Set([wh,Eh,Th]),g=new Set([li,qi,Vr,Ws,bh,Sh]),y=new Uint32Array(4),S=new Int32Array(4);let M=null,T=null;const w=[],R=[];let _=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Wi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let L=!1;this._outputColorSpace=Lt;let C=0,F=0,k=null,V=-1,W=null;const z=new bt,B=new bt;let ie=null;const K=new Ae(0);let ce=0,de=t.width,ue=t.height,Ne=1,tt=null,Qe=null;const Z=new bt(0,0,de,ue),ne=new bt(0,0,de,ue);let se=!1;const Se=new ea;let Me=!1,Le=!1;const Tt=new ze,Ge=new P,je=new bt,it={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ke=!1;function dt(){return k===null?Ne:1}let D=i;function _t(b,O){return t.getContext(b,O)}try{const b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${dh}`),t.addEventListener("webglcontextlost",Te,!1),t.addEventListener("webglcontextrestored",Ve,!1),t.addEventListener("webglcontextcreationerror",yt,!1),D===null){const O="webgl2";if(D=_t(O,b),D===null)throw _t(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(b){throw Ue("WebGLRenderer: "+b.message),b}let $e,rt,_e,A,x,U,J,$,q,pe,N,G,oe,Q,ee,fe,me,he,Oe,I,le,re,be;function ae(){$e=new J_(D),$e.init(),le=new VM(D,$e),rt=new G_(D,$e,e,le),_e=new kM(D,$e),rt.reversedDepthBuffer&&u&&_e.buffers.depth.setReversed(!0),A=new ey(D),x=new EM,U=new zM(D,$e,_e,x,rt,le,A),J=new Z_(E),$=new rv(D),re=new V_(D,$),q=new Q_(D,$,A,re),pe=new iy(D,q,$,re,A),he=new ty(D,rt,U),ee=new W_(x),N=new TM(E,J,$e,rt,re,ee),G=new jM(E,x),oe=new AM,Q=new IM($e),me=new z_(E,J,_e,pe,m,l),fe=new BM(E,pe,rt),be=new YM(D,A,rt,_e),Oe=new H_(D,$e,A),I=new $_(D,$e,A),A.programs=N.programs,E.capabilities=rt,E.extensions=$e,E.properties=x,E.renderLists=oe,E.shadowMap=fe,E.state=_e,E.info=A}ae(),v!==li&&(_=new sy(v,t.width,t.height,s,r));const Y=new XM(E,D);this.xr=Y,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const b=$e.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){const b=$e.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return Ne},this.setPixelRatio=function(b){b!==void 0&&(Ne=b,this.setSize(de,ue,!1))},this.getSize=function(b){return b.set(de,ue)},this.setSize=function(b,O,j=!0){if(Y.isPresenting){Re("WebGLRenderer: Can't change size while VR device is presenting.");return}de=b,ue=O,t.width=Math.floor(b*Ne),t.height=Math.floor(O*Ne),j===!0&&(t.style.width=b+"px",t.style.height=O+"px"),_!==null&&_.setSize(t.width,t.height),this.setViewport(0,0,b,O)},this.getDrawingBufferSize=function(b){return b.set(de*Ne,ue*Ne).floor()},this.setDrawingBufferSize=function(b,O,j){de=b,ue=O,Ne=j,t.width=Math.floor(b*j),t.height=Math.floor(O*j),this.setViewport(0,0,b,O)},this.setEffects=function(b){if(v===li){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let O=0;O<b.length;O++)if(b[O].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}_.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(z)},this.getViewport=function(b){return b.copy(Z)},this.setViewport=function(b,O,j,X){b.isVector4?Z.set(b.x,b.y,b.z,b.w):Z.set(b,O,j,X),_e.viewport(z.copy(Z).multiplyScalar(Ne).round())},this.getScissor=function(b){return b.copy(ne)},this.setScissor=function(b,O,j,X){b.isVector4?ne.set(b.x,b.y,b.z,b.w):ne.set(b,O,j,X),_e.scissor(B.copy(ne).multiplyScalar(Ne).round())},this.getScissorTest=function(){return se},this.setScissorTest=function(b){_e.setScissorTest(se=b)},this.setOpaqueSort=function(b){tt=b},this.setTransparentSort=function(b){Qe=b},this.getClearColor=function(b){return b.copy(me.getClearColor())},this.setClearColor=function(){me.setClearColor(...arguments)},this.getClearAlpha=function(){return me.getClearAlpha()},this.setClearAlpha=function(){me.setClearAlpha(...arguments)},this.clear=function(b=!0,O=!0,j=!0){let X=0;if(b){let H=!1;if(k!==null){const ve=k.texture.format;H=p.has(ve)}if(H){const ve=k.texture.type,ye=g.has(ve),xe=me.getClearColor(),Ee=me.getClearAlpha(),Ce=xe.r,He=xe.g,Ye=xe.b;ye?(y[0]=Ce,y[1]=He,y[2]=Ye,y[3]=Ee,D.clearBufferuiv(D.COLOR,0,y)):(S[0]=Ce,S[1]=He,S[2]=Ye,S[3]=Ee,D.clearBufferiv(D.COLOR,0,S))}else X|=D.COLOR_BUFFER_BIT}O&&(X|=D.DEPTH_BUFFER_BIT),j&&(X|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),X!==0&&D.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",Te,!1),t.removeEventListener("webglcontextrestored",Ve,!1),t.removeEventListener("webglcontextcreationerror",yt,!1),me.dispose(),oe.dispose(),Q.dispose(),x.dispose(),J.dispose(),pe.dispose(),re.dispose(),be.dispose(),N.dispose(),Y.dispose(),Y.removeEventListener("sessionstart",Xh),Y.removeEventListener("sessionend",qh),Un.stop()};function Te(b){b.preventDefault(),fo("WebGLRenderer: Context Lost."),L=!0}function Ve(){fo("WebGLRenderer: Context Restored."),L=!1;const b=A.autoReset,O=fe.enabled,j=fe.autoUpdate,X=fe.needsUpdate,H=fe.type;ae(),A.autoReset=b,fe.enabled=O,fe.autoUpdate=j,fe.needsUpdate=X,fe.type=H}function yt(b){Ue("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function ct(b){const O=b.target;O.removeEventListener("dispose",ct),Ki(O)}function Ki(b){Zi(b),x.remove(b)}function Zi(b){const O=x.get(b).programs;O!==void 0&&(O.forEach(function(j){N.releaseProgram(j)}),b.isShaderMaterial&&N.releaseShaderCache(b))}this.renderBufferDirect=function(b,O,j,X,H,ve){O===null&&(O=it);const ye=H.isMesh&&H.matrixWorld.determinant()<0,xe=Yp(b,O,j,X,H);_e.setMaterial(X,ye);let Ee=j.index,Ce=1;if(X.wireframe===!0){if(Ee=q.getWireframeAttribute(j),Ee===void 0)return;Ce=2}const He=j.drawRange,Ye=j.attributes.position;let Pe=He.start*Ce,ft=(He.start+He.count)*Ce;ve!==null&&(Pe=Math.max(Pe,ve.start*Ce),ft=Math.min(ft,(ve.start+ve.count)*Ce)),Ee!==null?(Pe=Math.max(Pe,0),ft=Math.min(ft,Ee.count)):Ye!=null&&(Pe=Math.max(Pe,0),ft=Math.min(ft,Ye.count));const Rt=ft-Pe;if(Rt<0||Rt===1/0)return;re.setup(H,X,xe,j,Ee);let Ct,pt=Oe;if(Ee!==null&&(Ct=$.get(Ee),pt=I,pt.setIndex(Ct)),H.isMesh)X.wireframe===!0?(_e.setLineWidth(X.wireframeLinewidth*dt()),pt.setMode(D.LINES)):pt.setMode(D.TRIANGLES);else if(H.isLine){let Xt=X.linewidth;Xt===void 0&&(Xt=1),_e.setLineWidth(Xt*dt()),H.isLineSegments?pt.setMode(D.LINES):H.isLineLoop?pt.setMode(D.LINE_LOOP):pt.setMode(D.LINE_STRIP)}else H.isPoints?pt.setMode(D.POINTS):H.isSprite&&pt.setMode(D.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)po("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),pt.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if($e.get("WEBGL_multi_draw"))pt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Xt=H._multiDrawStarts,we=H._multiDrawCounts,si=H._multiDrawCount,at=Ee?$.get(Ee).bytesPerElement:1,yi=x.get(X).currentProgram.getUniforms();for(let Ii=0;Ii<si;Ii++)yi.setValue(D,"_gl_DrawID",Ii),pt.render(Xt[Ii]/at,we[Ii])}else if(H.isInstancedMesh)pt.renderInstances(Pe,Rt,H.count);else if(j.isInstancedBufferGeometry){const Xt=j._maxInstanceCount!==void 0?j._maxInstanceCount:1/0,we=Math.min(j.instanceCount,Xt);pt.renderInstances(Pe,Rt,we)}else pt.render(Pe,Rt)};function Wh(b,O,j){b.transparent===!0&&b.side===Bi&&b.forceSinglePass===!1?(b.side=Qt,b.needsUpdate=!0,aa(b,O,j),b.side=Xi,b.needsUpdate=!0,aa(b,O,j),b.side=Bi):aa(b,O,j)}this.compile=function(b,O,j=null){j===null&&(j=b),T=Q.get(j),T.init(O),R.push(T),j.traverseVisible(function(H){H.isLight&&H.layers.test(O.layers)&&(T.pushLight(H),H.castShadow&&T.pushShadow(H))}),b!==j&&b.traverseVisible(function(H){H.isLight&&H.layers.test(O.layers)&&(T.pushLight(H),H.castShadow&&T.pushShadow(H))}),T.setupLights();const X=new Set;return b.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const ve=H.material;if(ve)if(Array.isArray(ve))for(let ye=0;ye<ve.length;ye++){const xe=ve[ye];Wh(xe,j,H),X.add(xe)}else Wh(ve,j,H),X.add(ve)}),T=R.pop(),X},this.compileAsync=function(b,O,j=null){const X=this.compile(b,O,j);return new Promise(H=>{function ve(){if(X.forEach(function(ye){x.get(ye).currentProgram.isReady()&&X.delete(ye)}),X.size===0){H(b);return}setTimeout(ve,10)}$e.get("KHR_parallel_shader_compile")!==null?ve():setTimeout(ve,10)})};let Ho=null;function jp(b){Ho&&Ho(b)}function Xh(){Un.stop()}function qh(){Un.start()}const Un=new Kf;Un.setAnimationLoop(jp),typeof self<"u"&&Un.setContext(self),this.setAnimationLoop=function(b){Ho=b,Y.setAnimationLoop(b),b===null?Un.stop():Un.start()},Y.addEventListener("sessionstart",Xh),Y.addEventListener("sessionend",qh),this.render=function(b,O){if(O!==void 0&&O.isCamera!==!0){Ue("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;const j=Y.enabled===!0&&Y.isPresenting===!0,X=_!==null&&(k===null||j)&&_.begin(E,k);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),Y.enabled===!0&&Y.isPresenting===!0&&(_===null||_.isCompositing()===!1)&&(Y.cameraAutoUpdate===!0&&Y.updateCamera(O),O=Y.getCamera()),b.isScene===!0&&b.onBeforeRender(E,b,O,k),T=Q.get(b,R.length),T.init(O),R.push(T),Tt.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),Se.setFromProjectionMatrix(Tt,Vi,O.reversedDepth),Le=this.localClippingEnabled,Me=ee.init(this.clippingPlanes,Le),M=oe.get(b,w.length),M.init(),w.push(M),Y.enabled===!0&&Y.isPresenting===!0){const ye=E.xr.getDepthSensingMesh();ye!==null&&Go(ye,O,-1/0,E.sortObjects)}Go(b,O,0,E.sortObjects),M.finish(),E.sortObjects===!0&&M.sort(tt,Qe),ke=Y.enabled===!1||Y.isPresenting===!1||Y.hasDepthSensing()===!1,ke&&me.addToRenderList(M,b),this.info.render.frame++,Me===!0&&ee.beginShadows();const H=T.state.shadowsArray;if(fe.render(H,b,O),Me===!0&&ee.endShadows(),this.info.autoReset===!0&&this.info.reset(),(X&&_.hasRenderPass())===!1){const ye=M.opaque,xe=M.transmissive;if(T.setupLights(),O.isArrayCamera){const Ee=O.cameras;if(xe.length>0)for(let Ce=0,He=Ee.length;Ce<He;Ce++){const Ye=Ee[Ce];Yh(ye,xe,b,Ye)}ke&&me.render(b);for(let Ce=0,He=Ee.length;Ce<He;Ce++){const Ye=Ee[Ce];jh(M,b,Ye,Ye.viewport)}}else xe.length>0&&Yh(ye,xe,b,O),ke&&me.render(b),jh(M,b,O)}k!==null&&F===0&&(U.updateMultisampleRenderTarget(k),U.updateRenderTargetMipmap(k)),X&&_.end(E),b.isScene===!0&&b.onAfterRender(E,b,O),re.resetDefaultState(),V=-1,W=null,R.pop(),R.length>0?(T=R[R.length-1],Me===!0&&ee.setGlobalState(E.clippingPlanes,T.state.camera)):T=null,w.pop(),w.length>0?M=w[w.length-1]:M=null};function Go(b,O,j,X){if(b.visible===!1)return;if(b.layers.test(O.layers)){if(b.isGroup)j=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(O);else if(b.isLight)T.pushLight(b),b.castShadow&&T.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||Se.intersectsSprite(b)){X&&je.setFromMatrixPosition(b.matrixWorld).applyMatrix4(Tt);const ye=pe.update(b),xe=b.material;xe.visible&&M.push(b,ye,xe,j,je.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||Se.intersectsObject(b))){const ye=pe.update(b),xe=b.material;if(X&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),je.copy(b.boundingSphere.center)):(ye.boundingSphere===null&&ye.computeBoundingSphere(),je.copy(ye.boundingSphere.center)),je.applyMatrix4(b.matrixWorld).applyMatrix4(Tt)),Array.isArray(xe)){const Ee=ye.groups;for(let Ce=0,He=Ee.length;Ce<He;Ce++){const Ye=Ee[Ce],Pe=xe[Ye.materialIndex];Pe&&Pe.visible&&M.push(b,ye,Pe,j,je.z,Ye)}}else xe.visible&&M.push(b,ye,xe,j,je.z,null)}}const ve=b.children;for(let ye=0,xe=ve.length;ye<xe;ye++)Go(ve[ye],O,j,X)}function jh(b,O,j,X){const{opaque:H,transmissive:ve,transparent:ye}=b;T.setupLightsView(j),Me===!0&&ee.setGlobalState(E.clippingPlanes,j),X&&_e.viewport(z.copy(X)),H.length>0&&ra(H,O,j),ve.length>0&&ra(ve,O,j),ye.length>0&&ra(ye,O,j),_e.buffers.depth.setTest(!0),_e.buffers.depth.setMask(!0),_e.buffers.color.setMask(!0),_e.setPolygonOffset(!1)}function Yh(b,O,j,X){if((j.isScene===!0?j.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[X.id]===void 0){const Pe=$e.has("EXT_color_buffer_half_float")||$e.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[X.id]=new Yt(1,1,{generateMipmaps:!0,type:Pe?ei:li,minFilter:rn,samples:Math.max(4,rt.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:et.workingColorSpace})}const ve=T.state.transmissionRenderTarget[X.id],ye=X.viewport||z;ve.setSize(ye.z*E.transmissionResolutionScale,ye.w*E.transmissionResolutionScale);const xe=E.getRenderTarget(),Ee=E.getActiveCubeFace(),Ce=E.getActiveMipmapLevel();E.setRenderTarget(ve),E.getClearColor(K),ce=E.getClearAlpha(),ce<1&&E.setClearColor(16777215,.5),E.clear(),ke&&me.render(j);const He=E.toneMapping;E.toneMapping=Wi;const Ye=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),T.setupLightsView(X),Me===!0&&ee.setGlobalState(E.clippingPlanes,X),ra(b,j,X),U.updateMultisampleRenderTarget(ve),U.updateRenderTargetMipmap(ve),$e.has("WEBGL_multisampled_render_to_texture")===!1){let Pe=!1;for(let ft=0,Rt=O.length;ft<Rt;ft++){const Ct=O[ft],{object:pt,geometry:Xt,material:we,group:si}=Ct;if(we.side===Bi&&pt.layers.test(X.layers)){const at=we.side;we.side=Qt,we.needsUpdate=!0,Kh(pt,j,X,Xt,we,si),we.side=at,we.needsUpdate=!0,Pe=!0}}Pe===!0&&(U.updateMultisampleRenderTarget(ve),U.updateRenderTargetMipmap(ve))}E.setRenderTarget(xe,Ee,Ce),E.setClearColor(K,ce),Ye!==void 0&&(X.viewport=Ye),E.toneMapping=He}function ra(b,O,j){const X=O.isScene===!0?O.overrideMaterial:null;for(let H=0,ve=b.length;H<ve;H++){const ye=b[H],{object:xe,geometry:Ee,group:Ce}=ye;let He=ye.material;He.allowOverride===!0&&X!==null&&(He=X),xe.layers.test(j.layers)&&Kh(xe,O,j,Ee,He,Ce)}}function Kh(b,O,j,X,H,ve){b.onBeforeRender(E,O,j,X,H,ve),b.modelViewMatrix.multiplyMatrices(j.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),H.onBeforeRender(E,O,j,X,b,ve),H.transparent===!0&&H.side===Bi&&H.forceSinglePass===!1?(H.side=Qt,H.needsUpdate=!0,E.renderBufferDirect(j,O,X,H,b,ve),H.side=Xi,H.needsUpdate=!0,E.renderBufferDirect(j,O,X,H,b,ve),H.side=Bi):E.renderBufferDirect(j,O,X,H,b,ve),b.onAfterRender(E,O,j,X,H,ve)}function aa(b,O,j){O.isScene!==!0&&(O=it);const X=x.get(b),H=T.state.lights,ve=T.state.shadowsArray,ye=H.state.version,xe=N.getParameters(b,H.state,ve,O,j),Ee=N.getProgramCacheKey(xe);let Ce=X.programs;X.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?O.environment:null,X.fog=O.fog;const He=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;X.envMap=J.get(b.envMap||X.environment,He),X.envMapRotation=X.environment!==null&&b.envMap===null?O.environmentRotation:b.envMapRotation,Ce===void 0&&(b.addEventListener("dispose",ct),Ce=new Map,X.programs=Ce);let Ye=Ce.get(Ee);if(Ye!==void 0){if(X.currentProgram===Ye&&X.lightsStateVersion===ye)return Jh(b,xe),Ye}else xe.uniforms=N.getUniforms(b),b.onBeforeCompile(xe,E),Ye=N.acquireProgram(xe,Ee),Ce.set(Ee,Ye),X.uniforms=xe.uniforms;const Pe=X.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Pe.clippingPlanes=ee.uniform),Jh(b,xe),X.needsLights=Zp(b),X.lightsStateVersion=ye,X.needsLights&&(Pe.ambientLightColor.value=H.state.ambient,Pe.lightProbe.value=H.state.probe,Pe.directionalLights.value=H.state.directional,Pe.directionalLightShadows.value=H.state.directionalShadow,Pe.spotLights.value=H.state.spot,Pe.spotLightShadows.value=H.state.spotShadow,Pe.rectAreaLights.value=H.state.rectArea,Pe.ltc_1.value=H.state.rectAreaLTC1,Pe.ltc_2.value=H.state.rectAreaLTC2,Pe.pointLights.value=H.state.point,Pe.pointLightShadows.value=H.state.pointShadow,Pe.hemisphereLights.value=H.state.hemi,Pe.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Pe.spotLightMatrix.value=H.state.spotLightMatrix,Pe.spotLightMap.value=H.state.spotLightMap,Pe.pointShadowMatrix.value=H.state.pointShadowMatrix),X.currentProgram=Ye,X.uniformsList=null,Ye}function Zh(b){if(b.uniformsList===null){const O=b.currentProgram.getUniforms();b.uniformsList=to.seqWithValue(O.seq,b.uniforms)}return b.uniformsList}function Jh(b,O){const j=x.get(b);j.outputColorSpace=O.outputColorSpace,j.batching=O.batching,j.batchingColor=O.batchingColor,j.instancing=O.instancing,j.instancingColor=O.instancingColor,j.instancingMorph=O.instancingMorph,j.skinning=O.skinning,j.morphTargets=O.morphTargets,j.morphNormals=O.morphNormals,j.morphColors=O.morphColors,j.morphTargetsCount=O.morphTargetsCount,j.numClippingPlanes=O.numClippingPlanes,j.numIntersection=O.numClipIntersection,j.vertexAlphas=O.vertexAlphas,j.vertexTangents=O.vertexTangents,j.toneMapping=O.toneMapping}function Yp(b,O,j,X,H){O.isScene!==!0&&(O=it),U.resetTextureUnits();const ve=O.fog,ye=X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial?O.environment:null,xe=k===null?E.outputColorSpace:k.isXRRenderTarget===!0?k.texture.colorSpace:ti,Ee=X.isMeshStandardMaterial||X.isMeshLambertMaterial&&!X.envMap||X.isMeshPhongMaterial&&!X.envMap,Ce=J.get(X.envMap||ye,Ee),He=X.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,Ye=!!j.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Pe=!!j.morphAttributes.position,ft=!!j.morphAttributes.normal,Rt=!!j.morphAttributes.color;let Ct=Wi;X.toneMapped&&(k===null||k.isXRRenderTarget===!0)&&(Ct=E.toneMapping);const pt=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,Xt=pt!==void 0?pt.length:0,we=x.get(X),si=T.state.lights;if(Me===!0&&(Le===!0||b!==W)){const kt=b===W&&X.id===V;ee.setState(X,b,kt)}let at=!1;X.version===we.__version?(we.needsLights&&we.lightsStateVersion!==si.state.version||we.outputColorSpace!==xe||H.isBatchedMesh&&we.batching===!1||!H.isBatchedMesh&&we.batching===!0||H.isBatchedMesh&&we.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&we.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&we.instancing===!1||!H.isInstancedMesh&&we.instancing===!0||H.isSkinnedMesh&&we.skinning===!1||!H.isSkinnedMesh&&we.skinning===!0||H.isInstancedMesh&&we.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&we.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&we.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&we.instancingMorph===!1&&H.morphTexture!==null||we.envMap!==Ce||X.fog===!0&&we.fog!==ve||we.numClippingPlanes!==void 0&&(we.numClippingPlanes!==ee.numPlanes||we.numIntersection!==ee.numIntersection)||we.vertexAlphas!==He||we.vertexTangents!==Ye||we.morphTargets!==Pe||we.morphNormals!==ft||we.morphColors!==Rt||we.toneMapping!==Ct||we.morphTargetsCount!==Xt)&&(at=!0):(at=!0,we.__version=X.version);let yi=we.currentProgram;at===!0&&(yi=aa(X,O,H));let Ii=!1,On=!1,ss=!1;const xt=yi.getUniforms(),Vt=we.uniforms;if(_e.useProgram(yi.program)&&(Ii=!0,On=!0,ss=!0),X.id!==V&&(V=X.id,On=!0),Ii||W!==b){_e.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),xt.setValue(D,"projectionMatrix",b.projectionMatrix),xt.setValue(D,"viewMatrix",b.matrixWorldInverse);const dn=xt.map.cameraPosition;dn!==void 0&&dn.setValue(D,Ge.setFromMatrixPosition(b.matrixWorld)),rt.logarithmicDepthBuffer&&xt.setValue(D,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&xt.setValue(D,"isOrthographic",b.isOrthographicCamera===!0),W!==b&&(W=b,On=!0,ss=!0)}if(we.needsLights&&(si.state.directionalShadowMap.length>0&&xt.setValue(D,"directionalShadowMap",si.state.directionalShadowMap,U),si.state.spotShadowMap.length>0&&xt.setValue(D,"spotShadowMap",si.state.spotShadowMap,U),si.state.pointShadowMap.length>0&&xt.setValue(D,"pointShadowMap",si.state.pointShadowMap,U)),H.isSkinnedMesh){xt.setOptional(D,H,"bindMatrix"),xt.setOptional(D,H,"bindMatrixInverse");const kt=H.skeleton;kt&&(kt.boneTexture===null&&kt.computeBoneTexture(),xt.setValue(D,"boneTexture",kt.boneTexture,U))}H.isBatchedMesh&&(xt.setOptional(D,H,"batchingTexture"),xt.setValue(D,"batchingTexture",H._matricesTexture,U),xt.setOptional(D,H,"batchingIdTexture"),xt.setValue(D,"batchingIdTexture",H._indirectTexture,U),xt.setOptional(D,H,"batchingColorTexture"),H._colorsTexture!==null&&xt.setValue(D,"batchingColorTexture",H._colorsTexture,U));const un=j.morphAttributes;if((un.position!==void 0||un.normal!==void 0||un.color!==void 0)&&he.update(H,j,yi),(On||we.receiveShadow!==H.receiveShadow)&&(we.receiveShadow=H.receiveShadow,xt.setValue(D,"receiveShadow",H.receiveShadow)),(X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial)&&X.envMap===null&&O.environment!==null&&(Vt.envMapIntensity.value=O.environmentIntensity),Vt.dfgLUT!==void 0&&(Vt.dfgLUT.value=ZM()),On&&(xt.setValue(D,"toneMappingExposure",E.toneMappingExposure),we.needsLights&&Kp(Vt,ss),ve&&X.fog===!0&&G.refreshFogUniforms(Vt,ve),G.refreshMaterialUniforms(Vt,X,Ne,ue,T.state.transmissionRenderTarget[b.id]),to.upload(D,Zh(we),Vt,U)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(to.upload(D,Zh(we),Vt,U),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&xt.setValue(D,"center",H.center),xt.setValue(D,"modelViewMatrix",H.modelViewMatrix),xt.setValue(D,"normalMatrix",H.normalMatrix),xt.setValue(D,"modelMatrix",H.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const kt=X.uniformsGroups;for(let dn=0,rs=kt.length;dn<rs;dn++){const Qh=kt[dn];be.update(Qh,yi),be.bind(Qh,yi)}}return yi}function Kp(b,O){b.ambientLightColor.needsUpdate=O,b.lightProbe.needsUpdate=O,b.directionalLights.needsUpdate=O,b.directionalLightShadows.needsUpdate=O,b.pointLights.needsUpdate=O,b.pointLightShadows.needsUpdate=O,b.spotLights.needsUpdate=O,b.spotLightShadows.needsUpdate=O,b.rectAreaLights.needsUpdate=O,b.hemisphereLights.needsUpdate=O}function Zp(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return F},this.getRenderTarget=function(){return k},this.setRenderTargetTextures=function(b,O,j){const X=x.get(b);X.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),x.get(b.texture).__webglTexture=O,x.get(b.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:j,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,O){const j=x.get(b);j.__webglFramebuffer=O,j.__useDefaultFramebuffer=O===void 0};const Jp=D.createFramebuffer();this.setRenderTarget=function(b,O=0,j=0){k=b,C=O,F=j;let X=null,H=!1,ve=!1;if(b){const xe=x.get(b);if(xe.__useDefaultFramebuffer!==void 0){_e.bindFramebuffer(D.FRAMEBUFFER,xe.__webglFramebuffer),z.copy(b.viewport),B.copy(b.scissor),ie=b.scissorTest,_e.viewport(z),_e.scissor(B),_e.setScissorTest(ie),V=-1;return}else if(xe.__webglFramebuffer===void 0)U.setupRenderTarget(b);else if(xe.__hasExternalTextures)U.rebindTextures(b,x.get(b.texture).__webglTexture,x.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){const He=b.depthTexture;if(xe.__boundDepthTexture!==He){if(He!==null&&x.has(He)&&(b.width!==He.image.width||b.height!==He.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");U.setupDepthRenderbuffer(b)}}const Ee=b.texture;(Ee.isData3DTexture||Ee.isDataArrayTexture||Ee.isCompressedArrayTexture)&&(ve=!0);const Ce=x.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ce[O])?X=Ce[O][j]:X=Ce[O],H=!0):b.samples>0&&U.useMultisampledRTT(b)===!1?X=x.get(b).__webglMultisampledFramebuffer:Array.isArray(Ce)?X=Ce[j]:X=Ce,z.copy(b.viewport),B.copy(b.scissor),ie=b.scissorTest}else z.copy(Z).multiplyScalar(Ne).floor(),B.copy(ne).multiplyScalar(Ne).floor(),ie=se;if(j!==0&&(X=Jp),_e.bindFramebuffer(D.FRAMEBUFFER,X)&&_e.drawBuffers(b,X),_e.viewport(z),_e.scissor(B),_e.setScissorTest(ie),H){const xe=x.get(b.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+O,xe.__webglTexture,j)}else if(ve){const xe=O;for(let Ee=0;Ee<b.textures.length;Ee++){const Ce=x.get(b.textures[Ee]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+Ee,Ce.__webglTexture,j,xe)}}else if(b!==null&&j!==0){const xe=x.get(b.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,xe.__webglTexture,j)}V=-1},this.readRenderTargetPixels=function(b,O,j,X,H,ve,ye,xe=0){if(!(b&&b.isWebGLRenderTarget)){Ue("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ee=x.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&ye!==void 0&&(Ee=Ee[ye]),Ee){_e.bindFramebuffer(D.FRAMEBUFFER,Ee);try{const Ce=b.textures[xe],He=Ce.format,Ye=Ce.type;if(b.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+xe),!rt.textureFormatReadable(He)){Ue("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!rt.textureTypeReadable(Ye)){Ue("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=b.width-X&&j>=0&&j<=b.height-H&&D.readPixels(O,j,X,H,le.convert(He),le.convert(Ye),ve)}finally{const Ce=k!==null?x.get(k).__webglFramebuffer:null;_e.bindFramebuffer(D.FRAMEBUFFER,Ce)}}},this.readRenderTargetPixelsAsync=async function(b,O,j,X,H,ve,ye,xe=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ee=x.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&ye!==void 0&&(Ee=Ee[ye]),Ee)if(O>=0&&O<=b.width-X&&j>=0&&j<=b.height-H){_e.bindFramebuffer(D.FRAMEBUFFER,Ee);const Ce=b.textures[xe],He=Ce.format,Ye=Ce.type;if(b.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+xe),!rt.textureFormatReadable(He))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!rt.textureTypeReadable(Ye))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Pe=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Pe),D.bufferData(D.PIXEL_PACK_BUFFER,ve.byteLength,D.STREAM_READ),D.readPixels(O,j,X,H,le.convert(He),le.convert(Ye),0);const ft=k!==null?x.get(k).__webglFramebuffer:null;_e.bindFramebuffer(D.FRAMEBUFFER,ft);const Rt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Sg(D,Rt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Pe),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ve),D.deleteBuffer(Pe),D.deleteSync(Rt),ve}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,O=null,j=0){const X=Math.pow(2,-j),H=Math.floor(b.image.width*X),ve=Math.floor(b.image.height*X),ye=O!==null?O.x:0,xe=O!==null?O.y:0;U.setTexture2D(b,0),D.copyTexSubImage2D(D.TEXTURE_2D,j,0,0,ye,xe,H,ve),_e.unbindTexture()};const Qp=D.createFramebuffer(),$p=D.createFramebuffer();this.copyTextureToTexture=function(b,O,j=null,X=null,H=0,ve=0){let ye,xe,Ee,Ce,He,Ye,Pe,ft,Rt;const Ct=b.isCompressedTexture?b.mipmaps[ve]:b.image;if(j!==null)ye=j.max.x-j.min.x,xe=j.max.y-j.min.y,Ee=j.isBox3?j.max.z-j.min.z:1,Ce=j.min.x,He=j.min.y,Ye=j.isBox3?j.min.z:0;else{const Vt=Math.pow(2,-H);ye=Math.floor(Ct.width*Vt),xe=Math.floor(Ct.height*Vt),b.isDataArrayTexture?Ee=Ct.depth:b.isData3DTexture?Ee=Math.floor(Ct.depth*Vt):Ee=1,Ce=0,He=0,Ye=0}X!==null?(Pe=X.x,ft=X.y,Rt=X.z):(Pe=0,ft=0,Rt=0);const pt=le.convert(O.format),Xt=le.convert(O.type);let we;O.isData3DTexture?(U.setTexture3D(O,0),we=D.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(U.setTexture2DArray(O,0),we=D.TEXTURE_2D_ARRAY):(U.setTexture2D(O,0),we=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,O.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,O.unpackAlignment);const si=D.getParameter(D.UNPACK_ROW_LENGTH),at=D.getParameter(D.UNPACK_IMAGE_HEIGHT),yi=D.getParameter(D.UNPACK_SKIP_PIXELS),Ii=D.getParameter(D.UNPACK_SKIP_ROWS),On=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,Ct.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Ct.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Ce),D.pixelStorei(D.UNPACK_SKIP_ROWS,He),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ye);const ss=b.isDataArrayTexture||b.isData3DTexture,xt=O.isDataArrayTexture||O.isData3DTexture;if(b.isDepthTexture){const Vt=x.get(b),un=x.get(O),kt=x.get(Vt.__renderTarget),dn=x.get(un.__renderTarget);_e.bindFramebuffer(D.READ_FRAMEBUFFER,kt.__webglFramebuffer),_e.bindFramebuffer(D.DRAW_FRAMEBUFFER,dn.__webglFramebuffer);for(let rs=0;rs<Ee;rs++)ss&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,x.get(b).__webglTexture,H,Ye+rs),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,x.get(O).__webglTexture,ve,Rt+rs)),D.blitFramebuffer(Ce,He,ye,xe,Pe,ft,ye,xe,D.DEPTH_BUFFER_BIT,D.NEAREST);_e.bindFramebuffer(D.READ_FRAMEBUFFER,null),_e.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(H!==0||b.isRenderTargetTexture||x.has(b)){const Vt=x.get(b),un=x.get(O);_e.bindFramebuffer(D.READ_FRAMEBUFFER,Qp),_e.bindFramebuffer(D.DRAW_FRAMEBUFFER,$p);for(let kt=0;kt<Ee;kt++)ss?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Vt.__webglTexture,H,Ye+kt):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Vt.__webglTexture,H),xt?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,un.__webglTexture,ve,Rt+kt):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,un.__webglTexture,ve),H!==0?D.blitFramebuffer(Ce,He,ye,xe,Pe,ft,ye,xe,D.COLOR_BUFFER_BIT,D.NEAREST):xt?D.copyTexSubImage3D(we,ve,Pe,ft,Rt+kt,Ce,He,ye,xe):D.copyTexSubImage2D(we,ve,Pe,ft,Ce,He,ye,xe);_e.bindFramebuffer(D.READ_FRAMEBUFFER,null),_e.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else xt?b.isDataTexture||b.isData3DTexture?D.texSubImage3D(we,ve,Pe,ft,Rt,ye,xe,Ee,pt,Xt,Ct.data):O.isCompressedArrayTexture?D.compressedTexSubImage3D(we,ve,Pe,ft,Rt,ye,xe,Ee,pt,Ct.data):D.texSubImage3D(we,ve,Pe,ft,Rt,ye,xe,Ee,pt,Xt,Ct):b.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ve,Pe,ft,ye,xe,pt,Xt,Ct.data):b.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ve,Pe,ft,Ct.width,Ct.height,pt,Ct.data):D.texSubImage2D(D.TEXTURE_2D,ve,Pe,ft,ye,xe,pt,Xt,Ct);D.pixelStorei(D.UNPACK_ROW_LENGTH,si),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,at),D.pixelStorei(D.UNPACK_SKIP_PIXELS,yi),D.pixelStorei(D.UNPACK_SKIP_ROWS,Ii),D.pixelStorei(D.UNPACK_SKIP_IMAGES,On),ve===0&&O.generateMipmaps&&D.generateMipmap(we),_e.unbindTexture()},this.initRenderTarget=function(b){x.get(b).__webglFramebuffer===void 0&&U.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?U.setTextureCube(b,0):b.isData3DTexture?U.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?U.setTexture2DArray(b,0):U.setTexture2D(b,0),_e.unbindTexture()},this.resetState=function(){C=0,F=0,k=null,_e.reset(),re.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Vi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=et._getDrawingBufferColorSpace(e),t.unpackColorSpace=et._getUnpackColorSpace()}}const ip=()=>In.archives.map((n,e)=>({id:"X-"+String(e+1).padStart(3,"0"),key:n.id,title:n.title,en:n.en||n.title,department:n.department,category:n.category,date:n.date,lead:n.lead,clearance:n.unlocked?"已解锁":"尚未解锁",abstract:n.body||n.summary,findings:n.notes,source:"",unlocked:n.unlocked})),vt=ip(),hn=[...new Set(vt.map(n=>n.category))],JM=["全部档案",...hn];window.addEventListener("linking-progress",()=>vt.splice(0,vt.length,...ip()));function cr(n){return vt.map((e,t)=>({record:e,index:t})).filter(({record:e})=>e.category===hn[n]).map(({index:e})=>e)}function Rn(n){const e=hn.indexOf(vt[n].category),t=12+cr(e).indexOf(n);return{lane:e,row:t,slot:e*32+t}}const wd=9,vo=32,mi=5.2,gi=.62,QM=[0,1,2,3,4,-2,-1,5,6];function Wc(n,e){return(n%e+e)%e}function Ad(n,e,t){return n+Math.floor((e-n+t/2)/t)*t}function Fl({lane:n,row:e}){const t=cr(Wc(n,hn.length));return t[Wc(e-12,t.length)]}function $M(n,e,t){if(t&&"cell"in t)return{...t.cell};const i=Rn(n),s=Ad(i.row,e.row,cr(i.lane).length);return t&&"axis"in t&&t.axis==="row"?{lane:e.lane,row:e.row+t.direction}:{lane:t&&"axis"in t&&t.axis==="lane"?e.lane+t.direction:Ad(i.lane,e.lane,hn.length),row:s}}function Bl(n){return{lane:QM[Math.floor(n/vo)],row:n%vo}}function sn(n){return`${n.lane}:${n.row}`}function Tr(n,e){return n.lane===e.lane&&n.row===e.row}const eb=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];class tb{camera=new Wt;frustum=new ea;matrix=new ze;box=new _i;candidates=0;previous=[];cachedCells=[];update(e,t,i,s,r){const a=[...e.projectionMatrix.elements,...e.matrixWorldInverse.elements,e.near,e.far,t,i,s,Number(r)];if(a.every((y,S)=>y===this.previous[S]))return this.cachedCells;this.previous=a,this.camera.copy(e,!1),this.camera.far=Math.min(e.far,Math.max(e.near+1,t+8)),this.camera.updateProjectionMatrix();const o=r?1.5:1.18;this.camera.projectionMatrix.elements[0]/=o,this.camera.projectionMatrix.elements[5]/=o,this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(),this.matrix.multiplyMatrices(this.camera.projectionMatrix,e.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.matrix);const l=this.matrix.clone().invert(),c=Array.from({length:8},(y,S)=>new P(S&1?1:-1,S&2?1:-1,S&4?1:-1).applyMatrix4(l)),h=new _i,d=-6.5,u=6.5;for(const y of c)y.y>=d&&y.y<=u&&h.expandByPoint(y);for(const[y,S]of eb)for(const M of[d,u]){const T=c[y],w=c[S],R=w.y-T.y;if(Math.abs(R)<1e-9)continue;const _=(M-T.y)/R;_>=0&&_<=1&&h.expandByPoint(T.clone().lerp(w,_))}if(h.isEmpty())return this.candidates=0,this.cachedCells=[];const f=Math.floor((h.min.x-2.8+i)/mi+2)-1,m=Math.ceil((h.max.x+2.8+i)/mi+2)+1,v=Math.floor((h.min.z-.6-s)/gi+15.5)-2,p=Math.ceil((h.max.z+.6-s)/gi+15.5)+2,g=[];for(let y=f;y<=m;y++)for(let S=v;S<=p;S++){const M=(y-2)*mi-i,T=(S-15.5)*gi+s;this.box.min.set(M-2.8,d,T-1.2),this.box.max.set(M+2.8,u,T+1.2),this.frustum.intersectsBox(this.box)&&g.push({lane:y,row:S})}return this.candidates=g.length,this.cachedCells=g}intersects(e,t,i){return this.box.min.set(e-2.8,t-.3,i-1.2),this.box.max.set(e+2.8,t+4.1,i+1.2),this.frustum.intersectsBox(this.box)}}class Ls{first=1/0;last=-1;attribute;constructor(e){this.attribute=e}set(e,t){const i=this.attribute.array;for(let s=0;s<t.length;s++){const r=e+s,a=Math.fround(t[s]);i[r]!==a&&(i[r]=a,this.first=Math.min(this.first,r),this.last=Math.max(this.last,r))}}scalar(e,t){t=Math.fround(t),this.attribute.array[e]!==t&&(this.attribute.array[e]=t,this.first=Math.min(this.first,e),this.last=Math.max(this.last,e))}commit(){return this.last<0?!1:(this.attribute.addUpdateRange(this.first,this.last-this.first+1),this.attribute.needsUpdate=!0,this.first=1/0,this.last=-1,!0)}}class ib{frustum=new ea;matrix=new ze;box=new _i;update(e){this.matrix.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.matrix)}contains(e,t,i){return this.box.min.set(e-2.8,t-.3,i-1.2),this.box.max.set(e+2.8,t+4.1,i+1.2),this.frustum.intersectsBox(this.box)}}class nb{mesh;updates;count=0;constructor(e){this.mesh=new $n(e.geometry,e.material,e.instanceMatrix.count),this.mesh.name="archive-shadow-coverage",this.mesh.frustumCulled=!1,this.mesh.castShadow=!0,this.mesh.userData.excludeFromAO=!0,this.mesh.userData.shadowOnly=!0,this.mesh.onBeforeRender=()=>{this.mesh.count=0},this.mesh.onAfterRender=()=>{this.mesh.count=this.count},this.mesh.instanceMatrix.setUsage(Ds),this.updates=new Ls(this.mesh.instanceMatrix),e.castShadow=!1}begin(){this.count=0}add(e){if(this.count===this.mesh.instanceMatrix.count){const t=this.mesh.instanceMatrix;this.mesh.dispose(),this.mesh.instanceMatrix=new Qn(new Float32Array(t.array.length*2),16).setUsage(Ds),this.mesh.instanceMatrix.array.set(t.array),this.updates=new Ls(this.mesh.instanceMatrix)}this.updates.set(this.count++*16,e.elements)}commit(){const e=this.mesh.count!==this.count;return this.mesh.count=this.count,this.updates.commit()||e}}class Cd{values=[];cursor=0;changed=!0;begin(){this.cursor=0}add(...e){for(const t of e)this.values[this.cursor]!==t&&(this.changed=!0),this.values[this.cursor++]=t}floats(...e){this.add(...e.map(t=>t===void 0?void 0:Math.fround(t)))}end(){const e=this.changed||this.values.length!==this.cursor;return this.values.length=this.cursor,this.changed=!1,e}invalidate(){this.changed=!0}}class Nn{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const sb=new ia(-1,1,1,-1,0,1);class rb extends fi{constructor(){super(),this.setAttribute("position",new ui([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ui([0,2,0,0,2,0],2))}}const ab=new rb;class hr{constructor(e){this._mesh=new st(ab,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,sb)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ob{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let i,s,r;const a=.5*(Math.sqrt(3)-1),o=(e+t)*a,l=Math.floor(e+o),c=Math.floor(t+o),h=(3-Math.sqrt(3))/6,d=(l+c)*h,u=l-d,f=c-d,m=e-u,v=t-f;let p,g;m>v?(p=1,g=0):(p=0,g=1);const y=m-p+h,S=v-g+h,M=m-1+2*h,T=v-1+2*h,w=l&255,R=c&255,_=this.perm[w+this.perm[R]]%12,E=this.perm[w+p+this.perm[R+g]]%12,L=this.perm[w+1+this.perm[R+1]]%12;let C=.5-m*m-v*v;C<0?i=0:(C*=C,i=C*C*this._dot(this.grad3[_],m,v));let F=.5-y*y-S*S;F<0?s=0:(F*=F,s=F*F*this._dot(this.grad3[E],y,S));let k=.5-M*M-T*T;return k<0?r=0:(k*=k,r=k*k*this._dot(this.grad3[L],M,T)),70*(i+s+r)}noise3d(e,t,i){let s,r,a,o;const c=(e+t+i)*.3333333333333333,h=Math.floor(e+c),d=Math.floor(t+c),u=Math.floor(i+c),f=1/6,m=(h+d+u)*f,v=h-m,p=d-m,g=u-m,y=e-v,S=t-p,M=i-g;let T,w,R,_,E,L;y>=S?S>=M?(T=1,w=0,R=0,_=1,E=1,L=0):y>=M?(T=1,w=0,R=0,_=1,E=0,L=1):(T=0,w=0,R=1,_=1,E=0,L=1):S<M?(T=0,w=0,R=1,_=0,E=1,L=1):y<M?(T=0,w=1,R=0,_=0,E=1,L=1):(T=0,w=1,R=0,_=1,E=1,L=0);const C=y-T+f,F=S-w+f,k=M-R+f,V=y-_+2*f,W=S-E+2*f,z=M-L+2*f,B=y-1+3*f,ie=S-1+3*f,K=M-1+3*f,ce=h&255,de=d&255,ue=u&255,Ne=this.perm[ce+this.perm[de+this.perm[ue]]]%12,tt=this.perm[ce+T+this.perm[de+w+this.perm[ue+R]]]%12,Qe=this.perm[ce+_+this.perm[de+E+this.perm[ue+L]]]%12,Z=this.perm[ce+1+this.perm[de+1+this.perm[ue+1]]]%12;let ne=.6-y*y-S*S-M*M;ne<0?s=0:(ne*=ne,s=ne*ne*this._dot3(this.grad3[Ne],y,S,M));let se=.6-C*C-F*F-k*k;se<0?r=0:(se*=se,r=se*se*this._dot3(this.grad3[tt],C,F,k));let Se=.6-V*V-W*W-z*z;Se<0?a=0:(Se*=Se,a=Se*Se*this._dot3(this.grad3[Qe],V,W,z));let Me=.6-B*B-ie*ie-K*K;return Me<0?o=0:(Me*=Me,o=Me*Me*this._dot3(this.grad3[Z],B,ie,K)),32*(s+r+a+o)}noise4d(e,t,i,s){const r=this.grad4,a=this.simplex,o=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20;let h,d,u,f,m;const v=(e+t+i+s)*l,p=Math.floor(e+v),g=Math.floor(t+v),y=Math.floor(i+v),S=Math.floor(s+v),M=(p+g+y+S)*c,T=p-M,w=g-M,R=y-M,_=S-M,E=e-T,L=t-w,C=i-R,F=s-_,k=E>L?32:0,V=E>C?16:0,W=L>C?8:0,z=E>F?4:0,B=L>F?2:0,ie=C>F?1:0,K=k+V+W+z+B+ie,ce=a[K][0]>=3?1:0,de=a[K][1]>=3?1:0,ue=a[K][2]>=3?1:0,Ne=a[K][3]>=3?1:0,tt=a[K][0]>=2?1:0,Qe=a[K][1]>=2?1:0,Z=a[K][2]>=2?1:0,ne=a[K][3]>=2?1:0,se=a[K][0]>=1?1:0,Se=a[K][1]>=1?1:0,Me=a[K][2]>=1?1:0,Le=a[K][3]>=1?1:0,Tt=E-ce+c,Ge=L-de+c,je=C-ue+c,it=F-Ne+c,ke=E-tt+2*c,dt=L-Qe+2*c,D=C-Z+2*c,_t=F-ne+2*c,$e=E-se+3*c,rt=L-Se+3*c,_e=C-Me+3*c,A=F-Le+3*c,x=E-1+4*c,U=L-1+4*c,J=C-1+4*c,$=F-1+4*c,q=p&255,pe=g&255,N=y&255,G=S&255,oe=o[q+o[pe+o[N+o[G]]]]%32,Q=o[q+ce+o[pe+de+o[N+ue+o[G+Ne]]]]%32,ee=o[q+tt+o[pe+Qe+o[N+Z+o[G+ne]]]]%32,fe=o[q+se+o[pe+Se+o[N+Me+o[G+Le]]]]%32,me=o[q+1+o[pe+1+o[N+1+o[G+1]]]]%32;let he=.6-E*E-L*L-C*C-F*F;he<0?h=0:(he*=he,h=he*he*this._dot4(r[oe],E,L,C,F));let Oe=.6-Tt*Tt-Ge*Ge-je*je-it*it;Oe<0?d=0:(Oe*=Oe,d=Oe*Oe*this._dot4(r[Q],Tt,Ge,je,it));let I=.6-ke*ke-dt*dt-D*D-_t*_t;I<0?u=0:(I*=I,u=I*I*this._dot4(r[ee],ke,dt,D,_t));let le=.6-$e*$e-rt*rt-_e*_e-A*A;le<0?f=0:(le*=le,f=le*le*this._dot4(r[fe],$e,rt,_e,A));let re=.6-x*x-U*U-J*J-$*$;return re<0?m=0:(re*=re,m=re*re*this._dot4(r[me],x,U,J,$)),27*(h+d+u+f+m)}_dot(e,t,i){return e[0]*t+e[1]*i}_dot3(e,t,i,s){return e[0]*t+e[1]*i+e[2]*s}_dot4(e,t,i,s,r){return e[0]*t+e[1]*i+e[2]*s+e[3]*r}}const Ba={defines:{PERSPECTIVE_CAMERA:1,KERNEL_SIZE:32},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},kernel:{value:null},cameraNear:{value:null},cameraFar:{value:null},resolution:{value:new De},cameraProjectionMatrix:{value:new ze},cameraInverseProjectionMatrix:{value:new ze},kernelRadius:{value:8},minDistance:{value:.005},maxDistance:{value:.05}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;

		uniform vec3 kernel[ KERNEL_SIZE ];

		uniform vec2 resolution;

		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraInverseProjectionMatrix;

		uniform float kernelRadius;
		uniform float minDistance; // avoid artifacts caused by neighbour fragments with minimal depth difference
		uniform float maxDistance; // avoid the influence of fragments which are too far away

		varying vec2 vUv;

		#include <packing>

		#ifdef USE_REVERSED_DEPTH_BUFFER

			const float depthThreshold = 0.0;

		#else

			const float depthThreshold = 1.0;

		#endif

		float getDepth( const in vec2 screenPosition ) {

			return texture2D( tDepth, screenPosition ).x;

		}

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		float getViewZ( const in float depth ) {

			#if PERSPECTIVE_CAMERA == 1

				return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );

			#else

				return orthographicDepthToViewZ( depth, cameraNear, cameraFar );

			#endif

		}

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {

			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];

			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );

			clipPosition *= clipW; // unprojection.

			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;

		}

		vec3 getViewNormal( const in vec2 screenPosition ) {

			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );

		}

		void main() {

			float depth = getDepth( vUv );

			if ( depth == depthThreshold ) {

				gl_FragColor = vec4( 1.0 ); // don't influence background

			} else {

				float viewZ = getViewZ( depth );

				vec3 viewPosition = getViewPosition( vUv, depth, viewZ );
				vec3 viewNormal = getViewNormal( vUv );

				vec2 noiseScale = vec2( resolution.x / 4.0, resolution.y / 4.0 );
				vec3 random = vec3( texture2D( tNoise, vUv * noiseScale ).r );

				// compute matrix used to reorient a kernel vector

				vec3 tangent = normalize( random - viewNormal * dot( random, viewNormal ) );
				vec3 bitangent = cross( viewNormal, tangent );
				mat3 kernelMatrix = mat3( tangent, bitangent, viewNormal );

				float occlusion = 0.0;

				for ( int i = 0; i < KERNEL_SIZE; i ++ ) {

					vec3 sampleVector = kernelMatrix * kernel[ i ]; // reorient sample vector in view space
					vec3 samplePoint = viewPosition + ( sampleVector * kernelRadius ); // calculate sample point

					vec4 samplePointNDC = cameraProjectionMatrix * vec4( samplePoint, 1.0 ); // project point and calculate NDC
					samplePointNDC /= samplePointNDC.w;

					vec2 samplePointUv = samplePointNDC.xy * 0.5 + 0.5; // compute uv coordinates

					float realDepth = getLinearDepth( samplePointUv ); // get linear depth from depth texture
					float sampleDepth = viewZToOrthographicDepth( samplePoint.z, cameraNear, cameraFar ); // compute linear depth of the sample view Z value
					float delta = sampleDepth - realDepth;

					if ( delta > minDistance && delta < maxDistance ) { // if fragment is before sample point, increase occlusion

						occlusion += 1.0;

					}

				}

				occlusion = clamp( occlusion / float( KERNEL_SIZE ), 0.0, 1.0 );

				gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );

			}

		}`},ka={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;

		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		void main() {

			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},za={uniforms:{tDiffuse:{value:null},resolution:{value:new De}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDiffuse;

		uniform vec2 resolution;

		varying vec2 vUv;

		void main() {

			vec2 texelSize = ( 1.0 / resolution );
			float result = 0.0;

			for ( int i = - 2; i <= 2; i ++ ) {

				for ( int j = - 2; j <= 2; j ++ ) {

					vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;
					result += texture2D( tDiffuse, vUv + offset ).r;

				}

			}

			gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );

		}`},io={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class Tn extends Nn{constructor(e,t,i=512,s=512,r=32){super(),this.width=i,this.height=s,this.clear=!0,this.needsSwap=!1,this.camera=t,this.scene=e,this.kernelRadius=8,this.kernel=[],this.noiseTexture=null,this.output=0,this.minDistance=.005,this.maxDistance=.1,this._visibilityCache=[],this._generateSampleKernel(r),this._generateRandomKernelRotations();const a=new js;a.format=wn,a.type=Ws,this.normalRenderTarget=new Yt(this.width,this.height,{minFilter:St,magFilter:St,type:ei,depthTexture:a}),this.ssaoRenderTarget=new Yt(this.width,this.height,{type:ei}),this.blurRenderTarget=this.ssaoRenderTarget.clone(),this.ssaoMaterial=new Nt({defines:Object.assign({},Ba.defines),uniforms:Ai.clone(Ba.uniforms),vertexShader:Ba.vertexShader,fragmentShader:Ba.fragmentShader,blending:Gt}),this.ssaoMaterial.defines.KERNEL_SIZE=r,this.ssaoMaterial.uniforms.tNormal.value=this.normalRenderTarget.texture,this.ssaoMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.ssaoMaterial.uniforms.tNoise.value=this.noiseTexture,this.ssaoMaterial.uniforms.kernel.value=this.kernel,this.ssaoMaterial.uniforms.cameraNear.value=this.camera.near,this.ssaoMaterial.uniforms.cameraFar.value=this.camera.far,this.ssaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.normalMaterial=new y0,this.normalMaterial.blending=Gt,this.blurMaterial=new Nt({defines:Object.assign({},za.defines),uniforms:Ai.clone(za.uniforms),vertexShader:za.vertexShader,fragmentShader:za.fragmentShader}),this.blurMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.blurMaterial.uniforms.resolution.value.set(this.width,this.height),this.depthRenderMaterial=new Nt({defines:Object.assign({},ka.defines),uniforms:Ai.clone(ka.uniforms),vertexShader:ka.vertexShader,fragmentShader:ka.fragmentShader,blending:Gt}),this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Nt({uniforms:Ai.clone(io.uniforms),vertexShader:io.vertexShader,fragmentShader:io.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Mf,blendDst:Zl,blendEquation:ki,blendSrcAlpha:yf,blendDstAlpha:Zl,blendEquationAlpha:ki}),this._fsQuad=new hr(null),this._originalClearColor=new Ae}dispose(){this.normalRenderTarget.dispose(),this.ssaoRenderTarget.dispose(),this.blurRenderTarget.dispose(),this.normalMaterial.dispose(),this.blurMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}render(e,t,i){switch(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility(),this.ssaoMaterial.uniforms.kernelRadius.value=this.kernelRadius,this.ssaoMaterial.uniforms.minDistance.value=this.minDistance,this.ssaoMaterial.uniforms.maxDistance.value=this.maxDistance,this._renderPass(e,this.ssaoMaterial,this.ssaoRenderTarget),this._renderPass(e,this.blurMaterial,this.blurRenderTarget),this.output){case Tn.OUTPUT.SSAO:this.copyMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.copyMaterial.blending=Gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case Tn.OUTPUT.Blur:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=Gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case Tn.OUTPUT.Depth:this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:i);break;case Tn.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=Gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case Tn.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=fh,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;default:console.warn("THREE.SSAOPass: Unknown output type.")}}setSize(e,t){this.width=e,this.height=t,this.ssaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.blurRenderTarget.setSize(e,t),this.ssaoMaterial.uniforms.resolution.value.set(e,t),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.blurMaterial.uniforms.resolution.value.set(e,t)}_renderPass(e,t,i,s,r){e.getClearColor(this._originalClearColor);const a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_renderOverride(e,t,i,s,r){e.getClearColor(this._originalClearColor);const a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,s=t.clearColor||s,r=t.clearAlpha||r,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_generateSampleKernel(e){const t=this.kernel;for(let i=0;i<e;i++){const s=new P;s.x=Math.random()*2-1,s.y=Math.random()*2-1,s.z=Math.random(),s.normalize();let r=i/e;r=Ie.lerp(.1,1,r*r),s.multiplyScalar(r),t.push(s)}}_generateRandomKernelRotations(){const i=new ob,s=16,r=new Float32Array(s);for(let a=0;a<s;a++){const o=Math.random()*2-1,l=Math.random()*2-1,c=0;r[a]=i.noise3d(o,l,c)}this.noiseTexture=new No(r,4,4,Po,ci),this.noiseTexture.wrapS=Dn,this.noiseTexture.wrapT=Dn,this.noiseTexture.needsUpdate=!0}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(i){(i.isPoints||i.isLine||i.isLine2)&&i.visible&&(i.visible=!1,t.push(i))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}}Tn.OUTPUT={Default:0,SSAO:1,Blur:2,Depth:3,Normal:4};const Va={defines:{DEPTH_PACKING:1,PERSPECTIVE_CAMERA:1},uniforms:{tColor:{value:null},tDepth:{value:null},focus:{value:1},aspect:{value:1},aperture:{value:.025},maxblur:{value:.01},nearClip:{value:1},farClip:{value:1e3}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`};class lb extends Nn{constructor(e,t,i){super(),this.scene=e,this.camera=t;const s=i.focus!==void 0?i.focus:1,r=i.aperture!==void 0?i.aperture:.025,a=i.maxblur!==void 0?i.maxblur:1;this._renderTargetDepth=new Yt(1,1,{minFilter:St,magFilter:St,type:ei}),this._renderTargetDepth.texture.name="BokehPass.depth",this._materialDepth=new Gf,this._materialDepth.depthPacking=dg,this._materialDepth.blending=Gt;const o=Ai.clone(Va.uniforms);o.tDepth.value=this._renderTargetDepth.texture,o.focus.value=s,o.aspect.value=t.aspect,o.aperture.value=r,o.maxblur.value=a,o.nearClip.value=t.near,o.farClip.value=t.far,this.materialBokeh=new Nt({defines:Object.assign({},Va.defines),uniforms:o,vertexShader:Va.vertexShader,fragmentShader:Va.fragmentShader}),this.uniforms=o,this._fsQuad=new hr(this.materialBokeh),this._oldClearColor=new Ae}render(e,t,i){this.scene.overrideMaterial=this._materialDepth,e.getClearColor(this._oldClearColor);const s=e.getClearAlpha(),r=e.autoClear;e.autoClear=!1,e.setClearColor(16777215),e.setClearAlpha(1),e.setRenderTarget(this._renderTargetDepth),e.clear(),e.render(this.scene,this.camera),this.uniforms.tColor.value=i.texture,this.uniforms.nearClip.value=this.camera.near,this.uniforms.farClip.value=this.camera.far,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),e.clear(),this._fsQuad.render(e)),this.scene.overrideMaterial=null,e.setClearColor(this._oldClearColor),e.setClearAlpha(s),e.autoClear=r}setSize(e,t){this.materialBokeh.uniforms.aspect.value=e/t,this._renderTargetDepth.setSize(e,t)}dispose(){this._renderTargetDepth.dispose(),this._materialDepth.dispose(),this.materialBokeh.dispose(),this._fsQuad.dispose()}}class Rd extends Tn{packed;sharing=!0;savedColor=new Ae;depthClear=new Float32Array([1,1,1,1]);constructor(e,t,i,s,r=32){super(e,t,i,s,r),this.ssaoRenderTarget.depthBuffer=!1,this.blurRenderTarget.depthBuffer=!1,this.packed=this.normalRenderTarget.texture.clone(),this.packed.name="Archive.packedDepth",this.normalRenderTarget.textures.push(this.packed),this.normalMaterial.onBeforeCompile=a=>{this.sharing&&(a.vertexShader=`varying vec2 vArchiveZW;
`+a.vertexShader,a.vertexShader=a.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
vArchiveZW = gl_Position.zw;`),a.fragmentShader=`varying vec2 vArchiveZW;
layout(location = 1) out vec4 archivePackedDepth;
#include <packing>
`+a.fragmentShader,a.fragmentShader=a.fragmentShader.replace("void main() {",`void main() {
archivePackedDepth = packDepthToRGBA(0.5 * vArchiveZW.x / vArchiveZW.y + 0.5);`))},this.normalMaterial.customProgramCacheKey=()=>`archive-normal-packed-depth-v1-${this.sharing}`}render(e,t,i,s,r){const a=[];this.scene.traverseVisible(o=>{o.userData.excludeFromAO&&a.push(o)});for(const o of a)o.visible=!1;try{super.render(e,t,i,s,r)}finally{for(const o of a)o.visible=!0}}setSharing(e){e!==this.sharing&&(this.normalRenderTarget.dispose(),this.sharing=e,this.normalRenderTarget.textures.length=1,e&&this.normalRenderTarget.textures.push(this.packed),this.normalMaterial.needsUpdate=!0)}_renderOverride(e,t,i,s,r){e.getClearColor(this.savedColor);const a=e.getClearAlpha(),o=e.autoClear,l=this.scene.overrideMaterial;e.setRenderTarget(i),e.autoClear=!1,e.setClearColor(s,r),e.clear();const c=e.getContext();this.sharing&&c.clearBufferfv(c.COLOR,1,this.depthClear),this.scene.overrideMaterial=t;try{e.render(this.scene,this.camera)}finally{this.scene.overrideMaterial=l,e.autoClear=o,e.setClearColor(this.savedColor,a)}}}class cb extends lb{constructor(e,t,i,s){super(e,t,i),this.source=s,this.quad=new hr(this.materialBokeh)}source;width=1;height=1;quad;setSize(e,t){super.setSize(e,t),this.width=e,this.height=t}render(e,t,i,s,r){const a=this.source(),o=this.uniforms;if(!a.enabled||a.width!==this.width||a.height!==this.height)return super.render(e,t,i,s,r);const l=o.tDepth.value;o.tDepth.value=a.normalRenderTarget.textures[1],o.tColor.value=i.texture,o.nearClip.value=this.camera.near,o.farClip.value=this.camera.far;const c=e.autoClear;e.autoClear=!1,e.setRenderTarget(this.renderToScreen?null:t),this.renderToScreen||e.clear();try{this.quad.render(e)}finally{o.tDepth.value=l,e.autoClear=c}}dispose(){super.dispose(),this.quad.dispose()}}function Xc(n){const e=new Set,t=new Set,i=new Set;n.traverse(s=>{if(s instanceof st){s instanceof $n&&s.dispose(),e.add(s.geometry);for(const r of[s.material,s.userData.fullMaterial,s.userData.fastMaterial].flat())r instanceof di&&t.add(r)}});for(const s of t){for(const r of Object.values(s))r instanceof Et&&i.add(r);s.dispose()}n instanceof Io&&(n.environment&&i.add(n.environment),n.background instanceof Et&&i.add(n.background)),e.forEach(s=>s.dispose()),i.forEach(s=>s.dispose()),n.clear()}const Pd=n=>`${n.lane}:${n.row}`,Dd=n=>(n=Math.max(0,Math.min(1,n)),n*n*(3-2*n));class hb{target=0;start=-10;origin={row:12,lane:2};from=new Map;latest=new Map;backgroundFrom=0;set(e,t,i,s=!1){const r=e?1:0;r===this.target&&!s||(this.backgroundFrom=s?r:this.background(t),this.from=s?new Map:new Map(this.latest),this.target=r,this.start=s?t-10:t,this.origin={...i})}background(e){return this.backgroundFrom+(this.target-this.backgroundFrom)*Dd((e-this.start)/.85)}beginFrame(){this.latest.clear()}sample(e,t){if(t-this.start>=1.18)return this.target;const i=Math.min(.6,Math.abs(e.row-this.origin.row)*.034+Math.abs(e.lane-this.origin.lane)*.11),s=this.from.get(Pd(e))??this.backgroundFrom,r=s+(this.target-s)*Dd((t-this.start-i)/.58);return this.latest.set(Pd(e),r),r}}const ub={Frosted_Polymer:"#626b70",Ivory_Edges:"#687277",Optical_Diffuser:"#192226",Titanium_Fasteners:"#b1b9bb",Index_Inlay:"#c6a36b",Printed_Label:"#303a3e",Subsurface_Optics:"#939e9f",Optical_Edges:"#bbc3bc",Carbon_Ink:"#b6bdb8"};function xo(n,e,t=!1,i={value:0}){const s={value:0},r=n.onBeforeCompile,a=n.customProgramCacheKey.bind(n)(),o=new Ae(ub[e]??(e.includes("Orange")?"#bb8850":"#969f9f"));return n.onBeforeCompile=(l,c)=>{r.call(n,l,c),l.uniforms.rhineTheme=s,l.uniforms.rhineDarkSurface={value:o},l.uniforms.rhineSubduedIndex=i,t&&(l.vertexShader=`attribute float archiveTheme; varying float vRhineTheme;
`+l.vertexShader,l.vertexShader=l.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vRhineTheme = archiveTheme;`),l.fragmentShader=`varying float vRhineTheme;
`+l.fragmentShader),l.fragmentShader=`uniform float rhineTheme; uniform vec3 rhineDarkSurface; uniform float rhineSubduedIndex;
`+l.fragmentShader;const h=t?"vRhineTheme":"rhineTheme",d=e==="Printed_Canvas",u=d?"#include <opaque_fragment>":"#include <roughnessmap_fragment>",f=d?"mix(vec3(0.023, 0.032, 0.037), vec3(0.78, 0.78, 0.71), 1.0 - smoothstep(0.12, 0.65, dot(diffuseColor.rgb, vec3(.2126,.7152,.0722))))":e==="Frosted_Polymer"&&!t?"mix(rhineDarkSurface, vec3(0.92, 0.96, 0.97), glassRevealAtHeight(archiveClarity, vArchiveHeight))":e==="Index_Inlay"?"mix(rhineDarkSurface, vec3(0.030, 0.042, 0.048), rhineSubduedIndex)":"rhineDarkSurface",m=d?"outgoingLight":"diffuseColor.rgb";l.fragmentShader=l.fragmentShader.replace(u,`${m} = mix(${m}, ${f}, ${h});
${u}`)},n.customProgramCacheKey=()=>`${a}-rhine-theme-${e}-${t}`,s}const Ld=new WeakMap,db=new Ae("#11181b"),fb=new Ae("#192125"),pb=new Ae("#263136");function np(n,e,t){let i=Ld.get(n);if(!i){const s=[];n.traverse(o=>{o instanceof ta&&s.push({light:o,intensity:o.intensity})});const a=n.getObjectByName("archive-floor")?.material;i={background:n.background.clone(),fog:n.fog?.color.clone(),intensity:n.environmentIntensity,exposure:e.toneMappingExposure,lights:s,floor:a?{material:a,color:a.color.clone()}:void 0},Ld.set(n,i)}n.background.copy(i.background).lerp(db,t),n.fog&&i.fog&&n.fog.color.copy(i.fog).lerp(pb,t),i.floor&&i.floor.material.color.copy(i.floor.color).lerp(fb,t),n.environmentIntensity=Ie.lerp(i.intensity,.32,t),e.toneMappingExposure=Ie.lerp(i.exposure,.98,t);for(const{light:s,intensity:r}of i.lights)s.intensity=r*(1-.35*t)}const Zn=(n,e=0,t=1)=>Math.min(t,Math.max(e,n)),Id=()=>({low:0,mid:0,high:0,activity:0});function mb(n,e,t,i,s){const r=i.low*.8*(.5+.5*Math.sin(n*.29-e*.5-t*2.7)),a=i.mid*.48*(.5+.5*Math.sin(n*.72+e*.9-t*4.3)),o=i.high*.18*Math.pow(Math.max(0,Math.sin(n*1.7-e*2.2-t*6.4)),4);return Zn((r+a+o)*Zn(s,0,2),0,1.8)}class gb{weights={legacy:1,wave:0,lift:0};update(e,t,i,s){for(const r of["legacy","wave","lift"])this.weights[r]+=((s===r?1:0)-this.weights[r])*(1-Math.exp(-Zn(i,0,.1)*5));return{style:{...this.weights}}}}function vb(n,e,t,i,s,r,a=.5){a=Zn(a);const o=m=>m*m*(3-2*m),l=o(Zn((a-.5)*2)),c=1-o(Zn(a*2)),h=1-c-l,u=(i.low*c+i.mid*h+i.high*l)*(.72+.28*Math.sin(n*.32-t*2.2))*.95,f=i.low*.62*(.55+.45*Math.sin(n*.22+e*.18-t*1.8))+i.mid*.42*(.55+.45*Math.sin(n*.38-e*.27-t*2.8))+i.high*.28*(.55+.45*Math.sin(n*.62+e*.4-t*4.1));return mb(n,e,t,i,s)*r.style.legacy+(r.style.wave*u+r.style.lift*f)*Zn(s,0,2)}function Nd(n,e){if(e===hg)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),n;if(e===Oc||e===Pf){let t=n.getIndex();if(t===null){const a=[],o=n.getAttribute("position");if(o!==void 0){for(let l=0;l<o.count;l++)a.push(l);n.setIndex(a),t=n.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),n}const i=t.count-2,s=[];if(e===Oc)for(let a=1;a<=i;a++)s.push(t.getX(0)),s.push(t.getX(a)),s.push(t.getX(a+1));else for(let a=0;a<i;a++)a%2===0?(s.push(t.getX(a)),s.push(t.getX(a+1)),s.push(t.getX(a+2))):(s.push(t.getX(a+2)),s.push(t.getX(a+1)),s.push(t.getX(a)));s.length/3!==i&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const r=n.clone();return r.setIndex(s),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),n}function xb(n){const e=new Map,t=new Map,i=n.clone();return sp(n,i,function(s,r){e.set(r,s),t.set(s,r)}),i.traverse(function(s){if(!s.isSkinnedMesh)return;const r=s,a=e.get(s),o=a.skeleton.bones;r.skeleton=a.skeleton.clone(),r.bindMatrix.copy(a.bindMatrix),r.skeleton.bones=o.map(function(l){return t.get(l)}),r.bind(r.skeleton,r.bindMatrix)}),i}function sp(n,e,t){t(n,e);for(let i=0;i<n.children.length;i++)sp(n.children[i],e.children[i],t)}class Ud extends or{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Sb(t)}),this.register(function(t){return new Tb(t)}),this.register(function(t){return new Ib(t)}),this.register(function(t){return new Nb(t)}),this.register(function(t){return new Ub(t)}),this.register(function(t){return new wb(t)}),this.register(function(t){return new Ab(t)}),this.register(function(t){return new Cb(t)}),this.register(function(t){return new Rb(t)}),this.register(function(t){return new bb(t)}),this.register(function(t){return new Pb(t)}),this.register(function(t){return new Eb(t)}),this.register(function(t){return new Lb(t)}),this.register(function(t){return new Db(t)}),this.register(function(t){return new yb(t)}),this.register(function(t){return new Od(t,Ze.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Od(t,Ze.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new Ob(t)})}load(e,t,i,s){const r=this;let a;if(this.resourcePath!=="")a=this.resourcePath;else if(this.path!==""){const c=Or.extractUrlBase(e);a=Or.resolveURL(c,this.path)}else a=Or.extractUrlBase(e);this.manager.itemStart(e);const o=function(c){s?s(c):console.error(c),r.manager.itemError(e),r.manager.itemEnd(e)},l=new qf(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(c){try{r.parse(c,a,function(h){t(h),r.manager.itemEnd(e)},o)}catch(h){o(h)}},i,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,i,s){let r;const a={},o={},l=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===rp){try{a[Ze.KHR_BINARY_GLTF]=new Fb(e)}catch(d){s&&s(d);return}r=JSON.parse(a[Ze.KHR_BINARY_GLTF].content)}else r=JSON.parse(l.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const c=new Zb(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const d=this.pluginCallbacks[h](c);d.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[d.name]=d,a[d.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){const d=r.extensionsUsed[h],u=r.extensionsRequired||[];switch(d){case Ze.KHR_MATERIALS_UNLIT:a[d]=new Mb;break;case Ze.KHR_DRACO_MESH_COMPRESSION:a[d]=new Bb(r,this.dracoLoader);break;case Ze.KHR_TEXTURE_TRANSFORM:a[d]=new kb;break;case Ze.KHR_MESH_QUANTIZATION:a[d]=new zb;break;default:u.indexOf(d)>=0&&o[d]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+d+'".')}}c.setExtensions(a),c.setPlugins(o),c.parse(i,s)}parseAsync(e,t){const i=this;return new Promise(function(s,r){i.parse(e,t,s,r)})}}function _b(){let n={};return{get:function(e){return n[e]},add:function(e,t){n[e]=t},remove:function(e){delete n[e]},removeAll:function(){n={}}}}function Pt(n,e,t){const i=n.json.materials[e];return i.extensions&&i.extensions[t]?i.extensions[t]:null}const Ze={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class yb{constructor(e){this.parser=e,this.name=Ze.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let i=0,s=t.length;i<s;i++){const r=t[i];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){const t=this.parser,i="light:"+e;let s=t.cache.get(i);if(s)return s;const r=t.json,l=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e];let c;const h=new Ae(16777215);l.color!==void 0&&h.setRGB(l.color[0],l.color[1],l.color[2],ti);const d=l.range!==void 0?l.range:0;switch(l.type){case"directional":c=new kc(h),c.target.position.set(0,0,-1),c.add(c.target);break;case"point":c=new Yf(h),c.distance=d;break;case"spot":c=new k0(h),c.distance=d,l.spot=l.spot||{},l.spot.innerConeAngle=l.spot.innerConeAngle!==void 0?l.spot.innerConeAngle:0,l.spot.outerConeAngle=l.spot.outerConeAngle!==void 0?l.spot.outerConeAngle:Math.PI/4,c.angle=l.spot.outerConeAngle,c.penumbra=1-l.spot.innerConeAngle/l.spot.outerConeAngle,c.target.position.set(0,0,-1),c.add(c.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+l.type)}return c.position.set(0,0,0),Oi(c,l),l.intensity!==void 0&&(c.intensity=l.intensity),c.name=t.createUniqueName(l.name||"light_"+e),s=Promise.resolve(c),t.cache.add(i,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,i=this.parser,r=i.json.nodes[e],o=(r.extensions&&r.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(l){return i._getNodeRef(t.cache,o,l)})}}class Mb{constructor(){this.name=Ze.KHR_MATERIALS_UNLIT}getMaterialType(){return Gi}extendParams(e,t,i){const s=[];e.color=new Ae(1,1,1),e.opacity=1;const r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){const a=r.baseColorFactor;e.color.setRGB(a[0],a[1],a[2],ti),e.opacity=a[3]}r.baseColorTexture!==void 0&&s.push(i.assignTexture(e,"map",r.baseColorTexture,Lt))}return Promise.all(s)}}class bb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);return i===null||i.emissiveStrength!==void 0&&(t.emissiveIntensity=i.emissiveStrength),Promise.resolve()}}class Sb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];if(i.clearcoatFactor!==void 0&&(t.clearcoat=i.clearcoatFactor),i.clearcoatTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatMap",i.clearcoatTexture)),i.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=i.clearcoatRoughnessFactor),i.clearcoatRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",i.clearcoatRoughnessTexture)),i.clearcoatNormalTexture!==void 0&&(s.push(this.parser.assignTexture(t,"clearcoatNormalMap",i.clearcoatNormalTexture)),i.clearcoatNormalTexture.scale!==void 0)){const r=i.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new De(r,r)}return Promise.all(s)}}class Tb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);return i===null||(t.dispersion=i.dispersion!==void 0?i.dispersion:0),Promise.resolve()}}class Eb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];return i.iridescenceFactor!==void 0&&(t.iridescence=i.iridescenceFactor),i.iridescenceTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceMap",i.iridescenceTexture)),i.iridescenceIor!==void 0&&(t.iridescenceIOR=i.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),i.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=i.iridescenceThicknessMinimum),i.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=i.iridescenceThicknessMaximum),i.iridescenceThicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceThicknessMap",i.iridescenceThicknessTexture)),Promise.all(s)}}class wb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_SHEEN}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];if(t.sheenColor=new Ae(0,0,0),t.sheenRoughness=0,t.sheen=1,i.sheenColorFactor!==void 0){const r=i.sheenColorFactor;t.sheenColor.setRGB(r[0],r[1],r[2],ti)}return i.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=i.sheenRoughnessFactor),i.sheenColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenColorMap",i.sheenColorTexture,Lt)),i.sheenRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenRoughnessMap",i.sheenRoughnessTexture)),Promise.all(s)}}class Ab{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];return i.transmissionFactor!==void 0&&(t.transmission=i.transmissionFactor),i.transmissionTexture!==void 0&&s.push(this.parser.assignTexture(t,"transmissionMap",i.transmissionTexture)),Promise.all(s)}}class Cb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_VOLUME}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];t.thickness=i.thicknessFactor!==void 0?i.thicknessFactor:0,i.thicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"thicknessMap",i.thicknessTexture)),t.attenuationDistance=i.attenuationDistance||1/0;const r=i.attenuationColor||[1,1,1];return t.attenuationColor=new Ae().setRGB(r[0],r[1],r[2],ti),Promise.all(s)}}class Rb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_IOR}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);return i===null||(t.ior=i.ior!==void 0?i.ior:1.5),Promise.resolve()}}class Pb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];t.specularIntensity=i.specularFactor!==void 0?i.specularFactor:1,i.specularTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularIntensityMap",i.specularTexture));const r=i.specularColorFactor||[1,1,1];return t.specularColor=new Ae().setRGB(r[0],r[1],r[2],ti),i.specularColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularColorMap",i.specularColorTexture,Lt)),Promise.all(s)}}class Db{constructor(e){this.parser=e,this.name=Ze.EXT_MATERIALS_BUMP}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];return t.bumpScale=i.bumpFactor!==void 0?i.bumpFactor:1,i.bumpTexture!==void 0&&s.push(this.parser.assignTexture(t,"bumpMap",i.bumpTexture)),Promise.all(s)}}class Lb{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?Yi:null}extendMaterialParams(e,t){const i=Pt(this.parser,e,this.name);if(i===null)return Promise.resolve();const s=[];return i.anisotropyStrength!==void 0&&(t.anisotropy=i.anisotropyStrength),i.anisotropyRotation!==void 0&&(t.anisotropyRotation=i.anisotropyRotation),i.anisotropyTexture!==void 0&&s.push(this.parser.assignTexture(t,"anisotropyMap",i.anisotropyTexture)),Promise.all(s)}}class Ib{constructor(e){this.parser=e,this.name=Ze.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,i=t.json,s=i.textures[e];if(!s.extensions||!s.extensions[this.name])return null;const r=s.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(i.extensionsRequired&&i.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,a)}}class Nb{constructor(e){this.parser=e,this.name=Ze.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,i=this.parser,s=i.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;const a=r.extensions[t],o=s.images[a.source];let l=i.textureLoader;if(o.uri){const c=i.options.manager.getHandler(o.uri);c!==null&&(l=c)}return i.loadTextureImage(e,a.source,l)}}class Ub{constructor(e){this.parser=e,this.name=Ze.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,i=this.parser,s=i.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;const a=r.extensions[t],o=s.images[a.source];let l=i.textureLoader;if(o.uri){const c=i.options.manager.getHandler(o.uri);c!==null&&(l=c)}return i.loadTextureImage(e,a.source,l)}}class Od{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){const t=this.parser.json,i=t.bufferViews[e];if(i.extensions&&i.extensions[this.name]){const s=i.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),a=this.parser.options.meshoptDecoder;if(!a||!a.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(o){const l=s.byteOffset||0,c=s.byteLength||0,h=s.count,d=s.byteStride,u=new Uint8Array(o,l,c);return a.decodeGltfBufferAsync?a.decodeGltfBufferAsync(h,d,u,s.mode,s.filter).then(function(f){return f.buffer}):a.ready.then(function(){const f=new ArrayBuffer(h*d);return a.decodeGltfBuffer(new Uint8Array(f),h,d,u,s.mode,s.filter),f})})}else return null}}class Ob{constructor(e){this.name=Ze.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,i=t.nodes[e];if(!i.extensions||!i.extensions[this.name]||i.mesh===void 0)return null;const s=t.meshes[i.mesh];for(const c of s.primitives)if(c.mode!==vi.TRIANGLES&&c.mode!==vi.TRIANGLE_STRIP&&c.mode!==vi.TRIANGLE_FAN&&c.mode!==void 0)return null;const a=i.extensions[this.name].attributes,o=[],l={};for(const c in a)o.push(this.parser.getDependency("accessor",a[c]).then(h=>(l[c]=h,l[c])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(c=>{const h=c.pop(),d=h.isGroup?h.children:[h],u=c[0].count,f=[];for(const m of d){const v=new ze,p=new P,g=new Ri,y=new P(1,1,1),S=new $n(m.geometry,m.material,u);for(let M=0;M<u;M++)l.TRANSLATION&&p.fromBufferAttribute(l.TRANSLATION,M),l.ROTATION&&g.fromBufferAttribute(l.ROTATION,M),l.SCALE&&y.fromBufferAttribute(l.SCALE,M),S.setMatrixAt(M,v.compose(p,g,y));for(const M in l)if(M==="_COLOR_0"){const T=l[M];S.instanceColor=new Qn(T.array,T.itemSize,T.normalized)}else M!=="TRANSLATION"&&M!=="ROTATION"&&M!=="SCALE"&&m.geometry.setAttribute(M,l[M]);Mt.prototype.copy.call(S,m),this.parser.assignFinalMaterial(S),f.push(S)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}}const rp="glTF",Er=12,Fd={JSON:1313821514,BIN:5130562};class Fb{constructor(e){this.name=Ze.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Er),i=new TextDecoder;if(this.header={magic:i.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==rp)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const s=this.header.length-Er,r=new DataView(e,Er);let a=0;for(;a<s;){const o=r.getUint32(a,!0);a+=4;const l=r.getUint32(a,!0);if(a+=4,l===Fd.JSON){const c=new Uint8Array(e,Er+a,o);this.content=i.decode(c)}else if(l===Fd.BIN){const c=Er+a;this.body=e.slice(c,c+o)}a+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class Bb{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=Ze.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const i=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},l={},c={};for(const h in a){const d=qc[h]||h.toLowerCase();o[d]=a[h]}for(const h in e.attributes){const d=qc[h]||h.toLowerCase();if(a[h]!==void 0){const u=i.accessors[e.attributes[h]],f=Fs[u.componentType];c[d]=f.name,l[d]=u.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(d,u){s.decodeDracoFile(h,function(f){for(const m in f.attributes){const v=f.attributes[m],p=l[m];p!==void 0&&(v.normalized=p)}d(f)},o,c,ti,u)})})}}class kb{constructor(){this.name=Ze.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class zb{constructor(){this.name=Ze.KHR_MESH_QUANTIZATION}}class ap extends sr{constructor(e,t,i,s){super(e,t,i,s)}copySampleValue_(e){const t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let a=0;a!==s;a++)t[a]=i[r+a];return t}interpolate_(e,t,i,s){const r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=o*2,c=o*3,h=s-t,d=(i-t)/h,u=d*d,f=u*d,m=e*c,v=m-c,p=-2*f+3*u,g=f-u,y=1-p,S=g-u+d;for(let M=0;M!==o;M++){const T=a[v+M+o],w=a[v+M+l]*h,R=a[m+M+o],_=a[m+M]*h;r[M]=y*T+S*w+p*R+g*_}return r}}const Vb=new Ri;class Hb extends ap{interpolate_(e,t,i,s){const r=super.interpolate_(e,t,i,s);return Vb.fromArray(r).normalize().toArray(r),r}}const vi={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},Fs={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Bd={9728:St,9729:It,9984:Sf,9985:Za,9986:Dr,9987:rn},kd={33071:zi,33648:ho,10497:Dn},kl={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},qc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},yn={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Gb={CUBICSPLINE:void 0,LINEAR:Gr,STEP:Hr},zl={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Wb(n){return n.DefaultMaterial===void 0&&(n.DefaultMaterial=new Ks({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Xi})),n.DefaultMaterial}function qn(n,e,t){for(const i in t.extensions)n[i]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[i]=t.extensions[i])}function Oi(n,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(n.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Xb(n,e,t){let i=!1,s=!1,r=!1;for(let c=0,h=e.length;c<h;c++){const d=e[c];if(d.POSITION!==void 0&&(i=!0),d.NORMAL!==void 0&&(s=!0),d.COLOR_0!==void 0&&(r=!0),i&&s&&r)break}if(!i&&!s&&!r)return Promise.resolve(n);const a=[],o=[],l=[];for(let c=0,h=e.length;c<h;c++){const d=e[c];if(i){const u=d.POSITION!==void 0?t.getDependency("accessor",d.POSITION):n.attributes.position;a.push(u)}if(s){const u=d.NORMAL!==void 0?t.getDependency("accessor",d.NORMAL):n.attributes.normal;o.push(u)}if(r){const u=d.COLOR_0!==void 0?t.getDependency("accessor",d.COLOR_0):n.attributes.color;l.push(u)}}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(l)]).then(function(c){const h=c[0],d=c[1],u=c[2];return i&&(n.morphAttributes.position=h),s&&(n.morphAttributes.normal=d),r&&(n.morphAttributes.color=u),n.morphTargetsRelative=!0,n})}function qb(n,e){if(n.updateMorphTargets(),e.weights!==void 0)for(let t=0,i=e.weights.length;t<i;t++)n.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(n.morphTargetInfluences.length===t.length){n.morphTargetDictionary={};for(let i=0,s=t.length;i<s;i++)n.morphTargetDictionary[t[i]]=i}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function jb(n){let e;const t=n.extensions&&n.extensions[Ze.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Vl(t.attributes):e=n.indices+":"+Vl(n.attributes)+":"+n.mode,n.targets!==void 0)for(let i=0,s=n.targets.length;i<s;i++)e+=":"+Vl(n.targets[i]);return e}function Vl(n){let e="";const t=Object.keys(n).sort();for(let i=0,s=t.length;i<s;i++)e+=t[i]+":"+n[t[i]]+";";return e}function jc(n){switch(n){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Yb(n){return n.search(/\.jpe?g($|\?)/i)>0||n.search(/^data\:image\/jpeg/)===0?"image/jpeg":n.search(/\.webp($|\?)/i)>0||n.search(/^data\:image\/webp/)===0?"image/webp":n.search(/\.ktx2($|\?)/i)>0||n.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Kb=new ze;class Zb{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new _b,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let i=!1,s=-1,r=!1,a=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){const o=navigator.userAgent;i=/^((?!chrome|android).)*safari/i.test(o)===!0;const l=o.match(/Version\/(\d+)/);s=i&&l?parseInt(l[1],10):-1,r=o.indexOf("Firefox")>-1,a=r?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||i&&s<17||r&&a<98?this.textureLoader=new O0(this.options.manager):this.textureLoader=new H0(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new qf(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const i=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(a){return a._markDefs&&a._markDefs()}),Promise.all(this._invokeAll(function(a){return a.beforeRoot&&a.beforeRoot()})).then(function(){return Promise.all([i.getDependencies("scene"),i.getDependencies("animation"),i.getDependencies("camera")])}).then(function(a){const o={scene:a[0][s.scene||0],scenes:a[0],animations:a[1],cameras:a[2],asset:s.asset,parser:i,userData:{}};return qn(r,o,s),Oi(o,s),Promise.all(i._invokeAll(function(l){return l.afterRoot&&l.afterRoot(o)})).then(function(){for(const l of o.scenes)l.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],i=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){const a=t[s].joints;for(let o=0,l=a.length;o<l;o++)e[a[o]].isBone=!0}for(let s=0,r=e.length;s<r;s++){const a=e[s];a.mesh!==void 0&&(this._addNodeRef(this.meshCache,a.mesh),a.skin!==void 0&&(i[a.mesh].isSkinnedMesh=!0)),a.camera!==void 0&&this._addNodeRef(this.cameraCache,a.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,i){if(e.refs[t]<=1)return i;const s=i.clone(),r=(a,o)=>{const l=this.associations.get(a);l!=null&&this.associations.set(o,l);for(const[c,h]of a.children.entries())r(h,o.children[c])};return r(i,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let i=0;i<t.length;i++){const s=e(t[i]);if(s)return s}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const i=[];for(let s=0;s<t.length;s++){const r=e(t[s]);r&&i.push(r)}return i}getDependency(e,t){const i=e+":"+t;let s=this.cache.get(i);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(i,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){const i=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,a){return i.getDependency(e,a)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],i=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[Ze.KHR_BINARY_GLTF].body);const s=this.options;return new Promise(function(r,a){i.load(Or.resolveURL(t.uri,s.path),r,void 0,function(){a(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(i){const s=t.byteLength||0,r=t.byteOffset||0;return i.slice(r,r+s)})}loadAccessor(e){const t=this,i=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){const a=kl[s.type],o=Fs[s.componentType],l=s.normalized===!0,c=new o(s.count*a);return Promise.resolve(new $t(c,a,l))}const r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(a){const o=a[0],l=kl[s.type],c=Fs[s.componentType],h=c.BYTES_PER_ELEMENT,d=h*l,u=s.byteOffset||0,f=s.bufferView!==void 0?i.bufferViews[s.bufferView].byteStride:void 0,m=s.normalized===!0;let v,p;if(f&&f!==d){const g=Math.floor(u/f),y="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+g+":"+s.count;let S=t.cache.get(y);S||(v=new c(o,g*f,s.count*f/h),S=new n0(v,f/h),t.cache.add(y,S)),p=new Lh(S,l,u%f/h,m)}else o===null?v=new c(s.count*l):v=new c(o,u,s.count*l),p=new $t(v,l,m);if(s.sparse!==void 0){const g=kl.SCALAR,y=Fs[s.sparse.indices.componentType],S=s.sparse.indices.byteOffset||0,M=s.sparse.values.byteOffset||0,T=new y(a[1],S,s.sparse.count*g),w=new c(a[2],M,s.sparse.count*l);o!==null&&(p=new $t(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let R=0,_=T.length;R<_;R++){const E=T[R];if(p.setX(E,w[R*l]),l>=2&&p.setY(E,w[R*l+1]),l>=3&&p.setZ(E,w[R*l+2]),l>=4&&p.setW(E,w[R*l+3]),l>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}p.normalized=m}return p})}loadTexture(e){const t=this.json,i=this.options,r=t.textures[e].source,a=t.images[r];let o=this.textureLoader;if(a.uri){const l=i.manager.getHandler(a.uri);l!==null&&(o=l)}return this.loadTextureImage(e,r,o)}loadTextureImage(e,t,i){const s=this,r=this.json,a=r.textures[e],o=r.images[t],l=(o.uri||o.bufferView)+":"+a.sampler;if(this.textureCache[l])return this.textureCache[l];const c=this.loadImageSource(t,i).then(function(h){h.flipY=!1,h.name=a.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);const u=(r.samplers||{})[a.sampler]||{};return h.magFilter=Bd[u.magFilter]||It,h.minFilter=Bd[u.minFilter]||rn,h.wrapS=kd[u.wrapS]||Dn,h.wrapT=kd[u.wrapT]||Dn,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==St&&h.minFilter!==It,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[l]=c,c}loadImageSource(e,t){const i=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(d=>d.clone());const a=s.images[e],o=self.URL||self.webkitURL;let l=a.uri||"",c=!1;if(a.bufferView!==void 0)l=i.getDependency("bufferView",a.bufferView).then(function(d){c=!0;const u=new Blob([d],{type:a.mimeType});return l=o.createObjectURL(u),l});else if(a.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const h=Promise.resolve(l).then(function(d){return new Promise(function(u,f){let m=u;t.isImageBitmapLoader===!0&&(m=function(v){const p=new Et(v);p.needsUpdate=!0,u(p)}),t.load(Or.resolveURL(d,r.path),m,void 0,f)})}).then(function(d){return c===!0&&o.revokeObjectURL(l),Oi(d,a),d.userData.mimeType=a.mimeType||Yb(a.uri),d}).catch(function(d){throw console.error("THREE.GLTFLoader: Couldn't load texture",l),d});return this.sourceCache[e]=h,h}assignTexture(e,t,i,s){const r=this;return this.getDependency("texture",i.index).then(function(a){if(!a)return null;if(i.texCoord!==void 0&&i.texCoord>0&&(a=a.clone(),a.channel=i.texCoord),r.extensions[Ze.KHR_TEXTURE_TRANSFORM]){const o=i.extensions!==void 0?i.extensions[Ze.KHR_TEXTURE_TRANSFORM]:void 0;if(o){const l=r.associations.get(a);a=r.extensions[Ze.KHR_TEXTURE_TRANSFORM].extendTexture(a,o),r.associations.set(a,l)}}return s!==void 0&&(a.colorSpace=s),e[t]=a,a})}assignFinalMaterial(e){const t=e.geometry;let i=e.material;const s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){const o="PointsMaterial:"+i.uuid;let l=this.cache.get(o);l||(l=new Bf,di.prototype.copy.call(l,i),l.color.copy(i.color),l.map=i.map,l.sizeAttenuation=!1,this.cache.add(o,l)),i=l}else if(e.isLine){const o="LineBasicMaterial:"+i.uuid;let l=this.cache.get(o);l||(l=new Ff,di.prototype.copy.call(l,i),l.color.copy(i.color),l.map=i.map,this.cache.add(o,l)),i=l}if(s||r||a){let o="ClonedMaterial:"+i.uuid+":";s&&(o+="derivative-tangents:"),r&&(o+="vertex-colors:"),a&&(o+="flat-shading:");let l=this.cache.get(o);l||(l=i.clone(),r&&(l.vertexColors=!0),a&&(l.flatShading=!0),s&&(l.normalScale&&(l.normalScale.y*=-1),l.clearcoatNormalScale&&(l.clearcoatNormalScale.y*=-1)),this.cache.add(o,l),this.associations.set(l,this.associations.get(i))),i=l}e.material=i}getMaterialType(){return Ks}loadMaterial(e){const t=this,i=this.json,s=this.extensions,r=i.materials[e];let a;const o={},l=r.extensions||{},c=[];if(l[Ze.KHR_MATERIALS_UNLIT]){const d=s[Ze.KHR_MATERIALS_UNLIT];a=d.getMaterialType(),c.push(d.extendParams(o,r,t))}else{const d=r.pbrMetallicRoughness||{};if(o.color=new Ae(1,1,1),o.opacity=1,Array.isArray(d.baseColorFactor)){const u=d.baseColorFactor;o.color.setRGB(u[0],u[1],u[2],ti),o.opacity=u[3]}d.baseColorTexture!==void 0&&c.push(t.assignTexture(o,"map",d.baseColorTexture,Lt)),o.metalness=d.metallicFactor!==void 0?d.metallicFactor:1,o.roughness=d.roughnessFactor!==void 0?d.roughnessFactor:1,d.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(o,"metalnessMap",d.metallicRoughnessTexture)),c.push(t.assignTexture(o,"roughnessMap",d.metallicRoughnessTexture))),a=this._invokeOne(function(u){return u.getMaterialType&&u.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(u){return u.extendMaterialParams&&u.extendMaterialParams(e,o)})))}r.doubleSided===!0&&(o.side=Bi);const h=r.alphaMode||zl.OPAQUE;if(h===zl.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===zl.MASK&&(o.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&a!==Gi&&(c.push(t.assignTexture(o,"normalMap",r.normalTexture)),o.normalScale=new De(1,1),r.normalTexture.scale!==void 0)){const d=r.normalTexture.scale;o.normalScale.set(d,d)}if(r.occlusionTexture!==void 0&&a!==Gi&&(c.push(t.assignTexture(o,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&a!==Gi){const d=r.emissiveFactor;o.emissive=new Ae().setRGB(d[0],d[1],d[2],ti)}return r.emissiveTexture!==void 0&&a!==Gi&&c.push(t.assignTexture(o,"emissiveMap",r.emissiveTexture,Lt)),Promise.all(c).then(function(){const d=new a(o);return r.name&&(d.name=r.name),Oi(d,r),t.associations.set(d,{materials:e}),r.extensions&&qn(s,d,r),d})}createUniqueName(e){const t=ut.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,i=this.extensions,s=this.primitiveCache;function r(o){return i[Ze.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(l){return zd(l,o,t)})}const a=[];for(let o=0,l=e.length;o<l;o++){const c=e[o],h=jb(c),d=s[h];if(d)a.push(d.promise);else{let u;c.extensions&&c.extensions[Ze.KHR_DRACO_MESH_COMPRESSION]?u=r(c):u=zd(new fi,c,t),s[h]={primitive:c,promise:u},a.push(u)}}return Promise.all(a)}loadMesh(e){const t=this,i=this.json,s=this.extensions,r=i.meshes[e],a=r.primitives,o=[];for(let l=0,c=a.length;l<c;l++){const h=a[l].material===void 0?Wb(this.cache):this.getDependency("material",a[l].material);o.push(h)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(l){const c=l.slice(0,l.length-1),h=l[l.length-1],d=[];for(let f=0,m=h.length;f<m;f++){const v=h[f],p=a[f];let g;const y=c[f];if(p.mode===vi.TRIANGLES||p.mode===vi.TRIANGLE_STRIP||p.mode===vi.TRIANGLE_FAN||p.mode===void 0)g=r.isSkinnedMesh===!0?new o0(v,y):new st(v,y),g.isSkinnedMesh===!0&&g.normalizeSkinWeights(),p.mode===vi.TRIANGLE_STRIP?g.geometry=Nd(g.geometry,Pf):p.mode===vi.TRIANGLE_FAN&&(g.geometry=Nd(g.geometry,Oc));else if(p.mode===vi.LINES)g=new f0(v,y);else if(p.mode===vi.LINE_STRIP)g=new Nh(v,y);else if(p.mode===vi.LINE_LOOP)g=new p0(v,y);else if(p.mode===vi.POINTS)g=new m0(v,y);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(g.geometry.morphAttributes).length>0&&qb(g,r),g.name=t.createUniqueName(r.name||"mesh_"+e),Oi(g,r),p.extensions&&qn(s,g,p),t.assignFinalMaterial(g),d.push(g)}for(let f=0,m=d.length;f<m;f++)t.associations.set(d[f],{meshes:e,primitives:f});if(d.length===1)return r.extensions&&qn(s,d[0],r),d[0];const u=new Hi;r.extensions&&qn(s,u,r),t.associations.set(u,{meshes:e});for(let f=0,m=d.length;f<m;f++)u.add(d[f]);return u})}loadCamera(e){let t;const i=this.json.cameras[e],s=i[i.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return i.type==="perspective"?t=new Wt(Ie.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):i.type==="orthographic"&&(t=new ia(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),i.name&&(t.name=this.createUniqueName(i.name)),Oi(t,i),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],i=[];for(let s=0,r=t.joints.length;s<r;s++)i.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?i.push(this.getDependency("accessor",t.inverseBindMatrices)):i.push(null),Promise.all(i).then(function(s){const r=s.pop(),a=s,o=[],l=[];for(let c=0,h=a.length;c<h;c++){const d=a[c];if(d){o.push(d);const u=new ze;r!==null&&u.fromArray(r.array,c*16),l.push(u)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[c])}return new Ih(o,l)})}loadAnimation(e){const t=this.json,i=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,a=[],o=[],l=[],c=[],h=[];for(let d=0,u=s.channels.length;d<u;d++){const f=s.channels[d],m=s.samplers[f.sampler],v=f.target,p=v.node,g=s.parameters!==void 0?s.parameters[m.input]:m.input,y=s.parameters!==void 0?s.parameters[m.output]:m.output;v.node!==void 0&&(a.push(this.getDependency("node",p)),o.push(this.getDependency("accessor",g)),l.push(this.getDependency("accessor",y)),c.push(m),h.push(v))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(l),Promise.all(c),Promise.all(h)]).then(function(d){const u=d[0],f=d[1],m=d[2],v=d[3],p=d[4],g=[];for(let S=0,M=u.length;S<M;S++){const T=u[S],w=f[S],R=m[S],_=v[S],E=p[S];if(T===void 0)continue;T.updateMatrix&&T.updateMatrix();const L=i._createAnimationTracks(T,w,R,_,E);if(L)for(let C=0;C<L.length;C++)g.push(L[C])}const y=new R0(r,void 0,g);return Oi(y,s),y})}createNodeMesh(e){const t=this.json,i=this,s=t.nodes[e];return s.mesh===void 0?null:i.getDependency("mesh",s.mesh).then(function(r){const a=i._getNodeRef(i.meshCache,s.mesh,r);return s.weights!==void 0&&a.traverse(function(o){if(o.isMesh)for(let l=0,c=s.weights.length;l<c;l++)o.morphTargetInfluences[l]=s.weights[l]}),a})}loadNode(e){const t=this.json,i=this,s=t.nodes[e],r=i._loadNodeShallow(e),a=[],o=s.children||[];for(let c=0,h=o.length;c<h;c++)a.push(i.getDependency("node",o[c]));const l=s.skin===void 0?Promise.resolve(null):i.getDependency("skin",s.skin);return Promise.all([r,Promise.all(a),l]).then(function(c){const h=c[0],d=c[1],u=c[2];u!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(u,Kb)});for(let f=0,m=d.length;f<m;f++)h.add(d[f]);if(h.userData.pivot!==void 0&&d.length>0){const f=h.userData.pivot,m=d[0];h.pivot=new P().fromArray(f),h.position.x-=f[0],h.position.y-=f[1],h.position.z-=f[2],m.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){const t=this.json,i=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const r=t.nodes[e],a=r.name?s.createUniqueName(r.name):"",o=[],l=s._invokeOne(function(c){return c.createNodeMesh&&c.createNodeMesh(e)});return l&&o.push(l),r.camera!==void 0&&o.push(s.getDependency("camera",r.camera).then(function(c){return s._getNodeRef(s.cameraCache,r.camera,c)})),s._invokeAll(function(c){return c.createNodeAttachment&&c.createNodeAttachment(e)}).forEach(function(c){o.push(c)}),this.nodeCache[e]=Promise.all(o).then(function(c){let h;if(r.isBone===!0?h=new Of:c.length>1?h=new Hi:c.length===1?h=c[0]:h=new Mt,h!==c[0])for(let d=0,u=c.length;d<u;d++)h.add(c[d]);if(r.name&&(h.userData.name=r.name,h.name=a),Oi(h,r),r.extensions&&qn(i,h,r),r.matrix!==void 0){const d=new ze;d.fromArray(r.matrix),h.applyMatrix4(d)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!s.associations.has(h))s.associations.set(h,{});else if(r.mesh!==void 0&&s.meshCache.refs[r.mesh]>1){const d=s.associations.get(h);s.associations.set(h,{...d})}return s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,i=this.json.scenes[e],s=this,r=new Hi;i.name&&(r.name=s.createUniqueName(i.name)),Oi(r,i),i.extensions&&qn(t,r,i);const a=i.nodes||[],o=[];for(let l=0,c=a.length;l<c;l++)o.push(s.getDependency("node",a[l]));return Promise.all(o).then(function(l){for(let h=0,d=l.length;h<d;h++){const u=l[h];u.parent!==null?r.add(xb(u)):r.add(u)}const c=h=>{const d=new Map;for(const[u,f]of s.associations)(u instanceof di||u instanceof Et)&&d.set(u,f);return h.traverse(u=>{const f=s.associations.get(u);f!=null&&d.set(u,f)}),d};return s.associations=c(r),r})}_createAnimationTracks(e,t,i,s,r){const a=[],o=e.name?e.name:e.uuid,l=[];yn[r.path]===yn.weights?e.traverse(function(u){u.morphTargetInfluences&&l.push(u.name?u.name:u.uuid)}):l.push(o);let c;switch(yn[r.path]){case yn.weights:c=Zs;break;case yn.rotation:c=Js;break;case yn.translation:case yn.scale:c=Qs;break;default:i.itemSize===1?c=Zs:c=Qs;break}const h=s.interpolation!==void 0?Gb[s.interpolation]:Gr,d=this._getArrayFromAccessor(i);for(let u=0,f=l.length;u<f;u++){const m=new c(l[u]+"."+yn[r.path],t.array,d,h);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(m),a.push(m)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const i=jc(t.constructor),s=new Float32Array(t.length);for(let r=0,a=t.length;r<a;r++)s[r]=t[r]*i;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(i){const s=this instanceof Js?Hb:ap;return new s(this.times,this.values,this.getValueSize()/3,i)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Jb(n,e,t){const i=e.attributes,s=new _i;if(i.POSITION!==void 0){const o=t.json.accessors[i.POSITION],l=o.min,c=o.max;if(l!==void 0&&c!==void 0){if(s.set(new P(l[0],l[1],l[2]),new P(c[0],c[1],c[2])),o.normalized){const h=jc(Fs[o.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const r=e.targets;if(r!==void 0){const o=new P,l=new P;for(let c=0,h=r.length;c<h;c++){const d=r[c];if(d.POSITION!==void 0){const u=t.json.accessors[d.POSITION],f=u.min,m=u.max;if(f!==void 0&&m!==void 0){if(l.setX(Math.max(Math.abs(f[0]),Math.abs(m[0]))),l.setY(Math.max(Math.abs(f[1]),Math.abs(m[1]))),l.setZ(Math.max(Math.abs(f[2]),Math.abs(m[2]))),u.normalized){const v=jc(Fs[u.componentType]);l.multiplyScalar(v)}o.max(l)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(o)}n.boundingBox=s;const a=new ji;s.getCenter(a.center),a.radius=s.min.distanceTo(s.max)/2,n.boundingSphere=a}function zd(n,e,t){const i=e.attributes,s=[];function r(a,o){return t.getDependency("accessor",a).then(function(l){n.setAttribute(o,l)})}for(const a in i){const o=qc[a]||a.toLowerCase();o in n.attributes||s.push(r(i[a],o))}if(e.indices!==void 0&&!n.index){const a=t.getDependency("accessor",e.indices).then(function(o){n.setIndex(o)});s.push(a)}return et.workingColorSpace!==ti&&"COLOR_0"in i&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${et.workingColorSpace}" not supported.`),Oi(n,e),Jb(n,e,t),Promise.all(s).then(function(){return e.targets!==void 0?Xb(n,e.targets,t):n})}class Qb extends Io{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;const e=new nr;e.deleteAttribute("uv");const t=new Ks({side:Qt}),i=new Ks,s=new Yf(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);const r=new st(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);const a=new $n(e,i,6),o=new Mt;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);const l=new st(e,Ss(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);const c=new st(e,Ss(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);const h=new st(e,Ss(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);const d=new st(e,Ss(43));d.position.set(-.462,8.89,14.52),d.scale.set(4.38,5.441,.088),this.add(d);const u=new st(e,Ss(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);const f=new st(e,Ss(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){const e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(const t of e)t.dispose()}}function Ss(n){return new M0({color:0,emissive:16777215,emissiveIntensity:n})}function op(n,e,t="baseline"){const i=t==="refined";n.toneMappingExposure=i?1:1.05;const s=new Vc(n),r=new Qb;e.environment=s.fromScene(r,.04).texture,r.dispose(),s.dispose(),e.environmentIntensity=i?.52:.48,e.add(new F0("#fffaf5",i?"#b49b80":"#b4a18c",i?.5:.65));const a=new kc(i?"#fff4e5":"#fff7ed",i?1.7:1.4);a.position.set(...i?[-8,14,4]:[-6,14,-5]);const o=new kc("#ffffff",i?.3:.6);return o.position.set(7,8,-10),e.add(a,o),a}class $b extends Nn{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Nt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Ai.clone(e.uniforms),this.material=new Nt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new hr(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Vd extends Nn{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class eS extends Nn{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class lp{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new De);this._width=i.width,this._height=i.height,t=new Yt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ei}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new $b(io),this.copyPass.material.blending=Gt,this.timer=new X0}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let s=0,r=this.passes.length;s<r;s++){const a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),a.needsSwap){if(i){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Vd!==void 0&&(a instanceof Vd?i=!0:a instanceof eS&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new De);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(i,s),this.renderTarget2.setSize(i,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class cp extends Nn{constructor(e,t,i=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Ae}render(e,t,i){const s=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=s}}const Ha={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class hp extends Nn{constructor(){super(),this.isOutputPass=!0,this.uniforms=Ai.clone(Ha.uniforms),this.material=new Hf({name:Ha.name,uniforms:this.uniforms,vertexShader:Ha.vertexShader,fragmentShader:Ha.fragmentShader}),this._fsQuad=new hr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},et.getTransfer(this._outputColorSpace)===lt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===mh?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===gh?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===vh?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===$r?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===_h?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===yh?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===xh&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const Ga={defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new De(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},Wa={defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new De(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},Hl={uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new De(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};class up extends Nn{constructor(){super(),this._edgesRT=new Yt(1,1,{depthBuffer:!1,type:ei}),this._edgesRT.texture.name="SMAAPass.edges",this._weightsRT=new Yt(1,1,{depthBuffer:!1,type:ei}),this._weightsRT.texture.name="SMAAPass.weights";const e=this,t=new Image;t.src=this._getAreaTexture(),t.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new Et,this._areaTexture.name="SMAAPass.area",this._areaTexture.image=t,this._areaTexture.minFilter=It,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;const i=new Image;i.src=this._getSearchTexture(),i.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new Et,this._searchTexture.name="SMAAPass.search",this._searchTexture.image=i,this._searchTexture.magFilter=St,this._searchTexture.minFilter=St,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=Ai.clone(Ga.uniforms),this._materialEdges=new Nt({defines:Object.assign({},Ga.defines),uniforms:this._uniformsEdges,vertexShader:Ga.vertexShader,fragmentShader:Ga.fragmentShader}),this._uniformsWeights=Ai.clone(Wa.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new Nt({defines:Object.assign({},Wa.defines),uniforms:this._uniformsWeights,vertexShader:Wa.vertexShader,fragmentShader:Wa.fragmentShader}),this._uniformsBlend=Ai.clone(Hl.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new Nt({uniforms:this._uniformsBlend,vertexShader:Hl.vertexShader,fragmentShader:Hl.fragmentShader}),this._fsQuad=new hr(null)}render(e,t,i){this._uniformsEdges.tDiffuse.value=i.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=i.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,t){this._edgesRT.setSize(e,t),this._weightsRT.setSize(e,t),this._materialEdges.uniforms.resolution.value.set(1/e,1/t),this._materialWeights.uniforms.resolution.value.set(1/e,1/t),this._materialBlend.uniforms.resolution.value.set(1/e,1/t)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return"data:image/png;base64,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"}_getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}}function Yc(n,e,t){const i=Math.min(t.anisotropy,e.capabilities.getMaxAnisotropy()),s=new Set;n.traverse(r=>{if(r instanceof st)for(const a of Array.isArray(r.material)?r.material:[r.material])for(const o of Object.values(a))o instanceof Et&&!o.isRenderTargetTexture&&s.add(o)});for(const r of s)r.anisotropy!==i&&(r.anisotropy=i,r.needsUpdate=!0)}function dp(n,e,t,i,s=!1){const r=Math.max(1,t.clientWidth),a=Math.max(1,t.clientHeight),o=Nm(i,r,a,t.getBoundingClientRect().width/r,devicePixelRatio,n.capabilities.maxTextureSize,s?921600:8294400);return n.setPixelRatio(o.ratio),n.setSize(r,a),e.setPixelRatio(o.ratio),e.setSize(r,a),n.transmissionResolutionScale=i.transmission,t.dataset.renderQuality=JSON.stringify({...o,antialias:i.antialias,transmission:i.transmission,anisotropy:Math.min(i.anisotropy,n.capabilities.getMaxAnisotropy()),superPerformance:s}),o}function tS(n,e,t){const i=new lp(n),s=new up;return i.addPass(new cp(e,t)),i.addPass(s),i.addPass(new hp),{composer:i,smaa:s}}const Hd=.12,fp=.42,Gl=.025,iS=.016,nS=`
float archiveTransmissionLod(float roughness, float ior, vec2 samplerSize) {
  float nativeLod = log2(samplerSize.x) * roughness * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
  float strength = clamp((roughness - ${Gl}) / ${fp-Gl}, 0.0, 1.0);
  float panelPixels = length(vArchiveProjectedAxis * samplerSize);
  float clearLod = log2(samplerSize.x) * ${Gl} * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
  float boundedLod = log2(max(exp2(clearLod), panelPixels * ${iS} * pow(strength, 1.15)));
  return mix(nativeLod, min(nativeLod, boundedLod), archiveQuality);
}`,sS=`
float glassRevealAtHeight(float progress, float height) {
  float edge = 1.0 - ${1+2*Hd} * clamp(progress, 0.0, 1.0);
  return smoothstep(edge, edge + ${2*Hd}, clamp(height, 0.0, 1.0));
}`,rS={Optical_Glass_Body:{color:"#929894",roughness:.38,opacity:.27,order:20},Optical_Glass_Roof:{color:"#929b94",roughness:.34,opacity:.42,order:24},Optical_Glass_Edge:{color:"#edf0e7",roughness:.19,opacity:.9,order:28},Optical_Bridge_Glass:{color:"#a0aca2",roughness:.32,opacity:.36,order:26}};function aS(n,e){const t=rS[n];t&&(e.color.set(t.color),e.roughness=t.roughness,e.metalness=.015,e.clearcoat=.42,e.clearcoatRoughness=.24,e.opacity=t.opacity,e.transmission=0,e.transparent=!1,e.blending=fh,e.blendEquation=ki,e.blendSrc=co,e.blendDst=zr,e.blendSrcAlpha=_f,e.blendDstAlpha=zr,e.depthWrite=!1,e.side=Xi,e.userData.opticalOrder=t.order)}function oS(n){return n.replace("#include <opaque_fragment>",`diffuseColor.a = min(0.86, opacity + 0.42 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0));
     #include <opaque_fragment>`)}class lS{palettes=new Map;disposeSources(){for(const e of this.palettes.values())e.high.dispose(),e.low?.dispose();this.palettes.clear()}register(e,t,i){this.palettes.set(e,{high:t,low:i})}prepare(e){for(const t of e.children){const i=t,s=i.userData.surface,r=this.palettes.get(s);if(!r){i.userData.themeAmount=xo(i.material,"Printed_Canvas");continue}const a=r.high.clone(),o={value:0},l={value:0};i.material=a,a.userData.opticalOrder&&(i.renderOrder=a.userData.opticalOrder),i.userData.appearance=o,i.userData.glassClarity=l,a.onBeforeCompile=c=>{a.userData.opticalOrder&&(c.fragmentShader=oS(c.fragmentShader)),c.uniforms.archiveQuality=o,c.uniforms.archiveClarity=l,c.fragmentShader=`uniform float archiveQuality;
uniform float archiveClarity;
`+c.fragmentShader,s==="Frosted_Polymer"?(c.vertexShader=`varying float vArchiveHeight;
varying vec2 vArchiveProjectedAxis;
`+c.vertexShader,c.vertexShader=c.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vArchiveHeight = position.y / 3.7;`),c.fragmentShader=`varying float vArchiveHeight;
varying vec2 vArchiveProjectedAxis;
`+sS+c.fragmentShader,c.vertexShader=c.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
vArchiveProjectedAxis = 1.85 * vec2(projectionMatrix[0][0] * modelViewMatrix[1][0], projectionMatrix[1][1] * modelViewMatrix[1][1]) / max(0.0001, abs(mvPosition.z));`),c.fragmentShader=c.fragmentShader.replace("#include <transmission_pars_fragment>",nS+`
`+We.transmission_pars_fragment.replace("float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );","float lod = archiveTransmissionLod(roughness, ior, transmissionSamplerSize);")),c.fragmentShader=c.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
diffuseColor.rgb *= mix(mix(vec3(0.40, 0.30, 0.20), vec3(1.0, 0.98, 0.94), smoothstep(0.1, 1.0, vArchiveHeight)), vec3(1.0), archiveQuality);`),c.fragmentShader=c.fragmentShader.replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor = mix(mix(0.28, ${fp}, archiveQuality), 0.025, glassRevealAtHeight(archiveClarity, vArchiveHeight));`)):r.low||(c.fragmentShader=c.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
float coverage = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
if (archiveQuality <= coverage) discard;`))},a.customProgramCacheKey=()=>`archive-surface-clarity-${s}-${!!r.low}`,i.userData.subduedIndex={value:0},i.userData.themeAmount=xo(a,s,!1,i.userData.subduedIndex)}}setClarity(e,t){const i=Ie.clamp(t,0,1);e.traverse(s=>{if(!(s instanceof st)||!s.userData.glassClarity||(s.userData.glassClarity.value=i,s.userData.surface!=="Frosted_Polymer"))return;const r=s.material,a=this.palettes.get("Frosted_Polymer"),o=s.userData.appearance.value,l=c=>Ie.lerp(a.low?.[c]??a.high[c],a.high[c],o);r.thickness=Ie.lerp(l("thickness"),.018,i),r.transmission=Ie.lerp(l("transmission"),.985,i),r.attenuationDistance=Ie.lerp(l("attenuationDistance"),8,i)})}setTheme(e,t,i=!1){e.traverse(s=>{s.userData.themeAmount&&(s.userData.themeAmount.value=t),s.userData.subduedIndex&&(s.userData.subduedIndex.value=Ie.clamp(Number(i),0,1))})}apply(e,t){for(const i of e.children){const s=i,r=this.palettes.get(s.userData.surface);if(!r){s.material.opacity=t;continue}s.userData.appearance.value=t;const{high:a,low:o}=r;if(!o)continue;const l=s.material;l.color.copy(o.color).lerp(a.color,t),l.attenuationColor&&o.attenuationColor&&a.attenuationColor&&(l.attenuationColor.copy(o.attenuationColor).lerp(a.attenuationColor,t),l.attenuationDistance=Number.isFinite(o.attenuationDistance)&&Number.isFinite(a.attenuationDistance)?Ie.lerp(o.attenuationDistance,a.attenuationDistance,t):a.attenuationDistance);for(const c of["roughness","metalness","transmission","thickness","clearcoat","clearcoatRoughness"])l[c]=Ie.lerp(o[c]??0,a[c]??0,t);a.transmission>0&&(l.transmission=Math.max(1e-6,l.transmission))}}dispose(e){for(const t of e.children){const i=t,s=i.material;i.userData.surface||s.map?.dispose(),s.dispose()}}}class cS{active=!1;moved=!1;value={lane:0,row:0};x=0;y=0;inverse=null;samples=[];lastMotion=-1/0;motionDirection={x:0,y:0};pointer={x:0,y:0};start(e,t,i,s=0){this.active=!1,this.moved=!1,this.x=e,this.y=t,this.value={lane:0,row:0},this.samples=[{value:this.value,time:s}],this.lastMotion=-1/0,this.motionDirection={x:0,y:0},this.pointer={x:e,y:t};const{lane:r,row:a}=i,o=r.x*a.y-a.x*r.y,l=Math.hypot(r.x,r.y)*Math.hypot(a.x,a.y);this.inverse=Number.isFinite(l)&&l>0&&Math.abs(o)>l*.001?{lane:{x:a.y/o,y:-a.x/o},row:{x:-r.y/o,y:r.x/o}}:null}move(e,t,i){const s=e-this.x,r=t-this.y,a=Math.hypot(s,r);if(a>7&&(this.moved=!0),!this.inverse||!this.active&&a<10)return;this.active=!0;const o={lane:s*this.inverse.lane.x+r*this.inverse.lane.y,row:s*this.inverse.row.x+r*this.inverse.row.y},l=this.samples.at(-1);if(l){const c={x:e-this.pointer.x,y:t-this.pointer.y};Math.hypot(c.x,c.y)>1e-9&&(this.lastMotion=i,c.x*this.motionDirection.x+c.y*this.motionDirection.y<0&&(this.samples=[l]),this.motionDirection=c)}this.pointer={x:e,y:t},this.value=o,l?.time===i?this.samples[this.samples.length-1]={value:o,time:i}:this.samples.push({value:o,time:i}),this.samples=this.samples.filter(c=>i-c.time<=120).slice(-32)}releaseVelocity(e,t){const i=this.samples[0],s=this.samples.at(-1);if(t||!i||!s||e-this.lastMotion>80||s.time-i.time<8)return{lane:0,row:0};const r=1e3/(s.time-i.time);return{lane:(s.value.lane-i.value.lane)*r,row:(s.value.row-i.value.row)*r}}}class Gd{value;velocity;phase;target;friction=2.4;constructor(e,t){this.value=e,this.velocity=t,this.phase=Math.abs(t)>=.75?"coasting":"snapping",this.target=Math.round(e)}step(e,t=this.phase==="coasting"){if(t){const i=Math.exp(-this.friction*e);this.value+=this.velocity*(1-i)/this.friction,this.velocity*=i,Math.abs(this.velocity)<.6&&(this.target=Math.round(this.value+this.velocity/this.friction),this.phase="snapping")}else if(this.phase==="snapping"){const s=this.value-this.target,r=this.velocity+10*s,a=Math.exp(-10*e);this.value=this.target+(s+r*e)*a,this.velocity=(this.velocity-10*r*e)*a,Math.abs(this.value-this.target)<1e-4&&Math.abs(this.velocity)<.005&&(this.value=this.target,this.velocity=0,this.phase="idle")}}}class hS{lane;row;constructor(e,t){this.lane=new Gd(e.lane,t.lane),this.row=new Gd(e.row,t.row)}get phase(){return this.lane.phase==="coasting"||this.row.phase==="coasting"?"coasting":this.lane.phase==="idle"&&this.row.phase==="idle"?"idle":"snapping"}get value(){return{lane:this.lane.value,row:this.row.value}}get velocity(){return{lane:this.lane.velocity,row:this.row.velocity}}step(e){const t=this.phase==="coasting";this.lane.step(e,t),this.row.step(e,t)}}const Xa={boot:{title:"开场动画",description:"开机标志、扫描与欢迎画面",group:"开场"},selectionWave:{title:"选择波浪",description:"选档时向阵列传播的波浪",group:"档案阵列"},idleWave:{title:"静置起伏",description:"停止操作后的阵列起伏",group:"档案阵列"},pointerParallax:{title:"指针视差",description:"镜头随指针的轻微偏移",group:"档案阵列"},dragMomentum:{title:"拖动惯性",description:"松手后按实际速度继续滑行",group:"档案阵列"},selectionTransition:{title:"档案切换",description:"切列、切档时的轨道移动",group:"档案阵列"},detailTransition:{title:"详情展开",description:"抽取、转正、归位与详情镜头",group:"档案详情"},modelDecryption:{title:"模型解密",description:"模型解密线与磨砂揭示",group:"档案详情"},documentReveal:{title:"正文呈现",description:"正文的遮罩揭示",group:"档案详情"},rollingText:{title:"文字滚动",description:"标题、分类与权限标签滚动",group:"界面"},rollingNumbers:{title:"数字滚动",description:"序号、列编号与档案编码滚动",group:"界面"},surfaceTransitions:{title:"面板过渡",description:"详情、检索、收藏与设置窗口过渡",group:"界面"},viewerNavigation:{title:"视角缓动",description:"360° 旋转、平移、缩放与复位阻尼",group:"360° 查看器"},viewerModelTransition:{title:"模型过渡",description:"拆解、重组与清晰度变化",group:"360° 查看器"}},no={boot:!0,selectionWave:!0,idleWave:!0,pointerParallax:!0,dragMomentum:!0,selectionTransition:!0,detailTransition:!0,modelDecryption:!0,documentReveal:!0,rollingText:!0,rollingNumbers:!0,surfaceTransitions:!0,viewerNavigation:!0,viewerModelTransition:!0},Kc={boot:!1,selectionWave:!1,idleWave:!1,pointerParallax:!1,dragMomentum:!1,selectionTransition:!1,detailTransition:!1,modelDecryption:!1,documentReveal:!1,rollingText:!1,rollingNumbers:!1,surfaceTransitions:!1,viewerNavigation:!1,viewerModelTransition:!1};function qr(){return{...no}}function pp(){return{...Kc}}function Bh(n){return Object.values(n).every(Boolean)?"full":Object.values(n).every(e=>!e)?"reduced":"custom"}function uS(n,e){const i={...n?.preset==="full"?no:n?.preset==="reduced"||e===!0?Kc:no};if(n)for(const s of Object.keys(no))typeof n[s]=="boolean"&&(i[s]=n[s]);return i}function dS(n,e){return n[e]}function fS(n){const e=Object.values(n).filter(Boolean).length;if(e===Object.keys(n).length)return"当前使用完整动画。";if(e===0)return"当前已减少动画。";const t=[];return n.boot||t.push("开场已跳过"),!n.selectionWave&&!n.idleWave&&t.push("阵列波动已关闭"),!n.rollingText&&!n.rollingNumbers&&t.push("文字滚动已关闭"),`当前使用自定义动画（${t.slice(0,2).join("、")||`启用 ${e} 项`}）。`}function mp(n,e){const t=[...new Set(Object.values(Xa).map(r=>r.group))],i=e??Bh(n),s=(r,a)=>`<button type="button" data-action="motion-preset" data-preset="${r}" aria-pressed="${i===r}"${r==="custom"?" disabled":""}>${a}</button>`;return`<section id="motion-settings" class="motion-settings" aria-label="动效设置"><div class="motion-settings-head"><div><strong>ANIMATION CONTROLS</strong><span>完整、减少或按分项自定义；关闭后会立即收束当前动画（开场设置下次重播生效）</span></div>${s("full","完整")}${s("reduced","减少")}${s("custom","自定义")}</div><details class="motion-advanced"><summary>精细设置 <span>开场 / 阵列 / 详情 / 界面 / 360° 查看器</span></summary><div class="motion-groups">${t.map(r=>`<fieldset><legend>${r}</legend>${Object.keys(Xa).filter(a=>Xa[a].group===r).map(a=>{const o=Xa[a];return`<label class="motion-setting"><div><strong>${o.title}</strong><span>${o.description}</span></div><input type="checkbox" data-motion="${a}" ${n[a]?"checked":""}/><i class="toggle"></i></label>`}).join("")}</fieldset>`).join("")}</div></details></section>`}const hi=n=>(n=Math.max(0,Math.min(1,n)),n*n*n*(10+n*(-15+6*n))),_o=(n,e)=>Math.exp(-.5*(n/e)**2);function gp(n,e,t){const i=t-22;if(i<=0||i>=4.35)return 0;const s=n+(e-2)*.65,r=hi(i/.32),a=3+i*19,o=32-(i-2.3)*24,l=c=>2.5*_o(c,3.8)-.58*_o(c-6,3.5);return r*(l(s-a)*(1-hi((i-2.15)/.65))+l(s-o)*hi((i-2.17)/.32)*(1-hi((i-3.5)/.85)))}function pS(n){return .4*hi((n-25.58)/.82)+2.95*hi((n-27.55)/1.3)}function Zc(n,e){const t=e-25.05-Math.abs(n)*.065,i=Math.max(-.42,2.15-.17*(Math.sqrt(n*n+1)-1)),s=hi(t/.62),r=t>0?Math.sin(t*5.1)*Math.exp(-t*1.3):0;return i*(s+.18*r*hi(t/.16))}function mS(n,e){return e<0||e>3.2?0:.8*hi(e/.2)*Math.exp(-e*1.15)*Math.cos((n-e*8)*.58)*_o(n-e*8,3.4)}function gS(n,e){return hi(n/2.5)*Math.max(0,Math.cos((n-e*8)*.58))}function vp(n,e,t=1){return 1+(.25+.75*_o(n-e,.55)-1)*hi(t)}function vS(n,e,t){return .075*Math.sin(t*Math.PI*2/8+n*.3-e*.45)+.027*Math.sin(t*Math.PI*2/13-n*.17+e*.3)}function xS(n,e,t,i=12,s=2){const r=hi((t-24.95)/.45),a=hi((t-25.4)/.95),o=t+.3*r*(1-a);return gp(n,e,t)*(1-r)+Zc(n-i,o)*vp(e,s,(t-25.4)/.95)}const Wd=4.05,_S=.001;function Xd(n,e,t=!1){const i=n*Math.exp(-e*(t?35:7));return Math.abs(i)<=_S?0:i}function bn(n,e,t,i){const s=n.value-e,r=n.velocity+t*s,a=Math.exp(-t*i);n.value=e+(s+r*i)*a,n.velocity=(n.velocity-t*r*i)*a}const wt=n=>(n=Ie.clamp(n,0,1),n*n*n*(n*(n*6-15)+10));class yS{constructor(e,t=mS,i=!1,s="baseline"){this.container=e,this.selectionPulse=t,this.deferSelectionPulse=i,this.lightingLook=s,this.renderer=new tp({antialias:!0,alpha:!1,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*Math.min(innerWidth/1920,innerHeight/1080)),this.renderer.setSize(e.clientWidth,e.clientHeight),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.autoUpdate=!1,this.renderer.shadowMap.type=xf,this.renderer.toneMapping=$r,this.renderer.toneMappingExposure=1.05,this.renderer.domElement.setAttribute("aria-label","三维研究档案阵列，点击选择，左右拖动切列，上下拖动或滚轮切换列内档案"),e.appendChild(this.renderer.domElement),this.renderer.domElement.addEventListener("webglcontextrestored",()=>{this.renderState.invalidate(),this.shadowState.invalidate()},{signal:this.inputEvents.signal}),this.scene.background=new Ae("#eae5e1"),this.scene.matrixWorldAutoUpdate=!1,this.scene.fog=new Lo("#eae5e1",22,47),this.light=op(this.renderer,this.scene,s),this.light.castShadow=!0,Object.assign(this.light.shadow.camera,{left:-16,right:16,top:15,bottom:-15,near:.1,far:45}),this.light.shadow.mapSize.set(2048,2048),this.light.shadow.normalBias=s==="refined"?.018:.035,this.light.shadow.bias=s==="refined"?-12e-5:-3e-4,this.light.shadow.radius=4;const r=new st(new es(200,200),new Ks({color:"#d8c9b9",roughness:.95}));r.rotation.x=-Math.PI/2,r.name="archive-floor",r.position.y=-4.63,r.receiveShadow=!0,this.scene.add(r),this.camera.position.set(-62.26,35.98,43.28),this.cameraAim.set(-.5,1.1,.4),this.camera.fov=6.15,this.camera.lookAt(this.cameraAim),this.composer=new lp(this.renderer),this.composer.addPass(new cp(this.scene,this.camera)),this.ao=new Rd(this.scene,this.camera,e.clientWidth,e.clientHeight),this.ao.kernelRadius=s==="refined"?.44:.38,this.ao.minDistance=.001,this.ao.maxDistance=.09,this.composer.addPass(this.ao),this.bokeh=new cb(this.scene,this.camera,{focus:25,aperture:.0018,maxblur:.011},()=>this.ao),this.composer.addPass(this.bokeh),this.smaa.enabled=!1,this.composer.addPass(this.smaa),this.composer.addPass(new hp),this.bindPointer()}container;selectionPulse;deferSelectionPulse;lightingLook;inputEvents=new AbortController;presence=1;presenceTarget=1;setPresentationVisible(e,t=!1){this.presenceTarget=Number(e),t&&(this.presence=this.presenceTarget),e||this.cancelPointer()}get presentationHidden(){return this.presenceTarget===0&&this.presence===0}presentationDrop(e){const t=.15*(1+Math.tanh((e.row-this.selectedCell.row)*.1+(e.lane-this.selectedCell.lane)*.25));return 35*Math.pow(Ie.clamp((1-this.presence-t)/.7,0,1),2)}revealImmediately(){this.reveal=this.targetReveal}dispose(){this.inputEvents.abort(),this.cancelPointer(),Xc(this.scene),this.appearance.disposeSources(),this.model.clear(),this.outgoing=[],this.instances=[],this.assemblyTemplate?.then(Xc).catch(()=>{}),this.assemblyTemplate=void 0,this.light.shadow.map?.dispose();for(const e of this.composer.passes)e.dispose();this.composer.dispose(),this.renderer.dispose(),this.renderer.forceContextLoss(),this.renderer.domElement.remove(),this.loaded=!1}uiOnlyParallax=!1;theme=new hb;subduedIndex={value:0};selectedIndexOnly=!1;superPerformance=!1;setSuperPerformance(e){if(this.superPerformance!==e){this.superPerformance=e;for(const t of this.instances){const i=t.userData.fullMaterial??=t.material;if(e&&!t.userData.fastMaterial){const s=i.clone();s.onBeforeCompile=i.onBeforeCompile,s.customProgramCacheKey=i.customProgramCacheKey.bind(i),s.transmission=0,s.clearcoat=0,s.roughness=Math.max(.45,i.roughness),t.userData.fastMaterial=s}t.material=e?t.userData.fastMaterial:i,t.visible=!e||i.name.replace(/\.\d+$/,"")!=="Titanium_Fasteners"}this.resize()}}setSelectedIndexAccent(e){this.selectedIndexOnly=e}themeAttribute;get themeAmount(){return this.theme.background(performance.now()/1e3)}setTheme(e,t=!1){this.theme.set(e,performance.now()/1e3,this.selectedCell,t)}playfield={enabled:!1,bands:Id(),strength:1,flatten:0,target:null,breathing:!0};flatMix=0;rhythm=new gb;rhythmStyle="legacy";setRhythmStyle(e){this.rhythmStyle=e}relayLifts=new Map;relayPoints=new Map;relayActive=!1;onRelayPick;setPlayfield(e,t,i,s,r,a=!0){this.playfield={enabled:e,bands:t,strength:i,flatten:s,target:r,breathing:a}}setRelayActive(e){e!==this.relayActive&&(this.cancelPointer(),this.setHover(null),this.relayActive=e,this.pointer.set(0,0))}relayPulse(e){const t=this.relayPoints.get(e)?.cell;t&&!this.reduced&&this.emitPulse(t)}projectRelay(e){const t=this.relayPoints.get(e);if(!t)return null;const i=t.point.clone().project(this.camera),s=this.renderer.domElement.getBoundingClientRect();return{x:s.left+(i.x+1)*s.width/2,y:s.top+(1-i.y)*s.height/2}}relayCandidates(){const e=this.renderer.domElement.getBoundingClientRect();return this.scene.updateMatrixWorld(!0),[...this.relayPoints.keys()].filter(t=>{const i=this.projectRelay(t),s=(i.x-e.left)/e.width,r=(i.y-e.top)/e.height;if(s<.18||s>.82||r<.32||r>.76)return!1;const a=this.pickCell(i.x,i.y);return a&&sn(a)===t})}renderer;scene=new Io;camera=new Wt(34,16/9,5,300);composer;ao;bokeh;instances=[];matrixUpdates;themeUpdates;renderState=new Cd;shadowState=new Cd;renderedFrames=0;reusedFrames=0;visibility=new tb;drawCoverage=new ib;shadowCoverage;instanceCapacity=wd*vo;drawnCells=[];extraCoverage=!1;setArchiveCoverage(e){this.extraCoverage=e}model=new Hi;appearance=new lS;decryption=new Pm;cursor=new De;raycaster=new iv;dummy=new Mt;cells=[];selectedCell={lane:2,row:12};looping=!1;coordinateOrigin={lane:0,row:0};lift={value:0,velocity:0};rail={value:0,velocity:0};shoulder={value:12,velocity:0};laneFocus={value:2,velocity:0};columnCamera={value:0,velocity:0};returnY=null;canInspect=!1;clearance=0;pulseGain=1;idleGain=0;lastInteraction=0;scanTime=29.1;scanBlend=0;cameraAim=new P;outgoing=[];pulses=[];pendingPulse=null;selectedSlot=76;selectedIndex=0;detail=0;targetDetail=0;reveal=0;targetReveal=0;last=0;pointer=new De;dragging=!1;hoverCell=null;hoverLifts=new Map;archiveDrag=new cS;dragTrack=null;navigatingDrag=!1;archiveMomentum=null;holdingArchive=!1;cancelPointer=()=>{};pendingHover=null;flushHover=()=>{};rotation=0;targetRotation=0;light;clock=0;loaded=!1;labelCanvas=document.createElement("canvas");labelTexture;labelMark=new Image;motion=qr();quality=Jn(void 0);appliedQuality="";smaa=new up;aoKernelSize=32;displayHeight=0;layoutKind="";onSelect;onHover;onNavigate;async load(e=lo("assets/archive-cassette.glb")){this.labelMark.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(em)}`,await this.labelMark.decode();const t=await new Ud().loadAsync(e);t.scene.updateMatrixWorld(!0);const i=[];t.scene.traverse(a=>{a instanceof st&&i.push(a)});const s=wd*vo;for(let a=0;a<s;a++){const o=Bl(a);this.cells.push(o)}for(const a of i){const o=a.geometry.clone().applyMatrix4(a.matrixWorld).scale(1,1,1),l=a.material,c=l.name.replace(/\.\d+$/,""),h=l.clone();if(h.envMapIntensity=.6,c==="Frosted_Polymer"&&(h.color.set("#fffdfa"),h.transmission=.9,h.thickness=.12,h.roughness=.21,h.ior=1.46,h.attenuationColor=new Ae("#eee6df"),h.attenuationDistance=2),c==="Internal_Ceramic"&&(h.color.set(this.lightingLook==="refined"?"#c4baae":"#c7beb6"),h.roughness=.6),c==="Printed_Label"&&h.color.set("#eae5dc"),c==="Ivory_Edges"&&(h.color.set("#f0e7df"),h.roughness=.31,h.transmission=.65,h.thickness=.04),c==="Optical_Diffuser"&&(h.color.set("#e2dad4"),h.transmission=0,h.roughness=.7),c==="Subsurface_Optics"&&(h.color.set(this.lightingLook==="refined"?"#b9a796":"#b9aba1"),h.roughness=.48,h.metalness=.05),c==="Optical_Edges"&&(h.transmission=0,h.color.set(this.lightingLook==="refined"?"#d8c7b5":"#d4c7be"),h.roughness=.26,h.metalness=.08),aS(c,h),c==="Carbon_Ink")continue;const d=new st(o,h);if(d.userData.surface=c,d.castShadow=c==="Optical_Diffuser",d.receiveShadow=!0,this.model.add(d),!["Frosted_Polymer","Ivory_Edges","Titanium_Fasteners","Index_Inlay","Optical_Diffuser"].includes(c)){this.appearance.register(c,h);continue}const u=h.clone();c==="Frosted_Polymer"&&(u.transmission=.78,this.lightingLook==="refined"&&(u.thickness=.28,u.attenuationColor.set("#d4c7b4"),u.attenuationDistance=1.2),u.transparent=!1,u.color.set("#fff7ed"),u.onBeforeCompile=m=>{m.vertexShader=`varying float vPanelHeight;
`+m.vertexShader,m.vertexShader=m.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vPanelHeight = position.y / 3.7;`),m.fragmentShader=`varying float vPanelHeight;
`+m.fragmentShader,m.fragmentShader=m.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
diffuseColor.rgb *= mix(vec3(0.40, 0.30, 0.20), vec3(1.0, 0.98, 0.94), smoothstep(0.1, 1.0, vPanelHeight));`)},u.roughness=.28,u.clearcoat=.3,u.clearcoatRoughness=.25),c==="Optical_Diffuser"&&u.color.set("#806447"),c==="Ivory_Edges"&&(u.transmission=0,u.color.set(this.lightingLook==="refined"?"#dcc9b0":"#fff5e9"),u.roughness=.38),c==="Index_Inlay"&&(u.color.set("#e4d6c5"),u.metalness=.05),this.appearance.register(c,h,u),this.themeAttribute??=new Qn(new Float32Array(s),1).setUsage(Ds),o.setAttribute("archiveTheme",this.themeAttribute),xo(u,c,!0,this.subduedIndex);const f=new $n(o,u,s);f.instanceMatrix=this.instances[0]?.instanceMatrix??f.instanceMatrix.setUsage(Ds),f.castShadow=c==="Optical_Diffuser",f.receiveShadow=!0,f.frustumCulled=!1,this.instances.push(f),this.scene.add(f)}this.shadowCoverage=new nb(this.instances.find(a=>a.castShadow)),this.scene.add(this.shadowCoverage.mesh),this.labelCanvas.width=1024,this.labelCanvas.height=440,this.labelTexture=new Cl(this.labelCanvas),this.labelTexture.colorSpace=Lt,this.labelTexture.anisotropy=this.renderer.capabilities.getMaxAnisotropy();const r=new st(new es(.99,.46),new Gi({map:this.labelTexture,toneMapped:!1,transparent:!0,depthWrite:!1}));r.position.set(-1.36,3.04,.255),this.model.add(r),this.appearance.prepare(this.model),this.appearance.apply(this.model,0),this.drawLabel(0),this.scene.add(this.model),this.model.position.copy(this.cellPosition(Bl(this.selectedSlot))),this.loaded=!0}assemblyTemplate;async createAssemblyModel(){this.assemblyTemplate??=new Ud().loadAsync(lo("assets/archive-assembly.glb")).then(o=>(o.scene.updateMatrixWorld(!0),o.scene)).catch(o=>{throw this.assemblyTemplate=void 0,o});const e=await this.assemblyTemplate,t=new Hi,i=[];e.traverse(o=>{if(!(o instanceof st))return;const l=o.material.name.replace(/\.\d+$/,""),c=new st(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material);c.userData.surface=l,c.userData.assemblyPart=o.userData.assemblyPart,t.add(c),i.push(c)}),this.appearance.prepare(t),this.appearance.apply(t,1),this.appearance.setClarity(t,this.modelClarity()),this.appearance.setTheme(t,this.themeAmount);const s=document.createElement("canvas");s.width=this.labelCanvas.width,s.height=this.labelCanvas.height,s.getContext("2d").drawImage(this.labelCanvas,0,0);const r=new Cl(s);r.colorSpace=Lt,r.anisotropy=this.renderer.capabilities.getMaxAnisotropy();const a=new st(new es(.99,.46),new Gi({map:r,toneMapped:!1,transparent:!0,depthWrite:!1}));return a.position.set(-1.36,3.04,.255),a.userData.assemblyPart="cover",a.userData.themeAmount=xo(a.material,"Printed_Canvas"),a.userData.themeAmount.value=this.themeAmount,t.add(a),i.push(a),{model:t,setClarity:o=>this.appearance.setClarity(t,o),dispose:()=>{for(const o of i)o.geometry.dispose(),o.material.dispose();r.dispose()}}}setMode(e){if(this.cancelPointer(),this.setHover(null),e==="detail"?this.decryption.enter(this.scanBlend>.9&&this.decryption.clarity>.999):this.decryption.leave(),e==="hidden"&&this.decryption.select(),e!=="archive"&&(this.pendingPulse=null),this.looping=e!=="hidden",!this.looping){const t=Rn(this.selectedIndex);this.selectedCell={lane:t.lane,row:t.row},this.coordinateOrigin={lane:0,row:0};for(const i of this.outgoing)this.scene.remove(i.group),this.appearance.dispose(i.group);this.outgoing=[]}this.lastInteraction=this.clock,this.targetReveal=e==="hidden"?0:1,this.targetDetail=e==="detail"?1:0,this.dragging=!1,e!=="detail"?(this.targetRotation=0,this.rotation!==0&&(this.returnY=this.model.position.y)):this.returnY=null}setReduced(e){this.setMotion(e?pp():qr())}setMotion(e){if((!e.pointerParallax||!e.dragMomentum)&&(this.motion.pointerParallax||this.motion.dragMomentum)&&this.cancelPointer(),e.dragMomentum||(this.archiveMomentum=null,this.columnCamera.velocity=0,this.rail.velocity=0),e.pointerParallax||this.pointer.set(0,0),e.selectionWave||(this.pulses=[]),e.idleWave||(this.idleGain=0),this.motion={...e},!e.modelDecryption){this.appearance.setClarity(this.model,this.modelClarity());for(const t of this.outgoing)t.clarity=0,this.appearance.setClarity(t.group,0)}}get reduced(){return Object.values(this.motion).every(e=>!e)}modelClarity(){return this.motion.modelDecryption?this.decryption.clarity:this.targetDetail}setQuality(e){const t=typeof e=="boolean"?Jn(void 0,e):Jn(e),i=JSON.stringify(t);if(this.appliedQuality===i)return;if(this.appliedQuality=i,this.quality=t,t.aoSamples&&t.aoSamples!==this.aoKernelSize){const r=this.ao;this.ao=new Rd(this.scene,this.camera,1,1,t.aoSamples),this.ao.kernelRadius=r.kernelRadius,this.ao.minDistance=r.minDistance,this.ao.maxDistance=r.maxDistance;const a=this.composer.passes.indexOf(r);this.composer.removePass(r),this.composer.insertPass(this.ao,a),r.dispose(),this.aoKernelSize=t.aoSamples}this.ao.enabled=t.aoSamples>0,this.bokeh.enabled=t.depthOfField>0,this.smaa.enabled=t.antialias==="smaa",this.renderer.shadowMap.enabled=t.shadows>0;const s=Math.min(t.shadows||1024,this.renderer.capabilities.maxTextureSize);this.light.shadow.mapSize.x!==s&&(this.light.shadow.map?.dispose(),this.light.shadow.map=null,this.light.shadow.mapSize.set(s,s)),this.light.shadow.needsUpdate=!0,Yc(this.scene,this.renderer,t),this.resize()}cellPosition(e){return new P((e.lane-2)*mi,-4.6,(e.row-15.5)*gi)}rebaseCoordinates(){const e={lane:Math.abs(this.selectedCell.lane)>2048?Math.round((this.selectedCell.lane-2)/5)*5:0,row:Math.abs(this.selectedCell.row)>2048?Math.floor((this.selectedCell.row-12)/8)*8:0};if(!(!e.lane&&!e.row)){this.setHover(null),this.hoverLifts.clear(),this.selectedCell.lane-=e.lane,this.selectedCell.row-=e.row,this.coordinateOrigin.lane+=e.lane,this.coordinateOrigin.row+=e.row,this.laneFocus.value-=e.lane,this.shoulder.value-=e.row,this.columnCamera.value-=e.lane*mi,this.rail.value+=e.row*gi;for(const t of this.outgoing)t.cell.lane-=e.lane,t.cell.row-=e.row;for(const t of this.pulses)t.lane-=e.lane,t.row-=e.row;this.pendingPulse&&(this.pendingPulse.lane-=e.lane,this.pendingPulse.row-=e.row)}}select(e,t){this.selectedIndex=e,this.navigatingDrag||this.cancelPointer(),this.setHover(null),this.lastInteraction=this.clock;const i=Rn(e).slot,s=Rn(e),r=this.looping?$M(e,this.selectedCell,t):{lane:s.lane,row:s.row},a=!Tr(r,this.selectedCell);if(this.looping&&a&&this.loaded&&this.lift.value>1e-4){const l=this.model.clone(!0),c=l.children[l.children.length-1],h=document.createElement("canvas");h.width=1024,h.height=440,h.getContext("2d").drawImage(this.labelCanvas,0,0);const d=new Cl(h);d.colorSpace=Lt,c.material=new Gi({map:d,toneMapped:!1,transparent:!0,depthWrite:!1}),this.appearance.prepare(l),this.appearance.apply(l,wt(this.lift.value/.4)),this.appearance.setClarity(l,this.modelClarity()),this.scene.add(l),this.outgoing.push({group:l,slot:this.selectedSlot,cell:{...this.selectedCell},lift:{...this.lift},returnY:l.rotation.y!==0?l.position.y:null,clarity:this.modelClarity()}),this.lift.value=0,this.lift.velocity=0}this.selectedSlot=i,this.selectedCell=r,a&&(this.decryption.select(),this.rotation=0,this.returnY=null);const o=this.outgoing.findIndex(l=>Tr(l.cell,r));if(o>=0){const l=this.outgoing[o];this.lift={...l.lift},this.rotation=l.group.rotation.y,this.returnY=l.returnY,this.decryption.select(l.clarity),this.scene.remove(l.group),this.appearance.dispose(l.group),this.outgoing.splice(o,1)}this.deferSelectionPulse?this.pendingPulse=this.looping?{...r}:null:this.emitPulse(r),this.targetRotation=0,this.drawLabel(e)}emitPulse(e){this.pulses.push({...e,time:this.clock}),this.pulses=this.pulses.slice(-6)}drawLabel(e){if(!this.labelTexture)return;const t=this.labelCanvas.getContext("2d");t.fillStyle="#e6e2d9",t.fillRect(0,0,1024,440),t.fillStyle="#171713",t.fillRect(12,12,1e3,6),t.fillRect(12,419,1e3,3),t.font="bold 81px MiSans",t.fillText("FANTASY TOWN",22,116),t.font="32px MiSans",t.fillStyle="#878476",t.fillText("INTERNAL DATABASE",25,174),t.fillStyle="#171713",t.font="bold 130px MiSans",t.fillText("NO."+String(e+1).padStart(3,"0"),22,360),t.fillRect(782,32,221,39),t.fillStyle="#eee9de",t.font="24px MiSans",t.fillText("R L / I S",809,61),t.fillStyle="#171713",t.font="bold 64px MiSans",t.fillText("INFO",830,143),t.drawImage(this.labelMark,790,242,210,98),this.labelTexture.needsUpdate=!0}ensureInstanceCapacity(e){if(e<=this.instanceCapacity)return;const t=Math.max(e,this.instanceCapacity*2),i=new Qn(new Float32Array(t*16),16).setUsage(Ds);i.array.set(this.instances[0].instanceMatrix.array);for(const r of this.instances)r.dispose(),r.instanceMatrix=i;const s=this.themeAttribute;this.themeAttribute=new Qn(new Float32Array(t),1).setUsage(Ds),s&&this.themeAttribute.array.set(s.array);for(const r of this.instances)r.geometry.setAttribute("archiveTheme",this.themeAttribute);this.matrixUpdates=new Ls(i),this.themeUpdates=new Ls(this.themeAttribute),this.instanceCapacity=t}resize(){this.renderState.invalidate();const e=this.container.clientWidth,t=this.container.clientHeight,i=this.container.closest("[data-layout]")?.dataset.layout??"",s=this.container.getBoundingClientRect().height;this.layoutKind==="cinematic"&&i!=="cinematic"&&this.displayHeight>0&&(this.camera.fov=Ie.radToDeg(2*Math.atan(Math.tan(Ie.degToRad(this.camera.fov/2))*s/this.displayHeight))),this.displayHeight=s,this.layoutKind=i;const r=dp(this.renderer,this.composer,this.container,this.quality,this.superPerformance);this.ao.setSize(Math.max(1,Math.floor(r.width*this.quality.aoResolution)),Math.max(1,Math.floor(r.height*this.quality.aoResolution))),this.ao.setSharing(this.ao.enabled&&this.bokeh.enabled&&this.quality.aoResolution===1&&!this.superPerformance),this.container.dataset.renderQuality=JSON.stringify({...JSON.parse(this.container.dataset.renderQuality),aoSamples:this.ao.enabled?this.aoKernelSize:0,aoWidth:this.ao.width,aoHeight:this.ao.height,shadows:this.renderer.shadowMap.enabled?this.light.shadow.mapSize.x:0,depthOfField:this.bokeh.enabled?this.quality.depthOfField:0}),this.camera.aspect=e/t,this.camera.updateProjectionMatrix()}canBrowse(){return this.presenceTarget===1&&this.looping&&!this.targetDetail&&this.detail<.2&&this.reveal>=.8&&this.loaded&&!this.container.closest("[inert]")}setHover(e){!e&&!this.hoverCell||e&&this.hoverCell&&Tr(e,this.hoverCell)||(this.hoverCell=e?{...e}:null,this.onHover?.(e?Fl(e):null))}pickCell(e,t){const i=this.renderer.domElement.getBoundingClientRect();this.cursor.set((e-i.left)/i.width*2-1,-(t-i.top)/i.height*2+1),this.raycaster.setFromCamera(this.cursor,this.camera);const s=this.raycaster.intersectObjects([this.instances[0],this.model,...this.outgoing.map(a=>a.group)],!0)[0];if(!s)return null;if(s.instanceId!==void 0)return{...this.drawnCells[s.instanceId]};let r=s.object;for(;r;){const a=this.outgoing.find(o=>o.group===r);if(a)return{...a.cell};r=r.parent}return{...this.selectedCell}}trackCoordinate(e,t){return e==="lane"?t/mi+2:(-t-2.17)/gi+15.5}dragProjection(){this.model.updateMatrixWorld(!0),this.camera.updateMatrixWorld(!0);const e=this.model.localToWorld(new P(0,1.85,0)),t=this.renderer.domElement.getBoundingClientRect(),i=s=>{const r=e.clone().addScaledVector(s,-.5).project(this.camera),a=e.clone().addScaledVector(s,.5).project(this.camera);return{x:(a.x-r.x)*t.width/2,y:-(a.y-r.y)*t.height/2}};return{lane:i(new P(-mi,0,0)),row:i(new P(0,0,-gi))}}trackPosition(e,t){return e==="lane"?(t-2)*mi:-2.17-(t-15.5)*gi}navigatePlane(e){const t={lane:Math.round(e.lane),row:Math.round(e.row)};if(Tr(t,this.selectedCell))return;const i={...this.selectedCell},s=Math.min(64,Math.max(Math.abs(t.lane-i.lane),Math.abs(t.row-i.row)));this.navigatingDrag=!0;try{for(let r=1;r<=s;r++){const a={lane:Math.round(i.lane+(t.lane-i.lane)*r/s),row:Math.round(i.row+(t.row-i.row)*r/s)};Tr(a,this.selectedCell)||this.onSelect?.(Fl(a),a)}}finally{this.navigatingDrag=!1}}stopMomentum(){this.archiveMomentum&&(this.columnCamera.velocity=0,this.rail.velocity=0),this.archiveMomentum=null}bindPointer(){const e=this.renderer.domElement;let t=null,i=0,s=0,r=0,a=!1,o=!1,l=!1,c={lane:0,row:0},h=0,d=0;const u=new Set,f=p=>{if(p.pointerType!=="mouse"||!this.canBrowse()||this.archiveMomentum)return;const g=e.getBoundingClientRect();this.pointer.set((p.clientX-g.left)/g.width-.5,(p.clientY-g.top)/g.height-.5);const y=this.pickCell(p.clientX,p.clientY);this.setHover(y),e.style.cursor=y?"pointer":"grab"};this.flushHover=()=>{const p=this.pendingHover;this.pendingHover=null,p&&f(p)};const m=()=>{this.pendingHover=null;const p=t;t=null,this.dragging=!1,this.dragTrack=null,this.holdingArchive=!1,o=!1,this.setHover(null),e.style.cursor=this.canBrowse()?"grab":"default",p!==null&&e.hasPointerCapture(p)&&e.releasePointerCapture(p)};this.cancelPointer=()=>{l=!0,this.stopMomentum(),u.clear(),h=0,m()};const v=p=>{const g=!this.archiveDrag.active;for(const y of p.getCoalescedEvents?.()??[])this.archiveDrag.move(y.clientX,y.clientY,y.timeStamp);this.archiveDrag.move(p.clientX,p.clientY,p.timeStamp),a||=this.archiveDrag.moved,this.archiveDrag.active&&(g&&(c={lane:this.columnCamera.value,row:this.rail.value}),this.setHover(null),this.lastInteraction=this.clock,e.style.cursor="grabbing",this.dragTrack={lane:c.lane+this.archiveDrag.value.lane*mi,row:c.row-this.archiveDrag.value.row*gi},this.columnCamera.value=this.dragTrack.lane,this.rail.value=this.dragTrack.row,this.columnCamera.velocity=this.rail.velocity=0,this.navigatePlane({lane:this.trackCoordinate("lane",this.columnCamera.value),row:this.trackCoordinate("row",this.rail.value)}))};e.addEventListener("pointerdown",p=>{if(!(p.pointerType==="mouse"&&p.button!==0)&&!(!this.canBrowse()&&!this.canInspect)){if(this.pendingHover=null,u.add(p.pointerId),u.size>1){l=!0,m();return}t=p.pointerId,l=!1,a=this.archiveMomentum!==null,s=i=p.clientX,r=p.clientY,o=this.canBrowse(),this.stopMomentum(),o&&(this.columnCamera.velocity=0,this.rail.velocity=0),this.holdingArchive=o,this.dragging=!o&&this.canInspect,c={lane:this.columnCamera.value,row:this.rail.value},this.archiveDrag.start(p.clientX,p.clientY,this.dragProjection(),p.timeStamp),this.setHover(null),e.setPointerCapture(p.pointerId),this.relayActive&&(this.holdingArchive=!1,this.dragging=!1)}},{signal:this.inputEvents.signal}),e.addEventListener("pointermove",p=>{if(this.relayActive){p.pointerId===t&&(a||=Math.hypot(p.clientX-s,p.clientY-r)>7);return}if(!(t!==null&&p.pointerId!==t)){if(t===null){this.pendingHover={clientX:p.clientX,clientY:p.clientY,pointerType:p.pointerType};return}if(!l){if(a||=Math.hypot(p.clientX-s,p.clientY-r)>7,o){if(!this.canBrowse()){this.cancelPointer();return}v(p);return}this.dragging&&this.canInspect&&(this.targetRotation=Ie.clamp(this.targetRotation+(p.clientX-i)*.004,-.8,.8),i=p.clientX)}}},{signal:this.inputEvents.signal}),e.addEventListener("pointerup",p=>{if(u.delete(p.pointerId),p.pointerId===t){if(this.relayActive){if(!l&&!a){const g=this.pickCell(p.clientX,p.clientY);this.onRelayPick?.(g?sn(g):null)}m();return}if(!l&&o&&this.canBrowse()){if(v(p),this.archiveDrag.active)this.motion.dragMomentum&&(this.archiveMomentum={time:performance.now()/1e3,motion:new hS({lane:this.trackCoordinate("lane",this.columnCamera.value),row:this.trackCoordinate("row",this.rail.value)},this.archiveDrag.releaseVelocity(p.timeStamp,!1))});else if(!a){const g=this.pickCell(p.clientX,p.clientY);g&&this.onSelect?.(Fl(g),g)}}m()}},{signal:this.inputEvents.signal}),e.addEventListener("pointercancel",p=>{u.delete(p.pointerId),p.pointerId===t&&(l=!0,m())},{signal:this.inputEvents.signal}),e.addEventListener("lostpointercapture",p=>{u.delete(p.pointerId),p.pointerId===t&&(l=!0,m())},{signal:this.inputEvents.signal}),e.addEventListener("pointerleave",()=>{this.pendingHover=null,this.pointer.set(0,0),this.setHover(null)},{signal:this.inputEvents.signal}),e.addEventListener("wheel",p=>{if(this.relayActive){p.preventDefault();return}if(!this.canBrowse()||t!==null||p.ctrlKey||Math.abs(p.deltaX)>Math.abs(p.deltaY))return;p.preventDefault(),this.archiveMomentum&&this.stopMomentum();const g=performance.now(),y=Ie.clamp(p.deltaY*(p.deltaMode===1?40:p.deltaMode===2?e.clientHeight:1),-300,300);(g-d>180||Math.sign(y)!==Math.sign(h))&&(h=0),d=g,h+=y;const S=Math.min(3,Math.floor(Math.abs(h)/100));if(!S)return;const M=Math.sign(h);h-=M*S*100,this.navigatingDrag=!0;try{for(let T=0;T<S;T++)this.onNavigate?.("row",M)}finally{this.navigatingDrag=!1}},{passive:!1,signal:this.inputEvents.signal}),window.addEventListener("blur",()=>this.cancelPointer(),{signal:this.inputEvents.signal}),document.addEventListener("visibilitychange",()=>{document.hidden&&this.cancelPointer()},{signal:this.inputEvents.signal}),window.addEventListener("resize",()=>this.cancelPointer(),{signal:this.inputEvents.signal}),window.addEventListener("pointerup",p=>u.delete(p.pointerId),{signal:this.inputEvents.signal}),window.addEventListener("pointercancel",p=>u.delete(p.pointerId),{signal:this.inputEvents.signal})}update(e,t){const i=Math.max(0,e-this.last||.016),s=Math.min(i,.05);if(this.last=e,this.clock=e,!this.loaded)return;this.flushHover();const r=this.motion.surfaceTransitions?Math.min(i,.25)/1.1:1;this.presence+=Math.sign(this.presenceTarget-this.presence)*Math.min(r,Math.abs(this.presenceTarget-this.presence)),this.renderer.domElement.style.opacity=String(Ie.clamp(this.presence/.16,0,1)),this.theme.beginFrame(),np(this.scene,this.renderer,this.themeAmount);const a=1-Math.exp(-s*(this.motion.selectionTransition?2.8:35)),o=1-Math.exp(-s*(this.motion.detailTransition?2.8:35));this.reveal=t?t.reveal:Ie.lerp(this.reveal,this.targetReveal,a),this.rotation=this.targetDetail?Ie.lerp(this.rotation,this.targetRotation,o):Xd(this.rotation,s,!this.motion.detailTransition);const l=t?.time??29.1;t?(this.scanTime=l,this.scanBlend=1):(this.scanTime+=s,this.scanBlend*=Math.exp(-s*3)),this.canBrowse()||(this.setHover(null),(this.holdingArchive||this.archiveMomentum)&&this.cancelPointer()),this.looping&&!t&&!this.holdingArchive&&!this.archiveMomentum&&this.rebaseCoordinates();const c=t?null:this.archiveMomentum;c&&(c.motion.step(Math.min(Math.max(e-c.time,0),.25)),c.time=e,this.navigatePlane(c.motion.value),this.lastInteraction=e);const h=!t&&this.hoverCell?sn(this.hoverCell):null;h&&!this.hoverLifts.has(h)&&this.hoverLifts.set(h,0);for(const[N,G]of this.hoverLifts){const oe=N===h?.28:0,Q=t?0:this.motion.selectionTransition?Ie.lerp(G,oe,1-Math.exp(-s*14)):oe;oe===0&&Q<1e-4?this.hoverLifts.delete(N):this.hoverLifts.set(N,Q)}const d=N=>this.hoverLifts.get(sn(N))??0,u=this.cellPosition(this.selectedCell),f=this.selectedCell.row,m=this.selectedCell.lane;bn(this.shoulder,f,this.motion.selectionTransition?5:35,s),bn(this.laneFocus,m,this.motion.selectionTransition?4:35,s),!this.holdingArchive&&!c&&(bn(this.columnCamera,u.x,this.motion.selectionTransition?3.7:35,s),bn(this.rail,t?0:-2.17-u.z,this.motion.selectionTransition?3.7:35,s)),c&&(this.columnCamera.value=this.trackPosition("lane",c.motion.lane.value),this.rail.value=this.trackPosition("row",c.motion.row.value),this.columnCamera.velocity=c.motion.lane.velocity*mi,this.rail.velocity=-c.motion.row.velocity*gi,c.motion.phase==="idle"&&(this.archiveMomentum=null)),this.dragTrack&&!t&&(this.columnCamera.value=this.dragTrack.lane,this.rail.value=this.dragTrack.row,this.columnCamera.velocity=this.rail.velocity=0),t&&(this.rail.value=0,this.rail.velocity=0,this.lift.value=pS(l),this.lift.velocity=0,this.shoulder.value=f,this.laneFocus.value=m,this.laneFocus.velocity=0,this.columnCamera.value=u.x,this.columnCamera.velocity=0);const v=t?0:this.columnCamera.value;this.pulses=this.pulses.filter(N=>e-N.time<3.2);const p=this.outgoing.some(N=>N.returnY!==null),g=!t&&this.motion.idleWave&&this.targetReveal>0&&!this.targetDetail&&this.detail<.01&&this.returnY===null&&!p&&e-this.lastInteraction>2.5;this.idleGain=t?0:Ie.lerp(this.idleGain,g?this.playfield.enabled?this.playfield.breathing&&!this.relayActive?1-this.playfield.bands.activity:0:1:0,1-Math.exp(-s*(g?.8:4))),this.pulseGain=Ie.lerp(this.pulseGain,this.targetDetail||this.returnY!==null||p?0:1,1-Math.exp(-s*8));const y=this.playfield,S=!t&&!this.targetDetail&&y.enabled,M=this.rhythm.update(S&&!this.reduced?y.bands:Id(),e,s,this.rhythmStyle);this.flatMix+=((S?y.flatten:0)-this.flatMix)*(this.reduced?1:1-Math.exp(-s*4)),this.subduedIndex.value=Math.max(Number(this.selectedIndexOnly),this.flatMix);const T=N=>this.selectedIndexOnly?1-wt(N/.4)*(1-this.flatMix):this.flatMix,w=S?y.target:null;w&&!this.relayLifts.has(w)&&this.relayLifts.set(w,0);for(const[N,G]of this.relayLifts){const oe=G+((N===w?.95:0)-G)*(this.reduced?1:1-Math.exp(-s*8));oe<.001&&N!==w?this.relayLifts.delete(N):this.relayLifts.set(N,oe)}const R=new P,_=(N,G)=>(R.set((G-2)*mi-v,-4.6,(N-15.5)*gi+this.rail.value).project(this.camera),(R.x+1)/2),E=new Map,L=(N,G)=>{if(t)return xS(N,G,l,this.shoulder.value,this.laneFocus.value);const oe=gp(N+this.coordinateOrigin.row,G+this.coordinateOrigin.lane,this.scanTime)*this.scanBlend,Q=vS(N+this.coordinateOrigin.row,G+this.coordinateOrigin.lane,e)*this.idleGain;let ee=0;if(!t&&this.motion.selectionWave){let me=0;for(const he of this.pulses){const Oe=Math.hypot(N-he.row,(G-he.lane)*2.2),I=e-he.time;me+=this.selectionPulse(Oe,I)*(this.deferSelectionPulse?gS(Oe,I):1)}ee=Ie.clamp(me,-.6,.6)*this.pulseGain}const fe=N-this.shoulder.value;return(oe+Zc(fe,26.56)*vp(G,this.laneFocus.value))*(1-this.flatMix)+Q+ee+(S&&!this.reduced?vb(N,G,e,y.bands,y.strength,M,_(N,G)):0)+(this.relayLifts.get(sn({row:N,lane:G}))??0)},C=(N,G)=>{let oe=E.get(G);oe||(oe=new Map,E.set(G,oe));const Q=oe.get(N);if(Q!==void 0)return Q;const ee=L(N,G);return oe.set(N,ee),ee},F=u.y+C(f,m);t||(this.returnY!==null&&this.rotation!==0?(this.lift.value=this.returnY-F,this.lift.velocity=0):(this.returnY=null,bn(this.lift,this.targetDetail?Wd:this.outgoing.some(N=>N.returnY!==null&&N.cell.lane===m&&Math.abs(N.cell.row-f)<5)?0:.4*this.targetReveal*(1-this.flatMix),this.motion.detailTransition?this.deferSelectionPulse&&!this.targetDetail&&this.lift.value<.4?7.6:4.2:35,s)));const k=this.targetDetail?wt((this.lift.value-.8)/2.4):this.returnY!==null?this.detail:wt((this.lift.value-.4)/(Wd-.4));this.detail=t?t.zoom:Ie.lerp(this.detail,k,o);const V=this.detail;this.decryption.update(s,V>.78&&this.lift.value>3.3,!1,t?l+5:void 0),this.appearance.apply(this.model,wt(this.lift.value/.4)),this.appearance.setClarity(this.model,this.modelClarity());const W=t?wt((l-21.9)/.86):this.reveal,z=Ie.clamp((l-21.92)/.75,0,1),B=t?-23*(1-z)**2:-28*(1-W);for(let N=this.outgoing.length-1;N>=0;N--){const G=this.outgoing[N],oe=this.cellPosition(G.cell),Q=oe.y+C(G.cell.row,G.cell.lane);G.group.rotation.y=Xd(G.group.rotation.y,s,!this.motion.detailTransition),G.returnY!==null?(G.lift.value=G.returnY-Q,G.lift.velocity=0,G.group.rotation.y===0&&(G.returnY=null)):bn(G.lift,0,this.motion.detailTransition?4.5:35,s),G.group.position.set(oe.x-v,Q+G.lift.value+d(G.cell)-this.presentationDrop(G.cell),oe.z+B+this.rail.value);const ee=wt(G.lift.value/.4);this.appearance.apply(G.group,ee),this.appearance.setTheme(G.group,this.theme.sample(G.cell,e),T(G.lift.value)),G.clarity=this.motion.modelDecryption?G.clarity*Math.exp(-s*9):0,this.appearance.setClarity(G.group,G.clarity);const{row:fe,lane:me}=G.cell;G.group.rotation.x=(C(fe+.5,me)-C(fe-.5,me))*.024*(1-V)*(1-ee),G.lift.value<1e-4&&Math.abs(G.group.rotation.y)<1e-4&&(this.scene.remove(G.group),this.appearance.dispose(G.group),this.outgoing.splice(N,1))}if(this.pendingPulse&&!t&&!this.targetDetail&&this.targetReveal){const N=F+this.lift.value,G=this.outgoing.every(oe=>oe.cell.lane!==m||Math.abs(oe.cell.row-f)>4||oe.group.position.y+.015<N);this.lift.value>=.35&&this.returnY===null&&G&&(this.motion.selectionWave&&this.emitPulse(this.pendingPulse),this.pendingPulse=null)}this.appearance.setTheme(this.model,this.theme.sample(this.selectedCell,e),T(this.lift.value)),this.model.position.set(u.x-v,u.y+C(f,m)+this.lift.value+d(this.selectedCell)-this.presentationDrop(this.selectedCell),u.z+B+this.rail.value),this.model.rotation.set((C(f+.5,m)-C(f-.5,m))*.024*(1-V)*(1-wt(this.lift.value/.4)),t?0:this.rotation,0);const ie=wt((l-22.6)/1.6),K=wt((l-24.25)/2.25),ce=Ie.degToRad(89-22*ie-8*K),de=Ie.degToRad(3+40*wt((l-21.96)/.22)-8*ie-16*K),ue=Ie.lerp(Ie.lerp(10.8,10.3,ie),7.33,K),Ne=!!t&&this.container.closest("[data-layout]")?.dataset.layout==="opening",tt=Ne?this.container.clientWidth/this.container.clientHeight/(16/9):1,Qe=N=>N/Math.min(1,tt),Z=Ie.lerp(Ie.lerp(28+7*ie,140,K),72,V),se=new P(-1.091,Ie.lerp(-2.55+.4*ie,-.045,K),Ie.lerp(2.48,.481,K)).clone(),Se=new P(-Math.sin(ce)*Math.cos(de),Math.sin(de),Math.cos(ce)*Math.cos(de));if(t){const N=wt((l-27.3)/1.3),G=wt((l-28.6)/5.4),oe=ce-Ie.degToRad(9*N+32*G),Q=de-Ie.degToRad(1.5*N+3.7*G);Se.set(-Math.sin(oe)*Math.cos(Q),Math.sin(Q),Math.cos(oe)*Math.cos(Q))}else Se.lerp(new P(-.277,.238,.931),V).normalize();if(t){const N=wt((l-25.4)/.95),G=new P().crossVectors(new P(0,1,0),Se).normalize();se.addScaledVector(G,-2.05*(1-N)*wt((l-24.2)/.8))}if(t&&l>=25.05&&l<=27.3){const N=wt((l-25.4)/1.05),G=new P().crossVectors(new P(0,1,0),Se).normalize(),oe=new P().crossVectors(Se,G).normalize(),Q=1080/Qe(ue),ee=this.model.position.clone().add(new P(-2.5,3.7,0));ee.addScaledVector(G,-(Ie.lerp(840,518,N)-960)*tt/Q),ee.addScaledVector(oe,-(540-Ie.lerp(340,288,N))/Q),se.lerp(ee,wt((l-25.05)/.35))}if(t&&l>27.3){const N=wt((l-27.3)/6.7),G=wt((l-27.3)/1.25),oe=Ie.lerp(518-98*G,618,N),Q=Ie.lerp(296+34*G,287,N),ee=1080/Qe(Ie.lerp(ue,5.9,V)),fe=new P().crossVectors(new P(0,1,0),Se).normalize(),me=new P().crossVectors(Se,fe).normalize(),he=this.model.position.clone().add(new P(-2.5,3.7,0));he.addScaledVector(fe,-(oe-960)*tt/ee),he.addScaledVector(me,-(540-Q)/ee),se.lerp(he,wt((l-27.3)/.5))}const Me=Vm(this.container.clientWidth,this.container.clientHeight,ue,V,this.container.closest("[data-layout]")?.dataset.layout==="compact");if(!t){const N=new P().crossVectors(new P(0,1,0),Se).normalize(),G=new P().crossVectors(Se,N).normalize(),oe=this.container.clientWidth,Q=this.container.clientHeight,ee=Q/Me.span;if(Me.portrait){const me=new P(0,-4.6+Zc(0,26.56)+.4+1.85,-2.17);me.addScaledVector(G,(Me.previewY-.5)*Q/ee),se.copy(me)}const fe=this.model.position.clone().add(new P(0,1.85,0));fe.addScaledVector(N,(.5-Me.detailX)*oe/ee),fe.addScaledVector(G,(Me.detailY-.5)*Q/ee),se.lerp(fe,V)}const Le=se.clone().addScaledVector(Se,Z);!t&&this.motion.pointerParallax&&!this.uiOnlyParallax&&(Le.x+=this.pointer.x*.12,Le.y-=this.pointer.y*.12);const Tt=this.targetDetail||this.detail>.01?this.motion.detailTransition:this.motion.selectionTransition,Ge=t?1:Tt?1-Math.exp(-s*5):1;this.camera.position.lerp(Le,Ge),this.cameraAim.lerp(se,Ge),this.camera.lookAt(this.cameraAim),this.camera.fov=Ie.lerp(this.camera.fov,Ie.radToDeg(2*Math.atan((t?Qe(Ie.lerp(ue,5.9,V)):Me.span)/(2*Z))),Ge);const je=this.scene.fog,it=this.camera.position.distanceTo(this.cameraAim),ke=this.themeAmount;je.near=it+Ie.lerp(5-4*ke,-1,V),je.far=it+Ie.lerp(25-9*ke,12,V),this.camera.updateProjectionMatrix(),this.camera.updateMatrixWorld(),S&&!this.reduced&&E.clear();const dt=(!!t||!this.looping)&&!Ne;this.cells=dt?Array.from({length:160},(N,G)=>Bl(G)):this.visibility.update(this.camera,je.far,v,B+this.rail.value,this.extraCoverage);const D=new Set(this.outgoing.map(N=>sn(N.cell)));D.add(sn(this.selectedCell)),this.drawnCells=[],this.relayPoints.clear(),this.drawCoverage.update(this.camera),this.shadowCoverage?.begin(),this.matrixUpdates??=new Ls(this.instances[0].instanceMatrix),this.themeAttribute&&(this.themeUpdates??=new Ls(this.themeAttribute));for(const N of this.cells){const{row:G,lane:oe}=N;if(D.has(sn(N)))continue;const Q=(oe-2)*mi-v,ee=-4.6+C(G,oe)+d(N)-this.presentationDrop(N),fe=(G-15.5)*gi+B+this.rail.value;if(!dt&&!this.visibility.intersects(Q,ee,fe))continue;const me=C(G+.5,oe)-C(G-.5,oe);if(this.dummy.position.set(Q,ee,fe),this.dummy.rotation.set(me*.024*(1-V),0,0),this.dummy.scale.setScalar(1),this.dummy.updateMatrix(),y.enabled&&this.relayPoints.set(sn(N),{cell:{...N},point:new P(0,3.5,0).applyMatrix4(this.dummy.matrix)}),this.shadowCoverage?.add(this.dummy.matrix),!this.drawCoverage.contains(Q,ee,fe))continue;const he=this.drawnCells.length;this.ensureInstanceCapacity(he+1),this.drawnCells.push(N),this.themeUpdates?.scalar(he,this.theme.sample(N,e)),this.matrixUpdates.set(he*16,this.dummy.matrix.elements)}const _t=this.instances[0].count!==this.drawnCells.length,$e=this.matrixUpdates.commit(),rt=this.shadowCoverage?.commit()??!1,_e=$e||rt;for(const N of this.instances)N.count=this.drawnCells.length;(_e||_t||!this.instances[0].boundingSphere)&&this.instances[0].computeBoundingSphere(),this.themeUpdates?.commit();let A=-1/0;const x=m,U=f;for(let N=U-5;N<=U+5;N++)N!==U&&(A=Math.max(A,-4.6+C(N,x)+3.76));for(const N of this.outgoing)N.cell.lane===x&&Math.abs(N.cell.row-U)<=5&&(A=Math.max(A,N.group.position.y+3.76));this.clearance=this.model.position.y-A,this.canInspect=!t&&!!this.targetDetail&&V>.9&&this.pulseGain<.01&&this.clearance>.3,this.container.dataset.inspection=this.returnY!==null?"aligning":this.canInspect?"ready":this.targetDetail?"lifting":"preview";const J=this.model.position.clone().add(new P(0,2,0)).applyMatrix4(this.camera.matrixWorldInverse),$=this.bokeh.uniforms;$.focus.value=-J.z,$.aperture.value=Ie.lerp(3e-4,8e-4,V)*this.quality.depthOfField/100,this.renderer.info.reset();const q=this.renderState;if(this.scene.updateMatrixWorld(),_e||t)q.invalidate();else if(q.begin(),q.floats(...this.camera.projectionMatrix.elements,...this.camera.matrixWorldInverse.elements,...this.camera.position.toArray(),je.near,je.far,this.themeAmount,this.subduedIndex.value,$.focus.value,$.aperture.value),this.scene.traverse(N=>{if(q.add(N.id,Number(N.visible)),!(N instanceof st))return;N.modelViewMatrix.multiplyMatrices(this.camera.matrixWorldInverse,N.matrixWorld),N.normalMatrix.getNormalMatrix(N.modelViewMatrix),q.floats(...N.modelViewMatrix.elements,...N.normalMatrix.elements,...N.matrixWorld.elements);const G=N.material;q.add(N.geometry.id,G.uuid,G.map?.uuid,G.map?.version??0),q.floats(G.opacity,G.roughness,G.metalness,G.transmission,G.thickness,G.attenuationDistance,G.clearcoat,G.clearcoatRoughness,G.color.r,G.color.g,G.color.b,G.attenuationColor?.r??0,G.attenuationColor?.g??0,G.attenuationColor?.b??0);for(const oe of["appearance","glassClarity","themeAmount","subduedIndex"])q.floats(N.userData[oe]?.value??0);N instanceof $n&&q.add(N.count,N.instanceMatrix.version,this.themeAttribute?.version??0)}),!q.end()){this.reusedFrames++;return}this.renderedFrames++;const pe=this.shadowState;pe.begin(),pe.add(this.light.shadow.mapSize.x,Number(this.renderer.shadowMap.enabled)),pe.floats(...this.light.matrixWorld.elements,...this.light.target.matrixWorld.elements),this.scene.traverseVisible(N=>{!(N instanceof st)||!N.castShadow||(pe.add(N.id,N.geometry.id),pe.floats(...N.matrixWorld.elements),N instanceof $n&&pe.add(N.count,N.instanceMatrix.version))}),this.renderer.shadowMap.needsUpdate=pe.end()||this.light.shadow.needsUpdate,this.superPerformance?this.renderer.render(this.scene,this.camera):this.composer.render()}projectCard(e,t){this.model.updateMatrixWorld(!0);const i=this.model.localToWorld(new P(e,t,.255)).project(this.camera);return[(i.x+1)*this.container.clientWidth/2,(1-i.y)*this.container.clientHeight/2]}get decryptionFrame(){return this.decryption.frame}finishDecryption(){this.decryption.finish()}get detailVisibility(){return wt((this.detail-.25)/.55)}getStats(){this.model.updateMatrixWorld(!0);const e=(t,i,s)=>{const r=this.model.localToWorld(new P(t,i,s)).project(this.camera);return[Math.round((r.x+1)*this.container.clientWidth/2),Math.round((1-r.y)*this.container.clientHeight/2)]};return{decryption:{...this.decryption.frame,clarity:this.decryption.clarity,modelClarity:this.modelClarity()},topLeft:e(-2.5,3.7,0),topRight:e(2.5,3.7,0),labelTopLeft:e(-1.855,3.27,.255),labelBottomLeft:e(-1.855,2.81,.255),modelPosition:this.model.position.toArray().map(t=>Math.round(t*1e4)/1e4),cameraPosition:this.camera.position.toArray().map(t=>Math.round(t*1e4)/1e4),fieldOfView:this.camera.fov,loaded:this.loaded,drawCalls:this.renderer.info.render.calls,renderedFrames:this.renderedFrames,reusedFrames:this.reusedFrames,superPerformance:this.superPerformance,presentation:this.presence,triangles:this.renderer.info.render.triangles,archiveCount:this.drawnCells.length,archiveCandidates:this.cells.length,archiveCulled:this.cells.length-this.drawnCells.length,archiveCapacity:this.instanceCapacity,archiveCoverage:this.extraCoverage?"extra":"standard",returningFiles:this.outgoing.length,selectionPhase:this.pendingPulse?"lifting":this.pulses.length?"wave":"settled",pendingPulse:this.pendingPulse?{...this.pendingPulse}:null,pulses:this.pulses.map(t=>({...t})),referenceTime:Math.round((this.scanTime+5)*100)/100,selectedSlot:this.selectedSlot,selectedLane:Math.floor(this.selectedSlot/32),selectedCell:{...this.selectedCell},hoverCell:this.hoverCell?{...this.hoverCell}:null,hoverLifts:Object.fromEntries(this.hoverLifts),dragTrack:this.dragTrack?{...this.dragTrack}:null,archiveMomentum:this.archiveMomentum?{phase:this.archiveMomentum.motion.phase,value:this.archiveMomentum.motion.value,velocity:this.archiveMomentum.motion.velocity}:null,holdingArchive:this.holdingArchive,dragProjection:this.dragProjection(),dragMapping:this.archiveDrag.active?"free":null,coordinateOrigin:{...this.coordinateOrigin},poolBounds:{minLane:Math.min(...this.cells.map(t=>t.lane)),maxLane:Math.max(...this.cells.map(t=>t.lane)),minRow:Math.min(...this.cells.map(t=>t.row)),maxRow:Math.max(...this.cells.map(t=>t.row))},laneFocus:this.laneFocus.value,columnCamera:this.columnCamera.value,rotation:this.rotation,clearance:this.clearance,canInspect:this.canInspect,returnPhase:this.returnY!==null?"aligning":"lowering",extraction:Math.round(this.lift.value*1e3)/1e3,appearance:Math.round(wt(this.lift.value/.4)*1e3)/1e3,cameraDetail:Math.round(this.detail*1e3)/1e3,idleGain:this.idleGain,flatten:this.flatMix,spectrumActivity:this.playfield.bands.activity,selectedIndexDim:this.model.children.find(t=>t.userData.surface==="Index_Inlay")?.userData.subduedIndex?.value,returningIndexDims:this.outgoing.map(t=>({cell:t.cell,dim:t.group.children.find(i=>i.userData.surface==="Index_Inlay")?.userData.subduedIndex?.value})),cameraDistance:this.camera.position.distanceTo(this.cameraAim),cameraNear:this.camera.near,cameraFar:this.camera.far,fogNear:this.scene.fog.near,fogFar:this.scene.fog.far,returningAppearance:this.outgoing.map(t=>({slot:t.slot,clarity:t.group.children.find(i=>i.userData.surface==="Frosted_Polymer")?.userData.glassClarity?.value,cell:{...t.cell},lift:t.lift.value,quality:wt(t.lift.value/.4),rotation:t.group.rotation.y,worldY:t.group.position.y,phase:t.returnY!==null?"aligning":"lowering"})),rail:Math.round(this.rail.value*1e3)/1e3}}}const qd={type:"change"},kh={type:"start"},xp={type:"end"},qa=new ir,jd=new Mn,MS=Math.cos(70*Ie.DEG2RAD),Ut=new P,ii=2*Math.PI,mt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Wl=1e-6;class bS extends nv{constructor(e,t=null){super(e,t),this.state=mt.NONE,this.target=new P,this.cursor=new P,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ns.ROTATE,MIDDLE:Ns.DOLLY,RIGHT:Ns.PAN},this.touches={ONE:En.ROTATE,TWO:En.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new P,this._lastQuaternion=new Ri,this._lastTargetPosition=new P,this._quat=new Ri().setFromUnitVectors(e.up,new P(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Fr,this._sphericalDelta=new Fr,this._scale=1,this._panOffset=new P,this._rotateStart=new De,this._rotateEnd=new De,this._rotateDelta=new De,this._panStart=new De,this._panEnd=new De,this._panDelta=new De,this._dollyStart=new De,this._dollyEnd=new De,this._dollyDelta=new De,this._dollyDirection=new P,this._mouse=new De,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=TS.bind(this),this._onPointerDown=SS.bind(this),this._onPointerUp=ES.bind(this),this._onContextMenu=LS.bind(this),this._onMouseWheel=CS.bind(this),this._onKeyDown=RS.bind(this),this._onTouchStart=PS.bind(this),this._onTouchMove=DS.bind(this),this._onMouseDown=wS.bind(this),this._onMouseMove=AS.bind(this),this._interceptControlDown=IS.bind(this),this._interceptControlUp=NS.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(qd),this.update(),this.state=mt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Ut.copy(t).sub(this.target),Ut.applyQuaternion(this._quat),this._spherical.setFromVector3(Ut),this.autoRotate&&this.state===mt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=ii:i>Math.PI&&(i-=ii),s<-Math.PI?s+=ii:s>Math.PI&&(s-=ii),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Ut.setFromSpherical(this._spherical),Ut.applyQuaternion(this._quatInverse),t.copy(this.target).add(Ut),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=Ut.length();a=this._clampDistance(o*this._scale);const l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const o=new P(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new P(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Ut.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(qa.origin.copy(this.object.position),qa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(qa.direction))<MS?this.object.lookAt(this.target):(jd.setFromNormalAndCoplanarPoint(this.object.up,this.target),qa.intersectPlane(jd,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Wl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Wl||this._lastTargetPosition.distanceToSquared(this.target)>Wl?(this.dispatchEvent(qd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ii/60*this.autoRotateSpeed*e:ii/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Ut.setFromMatrixColumn(t,0),Ut.multiplyScalar(-e),this._panOffset.add(Ut)}_panUp(e,t){this.screenSpacePanning===!0?Ut.setFromMatrixColumn(t,1):(Ut.setFromMatrixColumn(t,0),Ut.crossVectors(this.object.up,Ut)),Ut.multiplyScalar(e),this._panOffset.add(Ut)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Ut.copy(s).sub(this.target);let r=Ut.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/i.clientHeight,this.object.matrix),this._panUp(2*t*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),s=e-i.left,r=t-i.top,a=i.width,o=i.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ii*this._rotateDelta.x/t.clientHeight),this._rotateUp(ii*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ii*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(i,s)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),s=.5*(e.pageX+i.x),r=.5*(e.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ii*this._rotateDelta.x/t.clientHeight),this._rotateUp(ii*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new De,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function SS(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function TS(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function ES(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(xp),this.state=mt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function wS(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ns.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=mt.DOLLY;break;case Ns.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=mt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=mt.ROTATE}break;case Ns.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=mt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=mt.PAN}break;default:this.state=mt.NONE}this.state!==mt.NONE&&this.dispatchEvent(kh)}function AS(n){switch(this.state){case mt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case mt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case mt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function CS(n){this.enabled===!1||this.enableZoom===!1||this.state!==mt.NONE||(n.preventDefault(),this.dispatchEvent(kh),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(xp))}function RS(n){this.enabled!==!1&&this._handleKeyDown(n)}function PS(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case En.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=mt.TOUCH_ROTATE;break;case En.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=mt.TOUCH_PAN;break;default:this.state=mt.NONE}break;case 2:switch(this.touches.TWO){case En.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=mt.TOUCH_DOLLY_PAN;break;case En.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=mt.TOUCH_DOLLY_ROTATE;break;default:this.state=mt.NONE}break;default:this.state=mt.NONE}this.state!==mt.NONE&&this.dispatchEvent(kh)}function DS(n){switch(this._trackPointer(n),this.state){case mt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case mt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case mt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case mt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=mt.NONE}}function LS(n){this.enabled!==!1&&n.preventDefault()}function IS(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function NS(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const US=n=>Math.atan2(Math.sin(n),Math.cos(n));class OS{constructor(e){this.camera=e}camera;focus=new P;pose=new Fr;desired=new Fr;offset=new P;resetFrom=new Fr;resetFocus=new P;elapsed=0;resetting=!1;snap(e,t){this.resetting=!1,this.focus.copy(t),this.pose.setFromVector3(this.offset.copy(e.position).sub(t)),this.apply()}reset(){this.resetFrom.copy(this.pose),this.resetFocus.copy(this.focus),this.elapsed=0,this.resetting=!0}interruptReset(e,t){this.resetting&&(this.resetting=!1,e.position.copy(this.camera.position),t.copy(this.focus),e.lookAt(t))}update(e,t,i,s=!1){if(s){this.snap(e,t);return}if(this.desired.setFromVector3(this.offset.copy(e.position).sub(t)),this.resetting){this.elapsed+=Math.max(0,i);const r=Math.min(1,this.elapsed/.56),a=1-(1-r)**3;this.focus.lerpVectors(this.resetFocus,t,a),this.interpolate(this.resetFrom,this.desired,a,a),r===1&&(this.resetting=!1)}else{const r=1-Math.exp(-13*Math.max(0,i)),a=1-Math.exp(-9*Math.max(0,i)),o=1-Math.exp(-15*Math.max(0,i));this.focus.lerp(t,r),this.interpolate(this.pose,this.desired,a,o),this.focus.distanceToSquared(t)<1e-10&&this.focus.copy(t)}this.apply()}interpolate(e,t,i,s){this.pose.radius=Math.exp(Ie.lerp(Math.log(e.radius),Math.log(t.radius),s)),this.pose.phi=Ie.lerp(e.phi,t.phi,i),this.pose.theta=e.theta+US(t.theta-e.theta)*i,this.pose.makeSafe()}apply(){this.camera.position.copy(this.offset.setFromSpherical(this.pose)).add(this.focus),this.camera.lookAt(this.focus)}}function _p(){try{const n=navigator.getGamepads();for(const e of n)if(e?.connected&&e.mapping==="standard")return e}catch{}}function FS(n){const e=new Set,t=n.axes,i=r=>n.buttons[r]?.pressed??!1,s=r=>t[r]??0;return(i(0)||i(9))&&e.add("Enter"),(i(1)||i(8))&&e.add("Escape"),i(2)&&e.add("/"),i(3)&&e.add("Home"),i(4)&&e.add("Shift+Tab"),i(5)&&e.add("Tab"),(i(12)||s(1)<-ja)&&e.add("ArrowUp"),(i(13)||s(1)>ja)&&e.add("ArrowDown"),(i(14)||s(0)<-ja)&&e.add("ArrowLeft"),(i(15)||s(0)>ja)&&e.add("ArrowRight"),e}const yp=new WeakSet,BS=n=>yp.has(n);function Yd(n,e=!1){const t=document.activeElement,i=t instanceof HTMLElement&&t!==document.body?t:document.body,s=t instanceof HTMLElement?t.closest(".terminal-modal"):null;if(n==="Tab"||n==="Shift+Tab"||s&&n.startsWith("Arrow")){const l=[...(s??(t instanceof HTMLElement?t.closest('[role="dialog"]'):null)??document).querySelectorAll('a[href],button,input,select,summary,[tabindex="0"]')].filter(d=>d.tabIndex>=0&&!d.matches(':disabled,[aria-disabled="true"]')&&!d.closest("[inert]")&&d.getClientRects().length>0),c=l.indexOf(t),h=["Shift+Tab","ArrowUp","ArrowLeft"].includes(n);l.length&&l[c<0?h?l.length-1:0:(c+(h?l.length-1:1))%l.length].focus();return}const a=new KeyboardEvent("keydown",{key:n,repeat:e,bubbles:!0,cancelable:!0});yp.add(a),i.dispatchEvent(a),n==="Enter"&&!a.defaultPrevented&&t instanceof HTMLElement&&t.matches('button,a[href],summary,input[type="checkbox"],input[type="radio"]')&&!t.matches(':disabled,[aria-disabled="true"]')&&!t.closest("[inert]")&&t.click()}const ja=.35,kS=400,zS=120,jn=new Set,As=new Map,Yn=new Map;let Kd=0,Jc=!1,Xl=!1,yo="keyboard";const Qc=new Set;function Mo(n){if(yo!==n){yo=n;for(const e of Qc)e(n)}}function VS(){return yo}function Mp(n){return Qc.add(n),n(yo),()=>{Qc.delete(n)}}function bp(){if(Kd=requestAnimationFrame(bp),document.hidden||!document.hasFocus()){Xl=!0,jn.clear(),As.clear(),Yn.clear();return}const n=_p();if(!n){Mo("keyboard"),jn.clear(),As.clear(),Yn.clear(),Jc=!1,cancelAnimationFrame(Kd);return}const e=FS(n);if(Xl){Xl=e.size>0;return}const t=performance.now();e.size>0&&Mo("gamepad");for(const i of[...jn])e.has(i)||(jn.delete(i),As.delete(i),Yn.delete(i));for(const i of e)jn.has(i)?(i.startsWith("Arrow")||i.endsWith("Tab"))&&t-As.get(i)>=kS&&t-Yn.get(i)>=zS&&(Yn.set(i,t),Yd(i,!0)):(jn.add(i),As.set(i,t),Yn.set(i,t),Yd(i))}function Zd(){Jc||!_p()||(Jc=!0,bp())}let Jd=!1;function HS(){Jd||(Jd=!0,!(typeof navigator>"u"||!("getGamepads"in navigator))&&(window.addEventListener("keydown",n=>{n.isTrusted&&Mo("keyboard")},{capture:!0,passive:!0}),window.addEventListener("pointerdown",()=>Mo("keyboard"),{passive:!0}),Zd(),window.addEventListener("gamepadconnected",()=>{Zd()}),window.addEventListener("gamepaddisconnected",()=>{jn.clear(),As.clear(),Yn.clear()})))}const ql=[{id:"fasteners",label:"紧固件",en:"FASTENERS",depth:2.75},{id:"cover",label:"透明盖板",en:"OPTICAL COVER",depth:1.85},{id:"optical-lenses",label:"折射环组",en:"REFRACTIVE RINGS",depth:.75},{id:"optical-core",label:"光学核心",en:"OPTICAL CORE",depth:-.15},{id:"substrate",label:"信息基板",en:"SUBSTRATE",depth:-1.1},{id:"carrier",label:"背板与框架",en:"CARRIER",depth:-2.05}];class GS{constructor(e,t,i=()=>{}){this.onSound=i,this.onClose=t,this.root=document.createElement("section"),this.root.className="model-viewer",this.root.hidden=!0,this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-modal","true"),this.root.setAttribute("aria-labelledby","viewer-title"),this.root.innerHTML=`
      <div class="viewer-canvas"></div>
      <div class="scene-atmosphere viewer-atmosphere" aria-hidden="true"></div>
      <header class="viewer-header">
        <button class="viewer-back" data-viewer="close">← <span>返回档案</span><kbd>ESC</kbd></button>
        <div class="viewer-heading"><span>LINKING / 档案模型</span><h2 id="viewer-title">档案模型</h2><p id="viewer-file"></p></div>
        <span class="viewer-index">360<span>°</span></span>
      </header>
      <div class="viewer-surface" role="group" aria-label="玻璃模式"><button data-viewer="clear" aria-pressed="true">清晰</button><button data-viewer="frosted" aria-pressed="false">磨砂</button></div>
      <aside class="viewer-parts" aria-label="模型装配结构"><div>装配结构</div>${ql.map((s,r)=>`<p><span>${String(r+1).padStart(2,"0")}</span><strong>${s.label}</strong><small>${s.en}</small></p>`).join("")}</aside>
      <div class="viewer-loading" role="status"><span>正在载入模型…</span><button data-viewer="retry" hidden>重新载入 ↗</button></div>
      <footer class="viewer-footer">
        <div class="viewer-help"><span>拖动旋转</span><span>↑ ↓ ← → 平移</span><span>滚轮缩放</span></div>
        <div class="viewer-actions"><button data-viewer="explode" aria-pressed="false"><span>＋</span> 拆解档案</button><button data-viewer="assemble" aria-pressed="true"><span>−</span> 一键重组</button></div>
        <button class="viewer-reset" data-viewer="reset">复位视角 <span>↗</span></button>
      </footer>
      <div class="viewer-state" aria-live="polite">已组装</div>`,e.appendChild(this.root),this.disposeDeviceListener=Mp(()=>this.updateHelp()),this.canvasHost=this.root.querySelector(".viewer-canvas"),this.renderer=new tp({antialias:!0,powerPreference:"high-performance"}),this.renderer.toneMapping=$r,this.renderer.toneMappingExposure=1.05,this.renderer.domElement.tabIndex=0,this.renderer.domElement.setAttribute("aria-label","档案三维模型：拖动旋转，方向键平移，滚轮或加减键缩放，Home 复位"),this.canvasHost.appendChild(this.renderer.domElement),this.scene.background=new Ae("#eae5e1"),this.scene.fog=new Lo("#eae5e1",13.5,26.5),op(this.renderer,this.scene),this.camera.position.copy(this.initialCamera),this.controlCamera.copy(this.camera),this.controls=new bS(this.controlCamera,this.renderer.domElement),this.controls.enableDamping=!1,this.pipeline=tS(this.renderer,this.scene,this.camera),this.pipeline.smaa.enabled=!1,this.controls.rotateSpeed=.65,this.controls.zoomSpeed=.7,this.controls.panSpeed=.7,this.controls.minDistance=5,this.controls.maxDistance=28,this.controls.maxTargetRadius=5,this.controls.screenSpacePanning=!0,this.controls.touches.ONE=En.ROTATE,this.controls.touches.TWO=En.DOLLY_PAN,this.controls.enabled=!1,this.controls.update(),this.cameraMotion.snap(this.controlCamera,this.controls.target),this.controls.addEventListener("start",()=>this.interruptReset()),this.root.addEventListener("click",s=>{if(this.closing)return;const r=s.target.closest("[data-viewer]")?.dataset.viewer;r==="close"&&this.close(),r==="retry"&&this.load(),!(this.loading||!this.source)&&((r==="clear"||r==="frosted")&&(this.setSurface(r==="clear"),this.onSound("tick")),r==="explode"&&this.targetSpread!==1&&(this.setExploded(!0),this.onSound("explode")),r==="assemble"&&this.targetSpread!==0&&(this.setExploded(!1),this.onSound("assemble")),r==="reset"&&(this.resetView(),this.onSound("tick")))}),this.root.addEventListener("keydown",s=>this.keydown(s))}onSound;themeAmount=0;setTheme(e){this.themeAmount=e}root;canvasHost;renderer;pipeline;quality=Jn(void 0);superPerformance=!1;dispose(){this.disposeDeviceListener?.(),this.request++,this.isOpen&&this.finishClose(),this.controls.dispose(),Xc(this.scene);for(const e of this.pipeline.composer.passes)e.dispose();this.pipeline.composer.dispose(),this.renderer.dispose(),this.renderer.forceContextLoss(),this.root.remove()}setSuperPerformance(e){this.superPerformance!==e&&(this.superPerformance=e,this.resize())}appliedQuality="";scene=new Io;camera=new Wt(34,16/9,.3,120);controlCamera=this.camera.clone();cameraMotion=new OS(this.camera);controls;source;groups=new Map;spread={value:0,velocity:0};targetSpread=0;clarity={value:1,velocity:0};targetClarity=1;lastTime=0;request=0;reduced=!1;motion=qr();loading=!1;closing=!1;transitions=[];disposeDeviceListener;modelTransition;transitionId=0;status="";opener=null;siblings=[];initialCamera=new P(7.2,3.8,12);onClose;provider;isOpen=!1;setMotion(e){this.motion={...e},this.reduced=!e.viewerNavigation,this.root.dataset.motionModel=e.viewerModelTransition?"full":"reduced",this.root.dataset.motionSurface=e.surfaceTransitions?"full":"reduced",!e.surfaceTransitions&&this.isOpen&&(this.transitionId++,this.closing?this.finishClose():(this.transitions.forEach(t=>t.cancel()),this.transitions=[],this.root.dataset.transition="open")),e.viewerModelTransition||(this.modelTransition?.cancel(),this.modelTransition=void 0,this.clarity={value:this.targetClarity,velocity:0},this.spread={value:this.targetSpread,velocity:0})}open(e,t,i,s){this.isOpen||(this.isOpen=!0,this.closing=!1,this.reduced=s,this.provider=i,this.opener=document.activeElement,this.siblings=[...this.root.parentElement.children].filter(r=>r instanceof HTMLElement&&r!==this.root).map(r=>({node:r,inert:r.inert})),this.siblings.forEach(({node:r})=>r.inert=!0),this.root.hidden=!1,this.root.dataset.transition="opening",this.root.querySelector("#viewer-title").textContent=t,this.root.querySelector("#viewer-file").textContent="FILE "+e+" / INTERNAL DATABASE",this.spread={value:0,velocity:0},this.targetSpread=0,this.clarity={value:1,velocity:0},this.setSurface(!0),this.lastTime=0,this.root.dataset.exploded="false",this.resetView(!1),this.resize(),this.renderer.domElement.focus({preventScroll:!0}),this.enter(),this.load())}async load(){if(!this.provider||this.loading)return;const e=++this.request;this.loading=!0,this.controls.enabled=!1;const t=this.root.querySelector(".viewer-loading");t.hidden=!1,t.querySelector("span").textContent="正在载入模型…",t.querySelector("button").hidden=!0,this.setButtonsDisabled(!0);try{const i=await this.provider();if(!this.isOpen||this.closing||e!==this.request){i.dispose();return}this.source=i;for(const s of ql){const r=new Hi;r.name=s.id,this.groups.set(s.id,r)}for(const s of[...i.model.children])this.groups.get(s.userData.assemblyPart??"cover")?.add(s);for(const s of this.groups.values())i.model.add(s);i.model.position.set(0,-1.85,0),this.scene.add(i.model),Yc(i.model,this.renderer,this.quality),this.loading=!1,t.hidden=!0,this.controls.enabled=!0,this.setButtonsDisabled(!1),this.setExploded(!1),this.setStatus("已组装"),this.update(this.lastTime),this.motion.viewerModelTransition&&(this.modelTransition=this.canvasHost.animate([{opacity:0,transform:"scale(0.97)"},{opacity:1,transform:"scale(1)"}],{duration:380,easing:"cubic-bezier(0.22, 1, 0.36, 1)"}))}catch(i){if(!this.isOpen||this.closing||e!==this.request)return;this.loading=!1,t.querySelector("span").textContent="模型载入失败，请重试",t.querySelector("button").hidden=!1,console.error("Model viewer failed to load",i)}}enter(){const e=++this.transitionId;if(this.transitions.forEach(i=>i.cancel()),this.transitions=[],!this.motion.surfaceTransitions){this.root.dataset.transition="open";return}const t=this.root.animate([{opacity:0},{opacity:1}],{duration:320,easing:"cubic-bezier(0.22, 1, 0.36, 1)"});this.transitions.push(t);for(const i of[".viewer-header",".viewer-footer",".viewer-state"]){const s=this.root.querySelector(i);this.transitions.push(s.animate([{opacity:0,translate:"0 10px"},{opacity:1,translate:"0 0"}],{duration:300,delay:60,fill:"backwards",easing:"cubic-bezier(0.22, 1, 0.36, 1)"}))}t.finished.then(()=>{e===this.transitionId&&(this.root.dataset.transition="open")}).catch(()=>{})}close(){if(!this.isOpen||this.closing)return;this.closing=!0,this.request++,this.loading=!1,this.controls.enabled=!1,this.setButtonsDisabled(!0);const e=++this.transitionId,t=getComputedStyle(this.root).opacity,i=getComputedStyle(this.canvasHost),s=i.opacity,r=i.transform;if(this.modelTransition?.cancel(),this.modelTransition=void 0,this.transitions.forEach(o=>o.cancel()),this.transitions=[],this.root.dataset.transition="closing",!this.motion.surfaceTransitions){this.finishClose();return}const a=this.root.animate([{opacity:t},{opacity:0}],{duration:220,easing:"cubic-bezier(0.4, 0, 1, 1)",fill:"forwards"});this.transitions.push(a,this.canvasHost.animate([{transform:r,opacity:s},{transform:"scale(0.97)",opacity:0}],{duration:220,easing:"cubic-bezier(0.4, 0, 1, 1)",fill:"forwards"})),a.finished.then(()=>{e===this.transitionId&&this.finishClose()}).catch(()=>{})}finishClose(){this.isOpen=!1,this.closing=!1,this.root.hidden=!0,this.root.dataset.transition="closed",this.modelTransition?.cancel(),this.modelTransition=void 0,this.transitions.forEach(e=>e.cancel()),this.transitions=[],this.source&&(this.scene.remove(this.source.model),this.source.dispose(),this.source=void 0),this.groups.clear(),this.siblings.forEach(({node:e,inert:t})=>e.inert=t),this.siblings=[],this.opener?.focus({preventScroll:!0}),this.onClose()}setButtonsDisabled(e){for(const t of["explode","assemble","reset","clear","frosted"])this.root.querySelector(`[data-viewer="${t}"]`).disabled=e}setSurface(e){this.targetClarity=e?1:0,this.root.dataset.surface=e?"clear":"frosted",this.root.querySelector('[data-viewer="clear"]').setAttribute("aria-pressed",String(e)),this.root.querySelector('[data-viewer="frosted"]').setAttribute("aria-pressed",String(!e)),this.motion.viewerModelTransition||(this.clarity={value:this.targetClarity,velocity:0})}setExploded(e){this.targetSpread=e?1:0,this.root.dataset.exploded=String(e),this.root.querySelector('[data-viewer="explode"]').setAttribute("aria-pressed",String(e)),this.root.querySelector('[data-viewer="assemble"]').setAttribute("aria-pressed",String(!e)),this.setStatus(e?"正在拆解":this.spread.value>.001?"正在重组":"已组装"),this.motion.viewerModelTransition||(this.spread={value:this.targetSpread,velocity:0})}setStatus(e){e!==this.status&&(this.status=e,this.root.querySelector(".viewer-state").textContent=e)}resetView(e=!0){this.controls.enabled=!1,this.controls.enableDamping=!1,this.controls.update(),this.controls.target.set(0,0,0),this.controlCamera.position.copy(this.initialCamera),this.controls.enableDamping=!1,this.controls.update(),e&&this.motion.viewerNavigation?this.cameraMotion.reset():this.cameraMotion.snap(this.controlCamera,this.controls.target),this.controls.enabled=this.isOpen&&!this.loading&&!!this.source}interruptReset(){this.cameraMotion.resetting&&(this.cameraMotion.interruptReset(this.controlCamera,this.controls.target),this.controls.update())}keydown(e){if(e.stopPropagation(),e.key==="Escape"){e.preventDefault(),this.close();return}if(this.closing){e.preventDefault();return}if(e.key==="Tab"){const t=[...this.root.querySelectorAll('button:not([disabled]):not([hidden]),canvas[tabindex="0"]')],i=t[0],s=t.at(-1);e.shiftKey&&document.activeElement===i&&(e.preventDefault(),s?.focus()),!e.shiftKey&&document.activeElement===s&&(e.preventDefault(),i?.focus());return}if(!(!this.source||this.loading)){if(e.key==="Home"){e.preventDefault(),this.resetView(),this.onSound("tick");return}if(["+","=","-"].includes(e.key)){e.preventDefault(),this.interruptReset();const t=this.controlCamera.position.distanceTo(this.controls.target),i=Ie.clamp(t*(e.key==="-"?1.12:1/1.12),5,28);this.controlCamera.position.sub(this.controls.target).multiplyScalar(i/t).add(this.controls.target),this.controls.update();return}if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault(),this.interruptReset();const t=new P().setFromMatrixColumn(this.camera.matrix,0),i=new P().setFromMatrixColumn(this.camera.matrix,1),s=new P,r=this.controlCamera.position.distanceTo(this.controls.target)*.025;e.key==="ArrowLeft"&&s.addScaledVector(t,-r),e.key==="ArrowRight"&&s.addScaledVector(t,r),e.key==="ArrowUp"&&s.addScaledVector(i,r),e.key==="ArrowDown"&&s.addScaledVector(i,-r);const a=this.controls.target.clone();this.controls.target.add(s),this.controls.target.clampLength(0,this.controls.maxTargetRadius),this.controlCamera.position.add(this.controls.target.clone().sub(a)),this.controls.update()}}}setQuality(e){const t=JSON.stringify(e);this.appliedQuality!==t&&(this.appliedQuality=t,this.quality=Jn(e),this.pipeline.smaa.enabled=this.quality.antialias==="smaa",Yc(this.scene,this.renderer,this.quality),this.resize())}resize(){if(!this.isOpen)return;const e=this.canvasHost.clientWidth,t=this.canvasHost.clientHeight;dp(this.renderer,this.pipeline.composer,this.canvasHost,this.quality,this.superPerformance),this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.controlCamera.aspect=this.camera.aspect,this.controlCamera.updateProjectionMatrix(),this.updateHelp()}updateHelp(){const e=matchMedia("(pointer: coarse)").matches,t=this.root.querySelector(".viewer-help");t.innerHTML=VS()==="gamepad"?"<span>LS · DP 平移</span><span>Y 复位视角</span><span>LB · RB 选择操作 / A 确认 / B 返回</span>":e?"<span>单指旋转</span><span>双指缩放 / 平移</span>":"<span>拖动旋转</span><span>↑ ↓ ← → 平移</span><span>滚轮缩放</span>"}update(e){if(!this.isOpen)return;np(this.scene,this.renderer,this.themeAmount),this.source?.model.traverse(o=>{o.userData.themeAmount&&(o.userData.themeAmount.value=this.themeAmount)});const t=Math.min(this.lastTime?e-this.lastTime:1/60,.05);if(this.lastTime=e,this.source){bn(this.clarity,this.targetClarity,8,t),Math.abs(this.clarity.value-this.targetClarity)<1e-4&&Math.abs(this.clarity.velocity)<.001&&(this.clarity={value:this.targetClarity,velocity:0}),this.source.setClarity?.(this.clarity.value),this.motion.viewerModelTransition?bn(this.spread,this.targetSpread,5.5,t):this.spread={value:this.targetSpread,velocity:0},Math.abs(this.spread.value-this.targetSpread)<1e-4&&Math.abs(this.spread.velocity)<.001&&(this.spread={value:this.targetSpread,velocity:0},this.setStatus(this.targetSpread?"已拆解":"已组装"));for(const o of ql)this.groups.get(o.id).position.z=o.depth*this.spread.value}this.controls.update(),this.cameraMotion.update(this.controlCamera,this.controls.target,t,this.reduced);const s=this.root.closest("[data-layout]")?.dataset.layout==="portrait"?Math.min(1.15,this.camera.aspect/.85)/(1+.08*this.spread.value):1;this.camera.zoom!==s&&(this.camera.zoom=s,this.controlCamera.zoom=s,this.camera.updateProjectionMatrix(),this.controlCamera.updateProjectionMatrix());const r=this.scene.fog,a=this.camera.position.length();r.near=Math.max(0,a-1),r.far=a+12,this.quality.antialias==="smaa"?this.pipeline.composer.render():this.renderer.render(this.scene,this.camera),this.root.dataset.stats=JSON.stringify({ready:!!this.source,clarity:this.clarity.value,targetClarity:this.targetClarity,spread:this.spread.value,target:this.targetSpread,distance:this.camera.position.distanceTo(this.cameraMotion.focus),targetPosition:this.cameraMotion.focus.toArray(),requestedTarget:this.controls.target.toArray(),requestedDistance:this.controlCamera.position.distanceTo(this.controls.target),cameraPosition:this.camera.position.toArray(),resetting:this.cameraMotion.resetting,azimuth:this.controls.getAzimuthalAngle(),polar:this.controls.getPolarAngle(),parts:[...this.groups].map(([o,l])=>({id:o,z:l.position.z,meshes:l.children.length}))})}}const Sp="cubic-bezier(0.22, 1, 0.36, 1)",WS="cubic-bezier(0.4, 0, 1, 1)";class Tp{constructor(e,t,i=300,s=200){this.root=e,this.panel=t,this.enterDuration=i,this.exitDuration=s}root;panel;enterDuration;exitDuration;animations=[];revision=0;show(e){this.run(!0,e)}hide(e,t=()=>{}){this.run(!1,e,t)}finish(){this.animations.forEach(e=>e.finish())}dispose(){this.revision++,this.animations.forEach(e=>e.cancel()),this.animations=[]}run(e,t,i){const s=++this.revision,r=this.root.hidden,a=r?"0":getComputedStyle(this.root).opacity,o=this.panel?r?"translateY(12px)":getComputedStyle(this.panel).transform:void 0;this.animations.forEach(d=>d.cancel()),this.animations=[],this.root.hidden=!1,this.root.dataset.transition=e?"opening":"closing";const l=()=>{s===this.revision&&(this.root.hidden=!e,this.root.dataset.transition=e?"open":"closed",this.animations.forEach(d=>d.cancel()),this.animations=[],i?.())};if(t||!e&&r){l();return}const c={duration:e?this.enterDuration:this.exitDuration,easing:e?Sp:WS,fill:"both"},h=this.root.animate([{opacity:a},{opacity:e?1:0}],c);this.animations.push(h),this.panel&&this.animations.push(this.panel.animate([{transform:o},{transform:e?"translateY(0)":"translateY(8px)"}],c)),h.finished.then(l).catch(()=>{})}}class XS{animation;reveal(e,t){const i=this.animation?.playState==="running"?getComputedStyle(e).opacity:"0.35";this.cancel(),t||(this.animation=e.animate([{opacity:i},{opacity:1}],{duration:150,easing:Sp}))}cancel(){this.animation?.cancel(),this.animation=void 0}finish(){this.animation?.finish(),this.animation=void 0}}function At(n,e){if(e<=n[0][0])return n[0][1];const t=n.length-1;if(e>=n[t][0])return n[t][1];const i=l=>(n[l+1][1]-n[l][1])/(n[l+1][0]-n[l][0]),s=l=>{if(l===0)return i(0);if(l===t)return i(t-1);const c=i(l-1),h=i(l);if(c*h<=0)return 0;const d=n[l][0]-n[l-1][0],u=n[l+1][0]-n[l][0],f=2*u+d,m=u+2*d;return(f+m)/(f/c+m/h)};let r=0;for(;e>n[r+1][0];)r++;const a=n[r+1][0]-n[r][0],o=(e-n[r][0])/a;return(2*o**3-3*o**2+1)*n[r][1]+(o**3-2*o**2+o)*a*s(r)+(-2*o**3+3*o**2)*n[r+1][1]+(o**3-o**2)*a*s(r+1)}const qS=[234,216,181,143,115,94,78,65,54,45,38,31,26,21,17,13,10,8,6,4,3,2,1,0],jS=qS.map((n,e)=>[e,n]),YS=(n,e)=>{const t=n-278-e*2;return{x:At(jS,t),opacity:At([[-1,0],[0,.4],[1,.65],[2,.88],[3,1]],t)}},KS=[[588,4],[589,39],[592,225],[593,261],[594,288],[595,310],[596,328],[597,343],[598,356],[599,366],[600,375],[601,382],[602,389],[603,394],[604,398],[605,402],[606,405],[607,407],[608,408],[609,409],[610,410],[611,410]],ZS=n=>At(KS,n)/410;function JS(n){const e=i=>At(i,n),t=Math.PI/180;return{radius:e([[487,2e3],[492,1540],[497,1095],[500,895.5],[505,650],[510,492],[515,385.5],[520,320.5],[524,287.5],[527,275],[530,270],[535,265.5],[540,262],[545,258],[550,255],[555,252.5],[560,250],[568,246]]),whiteRadius:e([[487,1500],[492,1011],[493,955],[494,893],[495,834],[496,783],[497,737],[498,693.5],[499,655],[500,619],[505,470.5],[510,374],[515,310.5],[520,272],[524,253.5],[527,248],[530,246],[535,242],[540,238],[545,235],[550,232.5],[555,230],[560,227.5],[568,224]]),outerStart:t*e([[487,470],[492,364],[497,276],[500,226],[505,159.75],[510,98.75],[515,49.25],[520,13.25],[524,-9],[527,-23],[530,-36.25],[535,-53],[540,-66.25],[545,-75.75],[550,-82.75],[560,-89],[568,-90]]),outerSweep:t*e([[487,30],[492,105],[497,170],[500,199],[505,241.5],[510,270.25],[515,295.75],[520,313.25],[527,331],[530,336.75],[535,344.5],[540,350.75],[545,355],[550,358],[560,360],[568,360]]),whiteStart:t*e([[487,-100],[492,-30],[497,72],[500,107],[505,140],[510,172],[515,196],[520,213.75],[527,234.5],[530,241],[535,249.75],[540,256.75],[545,262.25],[550,265.75],[560,269.5],[568,270]]),whiteSweep:t*e([[487,30],[492,105],[497,170],[500,200],[505,241.25],[510,272.75],[515,295.5],[520,313.75],[527,330.5],[530,335.5],[535,343.5],[540,349.5],[545,354],[550,357],[560,360],[568,360]]),innerRadius:e([[487,124.5],[492,123],[495,121],[500,117.5],[505,112],[510,107.5],[515,104],[520,101.5],[530,97],[540,94],[550,91.5],[560,90],[568,88.5]]),innerStart:t*e([[487,-20],[490,-4.25],[492,14],[495,48.75],[497,69.25],[500,93.25],[505,121.25],[510,141],[515,155.5],[520,166.5],[527,178],[530,181],[535,187.75],[540,192],[545,195.25],[550,197.75],[555,199.75],[560,200.75],[568,201.5]]),innerSweep:t*e([[487,0],[492,22.5],[497,55.75],[500,70.25],[505,87.25],[510,99],[515,108],[520,115],[527,123.5],[530,127],[535,128],[540,131],[550,134],[568,136]]),orbit:t*e([[487,70],[492,33],[493,13.2],[494,-5.8],[495,-24.2],[496,-41.4],[497,-57.2],[498,-71.4],[499,-84.2],[500,-96],[505,-140.8],[510,-172.3],[515,-195.5],[520,-213.5],[527,-234],[530,-238.8],[535,-247.7],[540,-254.7],[545,-260.1],[550,-264],[555,-266.9],[560,-268.8],[568,-270]]),orbitRadius:e([[487,270],[495,236],[500,224],[505,214],[510,206],[515,199],[520,193],[530,185],[540,179.5],[550,174.5],[560,171.5],[568,169]]),dotRadius:e([[487,0],[492,1],[500,5.6],[510,7],[520,7.8],[530,8],[568,8]]),blackCap:e([[487,45],[504,35],[510,20],[515,10],[520,5],[525,2.5],[535,2],[550,0],[568,0]]),whiteCap:e([[487,40],[492,30],[497,22],[502,16],[507,10],[512,5],[520,1.5],[540,0],[568,0]])}}const QS=[[543,827.5,561,1091,518,38.7,260,250,0,0],[544,827.5,561,1091,518,38.7,260,250,3,3],[545,827.5,560.5,1091,518.5,38.6,265,236,17,17],[546,827.5,559.5,1091,519.5,38.5,274,190,44,44],[547,827.6,558.2,1090.6,520.8,38.5,296,121,79,81],[548,828.06,556.76,1090.35,522.58,38.38,332.38,50.99,111.73,113.42],[549,827.84,555.13,1090.42,524.39,38.34,367.27,-14.03,141.56,145.66],[550,827.89,553.28,1090.2,525.89,38.44,396.14,-68.97,168.88,172.89],[551,828,551.68,1090.21,527.44,38.28,421.62,-113.84,191.68,195.3],[552,828.19,550.24,1089.94,528.85,38.25,444.24,-152.25,208.55,215.7],[553,828.42,548.83,1089.7,530.24,38.18,462.76,-184.19,225.92,230.73],[554,828.61,547.64,1089.53,531.44,38.12,479.15,-212.29,239.9,244.63],[555,828.8,546.47,1089.37,532.55,38.03,494.23,-237.06,251.56,257.75],[556,829.06,545.41,1089.16,533.53,37.91,508.57,-259.19,261.49,267.63],[557,829.25,544.49,1088.93,534.52,37.87,520.46,-279.2,271.23,278.42],[558,829.47,543.66,1088.7,535.37,37.79,530.39,-295.86,280.34,286.17],[559,829.75,542.88,1088.46,536.12,37.72,541.33,-312.5,287.17,295.12],[560,829.95,542.16,1088.26,536.88,37.65,549.47,-326.37,295.98,301.16],[561,830.16,541.63,1088.02,537.41,37.57,557.82,-338.78,302.29,307.52],[562,830.33,541.08,1087.81,537.94,37.52,565.1,-350.74,307.99,312.58],[563,830.59,540.65,1087.61,538.36,37.43,571.89,-362.08,313.78,319.28],[564,830.83,540.28,1087.38,538.74,37.37,578.93,-371.93,316.97,323.53],[565,831.04,539.97,1087.14,539.04,37.35,583.85,-380.51,322.27,327.78],[566,831.25,539.74,1086.93,539.28,37.27,589.84,-388.93,325.61,331.62],[567,831.48,539.56,1086.73,539.4,37.19,594,-396.5,330.93,335.92],[568,831.61,539.51,1086.55,539.48,37.15,599.44,-403.94,332.25,338.7]],$S=Array.from({length:9},(n,e)=>QS.map(t=>[t[0],t[e+1]])),Ep=[[548,926.33,554.33],[551,944.38,572.15],[553,954.92,575.05],[555,963,575],[558,971.63,572.85],[561,977.53,569.78],[564,981.5,566.86],[568,984.71,563.5]],e1=Ep.map(([n,e,t])=>[n,Math.atan2(t-539.5,e-959.5)]),t1=Ep.map(([n,e,t])=>[n,Math.hypot(e-959.5,t-539.5)]),i1=[[-1,0],[0,.8],[1,1.7],[2,2.35],[3,2.85],[4,3.15],[5,3.45],[7,3.8],[10,4.1],[15,4.25],[20,4.25]];function n1(n){const e=$S.map(p=>At(p,n)),[t,i,s,r,a,o,l,c,h]=e,d=At(e1,n),u=At(t1,n),f=Math.floor(n+1e-5),m=[546,547,549,550].includes(f),v=At(m?[[546,42.93],[550,42.43]]:[[545,0],[548,7.96],[551,9.89],[553,10.63],[555,11.08],[559,11.45],[564,11.45],[568,11.27]],n);return{sides:[{x:t,y:i,radius:a,start:o*Math.PI/180,sweep:c*Math.PI/180},{x:s,y:r,radius:a,start:l*Math.PI/180,sweep:h*Math.PI/180}],sideVisible:n>=544,coreRadius:v,satellites:Array.from({length:6},(p,g)=>{const y=d+g*Math.PI/3;return{x:959.5+Math.cos(y)*u,y:539.5+Math.sin(y)*u,radius:At(i1,n-548-g*3)}})}}const wp=[[229,-.02,-.0198],[230,-.0195,-.011],[231,-.016,.009],[232,-.0095,.047],[233,.0025,.1135],[234,.0215,.2205],[235,.048,.365],[236,.0735,.504],[237,.094,.6155],[238,.109,.7045],[239,.122,.7755],[240,.133,.835],[241,.1425,.884],[242,.1505,.927],[243,.1575,.964],[244,.164,.996],[245,.1695,1.023],[246,.1745,1.0475],[247,.1785,1.0685],[248,.183,1.087],[249,.187,1.103],[250,.19,1.1175],[251,.1935,1.13],[252,.196,1.1405],[253,.1985,1.15],[254,.201,1.1575],[255,.203,1.1645],[256,.205,1.17],[257,.2065,1.1745],[258,.208,1.1785],[259,.2095,1.181],[260,.2105,1.183],[261,.2115,1.184],[264,.211,1.1835]],s1=wp.map(([n,e])=>[n,e]),r1=wp.map(([n,,e])=>[n,e]),a1=[[420,.1835],[425,.184],[430,.1885],[435,.2],[440,.2205],[450,.2925],[455,.3485],[460,.421],[465,.5095],[470,.614],[475,.722],[480,.827],[485,.9195],[486,.9365]],o1=[[260,814],[261,813],[262,812],[263,808],[264,803],[265,794],[266,781],[267,763],[268,740],[269,716],[270,691],[271,668],[272,648],[273,630],[274,615],[275,601],[276,590],[277,580],[278,571],[279,563],[280,556],[281,550],[282,545],[283,540],[284,536],[285,533],[286,530],[287,527],[288,525],[289,523],[290,521],[291,520],[292,519],[294,518]];function l1(n){const e=At(a1,n),t=n<420?At(s1,n):e+.0275,i=n<420?At(r1,n):e+1;return{offsetX:At(o1,n)-520,start:t,length:Math.max(0,Math.min(1,i-t)),strokeWidth:At([[229,.25],[230,2.8],[231,8],[232,16],[233,23.5],[234,26]],n),symbolScale:At([[246,0],[247,.4],[248,.63],[249,.75],[250,.83],[251,.89],[252,.94],[254,.985],[256,1]],n),plusX:At([[246,155],[247,123.3],[248,104],[249,93.53],[250,86.52],[251,81.78],[252,78.48],[254,74.26],[256,72.96],[260,72.6]],n),minusX:At([[246,155],[247,186.82],[248,206.14],[249,216.66],[250,223.47],[251,228.21],[252,231.77],[254,236.06],[256,237.57],[260,237.1]],n),minusWidth:At([[246,15],[256,15],[257,23],[258,31],[259,35.5],[260,38],[262,42],[264,44],[268,46]],n),plusAngle:At([[255,0],[256,-3],[257,-22],[258,-45],[259,-62],[260,-70],[262,-80],[265,-87],[270,-90]],n)}}const jl=(n,e,t)=>Math.max(0,Math.min(1,(n-e)/(t-e))),Qd=n=>n*n*(3-2*n),Ts=(n,e,t,i)=>n.slice(0,e<t?0:Math.min(n.length,1+Math.floor((e-t)*(n.length-1)/(i-t)))),wr=(n,e)=>e.includes(n),c1=[1,1,3,4,5,6,9,11,12,14,17,18,19,20,22,23,25,26];function Ap(n){const e=n+5,t=Math.floor(e*25+1e-5),i=e<9.12?"access":e<11.12?"logo":e<19.48?"auth":e<22.76?"scan":"welcome";let s="";t<363?(s=Ts("身份已确认",t,282,295),t>=320&&(s+=" : "+Ts("探索者",t,321,339))):t<421?s=Ts("连接请求已收到",t,367,389):(s=Ts("正在打开档案馆",t,423,440),t>=449&&(s+=".".repeat(Math.min(3,1+Math.floor((t-449)/4)))),wr(t,[479,485,486])&&(s="              载入中…"));const r=e*25,a=JS(r),o=n1(r),l=wr(t,[525,526,528,529]),c=[1,0,.28,0,1,0,0],h=t-569,d=Qd(jl(e,26.56,26.92));return{t:e,f:t,step:i,auth:s,access:"正在验证档案访问权限".slice(0,t<170?0:c1[Math.min(17,t-170)]),accessOpacity:t>=170&&t<227?t===226?.25:1:0,logoOpacity:e>=9.16&&e<19.48?1:0,logo:l1(r),logoLetters:Ts("LINKING",t,232,255),authOpacity:t>=281&&t<487?1:0,brand:[0,1,2].map(u=>YS(r,u)),poweredLetters:Ts("POWERED BY LINKING",t,279,295).length,scanVisible:e>=19.48&&e<22.76,scan:a,scanOrbit:o,scanRadius:a.radius,ringScale:l?1.94:1,ringOpacity:l?.32:At([[487,0],[488,.18],[490,.6],[493,1]],r),ringBlur:l?2.2:0,scanTracking:At([[487,40],[492,28],[497,18],[500,14],[505,8],[510,4],[515,1.7],[520,.5],[527,0],[568,0]],r),scanFont:26.5,permissionOpacity:e<21.8?jl(e,19.48,19.88):At([[545,1],[546,.4],[547,.3],[548,.25],[549,.1],[550,.04],[551,0]],r),ornament:e>=21.84,coreRadius:o.coreRadius,welcomeVisible:e>=22.76&&e<26.92,welcomePanel:h>=0&&h<7?c[h]:0,welcomeInk:h>=0&&h<7?[0,0,.2,1,0,0,.25][h]:1,companyVisible:t>=588&&!wr(t,[590,591]),companyMask:wr(t,[594,595]),highlight:ZS(r),databaseOpacity:t<626||wr(t,[628,629,631,634])?0:1,welcomeLogo:t>=588,welcomeScale:1-.46*d,welcomeOpacity:1-Math.pow(d,3),exitBlur:8*d,exit:d,backgroundOpacity:e<26.92?1:0,white:Qd(jl(e,26.16,26.88))}}const h1={ink:["#080a08","#e0e3dc"],muted:["#77756d","#a6b0b1"],line:["#aaa59a","#536166"],paper:["#eae5e1","#11181b"],panel:["#edebe4","#202a2f"],field:["#e7e3d9","#2a363b"],accent:["#9b7247","#c5a16b"]};let $d=-1,Cp=0;function ef(n){return[1,3,5].map(e=>parseInt(n.slice(e,e+2),16))}function Rp(n){if(Math.abs(n-$d)<1e-4)return;$d=Cp=n;const e=document.documentElement;e.dataset.darkSurface=String(n>1e-4);for(const[t,i]of Object.entries(h1)){const s=ef(i[0]),r=ef(i[1]),a=s.map((o,l)=>Math.round(o+(r[l]-o)*n)).join(", ");e.style.setProperty(`--theme-${t}`,`rgb(${a})`),e.style.setProperty(`--theme-${t}-rgb`,a)}}function u1(n){return`<div class="theme-settings"><div><strong>界面配色</strong><span>玻璃阵列随配色逐张过渡</span></div><div class="theme-choices" role="group" aria-label="界面配色"><button data-color-theme="light" aria-pressed="${!n}">亮色</button><button data-color-theme="dark" aria-pressed="${n}">暗色</button></div></div>`}async function d1(){return!1}class Ar{constructor(e,t){this.host=e,e.classList.remove("has-boot-lettering")}host;setText(e){this.host.textContent=e}useWebfonts(){}}const Ya="http://www.w3.org/2000/svg",Cr=(n,e,t,i=960,s=540)=>{const r=a=>`${i+Math.cos(a)*n},${s+Math.sin(a)*n}`;return t>=Math.PI*1.999?`M${r(e)}A${n},${n} 0 1 1 ${r(e+Math.PI)}A${n},${n} 0 1 1 ${r(e+Math.PI*2)}`:`M${r(e)}A${n},${n} 0 ${t>Math.PI?1:0} 1 ${r(e+t)}`};class f1{constructor(e){this.stage=e,[".access-text",".boot-logo",".auth-status","#auth-message",".scan",".scan > span",".welcome",".welcome-heading",".welcome-panel",".welcome-company",".welcome-highlight",".welcome-database",".welcome-logo",".brand",".powered","#boot-background",".boot-background svg",".boot-white"].forEach(r=>this.nodes.set(r,e.querySelector(r)));const t=e.querySelector(".boot-logo svg"),i=t.querySelector("path");this.contour=i,this.contour.setAttribute("d",tm),this.contour.setAttribute("pathLength","1");const s=t.querySelector("path:not([pathLength])");this.plus=document.createElementNS(Ya,"path"),this.plus.setAttribute("d","M44 70h50M69 45v50"),this.minus=document.createElementNS(Ya,"path"),this.minus.setAttribute("d","M219 70h44"),[this.plus,this.minus].forEach(r=>{r.setAttribute("stroke","currentColor"),r.setAttribute("stroke-width","15"),r.style.display="none",s.parentNode.insertBefore(r,s)}),s.remove(),this.letters=t.querySelector("text"),this.letters.setAttribute("text-anchor","start"),this.letters.setAttribute("x","20"),this.brandLines=Array.from(e.querySelector(".brand").children),this.scanPaths=Array.from(e.querySelectorAll(".scan path")),this.orbitDots=Array.from(e.querySelectorAll(".scan .orbit-dot")),this.core=e.querySelector(".scan .scan-core"),this.core.setAttribute("cx","959.5"),this.core.setAttribute("cy","539.5"),this.satellites=Array.from({length:6},()=>{const r=document.createElementNS(Ya,"circle");return r.classList.add("satellite-dot"),r.setAttribute("fill","#080a08"),r.setAttribute("stroke","none"),this.core.parentElement.insertBefore(r,this.core),r}),this.caps=["#080a08","#fff"].map(r=>{const a=document.createElementNS(Ya,"circle");return a.setAttribute("fill",r),a.setAttribute("stroke","none"),this.core.parentElement.appendChild(a),a}),this.companyInk=Array.from(e.querySelectorAll(".welcome-company strong")),this.companyInk.forEach(r=>{const a=document.createElement("span");a.textContent=r.textContent,r.replaceChildren(a)}),this.poweredHTML=this.el(".powered").innerHTML,new Ar(this.brandLines[0],["brand"]).setText("LINKING"),this.accessLettering=new Ar(this.el(".access-text"),["access"]),this.authLettering=new Ar(this.el("#auth-message"),["identity","request","processing","processingGlitch"]);for(const[r,a,o]of[[".scan > span","permission","访问权限已确认"],[".welcome-heading","welcome","欢迎进入"],[".welcome-database","database","幻想镇档案数据库"]])new Ar(this.el(r),[a]).setText(o);this.companyInk.forEach(r=>new Ar(r.querySelector("span"),["company"]).setText("LINKING 档案馆"))}stage;nodes=new Map;contour;letters;plus;minus;brandLines;scanPaths;orbitDots;core;satellites;caps;companyInk;poweredHTML;accessLettering;authLettering;el(e){return this.nodes.get(e)}opacity(e,t){this.el(e).style.opacity=String(Number(t))}update(e){const t=Ap(e),i=t.t;return this.stage.dataset.bootFrame=String(t.f),this.accessLettering.setText(t.access),this.opacity(".access-text",t.accessOpacity),this.opacity(".boot-logo",t.logoOpacity),this.el(".boot-logo").style.transform=`translate(${t.logo.offsetX}px, 1px)`,this.contour.style.strokeDasharray=`${t.logo.length} ${1-t.logo.length}`,this.contour.style.strokeDashoffset=String(-t.logo.start),this.contour.setAttribute("stroke-width",String(t.logo.strokeWidth)),this.letters.textContent!==t.logoLetters&&(this.letters.textContent=t.logoLetters),this.plus.style.opacity=this.minus.style.opacity=t.logo.symbolScale>0?"1":"0",this.plus.setAttribute("transform",`translate(${t.logo.plusX} 70) rotate(${t.logo.plusAngle}) scale(${t.logo.symbolScale}) translate(-69 -70)`),this.minus.setAttribute("d",`M${-t.logo.minusWidth/2} 0h${t.logo.minusWidth}`),this.minus.setAttribute("transform",`translate(${t.logo.minusX} 70) scale(${t.logo.symbolScale})`),this.opacity(".auth-status",t.authOpacity),this.authLettering.setText(t.auth),this.opacity(".brand",1),this.el(".brand").style.transform="none",this.brandLines.forEach((s,r)=>{s.style.opacity=String(t.brand[r].opacity),s.style.transform=`translateX(${t.brand[r].x}px)`}),this.opacity(".powered",t.poweredLetters>0),this.el(".powered").style.clipPath=`inset(0 ${100*(1-t.poweredLetters/19)}% 0 0)`,this.opacity(".scan",t.scanVisible),t.scanVisible&&this.renderScan(t),this.opacity(".welcome",t.welcomeVisible?t.welcomeOpacity:0),this.el(".welcome").style.transform=`scale(${t.welcomeScale})`,this.el(".welcome").style.filter=`blur(${t.exitBlur}px) invert(${t.exit*.22}) sepia(${t.exit}) saturate(${1+t.exit*5}) hue-rotate(${t.exit*115}deg)`,this.opacity(".welcome-panel",t.welcomePanel),this.opacity(".welcome-heading",1),this.el(".welcome-heading").style.color=Cp>1e-4?"var(--theme-ink)":`rgb(${255*(1-t.welcomeInk)} ${255*(1-t.welcomeInk)} ${255*(1-t.welcomeInk)})`,this.opacity(".welcome-company",t.companyVisible),this.el(".welcome-company").style.opacity=String(t.companyVisible?t.companyMask?.65:1:0),this.companyInk[1].querySelector("span").style.opacity=t.companyMask?".06":"1",this.el(".welcome-highlight").style.clipPath=`inset(0 ${100*(1-t.highlight)}% 0 0)`,this.opacity(".welcome-database",t.databaseOpacity),this.opacity(".welcome-logo",t.welcomeLogo),this.opacity("#boot-background",t.backgroundOpacity),this.opacity(".boot-white",t.white),this.el(".boot-background svg").style.transform=`translate(${Math.sin(i*.16)*18}px, ${-(i-6)*5}px) scale(1.08)`,t}renderScan(e){const{scan:t}=e,i=t.radius,s=this.scanPaths[0].parentElement;s.setAttribute("transform",`translate(960 540) scale(${e.ringScale}) translate(-960 -540)`),s.style.opacity=String(e.ringOpacity),s.style.filter=`blur(${e.ringBlur}px)`,this.scanPaths[0].setAttribute("d",Cr(i,t.outerStart,t.outerSweep)),this.scanPaths[0].setAttribute("stroke-width","2.4"),this.scanPaths[1].setAttribute("d",Cr(t.whiteRadius,t.whiteStart,t.whiteSweep)),this.scanPaths[1].setAttribute("stroke-width","4");const r=t.innerStart;this.scanPaths[2].setAttribute("d",Cr(t.innerRadius,r,t.innerSweep)),this.scanPaths[3].setAttribute("d",Cr(t.innerRadius,r+Math.PI,t.innerSweep)),e.scanOrbit.sides.forEach((o,l)=>{this.scanPaths[l+4].setAttribute("d",Cr(o.radius,o.start,o.sweep,o.x,o.y)),this.scanPaths[l+4].style.opacity=e.scanOrbit.sideVisible?"1":"0"}),e.scanOrbit.satellites.forEach((o,l)=>{const c=this.satellites[l];c.setAttribute("cx",String(o.x)),c.setAttribute("cy",String(o.y)),c.setAttribute("r",String(o.radius))}),this.core.style.opacity=e.ornament?"1":"0",this.core.setAttribute("r",String(e.coreRadius));const a=t.orbit;this.orbitDots.forEach((o,l)=>{o.setAttribute("cx",String(960+Math.cos(a+l*Math.PI)*t.orbitRadius)),o.setAttribute("cy",String(540+Math.sin(a+l*Math.PI)*t.orbitRadius)),o.setAttribute("r",String(t.dotRadius))}),this.caps.forEach((o,l)=>{const c=l?t.whiteStart:t.outerStart+t.outerSweep,h=l?t.whiteRadius:i;o.setAttribute("cx",String(960+Math.cos(c)*h)),o.setAttribute("cy",String(540+Math.sin(c)*h)),o.setAttribute("r",String(l?t.whiteCap:t.blackCap))}),this.opacity(".scan > span",e.permissionOpacity),this.el(".scan > span").style.letterSpacing=`${e.scanTracking}px`,this.el(".scan > span").style.setProperty("--boot-phrase-tracking",`${e.scanTracking}px`),this.el(".scan > span").style.fontSize=`${e.scanFont}px`}reset(){[".brand",".powered"].forEach(e=>this.el(e).removeAttribute("style")),this.brandLines.forEach(e=>e.removeAttribute("style")),this.el(".powered").innerHTML=this.poweredHTML,this.opacity("#boot-background",0)}}const p1=[[170,187],[282,295],[320,339],[367,389],[423,440],[449,457]].flatMap(([n,e])=>{const t=[];let i=0;for(let s=n;s<=e;s++){const r=Ap(s/25-5),o=(s<200?r.access:r.auth).replace(/\s/g,"").length;o>i&&t.push(s),i=o}return t});function m1(n,e){return p1.some(t=>t/25>n+1e-6&&t/25<=e+1e-6)}const tf=["atmosphere","motif","pulse"],nf=160/3,sf=new WeakMap,rf=new WeakMap;function g1(n){let e=rf.get(n);return e||(e={buffers:[720,910,1150].map(t=>{const i=n.createBuffer(1,Math.ceil(n.sampleRate*.032),n.sampleRate),s=i.getChannelData(0);for(let r=0;r<s.length;r++){const a=r/n.sampleRate;s[r]=Math.sin(a*t*Math.PI*2)*Math.exp(-a*190)*.2}return i}),next:0},rf.set(n,e)),e.buffers[e.next++%e.buffers.length]}const af=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0)),Cs=(n,e,t,i=.05)=>{if(typeof n.cancelAndHoldAtTime=="function")n.cancelAndHoldAtTime(t);else{const s=n.value;n.cancelScheduledValues(t),n.setValueAtTime(s,t)}n.linearRampToValueAtTime(e,t+i)},v1=[{time:9.16,sound:"brand"},{time:11.84,sound:"confirm"},{time:19.48,sound:"scan"},{time:21.84,sound:"confirm"},{time:22.76,sound:"welcome"},{time:23.52,sound:"text-reveal"},{time:25.04,sound:"text-reveal"},{time:26.92,sound:"array"},{time:30.68,sound:"open"},{time:34.3,sound:"inspect"}];function x1(n,e,t,i,s=0){const r=n.createGain(),a=n.createStereoPanner();a.pan.value=Math.max(-.65,Math.min(.65,s)),r.connect(a),a.connect(e);const o=[];let l=0,c=i;const h=(m,v,p,g,y,S=.006,M=!1)=>{const T=n.createGain(),w=i+g;M?T.gain.setValueAtTime(p,w):(T.gain.setValueAtTime(0,w),T.gain.linearRampToValueAtTime(p,w+Math.min(S,y*.3)),T.gain.exponentialRampToValueAtTime(1e-5,w+y),T.gain.linearRampToValueAtTime(0,w+y+.012)),v.connect(T),T.connect(r),o.push(m),l++,m.onended=()=>{m.disconnect(),v.disconnect(),T.disconnect(),--l===0&&(r.disconnect(),a.disconnect())},m.start(w),m.stop(w+y+.015),c=Math.max(c,w+y+.015)},d=(m,v,p,g,y=0,S=.006)=>{const M=n.createOscillator();M.frequency.setValueAtTime(m,i+y),M.frequency.exponentialRampToValueAtTime(v,i+y+g),h(M,M,p,y,g,S)},u=(m,v,p,g,y=0,S=.008)=>{let M=sf.get(n);if(!M){M=n.createBuffer(1,n.sampleRate*2,n.sampleRate);const R=M.getChannelData(0);let _=773;for(let E=0;E<R.length;E++)_=Math.imul(_,1664525)+1013904223>>>0,R[E]=_/2147483648-1;sf.set(n,M)}const T=n.createBufferSource(),w=n.createBiquadFilter();T.buffer=M,w.type="bandpass",w.Q.value=.8,w.frequency.setValueAtTime(m,i+y),w.frequency.exponentialRampToValueAtTime(v,i+y+g),T.connect(w),h(T,w,p,y,g,S)},f=(m,v,p,g=0)=>{const y=[[1,1,1],[1.47,.39,.66],[2.09,.21,.4],[2.73,.095,.25],[3.86,.035,.15]];for(const[S,M,T]of y){const w=m*S;w>Math.min(8500,n.sampleRate*.42)||d(w,w,v*M,p*T,g,.0012)}u(4800,3600,v*.24,.013,g,8e-4)};switch(t){case"page-open":u(700,1800,.065,.18,0,.025),d(360,480,.032,.16,0,.014),d(960,960,.009,.075,.06,.01);break;case"page-close":u(1300,600,.05,.13,0,.014),d(420,280,.027,.13,0,.01);break;case"ui-tick":u(1500,1200,.042,.036,0,.003),d(820,820,.022,.052,0,.003);break;case"brand":d(146.83,146.83,.039,.72,0,.08),d(293.66,293.66,.03,.62,.07,.07),d(440,440,.022,.54,.17,.055),u(420,1750,.036,.7,0,.13);break;case"text-reveal":u(2100,1300,.033,.064,0,.005),d(1050,1050,.012,.06,0,.005);break;case"key":{const m=n.createBufferSource();m.buffer=g1(n),h(m,m,.2,0,m.buffer.duration,0,!0);break}case"tick":f(1680,.064,.24);break;case"column":f(1280,.065,.32),f(2050,.016,.18,.045);break;case"open":f(1150,.071,.58),f(2180,.025,.36,.16),u(3100,4400,.014,.25,.035,.025);break;case"confirm":d(640,640,.039,.095,0,.008),d(960,960,.026,.15,.095,.009);break;case"back":f(1120,.066,.22),d(560,560,.012,.1,.025,.002);break;case"scan":u(1800,3400,.025,.8,0,.12);for(let m=0;m<4;m++)d(760,760,.025,.064,m*.19+.15,.007);break;case"welcome":[293.66,440,659.25,739.99].forEach((m,v)=>d(m,m,.034,1.6,v*.095,.05)),u(600,1800,.065,.9,0,.15);break;case"array":u(1600,3300,.025,.8,0,.12);for(let m=0;m<5;m++)f(1180+m*170,.043-m*.005,.31,.05+m*.105);break;case"inspect":d(1120,1120,.026,.055,0,.005),d(1120,1120,.018,.055,.11,.005);break;case"explode":[1220,1680,2260].forEach((m,v)=>f(m,.054-v*.01,.4-v*.055,v*.115));break;case"assemble":[2260,1680,1220].forEach((m,v)=>f(m,.035+v*.008,.2,v*.095));break}return{end:c,stop(m){Cs(r.gain,0,m,.018);for(const v of o)try{v.stop(m+.02)}catch{}}}}class _1{prefs={sound:!1,music:!1,soundVolume:.55,musicVolume:.5};context;effects;musicBus;duck;stemGains=[];buffers;loading;fetching;musicData;tracks=[];voices=[];lastSound=new Map;scene="boot";offset=0;startedAt=0;unlocked=!1;disposed=!1;bootTime=null;error="";requestId=0;suspension=Promise.resolve();bootMix=-1;playedKeys=0;entryPending=!1;hostPaused=!1;setHostPaused(e){this.hostPaused=e,e?this.hide():this.visibility()}constructor(){document.addEventListener("pointerdown",this.gesture,{capture:!0}),document.addEventListener("keydown",this.gesture,{capture:!0}),document.addEventListener("visibilitychange",this.visibility),window.addEventListener("pagehide",this.hide),window.addEventListener("pageshow",this.visibility)}gesture=()=>{this.entryPending||(this.unlocked=!0,this.activate())};holdForEntry(){this.entryPending=!0}releaseEntry(){this.entryPending=!1}cancelEntry(){this.hide()}async unlock(){return this.unlocked=!0,await this.activate(),this.context?.state==="running"&&(!this.prefs.music||!!this.buffers)}prepareMusic(){return this.musicData?Promise.resolve(this.musicData):(this.fetching??=Promise.all(tf.map(async e=>{const t=new AbortController,i=setTimeout(()=>t.abort(),15e3);try{const s=await fetch(lo(`audio/${e}.ogg`),{signal:t.signal});if(!s.ok)throw new Error(`Music ${e}: ${s.status}`);return await s.arrayBuffer()}finally{clearTimeout(i)}})).then(e=>this.musicData=e).finally(()=>{this.fetching=void 0}),this.fetching)}restartBoot(){this.stopEffects(),this.bootTime=6.76,this.bootMix=-1}hide=()=>{this.requestId++,this.stopMusic(),this.stopEffects(),this.suspension=this.context?.suspend().catch(()=>{})??Promise.resolve()};visibility=()=>{this.bootTime=null,document.hidden?this.hide():this.unlocked&&!this.entryPending&&this.activate()};configure(e){this.prefs={sound:!!e.sound,music:!!e.music,soundVolume:af(e.soundVolume),musicVolume:af(e.musicVolume)},this.context&&(Cs(this.effects.gain,this.prefs.sound?this.prefs.soundVolume:0,this.context.currentTime),Cs(this.musicBus.gain,this.prefs.music?this.prefs.musicVolume:0,this.context.currentTime,.2)),this.prefs.sound||this.stopEffects(),this.prefs.music||this.stopMusic(),!this.prefs.sound&&!this.prefs.music?this.hide():this.unlocked&&!this.entryPending&&this.activate()}createContext(){const e=this.context=new AudioContext,t=e.createGain(),i=e.createDynamicsCompressor();return t.gain.value=.8,i.threshold.value=-8,i.knee.value=8,i.ratio.value=6,i.attack.value=.003,i.release.value=.18,this.effects=e.createGain(),this.musicBus=e.createGain(),this.duck=e.createGain(),this.effects.gain.value=this.prefs.sound?this.prefs.soundVolume:0,this.musicBus.gain.value=this.prefs.music?this.prefs.musicVolume:0,this.effects.connect(t),this.musicBus.connect(this.duck),this.duck.connect(t),t.connect(i),i.connect(e.destination),this.stemGains=tf.map(()=>{const s=e.createGain();return s.gain.value=0,s.connect(this.musicBus),s}),this.mixScene(),e}async activate(){if(this.disposed||this.hostPaused||document.hidden||!this.unlocked||!this.prefs.sound&&!this.prefs.music)return;const e=++this.requestId;try{const t=this.context??this.createContext(),i=t.state==="running"?Promise.resolve():t.resume();if(await Promise.all([this.suspension,i]),e!==this.requestId||this.disposed||document.hidden||t.state!=="running"||e!==this.requestId||document.hidden||this.disposed)return;this.prefs.music&&(await this.loadMusic(t),e===this.requestId&&this.startMusic())}catch(t){this.error=t instanceof Error?t.message:"Audio unavailable"}}loadMusic(e){return this.buffers?Promise.resolve():(this.loading??=this.prepareMusic().then(t=>Promise.all(t.map(i=>e.decodeAudioData(i.slice(0))))).then(t=>{this.buffers=t,this.error=""}).finally(()=>{this.loading=void 0}),this.loading)}startMusic(){const e=this.context;!e||e.state!=="running"||!this.buffers||this.hostPaused||this.tracks.length||!this.prefs.music||this.disposed||document.hidden||(this.startedAt=e.currentTime+.04,this.tracks=this.buffers.map((t,i)=>{const s=e.createBufferSource();return s.buffer=t,s.loop=!0,s.loopStart=0,s.loopEnd=Math.min(nf,t.duration),s.connect(this.stemGains[i]),s.start(this.startedAt,this.offset%s.loopEnd),s}),this.musicBus.gain.cancelScheduledValues(e.currentTime),this.musicBus.gain.setValueAtTime(0,e.currentTime),this.musicBus.gain.linearRampToValueAtTime(this.prefs.musicVolume,e.currentTime+1.2))}stopMusic(){const e=this.context;!e||!this.tracks.length||(this.offset=(this.offset+Math.max(0,e.currentTime-this.startedAt))%nf,this.tracks.forEach((t,i)=>{const s=e.createGain();t.disconnect(),t.connect(s),s.connect(this.stemGains[i]),s.gain.setValueAtTime(1,e.currentTime),s.gain.linearRampToValueAtTime(0,e.currentTime+.06),t.stop(e.currentTime+.07),t.onended=()=>{t.disconnect(),s.disconnect()}}),this.tracks=[])}stopEffects(){this.context&&this.voices.forEach(e=>e.stop(this.context.currentTime)),this.voices=[],this.lastSound.clear()}setScene(e){this.scene!==e&&(this.scene=e,this.bootTime=null,this.bootMix=-1,this.stopEffects(),this.mixScene())}mixScene(){if(!this.context)return;const e={boot:[.48,.32,.18],archive:[.9,.72,.65],detail:[.72,.36,.12],viewer:[.8,.24,.28]}[this.scene];this.stemGains.forEach((t,i)=>Cs(t.gain,e[i],this.context.currentTime,1.1))}play(e="tick",t=0){const i=this.context;if(!this.prefs.sound||this.hostPaused||!i||i.state!=="running"||document.hidden||this.disposed)return;const s=i.currentTime,r=e==="key"?.024:e==="tick"||e==="column"?.055:.12;if(s-(this.lastSound.get(e)??-1/0)<r)return;this.lastSound.set(e,s),this.voices=this.voices.filter(o=>o.end>s),this.voices.length>=10&&this.voices.shift().stop(s);const a=x1(i,this.effects,e,s+.004,t);this.voices.push(a),this.prefs.soundVolume>0&&window.dispatchEvent(new CustomEvent("rhine-local-sound",{detail:{until:performance.now()/1e3+Math.max(0,a.end-s)+.2}})),e==="key"&&this.playedKeys++,["open","brand","welcome","array","explode","assemble"].includes(e)&&(Cs(this.duck.gain,.65,s,.035),this.duck.gain.linearRampToValueAtTime(1,s+.9))}updateBoot(e,t=!1){const i=e+5,s=this.bootTime;this.bootTime=i;const r=i<22.76?0:i<26.92?1:i<34.3?2:3;if(r!==this.bootMix&&this.context){this.bootMix=r;const a=[[.48,.32,.18],[.68,.55,.32],[.9,.72,.65],[.72,.36,.12]][r];this.stemGains.forEach((o,l)=>Cs(o.gain,a[l],this.context.currentTime,.9))}if(t||s===null||i<s||i-s>.3){this.stopEffects();return}for(const a of v1)a.time>s&&a.time<=i&&this.play(a.sound);m1(s,i)&&this.play("key")}stats(){return{state:this.context?.state??"locked",scene:this.scene,tracks:this.tracks.length,voices:this.voices.filter(e=>e.end>(this.context?.currentTime??0)).length,loaded:!!this.buffers,playedKeys:this.playedKeys,error:this.error,preferences:{...this.prefs}}}dispose(){this.disposed=!0,this.requestId++,this.stopMusic(),this.stopEffects(),document.removeEventListener("pointerdown",this.gesture,!0),document.removeEventListener("keydown",this.gesture,!0),document.removeEventListener("visibilitychange",this.visibility),window.removeEventListener("pagehide",this.hide),window.removeEventListener("pageshow",this.visibility),this.context?.close()}}function y1(n){return`<div class="audio-settings">${[["sound","soundVolume","INTERFACE SOUND","操作与启动音效"],["music","musicVolume","BACKGROUND MUSIC","观测室 · 背景音乐"]].map(([e,t,i,s])=>`<div class="audio-setting">
    <label class="audio-toggle"><div><strong>${i}</strong><span>${s}</span></div><input type="checkbox" data-pref="${e}" ${n[e]?"checked":""}/><i class="toggle"></i></label>
    <label class="audio-volume"><span>${e==="sound"?"音效":"音乐"}音量</span><input aria-label="${e==="sound"?"音效":"音乐"}音量" data-volume="${t}" type="range" min="0" max="100" step="1" value="${Math.round(n[t]*100)}"/><output>${Math.round(n[t]*100)}%</output></label>
  </div>`).join("")}</div>`}class M1{constructor(e){this.options=e;const{root:t}=e;t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),t.setAttribute("aria-label","进入幻想镇档案馆"),t.insertAdjacentHTML("beforeend",'<div class="entry-controls"><button class="entry-start" disabled>正在准备终端…</button><button class="entry-silent" hidden>关闭声音并进入</button><p class="entry-status" role="status">资源就绪后即可进入</p></div>'),this.button=t.querySelector(".entry-start"),this.silent=t.querySelector(".entry-silent"),this.status=t.querySelector(".entry-status"),t.addEventListener("click",i=>{i.stopPropagation(),i.target.closest(".entry-silent")?(this.request++,e.cancel(),this.finish(!0)):(this.state==="waiting"||this.state==="error")&&this.enter()}),t.addEventListener("keydown",i=>{if(i.stopPropagation(),i.key==="Tab"){const s=[this.button,this.silent].filter(a=>!a.disabled&&!a.hidden);if(!s.length){i.preventDefault();return}const r=s.indexOf(document.activeElement);i.preventDefault(),s[(r+(i.shiftKey?s.length-1:1))%s.length].focus()}})}options;state="loading";request=0;button;silent;status;get phase(){return this.state}ready(){this.state="waiting",this.options.root.dataset.entry="waiting",this.button.disabled=!1,this.button.textContent="开启档案 →",this.options.root.querySelector(":scope > span").textContent="档案终端已就绪",this.status.textContent="轻触屏幕或按 Enter 开始",this.button.focus({preventScroll:!0})}async enter(){const e=++this.request;this.state="starting",this.options.root.dataset.entry="starting",this.button.setAttribute("aria-disabled","true"),this.button.textContent="正在准备声音…",this.status.textContent="准备完成后开始播放",this.silent.hidden=!1;let t;try{const i=await Promise.race([this.options.unlock(),new Promise(s=>{t=setTimeout(()=>s(!1),3500)})]);if(e!==this.request)return;i&&!document.hidden?this.finish(!1):(this.options.cancel(),this.finish(!0))}catch{if(e!==this.request)return;this.options.cancel(),this.state="error",this.options.root.dataset.entry="error",this.button.removeAttribute("aria-disabled"),this.button.textContent="重试声音并进入 →",this.status.textContent="声音暂未就绪，请重试或无声进入"}finally{clearTimeout(t)}}finish(e){this.state!=="started"&&(this.state="started",this.options.start(e))}}document.createElement("canvas").getContext("2d");let $c;const te=n=>document.querySelector(n);te("#stage").innerHTML=`
  <div id="three-scene" class="three-scene"></div>
  <div class="scene-atmosphere archive-atmosphere"></div>
  <div id="boot-background" class="boot-background"><svg viewBox="0 0 1920 1080" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width="3"><path d="M-210 705C-45 705 182 704 247 567C337 377 99 306 4 435S27 680 169 631C309 584 227 314 279 111S568-113 568-113"/><path d="M1560-80C1374 114 1671 168 1601 323S1371 367 1431 480S1692 666 1559 787S1329 886 1498 1130"/><circle cx="1450" cy="648" r="346"/><circle cx="1450" cy="648" r="348"/></g></svg></div>
  <header class="brand">${im}</header>
  <nav class="system-nav" aria-label="系统导航">
    <button data-action="search"><span class="nav-glyph">⌕</span> 档案检索 <span class="key">/</span></button>
    <button data-action="saved" aria-label="查看收藏档案" title="收藏档案">收藏档案 <span id="saved-count">00</span></button>
    <button class="settings-button" data-action="settings" aria-label="系统设置" title="系统设置"><span class="settings-glyph" aria-hidden="true">◷</span><span class="settings-label">设置</span></button>
  </nav>
  <button id="skip" class="skip" data-action="skip">进入档案馆 <span>↗</span></button>
  <section id="boot" class="boot" aria-label="系统启动">
    <div class="access-text">读取</div>
    <div class="boot-logo">${Wo}</div>
    <div class="auth-status"><span>▪</span> <span id="auth-message"></span><i></i></div>
    <div class="scan"><svg viewBox="0 0 1920 1080" aria-hidden="true"><g fill="none" stroke="#080a08" stroke-width="2" stroke-linecap="round"><path/><path stroke="#fff"/><path/><path/><path/><path/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="scan-core" cx="960" cy="540" r="5" fill="#080a08" stroke="none"/></g></svg><span>访问权限已确认</span></div>
    <div class="welcome"><div class="welcome-panel"></div><div class="welcome-heading">欢迎进入</div><div class="welcome-company"><strong>LINKING 档案馆</strong><strong class="welcome-highlight" aria-hidden="true">LINKING 档案馆</strong></div><div class="welcome-database">档案数据库</div><div class="welcome-logo">${Wo}</div></div>
  </section>
  <svg id="inspection-marks" viewBox="0 0 1920 1080" aria-hidden="true"><path id="inspection-lines"/><g id="inspection-corners"></g><circle id="inspection-point" r="1.8"/></svg>
  <div id="inspection-text" aria-hidden="true">查阅范围：<strong>社区开放档案</strong></div>
  <section id="archive-ui" class="archive-ui" aria-label="档案选择">
    <div class="archive-callout"><div class="eyebrow">档案数据库 <span>／</span> <span id="archive-category">活动档案</span></div><button class="file-title" data-action="open">档案编号： <span id="selected-id">X-<span id="selected-code">001</span></span><span class="file-open">↗</span></button><div class="callout-rule"><i></i></div><div class="file-summary"><span id="selected-title">幻想镇档案馆</span><span id="selected-clearance">接入记录</span></div><button class="read-file" data-action="open">读取档案 <span>→</span></button></div>
    <div id="hover-label" class="hover-label" hidden>X-<span id="hover-code">001</span> / <span id="hover-title"></span></div>
    <div class="archive-counter"><span class="tiny-label">档案 / 选择</span><div><span id="selected-number">01</span><i>/</i><span class="count-total">12</span></div></div>
    <div class="archive-navigation"><button data-action="prev" aria-label="上一个档案">↑</button><div id="file-ticks" class="file-ticks"></div><button data-action="next" aria-label="下一个档案">↓</button></div>
    <div class="column-navigation"><button data-action="column-prev" aria-label="上一列">←</button><div><span id="column-number">分类 <span id="column-index">03</span> / ${String(hn.length).padStart(2,"0")}</span><strong id="column-name">活动档案</strong></div><button data-action="column-next" aria-label="下一列">→</button></div>
    <div class="archive-hint"><kbd>←</kbd> <kbd>→</kbd> 切换列 <span>／</span> <kbd>↑</kbd> <kbd>↓</kbd> 前后档案 <span>／</span> <kbd>ENTER</kbd> 读取</div>
  </section>
  <section id="detail-ui" class="detail-ui" aria-label="档案内容" hidden>
    <button class="back-button" data-action="back">← <span>返回档案阵列</span><small>ESC</small></button>
    <div class="object-caption"><span id="object-id">NO.001</span><div>档案数据库</div><small>拖动查看 <span>↔</span></small><button class="viewer-open" data-action="model-viewer">360° 查看文档模型 <span>↗</span></button></div>
    <article id="detail-content" class="detail-content"></article>
  </section>
  <div class="powered">幻想镇 <b>LINKING</b><i></i></div>
  <footer class="system-footer"><span><i class="status-light"></i> 社区身份已验证</span><span>${Ht(In.user.name)} <i>／</i> <span id="clock">00:00:00</span></span><button data-action="replay" title="重播启动流程">重播开场 ↗</button></footer>
  <div id="pwa-update-notice" class="pwa-update-notice" role="status" hidden><span>新版本已就绪</span><button data-pwa-action="update">更新并重启 ↻</button></div>
  <div id="modal-root"></div><div id="toast" class="toast" role="status"></div>
  <div id="loading" class="loading"><div class="loading-mark">${Wo}</div><span>正在连接档案数据库</span><i></i></div>
`;te("#boot-background").insertAdjacentHTML("beforeend",'<div class="boot-white"></div>');const Pp=new f1(te("#stage"));te("#viewport").insertAdjacentHTML("beforeend",'<button class="mobile-entry" data-action="skip">进入档案 <span>→</span></button>');let Be="boot",gt=0,$s=0,bo="",Di=!1,ot=null,Bs="",ks="全部档案",er="overview";const ni=new URLSearchParams(location.search);let na=ni.get("freeze")==="1"?Number(ni.get("time")??0):null;ni.get("review")==="1"&&(te("#stage").dataset.review="true",window.addEventListener("message",n=>{if(n.origin!==location.origin||n.source!==window.parent||n.data?.type!=="rhine-review-frame")return;const e=Number(n.data.time);!Number.isFinite(e)||e<0||e>=35||(na=e,Di&&Be!=="boot"&&Kt("boot"))}));let of,Dp=null;const eh=new Tp(te("#detail-ui"),void 0,180,180),Fo=new XS;let zs,Pn=!1,So=[],To=!1;function b1(n,e){try{return JSON.parse(localStorage.getItem(n)??"null")??e}catch{return e}}const ln=new Set(vt.filter(n=>In.archives.find(e=>e.id===n.key)?.bookmarked).map(n=>n.id)),oi=b1("hxz-linking-settings-v1",{}),Lp=uS(oi.motion,hf.reducedMotion||oi.reduced||(oi.motion===void 0?matchMedia("(prefers-reduced-motion: reduce)").matches:void 0)),S1=Bh(Lp),Fe={sound:oi.sound??!0,music:oi.music??oi.sound??!0,soundVolume:oi.soundVolume??.55,musicVolume:oi.musicVolume??.5,motion:Lp,motionPreset:S1,quality:oi.quality??!0,superPerformance:oi.superPerformance??!0,rendering:Jn(oi.rendering,oi.quality!==!1),colorTheme:(hf.theme||oi.colorTheme)==="dark"?"dark":"light"},Je=n=>dS(Fe.motion,n),Ip=()=>Object.values(Fe.motion).every(n=>!n);Rp(Fe.colorTheme==="dark"?1:0);const Np={duration:460,motionBlur:!0,animated:Je("rollingNumbers")},Up=Tm(te("#clock")),zh={...Np,locales:"en-US",format:{minimumIntegerDigits:2,useGrouping:!1}},th=Jr(te("#selected-number"),{...zh,value:1}),ih=Jr(te("#column-index"),{...zh,value:3}),Op={...zh,format:{minimumIntegerDigits:3,useGrouping:!1},value:1},sa={...Np,animated:Je("rollingText"),transition:"direct",stagger:"none"},Fp=Qr(te("#selected-title"),{...sa,text:te("#selected-title").textContent??""}),Bp=Qr(te("#column-name"),{...sa,text:te("#column-name").textContent??""}),so=Qr(te("#hover-title"),{...sa,text:""}),kp=Qr(te("#archive-category"),{...sa,text:te("#archive-category").textContent??""}),zp=Qr(te("#selected-clearance"),{...sa,text:te("#selected-clearance").textContent??""}),Eo=[Fp,Bp,so,kp,zp],nh=Jr(te("#selected-code"),Op),Vs=Jr(te("#hover-code"),Op),nt=new _1;function Bo(){nt.configure({...Fe,music:Fe.music&&!0})}Bo();const T1=ni.has("scene")||ni.has("time")||ni.get("review")==="1";let is=!1;const Is=te("#loading");te("#viewport").append(Is);te("#stage").inert=!0;te(".mobile-entry").inert=!0;const jr=!T1&&(Fe.sound||Fe.music)?new M1({root:Is,unlock:()=>nt.unlock(),cancel:()=>nt.cancelEntry(),start:n=>qp(n)}):void 0;jr&&(nt.holdForEntry(),Fe.music&&nt.prepareMusic().catch(()=>{}));let wo=!1,sh=0,qe,Ti="on",Ot;const Vp=[],Hp=hn.map((n,e)=>cr(e)[0]);function E1(){Vp.unshift({id:vt[gt].id,time:new Date().toLocaleTimeString("en-GB")})}function ko(){try{localStorage.setItem("hxz-linking-settings-v1",JSON.stringify(Fe))}catch{}Bo()}function Yr(){return Fe.superPerformance}function Ao(){return Yr()?Bm:Fe.rendering}function Cn(){ko(),Je("rollingText")||Eo.forEach(n=>n.finish()),Je("rollingNumbers")||[th,ih,nh,Vs].forEach(n=>n.finish()),Je("surfaceTransitions")||(eh.finish(),zs?.finish(),Fo.finish()),qe?.setMotion(Fe.motion),qe?.setTheme(Fe.colorTheme==="dark",!Je("surfaceTransitions")||!is),document.querySelectorAll("[data-color-theme]").forEach(n=>n.setAttribute("aria-pressed",String(n.dataset.colorTheme===Fe.colorTheme))),qe?.setSuperPerformance(Yr()),Ot?.setSuperPerformance(Yr()),qe?.setQuality(Ao()),Ot?.setQuality(Ao()),Ot?.setMotion(Fe.motion),Fm(Fe.rendering),Vo(),th.update({animated:Je("rollingNumbers")&&Be==="archive"}),Eo.forEach(n=>n.update({animated:Je("rollingText")&&Be==="archive"})),ih.update({animated:Je("rollingNumbers")&&Be==="archive"}),nh.update({animated:Je("rollingNumbers")&&Be==="archive"}),Vs.update({animated:Je("rollingNumbers")&&Be==="archive"}),te("#stage").classList.toggle("reduce-motion",Ip()),te("#stage").classList.toggle("reduce-surfaces",!Je("surfaceTransitions")),Up(new Date,Je("rollingNumbers"))}let lf="";function ur(){const n=te("#stage"),e=te("#viewport"),t=matchMedia("(pointer: coarse)").matches,i=ni.has("time")||ni.get("review")==="1",{width:s,height:r,scale:a,kind:o}=Be==="boot"&&!i?km(e.clientWidth,e.clientHeight):zm(e.clientWidth,e.clientHeight,t,Be==="boot");n.style.width=`${s}px`,n.style.height=`${r}px`,n.style.transform=`translate(-50%, -50%) scale(${a})`,n.dataset.layout=o,n.dataset.touch=String(t),e.dataset.mobileBoot=String(Be==="boot"&&(t||e.clientWidth<1100)),n.style.setProperty("--stage-scale",String(a)),n.style.setProperty("--opening-width",`${s}px`),n.style.setProperty("--opening-height",`${r}px`),n.style.setProperty("--opening-scan-scale",String(Math.min(1,s/1920))),n.dataset.openingPortrait=String(s<r);const l=window.visualViewport,c=(e.clientHeight-r*a)/2;n.style.setProperty("--modal-top",`${Math.max(0,(l?.offsetTop??0)-c)/a}px`),n.style.setProperty("--modal-height",`${Math.min(r,(l?.height??e.clientHeight)/a)}px`),te("#viewport").style.setProperty("--scale",String(a)),document.querySelector("#inspection-marks")?.setAttribute("viewBox",`0 0 ${s} ${r}`);const d=JSON.stringify([s,r,a,o,devicePixelRatio]);d!==lf&&(lf=d,qe?.resize(),Ot?.resize()),Vo(),requestAnimationFrame(()=>{dr.refresh();const u=document.querySelector(".detail-tabs button.active"),f=document.querySelector(".tab-indicator");u&&f&&(f.style.transform=`translateX(${u.offsetLeft}px) scaleX(${u.offsetWidth})`)})}window.addEventListener("resize",ur);window.visualViewport?.addEventListener("resize",ur);window.visualViewport?.addEventListener("scroll",ur);matchMedia("(pointer: coarse)").addEventListener("change",ur);ur();function Kt(n){const e=Be;Eo.forEach(t=>t.update({animated:Je("rollingText")&&n==="archive"})),n!=="archive"&&(Eo.forEach(t=>t.finish()),Vs.finish(),te("#hover-label").hidden=!0),n==="detail"&&Be!=="detail"&&E1(),Be=n,nt.setScene(n),n!=="boot"&&wo&&(wo=!1,sh++,Bo()),te("#stage").dataset.mode=n,e!==n&&ur(),te("#boot").inert=n!=="boot",te("#boot").setAttribute("aria-hidden",String(n!=="boot")),te("#archive-ui").inert=n!=="archive"||!!ot||!!$c?.enabled,te("#archive-ui").setAttribute("aria-hidden",String(n!=="archive"||!!$c?.enabled)),te(".system-nav").inert=n==="boot"||!!ot,te(".system-footer").inert=n==="boot"||!!ot,n==="detail"?e!=="detail"&&eh.show(!Je("surfaceTransitions")):(e==="detail"||n==="boot"&&!te("#detail-ui").hidden)&&(To=!1,Fo.cancel(),eh.hide(!Je("surfaceTransitions")||n==="boot"),!ot&&n==="archive"&&te(".read-file").focus({preventScroll:!0})),te("#detail-ui").inert=n!=="detail"||!!ot,qe?.setMode(n==="boot"?"hidden":n),n!=="boot"&&(Pp.reset(),te(".file-title").firstChild.textContent="档案编号： ",te("#stage").dataset.boot="done"),n==="detail"&&e!=="detail"&&(Vh(),To=!0,qe||(te("#detail-content").style.opacity="1",te("#detail-content").style.translate="0 0",te("#detail-content").inert=!1))}function Ln(n,e){gt=(n+vt.length)%vt.length,Hp[Rn(gt).lane]=gt,Be==="detail"&&Kt("archive"),er="overview",qe?.select(gt,e),zo(e);const t=e&&"axis"in e&&e.axis==="lane";nt.play(t?"column":"tick",t?e.direction*.45:0)}function Co(n){const e=cr(Rn(gt).lane);e.length<2||Ln(e[(e.indexOf(gt)+n+e.length)%e.length],{axis:"row",direction:n})}function Kr(n){const e=Rn(gt).lane,t=Wc(e+n,hn.length);Ln(Hp[t],{axis:"lane",direction:n})}function zo(n){const e=vt[gt],{lane:t}=Rn(gt),i=cr(t);Fp.update({text:e.title,animated:Je("rollingText")&&Be==="archive"}),zp.update({text:e.clearance,animated:Je("rollingText")&&Be==="archive"}),kp.update({text:e.category,animated:Je("rollingText")&&Be==="archive"});const s=n&&"axis"in n?n.direction>0?"up":"down":"auto";nh.update({value:Number(e.id.slice(2)),animated:Je("rollingNumbers")&&Be==="archive",direction:s}),th.update({value:i.indexOf(gt)+1,animated:Je("rollingNumbers")&&Be==="archive",direction:n&&"axis"in n&&n.axis==="row"?s:"auto"}),te(".count-total").textContent=String(i.length).padStart(2,"0"),ih.update({value:t+1,animated:Je("rollingNumbers")&&Be==="archive",direction:n&&"axis"in n&&n.axis==="lane"?s:"auto"}),Bp.update({text:hn[t],animated:Je("rollingText")&&Be==="archive"}),te('[data-action="column-prev"]').disabled=!1,te('[data-action="column-next"]').disabled=!1,te("#file-ticks").replaceChildren(...i.map(a=>{const o=document.createElement("button");return o.dataset.select=String(a),o})),[...te("#file-ticks").querySelectorAll("button")].forEach((a,o)=>{const l=i[o],c=vt[l];a.dataset.select=String(l),a.setAttribute("aria-label",`选择档案 ${c.id} ${c.title}`),a.title=`${c.id} · ${c.title}`,a.classList.toggle("selected",l===gt),a.setAttribute("aria-pressed",String(l===gt))}),te("#saved-count").textContent=String(ln.size).padStart(2,"0")}function rh(n=!1){Di&&tr(()=>w1(n))}function w1(n){$s=performance.now()/1e3-1.76,na=null,bo="",Kt(!Je("boot")&&!n?"archive":"boot"),nt.restartBoot(),qe?.select(0),gt=0,zo(),n||nt.play("ui-tick")}async function Zr(){if(!Di)return;const n=vt[gt];if(!n.unlocked){sm(),ro("完成前置任务后才能读取这份档案");return}try{await hh("read",n.key)}catch(e){ro("阅读进度未保存："+e.message,!0)}vt[gt]?.key===n.key&&tr(()=>{Kt("detail"),nt.play("open")})}async function A1(){const n=vt[gt],e=In.archives.find(t=>t.id===n.key);try{await hh("bookmark",n.key,{value:!e.bookmarked}),Be==="detail"&&Vh(),nt.play("confirm")}catch(t){ro(t.message,!0)}}function Vh(){Fo.cancel();const n=vt[gt];te("#object-id").textContent="NO."+String(gt+1).padStart(3,"0"),te("#detail-content").innerHTML=`
  <div class="detail-kicker"><span>档案 ${n.id}</span><span>${Ht(n.clearance)}</span></div>
  <h2>${Ht(n.en)}</h2><div class="detail-title-cn">${Ht(n.title)}<span>${Ht(n.category)}</span></div>
  <div class="detail-rule"></div>
  <dl class="metadata"><div><dt>分类</dt><dd>${Ht(n.department)}</dd></div><div><dt>编目范围</dt><dd>${Ht(n.date)}</dd></div><div><dt>相关人物</dt><dd>${Ht(n.lead)}</dd></div><div><dt>状态</dt><dd><i></i>${n.clearance==="尚未解锁"?"目录访问":"已归档 · 可读取"}</dd></div></dl>
  <div class="detail-tabs" role="tablist"><button id="tab-overview" class="active" role="tab" aria-controls="tab-panel" aria-selected="true" data-tab="overview">01 <span>概述</span></button><button id="tab-notes" role="tab" aria-controls="tab-panel" aria-selected="false" data-tab="notes">02 <span>研究记录</span></button><button id="tab-history" role="tab" aria-controls="tab-panel" aria-selected="false" data-tab="history">03 <span>访问日志</span></button><i class="tab-indicator" aria-hidden="true"></i></div>
  <div id="tab-panel" class="tab-panel" role="tabpanel">${Gp()}</div>
  <div class="detail-actions"><button class="solid-button" data-action="bookmark">${ln.has(n.id)?"取消收藏":"收藏档案"}<span>${ln.has(n.id)?"已收藏":"收藏档案"}</span></button></div>
  <div class="detail-footnote"><span>LINKING · 社区档案</span><span>${String(gt+1).padStart(3,"0")} / ${String(vt.length).padStart(3,"0")}</span></div>`,te("#detail-content").setAttribute("tabindex","-1"),te('[data-action="bookmark"]').setAttribute("aria-pressed",String(ln.has(n.id))),dr.reset(te("#detail-content"),!Je("documentReveal")||!qe||qe.decryptionFrame.phase==="clear"),Hh(er,!1)}function Gp(){return`<div class="panel-label">摘要</div><p>${Ht(vt[gt].abstract)}</p>`}function Hh(n,e=!0){if(e&&n===er)return;er=n,document.querySelectorAll("[data-tab]").forEach(r=>{const a=r.dataset.tab===n;r.classList.toggle("active",a),r.setAttribute("aria-selected",String(a)),r.setAttribute("tabindex",a?"0":"-1")});const t=vt[gt],i=te(`[data-tab="${n}"]`),s=te(".tab-indicator");s.style.transition=e&&Je("surfaceTransitions")?"":"none",s.style.transform=`translateX(${i.offsetLeft}px) scaleX(${i.offsetWidth})`,te("#tab-panel").setAttribute("aria-labelledby",i.id),te("#tab-panel").innerHTML=n==="overview"?Gp():n==="notes"?`<div class="panel-label">探索记录</div><ol class="research-notes">${t.findings.map((r,a)=>`<li><span>${String(a+1).padStart(2,"0")}</span>${Ht(r)}</li>`).join("")}</ol>`:`<div class="panel-label">本次访问</div>${Vp.filter(r=>r.id===t.id).slice(0,4).map(r=>`<div class="log-row"><span>${r.time}</span><span>${Ht(In.user.name)}</span><b>允许读取</b></div>`).join("")}<p class="log-note">本次会话已通过身份验证。档案内容以当前终端可访问范围展示。</p>`,te("#tab-panel").scrollTop=0,dr.refresh(),e&&(Fo.reveal(te("#tab-panel"),!Je("surfaceTransitions")),nt.play("ui-tick"))}function Wp(n){clearTimeout(of),te("#toast").textContent=n,te("#toast").classList.add("visible"),of=setTimeout(()=>te("#toast").classList.remove("visible"),2600)}function ah(n){Di&&(ot||(Dp=document.activeElement,So=[...te("#stage").children].filter(e=>e instanceof HTMLElement&&e.id!=="modal-root").map(e=>({node:e,inert:e.inert})),So.forEach(({node:e})=>e.inert=!0)),Pn=!1,ot=n,Bs="",ks="全部档案",nt.play("page-open"),oh())}function tr(n){if(!ot){n?.();return}Pn||(Pn=!0,nt.play("page-close"),zs.hide(!Je("surfaceTransitions"),()=>{ot=null,Pn=!1,te("#modal-root").replaceChildren(),zs=void 0,So.forEach(({node:e,inert:t})=>e.inert=t),So=[],te("#archive-ui").inert=Be!=="archive"||!!$c?.enabled,te("#detail-ui").inert=Be!=="detail",Dp?.focus({preventScroll:!0}),n?.()}))}function oh(){if(!ot)return;zs?.dispose(),te("#modal-root").innerHTML=`<div class="modal-backdrop"><section class="terminal-modal ${ot==="settings"?"settings-modal":""}" role="dialog" aria-modal="true" aria-label="${ot==="settings"?"系统设置":ot==="saved"?"收藏档案":"档案检索"}"><div class="modal-top"><span>LINKING / ${ot==="settings"?"系统设置":"档案目录"}</span><button data-action="close-modal" aria-label="关闭窗口">关闭 <span>×</span></button></div>${ot==="settings"?C1():`<h2>${ot==="saved"?"已收藏档案":"档案检索"}<small>${ot==="saved"?"收藏档案":"内部档案检索"}</small></h2><div class="search-field"><span>⌕</span><input id="archive-search" type="search" autocomplete="off" placeholder="输入档案编号、名称或分类" aria-label="检索档案"/><span class="key">ESC</span></div><div class="category-filters">${JM.map((e,t)=>`<button data-filter="${Ht(e)}" class="${t===0?"active":""}">${Ht(e)}</button>`).join("")}</div><div class="result-header"><span>档案</span><span>分类</span><span>读取</span></div><div id="search-results" class="search-results"></div><div class="modal-bottom"><span id="result-count"></span><span>档案数据库 <i>●</i> 已连接</span></div>`}</section></div>`;const n=te(".modal-backdrop");n.hidden=!0,zs=new Tp(n,te(".terminal-modal")),zs.show(!Je("surfaceTransitions")),ot==="settings"&&Vo(),ot!=="settings"?(Gh(),requestAnimationFrame(()=>{n.isConnected&&!Pn&&te("#archive-search").focus()})):requestAnimationFrame(()=>{n.isConnected&&!Pn&&te('[data-action="close-modal"]').focus()}),te("#modal-root").querySelector(".modal-backdrop")?.addEventListener("click",e=>{e.target===e.currentTarget&&tr()})}function Gh(){const n=vt.map((e,t)=>({r:e,i:t})).filter(({r:e})=>(ot!=="saved"||ln.has(e.id))&&(ks==="全部档案"||e.category===ks)&&`${e.id} ${e.title} ${e.en} ${e.department} ${e.lead}`.toLowerCase().includes(Bs.toLowerCase()));te("#search-results").innerHTML=n.length?n.map(({r:e,i:t})=>`<button class="result-row" data-result="${t}"><span class="result-name"><b>${e.id}</b><span>${Ht(e.title)}<small>${Ht(e.en)}</small></span>${ln.has(e.id)?"<i>＋</i>":""}</span><span>${Ht(e.department)}</span><span>${e.clearance==="尚未解锁"?"仅目录":"可读取"} <i>↗</i></span></button>`).join(""):`<div class="empty-results"><span>∅</span><strong>${ot==="saved"&&!Bs?"尚无收藏档案":"没有匹配的档案"}</strong><p>${ot==="saved"&&!Bs?"读取档案时，选择“收藏档案” 将其保存在此处。":"尝试其他名称、档案编号，或切换档案分类。"}</p><button data-action="reset-search">${ot==="saved"?"查看全部档案 →":"重置检索 →"}</button></div>`,te("#result-count").textContent=`${String(n.length).padStart(2,"0")} 份档案`}function Vo(){const n=document.querySelector("#quality-summary");if(!n)return;if(!qe){n.textContent="3D 已关闭 · 三维模型与渲染资源已释放";return}const e=qe.renderer.domElement,t=JSON.parse(e.parentElement?.dataset.renderQuality??"{}");n.textContent=`${Yr()?"超级性能模式已启用 · 画质设置暂被覆盖，关闭后恢复 · ":""}实际渲染 ${e.width} × ${e.height} · ${Ao().antialias==="smaa"?"SMAA":"原始抗锯齿"} · 纹理 ${t.anisotropy??1}×${t.limited?" · 已达到缓冲上限":""}`}function Xp(){const n=Fe.motionPreset,e=Object.values(Fe.motion).every(Boolean);return`<div id="motion-preference-note" class="motion-preference-note"><p>${fS(Fe.motion)}</p><span>预设：${n==="full"?"完整动画":n==="reduced"?"减少动画":"自定义"} · 选择会保存在本站</span>${e?"":'<button data-action="enable-motion">启用完整动画并重播 ↻</button>'}</div>`}function C1(){return`<h2>系统设置<small>终端偏好设置</small></h2><p class="settings-intro">${Ht(In.user.name)} <span>·</span> 社区身份已验证</p><div class="settings-list">${u1(Fe.colorTheme==="dark")}${`<label><div><strong>轻量渲染</strong><span>降低三维画质和渲染分辨率，保留完整动效；关闭后恢复原画质</span></div><input type="checkbox" data-pref="superPerformance" ${Fe.superPerformance?"checked":""}/><i class="toggle"></i></label>`}${y1(Fe)}</div>${Xp()}${mp(Fe.motion,Fe.motionPreset)}${Om(Fe.rendering)}${Wm()}<div class="settings-shortcuts"><span>键盘操作</span><p><kbd>←</kbd><kbd>→</kbd> 切列 <kbd>↑</kbd><kbd>↓</kbd> 选档 <kbd>ENTER</kbd> 读取 <kbd>/</kbd> 检索 <kbd>ESC</kbd> 返回</p></div><div class="settings-bottom">${document.fullscreenEnabled?'<button data-action="fullscreen">全屏显示 <span>↗</span></button>':""}<button data-action="restart">重新进入档案馆 <span>↻</span></button></div><div class="modal-bottom"><span>LINKING / 0.7.0 · 使用 MiSans 字体（小米） <a href="${lo("fonts/MiSans-license.pdf")}" target="_blank" rel="noopener">字体许可</a></span><span>幻想镇档案馆</span></div>`}document.addEventListener("input",n=>{const e=n.target;if(e.dataset.quality){const i=document.querySelector(`[data-quality-output="${e.dataset.quality}"]`);i&&(i.value=`${e.value}%`)}const t=n.target;(t.dataset.volume==="musicVolume"||t.dataset.volume==="soundVolume")&&(Fe[t.dataset.volume]=Number(t.value)/100,t.closest("label")?.querySelector("output")?.replaceChildren(`${t.value}%`),ko()),n.target.id==="archive-search"&&(Bs=n.target.value,Gh())});document.addEventListener("change",n=>{const e=n.target;if(e.id==="quality-preset"&&Object.hasOwn(kr,e.value))Fe.rendering={...kr[e.value]},Cn();else if(e.dataset.quality){const t=e.dataset.quality;Fe.rendering=Jn({...Fe.rendering,[t]:t==="antialias"?e.value:Number(e.value)}),Cn()}if(e.dataset.pref){const t=e.dataset.pref;(t==="sound"||t==="music"||t==="quality"||t==="superPerformance")&&(Fe[t]=e.checked),t==="sound"||t==="music"?ko():Cn(),nt.play("confirm")}if(e.dataset.motion){const t=e.dataset.motion;Fe.motion[t]=e.checked,Fe.motionPreset=Bh(Fe.motion),Cn();const i=te("#motion-settings"),s=i.querySelector(".motion-advanced")?.open??!1,r=i.closest(".settings-modal"),a=r?.scrollTop??0;i.outerHTML=mp(Fe.motion,Fe.motionPreset),te("#motion-preference-note").outerHTML=Xp(),te("#motion-settings").querySelector(".motion-advanced").open=s,requestAnimationFrame(()=>{r&&(r.scrollTop=a),document.querySelector(`[data-motion="${t}"]`)?.focus({preventScroll:!0})}),Wp(t==="boot"?"开场设置将在下次重播时生效":e.checked?"已启用此动画":"已关闭此动画"),nt.play("confirm")}});document.addEventListener("click",n=>{const e=n.target.closest("[data-color-theme]");if(e){Fe.colorTheme=e.dataset.colorTheme==="dark"?"dark":"light",Cn();return}if(!is||Pn)return;const t=n.target.closest("button");if(!t)return;if(t.dataset.action==="motion-preset"){const s=t.dataset.preset;if(s!=="full"&&s!=="reduced")return;Fe.motionPreset=s,Fe.motion=s==="full"?qr():pp(),Cn(),oh(),requestAnimationFrame(()=>document.querySelector(`[data-action="motion-preset"][data-preset="${Fe.motionPreset}"]`)?.focus({preventScroll:!0})),nt.play("confirm");return}if(t.dataset.select){Ln(Number(t.dataset.select));return}if(t.dataset.result){const s=Number(t.dataset.result);tr(()=>{Ln(s),Zr()});return}if(t.dataset.filter){ks=t.dataset.filter,document.querySelectorAll("[data-filter]").forEach(s=>s.classList.toggle("active",s.dataset.filter===ks)),Gh();return}if(t.dataset.tab){Hh(t.dataset.tab);return}const i=t.dataset.action;if(i==="toggle-three"){N1();return}if(i==="sound-preview"&&nt.play("confirm"),i==="skip"&&(Kt("archive"),nt.play("confirm")),i==="prev"&&Co(-1),i==="next"&&Co(1),i==="column-prev"&&Kr(-1),i==="column-next"&&Kr(1),i==="open"&&Zr(),i==="model-viewer"&&Be==="detail"&&qe){const s=qe;t.focus({preventScroll:!0}),Ot??=new GS(te("#stage"),()=>{nt.setScene(Be),nt.play("page-close")},r=>nt.play(r==="tick"?"ui-tick":r)),nt.setScene("viewer"),Ot.setSuperPerformance(Yr()),Ot.setQuality(Ao()),Ot.setMotion(Fe.motion),qe.finishDecryption(),Ot.open(vt[gt].id,vt[gt].title,()=>s.createAssemblyModel(),!Je("viewerNavigation")),nt.play("page-open")}i==="back"&&(Kt("archive"),nt.play("back")),(i==="search"||i==="saved"||i==="settings")&&(t.focus({preventScroll:!0}),ah(i)),i==="close-modal"&&tr(),i==="bookmark"&&A1(),i==="reset-search"&&(ot="search",Bs="",ks="全部档案",oh()),(i==="replay"||i==="restart")&&rh(),i==="enable-motion"&&(Fe.motion=qr(),Fe.motionPreset="full",Cn(),rh()),i==="fullscreen"&&document.fullscreenEnabled&&(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>Wp("请使用浏览器的全屏快捷键 F11")))});document.addEventListener("keydown",n=>{if(!is||Ot?.isOpen)return;if(Pn){n.preventDefault();return}const e=n.target instanceof HTMLInputElement;if(n.key==="Escape"){if(ot)tr();else if(Be==="detail"||Be==="boot"&&Di){const t=Be==="detail"?"back":"ui-tick";Kt("archive"),nt.play(t)}return}if(ot&&n.key==="Tab"){const i=[...te("#modal-root").querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(a=>a.tabIndex>=0&&!a.matches(":disabled")&&a.getClientRects().length>0),s=i[0],r=i.at(-1);n.shiftKey&&document.activeElement===s?(n.preventDefault(),r?.focus()):!n.shiftKey&&document.activeElement===r&&(n.preventDefault(),s?.focus());return}if(!(e||ot||!Di)){if(n.target.dataset.tab&&["ArrowLeft","ArrowRight"].includes(n.key)){n.preventDefault();const t=["overview","notes","history"];Hh(t[(t.indexOf(er)+(n.key==="ArrowRight"?1:2))%3]),te(`[data-tab="${er}"]`).focus();return}n.key==="/"&&(n.preventDefault(),Be==="boot"&&Kt("archive"),ah("search")),n.key==="Home"&&BS(n)&&Be==="archive"&&!ot&&(n.preventDefault(),ah("saved")),n.key==="ArrowLeft"&&Be!=="boot"&&(n.preventDefault(),Kr(-1)),n.key==="ArrowRight"&&Be!=="boot"&&(n.preventDefault(),Kr(1)),["ArrowUp","ArrowDown"].includes(n.key)&&Be!=="boot"&&(n.preventDefault(),Co(n.key==="ArrowUp"?-1:1)),n.key==="Enter"&&(document.activeElement===document.body||document.activeElement?.id==="detail-content"||["prev","next","column-prev","column-next"].includes(document.activeElement?.dataset.action??"")||document.activeElement?.dataset.select)&&(n.preventDefault(),Be==="boot"?Kt("archive"):Be==="archive"&&Zr())}});const Es=n=>(n=Math.max(0,Math.min(1,n)),n*n*(3-2*n));function R1(n){nt.updateBoot(n,na!==null);let t=Pp.update(n).step;n>=22&&(t="array"),n>=25.68&&(t="select"),n>=28.3&&(t="inspect"),t!==bo&&(te("#stage").dataset.boot=t,bo=t),te(".file-title").firstChild.textContent=t==="array"?"SELECTING FILES...".slice(0,Math.max(0,Math.floor((n-21.94)*18))):"档案编号： ",te("#stage").style.setProperty("--entry-opacity",String(Es((n-21.9)/.13))),te(".callout-rule").style.transform=`scaleX(${Es((n-22.08)/.9)})`;const i=Es((n-22)/.4),s=Es((n-26)/1.8),r=.55*Es((n-27.3)/1.65)+.45*Es((n-29)/5);if(n>=35){vt[gt].unlocked?(hh("read",vt[gt].key).catch(a=>ro("阅读进度未保存："+a.message,!0)),Kt("detail")):Kt("archive");return}return{reveal:i,lift:s,zoom:r,time:n}}const P1=new Lm,dr=new Im;document.fonts.addEventListener("loadingdone",()=>dr.refresh());let cf=0,Yl=0,Kl=performance.now(),lh=0,ch=!1;function Ir(n){if(ch){requestAnimationFrame(Ir);return}if(!Um()){requestAnimationFrame(Ir);return}if(document.hidden){requestAnimationFrame(Ir);return}const e=n/1e3,t=qe?.themeAmount??(Fe.colorTheme==="dark"?1:0);Rp(t),Ot?.setTheme(t);const i=Be==="boot"&&Di?R1(na??e-$s):void 0;!Ot?.isOpen&&(!i||i.time>=21.9)&&qe?.update(e,i),Ot?.update(e),Ti==="closing"&&qe?.presentationHidden&&I1(),qe&&Be==="detail"&&(dr.update(e,qe.decryptionFrame,!Je("documentReveal")),te("#detail-content").style.opacity=String(qe.detailVisibility),te("#detail-content").style.translate=`0 ${(1-qe.detailVisibility)*18}px`,te("#detail-content").inert=qe.detailVisibility<.1,To&&qe.detailVisibility>=.1&&!ot&&!Ot?.isOpen&&(te("#detail-content").focus({preventScroll:!0}),To=!1)),te("#stage").style.setProperty("--detail-shade",String(Be==="boot"?0:qe?.detailVisibility??0));const s=qe;s&&P1.render(s.decryptionFrame,(r,a)=>s.projectCard(r,a),!!i,Je("modelDecryption")),Math.floor(e)!==cf&&(cf=Math.floor(e),Up(new Date,Je("rollingNumbers"))),Yl++,n-Kl>1e3&&(lh=Yl*1e3/(n-Kl),Kl=n,Yl=0,te("#three-scene").dataset.fps=String(Math.round(lh)),te("#three-scene").dataset.renderStats=JSON.stringify(qe?.getStats()??{loaded:!1,drawCalls:0,triangles:0})),requestAnimationFrame(Ir)}function D1(n,e){n.select(gt,void 0),n.onSelect=(t,i)=>{Be!=="archive"||ot||Ot?.isOpen||Ln(t,i?{cell:i}:void 0)},n.onNavigate=(t,i)=>{Be!=="archive"||ot||Ot?.isOpen||(t==="lane"?Kr(i):Co(i))},n.onHover=t=>{const i=te("#hover-label");if(t===null){i.hidden=!0,Vs.finish(),so.finish();return}const s=Je("rollingText")&&Be==="archive",r=Je("rollingNumbers")&&Be==="archive";Vs.update({value:Number(vt[t].id.slice(2)),animated:!i.hidden&&r}),so.update({text:vt[t].title,animated:!i.hidden&&s}),i.hidden=!1,Vs.update({animated:r}),so.update({animated:s})}}function L1(){te("#stage").dataset.threeState=Ti;const n=document.querySelector('[data-action="toggle-three"]');n&&(n.textContent=Ti==="loading"?"3D 载入中…":Ti==="closing"?"3D 关闭中…":Ti==="off"?"3D 关闭":"3D 开启",n.disabled=Ti==="loading",n.setAttribute("aria-pressed",String(Ti==="on")),n.title=Ti==="off"?"重新载入三维模型":Ti==="closing"?"取消关闭，恢复三维画面":"卸载三维模型，保留 2D 界面")}function I1(){qe&&({...qe.getStats().selectedCell},Ot?.dispose(),Ot=void 0,qe.dispose(),qe=void 0,Be==="detail"&&(te("#detail-content").style.opacity="1",te("#detail-content").style.translate="0 0",te("#detail-content").inert=!1,dr.reset(te("#detail-content"),!0)),Ti="off",L1(),te("#hover-label").hidden=!0,delete te("#three-scene").dataset.renderQuality,Vo())}async function N1(){}async function U1(){try{(!$o||au()?.properties.load3donstartup?.value!==!1)&&(qe=new yS(te("#three-scene")),qe.setTheme(Fe.colorTheme==="dark",!0),qe.setArchiveCoverage(au()?.properties.archivecoverage?.value==="extra")),await Promise.all([qe?.load(),d1(),document.fonts.load("300 20px MiSans","ACCESS 欢迎进入 档案数据库"),document.fonts.load("400 20px MiSans","身份信息确认请求已接收开始处理权限验证通过欢迎访问幻想镇档案馆内部资料档案编号保密级别商业区选择档案：0123456789 探索者"),document.fonts.load("600 20px MiSans","SYNTHESIZE INFORMATION ANALYSIS OS"),document.fonts.load("700 20px MiSans","LINKING 欢迎进入 档案数据库")]),qe&&D1(qe),Cn(),Di=!0,Ln(0),jr?jr.ready():qp(!1)}catch(n){console.error(n),te("#loading").innerHTML='<div class="error-state"><strong>三维资源暂不可用</strong><p>三维画面无法载入。可以继续使用阅读模式，任务与进度保持一致。</p><button id="linking-reading-fallback">使用阅读模式 →</button></div>',document.querySelector("#linking-reading-fallback")?.addEventListener("click",()=>nm({chapter:In.id,mode:"read"}))}}function qp(n){if(is||!Di)return;is=!0,n&&(Fe.sound=!1,Fe.music=!1,ko()),nt.releaseEntry(),nt.restartBoot();const e=Je("boot")?600:0;$s=performance.now()/1e3-(ni.has("time")?Number(ni.get("time")):1.76),ni.has("time")||($s+=e/1e3),Kt("boot"),(ni.get("scene")==="archive"||!Je("boot")&&!ni.has("time"))&&Kt("archive"),ni.get("scene")==="detail"&&Kt("detail"),te("#stage").inert=!1,te(".mobile-entry").inert=!1,Is.classList.add("loaded"),Is.inert=!0,setTimeout(()=>{const t=Is.contains(document.activeElement)||document.activeElement===document.body;if(Is.remove(),jr&&t){const i=te("#skip");(Be==="boot"?i.getClientRects().length?i:te(".mobile-entry"):te(".read-file")).focus({preventScroll:!0})}},e),requestAnimationFrame(Ir),setTimeout(()=>{Gm()},1500)}zo();U1();HS();const O1={keyboard:"<kbd>←</kbd> <kbd>→</kbd> 切换列 <span>／</span> <kbd>↑</kbd> <kbd>↓</kbd> 前后档案 <span>／</span> <kbd>ENTER</kbd> 读取",gamepad:"<kbd>LS</kbd> <kbd>DP</kbd> 切换列 / 前后档案 <span>／</span> <kbd>A</kbd> 读取"};Mp(n=>{const e=document.querySelector(".archive-hint");e&&(e.innerHTML=O1[n])});Object.assign(window,{rhine:{playBootPreview:async(n=!1)=>{if(!Di||!navigator.userActivation.isActive)return!1;const e=++sh;wo=!0,nt.configure({...Fe,sound:!0,music:n});const t=await nt.unlock();return e!==sh?!1:t?(rh(!0),!0):(wo=!1,Bo(),!1)},seek:n=>{Kt("boot"),$s=performance.now()/1e3-n,bo=""},archive:()=>Kt("archive"),detail:()=>Zr(),select:n=>Ln(n),stats:()=>({...qe?.getStats(),threeState:Ti,fps:Math.round(lh),mode:Be,ready:Di,startup:is?"started":jr?.phase??"loading",motion:{reduced:Ip(),preset:Fe.motionPreset},bootTime:Be==="boot"?is?(na??performance.now()/1e3-$s)+5:6.76:null,selected:vt[gt].id,saved:[...ln],audio:nt.stats(),wallpaper:null})}});window.addEventListener("linking-panel",n=>{ch=!!n.detail,nt.setHostPaused(ch)});window.addEventListener("linking-progress",()=>{ln.clear();for(const n of vt)In.archives.find(e=>e.id===n.key)?.bookmarked&&ln.add(n.id);zo(),Be==="detail"&&Vh()});window.addEventListener("linking-select",n=>{const e=vt.findIndex(t=>t.key===n.detail);e>=0&&(Ln(e),Zr())});window.addEventListener("pagehide",()=>{nt.dispose(),qe?.dispose(),Ot?.dispose()});
