import {el} from './dom.mjs';

const ns='http://www.w3.org/2000/svg';
const shapes={
 cat:['M24 38 22 14 40 26M56 26 74 14 72 38','M23 42c0-25 50-25 50 0v12c0 26-50 26-50 0Z','M34 46v3m28-3v3m-18 5 4 3 4-3m-4 3v5m0 0c-6 5-11 0-11 0m11 0s5 5 11 0','M17 50l14 3m-14 7 14-3m48-7-14 3m14 7-14-3'],
 fox:['M24 40 18 12 43 28M53 28 78 12 72 40','M23 40c0-22 50-22 50 0l-4 22-21 17-21-17Z','m27 48 16 12m26-12-16 12m-12-15h2m12 0h2m-13 19 4 4 4-4'],
 rabbit:['M33 33C12-10 47-9 43 30M53 30c-4-39 31-40 10 3','M22 49c0-27 52-27 52 0v10c0 26-52 26-52 0Z','M35 50v3m26-3v3m-17 6 4 3 4-3m-4 3v5m-8 0q8 7 16 0'],
};
function companion(kind,name){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 96 96');svg.setAttribute('role','img');svg.setAttribute('aria-label',name);svg.classList.add('hub-companion');
 for(const [i,d] of shapes[kind].entries()){
  const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill',i===1?'var(--hub-companion-fill)':'none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);
 }return svg;
}
export function spaceHero(profile){
 const card=el('article','','hub-space-hero');card.dataset.spaceTheme=profile.home?.theme||'sky';
 const text=el('div','','hub-space-copy');text.append(el('h3',profile.name));
 if(profile.home?.motto)text.append(el('p',profile.home.motto,'hub-label'));
 text.append(el('p',profile.bio||'还没有填写介绍。','hub-prose'));
 if(profile.tags?.length){const tags=el('div','','hub-tags');for(const tag of profile.tags)tags.append(el('span',tag,'hub-chip'));text.append(tags);}
 if(profile.availability)text.append(el('small',profile.availability));card.append(text);
 const kind=profile.home?.companion;
 if(shapes[kind]){const figure=el('figure','','hub-space-companion'),name=profile.home.companionName||({cat:'猫咪',fox:'狐狸',rabbit:'兔子'}[kind]);figure.append(companion(kind,name),el('figcaption',name));card.append(figure);}
 return card;
}
