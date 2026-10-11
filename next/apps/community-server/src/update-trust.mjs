import {verify,createHash} from 'node:crypto';
export const KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAp3PXBqjaYfiTErfGIzr1rVo7SXX3lkUdWk23w1LmEf8=\n-----END PUBLIC KEY-----\n';
export const ROOT='https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases';
export const SOURCES=['https://gh-proxy.org/','https://gh-proxy.com/','https://ghfast.top/',''];
export function updateManifest(envelope,key=KEY){if(typeof envelope?.payload!=='string'||envelope.payload.length>256000||typeof envelope.signature!=='string'||envelope.signature.length!==88)throw Error('服务更新格式无效');const bytes=Buffer.from(envelope.payload,'base64');if(!verify(null,bytes,key,Buffer.from(envelope.signature,'base64')))throw Error('服务更新签名无效');const v=JSON.parse(bytes);if(v.kind!=='community'||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(v.version)||v.file?.url!==`HXZ-Community-${v.version}-update.zip`||!/^[a-f0-9]{128}$/.test(v.file.sha512)||!Number.isSafeInteger(v.file.size)||v.file.size<=0||v.file.size>256*1024**2||!Number.isInteger(v.minimumNode)||v.minimumNode<24||typeof v.notes!=='string'||v.notes.length>30000)throw Error('服务更新内容无效');return v;}
export const newer=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
export const archiveHash=bytes=>createHash('sha512').update(bytes).digest('hex');
