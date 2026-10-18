import test from 'node:test';import assert from 'node:assert/strict';import {hubDestination,resolveHubTarget} from './navigation.mjs';
test('existing record links and contextual entries resolve to the same record while the desk retains its own entry',()=>{
 const item='record-123';
 assert.deepEqual(resolveHubTarget('/community/hub?section=project&item='+item),resolveHubTarget(hubDestination('project',item)));
 assert.equal(resolveHubTarget('/community/hub').section,'desk');
 assert.equal(resolveHubTarget('/account/community?section=devices').section,'devices');
 assert.equal(resolveHubTarget('/community/events?section=workbench').section,'event');
 assert.equal(resolveHubTarget('https://outside.invalid/community/hub?section=project'),null);
 assert.equal(resolveHubTarget('/unknown'),null);
});
