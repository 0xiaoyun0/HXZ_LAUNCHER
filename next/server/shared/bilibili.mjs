// Public player parameters: https://player.bilibili.com/ . No cookies or playurl extraction.
export function bilibiliVideo(input){
 let text=String(input||'').trim();if(/^BV[0-9A-Za-z]{10}$/.test(text))text='https://www.bilibili.com/video/'+text;
 let u;try{u=new URL(text);}catch{throw Error('请填写完整 B 站视频链接或 BV 号');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.bilibili.com','bilibili.com','m.bilibili.com','player.bilibili.com'].includes(u.hostname))throw Error('请使用 bilibili.com 的视频链接');
 const bvid=u.pathname.match(/^\/video\/(BV[0-9A-Za-z]{10})(?:\/|$)/)?.[1]||u.searchParams.get('bvid'),av=u.pathname.match(/^\/video\/av([1-9][0-9]{0,17})(?:\/|$)/)?.[1],episode=u.pathname.match(/^\/bangumi\/play\/ep([1-9][0-9]{0,17})(?:\/|$)/)?.[1];
 const page=Number(u.searchParams.get('p')||1);if(!Number.isInteger(page)||page<1||page>1000)throw Error('B 站分 P 编号无效');
 if(bvid&&!/^BV[0-9A-Za-z]{10}$/.test(bvid))throw Error('BV 号无效');if(!bvid&&!av&&!episode)throw Error('请使用视频详情链接，短链接请先打开后复制完整地址');
 const key=bvid?{bvid}:av?{aid:av}:{episodeId:episode},source=bvid?'https://www.bilibili.com/video/'+bvid:av?'https://www.bilibili.com/video/av'+av:'https://www.bilibili.com/bangumi/play/ep'+episode;
 return {source:source+(page>1?'?p='+page:''),key,page};
}
export function bilibiliPlayer(input,seconds=0,playing=false){const v=bilibiliVideo(input),params=new URLSearchParams({...v.key,p:String(v.page),autoplay:playing?'1':'0',t:String(Math.max(0,Math.min(86400,Math.floor(Number(seconds)||0)))),danmaku:'1',poster:'1'});return 'https://player.bilibili.com/player.html?'+params;}
