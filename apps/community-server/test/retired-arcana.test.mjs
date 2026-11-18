import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/hub.mjs';

test('retired ARCANA routes stay disabled and direct clients to the independent LINKING activity',async t=>{
 const {req}=await fixture(t);
 for(const [path,method,body] of [['/api/arcana/public','GET'],['/api/arcana/unlock','POST',{code:'old-code'}],['/api/admin/arcana','GET'],['/api/admin/arcana','PUT',{enabled:true}]]){
  const value=await req('admin',path,method,body,410);assert.match(value.error,/LINKING/);assert.equal(value.cards,undefined);assert.equal(value.accessCode,undefined);
 }
 const catalog=await req('alice','/api/linking/catalog');assert.ok(Array.isArray(catalog.chapters));
});
