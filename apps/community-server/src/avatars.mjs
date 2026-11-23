import {createHash} from 'node:crypto';
export function avatarData(value) {
  if(value==='')return {bytes:Buffer.alloc(0),version:''};
  if(typeof value!=='string'||value.length>24576||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value))throw Error('头像必须为小于 24 KB 的 PNG 数据');
  const bytes=Buffer.from(value.slice(22),'base64');
  if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.subarray(12,16).toString()!=='IHDR')throw Error('头像 PNG 无效');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(!width||!height||width>256||height>256)throw Error('头像尺寸不能超过 256 像素');
  return {bytes,version:createHash('sha256').update(bytes).digest('hex').slice(0,24)};
}
