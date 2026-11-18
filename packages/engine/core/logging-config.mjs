import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {inside,noLinks,download} from './io.mjs';
import {knownLogging} from './logging-known.mjs';

// A local console/file configuration keeps diagnostics available if metadata's
// optional logging download is unavailable. No remote appenders or lookups.
const fallback=`<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN"><Appenders>
<Console name="Console" target="SYSTEM_OUT"><PatternLayout pattern="[%d{HH:mm:ss}] [%t/%level]: %msg{nolookups}%n"/></Console>
<RollingRandomAccessFile name="File" fileName="logs/latest.log" filePattern="logs/%d{yyyy-MM-dd}-%i.log.gz"><PatternLayout pattern="[%d{HH:mm:ss}] [%t/%level]: %msg{nolookups}%n"/><Policies><TimeBasedTriggeringPolicy/><OnStartupTriggeringPolicy/></Policies></RollingRandomAccessFile>
</Appenders><Loggers><Root level="info"><AppenderRef ref="Console"/><AppenderRef ref="File"/></Root></Loggers></Configuration>`;
export async function prepareLogging(root,logging,{signal,onLog=()=>{},onProgress=()=>{}}={}){
  if(!logging?.file?.url)return null;
  const file=inside(root,'assets/log_configs/'+logging.file.id);
  onProgress({phase:'准备日志配置',activeFiles:[path.relative(root,file)]});
  try{
    const known=knownLogging[logging.file.sha1];
    if(known&&Buffer.byteLength(known)===logging.file.size){
      await noLinks(file);await fs.mkdir(path.dirname(file),{recursive:true});
      const tmp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,known,'utf8');await fs.rename(tmp,file);}finally{await fs.rm(tmp,{force:true}).catch(()=>{});}
      signal?.throwIfAborted();return logging.argument.replace('${path}',file);
    }
    await download(logging.file.url,file,{sha1:logging.file.sha1,size:logging.file.size,signal,retryBudgetMs:0,connectTimeoutMs:2500});
    return logging.argument.replace('${path}',file);
  }catch(error){
    signal?.throwIfAborted();
    if(['EACCES','EPERM','ENOSPC','EROFS','EISDIR','ENOTDIR'].includes(error.code))throw error;
    if(logging.type!=='log4j2-xml'||!String(logging.argument).startsWith('-Dlog4j.configurationFile='))throw error;
    const target=inside(root,'assets/log_configs/hxz-local-log4j2.xml');await noLinks(target);await fs.mkdir(path.dirname(target),{recursive:true});
    const temporary=target+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temporary,fallback,'utf8');await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
    onLog('[日志配置] 在线配置暂不可用，已使用本机安全配置；游戏日志仍保存到 logs/latest.log。');
    return '-Dlog4j.configurationFile='+target;
  }
}
