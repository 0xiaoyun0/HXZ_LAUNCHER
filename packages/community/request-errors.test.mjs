import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestFailureMessage,requiresPageReload} from './request-errors.mjs';

test('a transport outage is readable without declaring the whole device offline',()=>{
  const message=requestFailureMessage(new TypeError('Failed to fetch'),{community:true});
  assert.match(message,/暂时无法连接社区/);
  assert.doesNotMatch(message,/本地断网|Failed to fetch/);
  assert.match(requestFailureMessage(new Error('fetch failed')),/暂时无法连接服务/);
});

test('uncertain writes ask users to check results before repeating a purchase or post',()=>{
  for(const error of [new TypeError('Failed to fetch'),Object.assign(new Error('The operation was aborted due to timeout'),{name:'TimeoutError'})]){
    const message=requestFailureMessage(error,{community:true,mutation:true});
    assert.match(message,/结果尚未确认/);
    assert.match(message,/刷新查看/);
  }
});

test('domain errors and explicit cancellation stay distinct from transport failure',()=>{
  assert.equal(requestFailureMessage(new Error('积分不足（HTTP 409）'),{community:true}),'积分不足（HTTP 409）');
  assert.equal(requestFailureMessage({name:'AbortError',message:'aborted'}),'操作已取消');
  assert.match(requestFailureMessage({name:'TimeoutError',message:'timeout'},{community:true}),/社区响应较慢/);
});

test('module-load failures need a fresh page while ordinary render failures do not',()=>{
  assert.equal(requiresPageReload(new TypeError('Failed to fetch dynamically imported module: app.js')),true);
  assert.equal(requiresPageReload(new Error('Loading CSS chunk 4 failed.')),true);
  assert.equal(requiresPageReload(new Error('Cannot read properties of undefined')),false);
  assert.equal(requiresPageReload(new TypeError('Failed to fetch')),false);
});
