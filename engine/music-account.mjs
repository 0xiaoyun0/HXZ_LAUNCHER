import {createHash} from 'node:crypto';
export function musicAccount(host,fetcher=fetch) {
 const profile=user=>({profile:createHash('sha256').update(user.base+'\0'+user.uid).digest('hex').slice(0,32)});
 const cookies=user=>host('music.web.cookies',profile(user));
 return {
  login:user=>host('music.web.login',profile(user)),
  async status(user){const values=await cookies(user);return {loggedIn:values.some(([k,v])=>k==='MUSIC_U'&&!!v)};},
  async logout(user){await host('music.web.logout',profile(user));return {loggedIn:false};},
  async resolve(user,id){
    if(!/^\d{1,24}$/.test(String(id)))throw Error('曲目标识无效');
    const values=await cookies(user);if(!values.some(([k,v])=>k==='MUSIC_U'&&v))return null;
    const cookie=values.filter(([k,v])=>/^(?:MUSIC_U|__csrf|MUSIC_A|NMTID)$/.test(k)&&!/[;\r\n]/.test(v)).map(([k,v])=>k+'='+v).join('; ');
    const response=await fetcher('https://music.163.com/api/song/enhance/player/url',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Cookie:cookie,Referer:'https://music.163.com/'},body:new URLSearchParams({ids:JSON.stringify([String(id)]),br:'320000'})});
    if(!response.ok)throw Error('音乐服务暂时不可用');const song=(await response.json())?.data?.[0];
    if(!song?.url||song.freeTrialInfo)throw Error('此账号没有完整播放该曲目的权限');
    const url=new URL(song.url);if(url.protocol==='http:')url.protocol='https:';
    if(url.protocol!=='https:'||!url.hostname.endsWith('.music.126.net')||url.username||url.password)throw Error('音乐服务返回了无效播放地址');return url.href;
  }
 };
}
