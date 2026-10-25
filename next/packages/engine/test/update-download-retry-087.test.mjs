import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAppUpdate} from '../core/app-update.mjs';

test('a cancelled source does not leave the 0.8.7 download attached to a dead promise', async t => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-update-087-'));
  t.after(() => fs.rm(data, {recursive: true, force: true}));
  const app = {isPackaged: true, getVersion: () => '0.8.6', getPath: () => data};
  const sources = [{name: 'slow', prefix: 'slow/'}, {name: 'working', prefix: 'working/'}];
  const updater = new EventEmitter();
  let checks = 0;
  let downloads = 0;
  let pendingReject;
  updater.setFeedURL = () => {};
  updater.checkForUpdates = async () => {
    const token = {cancel: () => pendingReject?.(Error('cancelled'))};
    updater.emit('update-available', {version: '0.8.7'});
    updater._token = token;
    checks++;
    return {cancellationToken: token};
  };
  updater.downloadUpdate = () => {
    downloads++;
    if (downloads === 1) {
      updater.downloadPromise = new Promise((_, reject) => { pendingReject = reject; });
      return updater.downloadPromise;
    }
    updater.emit('update-downloaded', {version: '0.8.7'});
    return Promise.resolve();
  };
  const manager = createAppUpdate({
    app,
    isBusy: () => false,
    emit: () => {},
    updater,
    discover: async () => ({info: {version: '0.8.7'}, sources}),
    stallTimeout: 10
  });
  t.after(() => manager.dispose());
  manager.configure(false);
  await manager.check();
  await manager.download();
  assert.equal(manager.status().ready, true);
  assert.equal(downloads, 2);
  assert.ok(checks >= 2);
});
