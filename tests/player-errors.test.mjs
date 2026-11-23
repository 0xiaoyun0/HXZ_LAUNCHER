import test from 'node:test';
import assert from 'node:assert/strict';
import {playerError,diagnosticSummary,supportAdvice} from '../packages/engine/core/player-errors.mjs';

test('player can distinguish incorrect credentials, expiry, a skin outage and a local connection problem',()=>{
  for(const [message,op,code,owner] of [
    ['invalid login','account.login','credentials','player'],
    ['登录已过期','skin.status','expired','player'],
    ['authserver refresh HTTP 503','community.connect','skinService','admin-if-repeated'],
    ['fetch failed','skin.status','skinNetwork','player'],
    ['HTTP 503','community.connect','service','admin-if-repeated'],
    ['没有操作权限','community.forum','permission','admin']
  ]) assert.deepEqual([playerError(message,op).code,playerError(message,op).owner],[code,owner]);
});
test('local JVM, mods, files and download failures have distinct recovery actions',()=>{
  for(const [message,area,code,action] of [
    ['Java heap space','game.launch','outOfHeap','memory'],
    ['Could not reserve enough space','game.launch','heap','memory'],
    ['UnsupportedClassVersionError','game.launch','java','java'],
    ['客户端 JAR 不存在','game.launch','gameFiles','preflight'],
    ['Mod resolution failed','game.crash','mod','preflight'],
    ['游戏进程异常退出','game.crash','crash','preflight'],
    ['ENOSPC','install.resume','disk','free-space'],
    ['EBUSY','install.resume','locked','resume'],
    ['EPERM','settings.save','denied','directory'],
    ['checksum mismatch','install.resume','checksum','source'],
    ['HTTP 404','install.resume','missingRemote','source'],
    ['ETIMEDOUT','install.resume','download','source'],
    ['已取消','pack.choose','stopped','resume']
  ]) assert.deepEqual([playerError(message,area).code,playerError(message,area).action],[code,action]);
});
test('unknown exceptions use operation context and sharing uses only catalogued, non-identifying fields',()=>{
  const privateData='C:\\Users\\private-player\\profile Bearer abcSECRET https://internal.invalid/?token=xyz 192.0.2.1';
  const issue=playerError(Error(privateData),'settings.save');
  assert.equal(issue.title,'设置未能保存');
  assert.equal(issue.owner,'ai');
  const summary=diagnosticSummary({...issue,title:privateData,message:privateData,raw:privateData},'0.10.0','x64');
  assert.match(summary,/0\.10\.0 · x64/);assert.match(summary,/settings\/unknown/);
  assert.doesNotMatch(summary,/private-player|SECRET|internal\.invalid|192\.0\.2|token=|C:\\/);
  assert.equal(diagnosticSummary({code:privateData,area:privateData},privateData,privateData).includes(privateData),false);
  assert.equal(typeof supportAdvice[issue.owner],'string');
});
