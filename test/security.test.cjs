const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../server.js');
const { readConfig } = require('../server/config.cjs');

test('missing or dummy environment cannot start the backend', () => {
  assert.throws(() => readConfig({}), /Configure local environment variables/);
  assert.throws(() => readConfig({ DB_HOST: '127.0.0.1', DB_USER: 'replace-me', DB_PASSWORD: 'replace-me', DB_NAME: 'playloop_demo', FIREBASE_PROJECT_ID: 'demo-playloop' }), /DB_PASSWORD/);
});

test('API authorization uses verified identity rather than submitted UID', async (t) => {
  const calls = [];
  const connection = { query(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    calls.push({ sql, params });
    callback(null, sql.startsWith('SELECT') ? [{ f_username: 'Demo user' }] : { insertId: 1, affectedRows: 1 });
  } };
  const app = createApp({ connection, config: { corsOrigin: 'http://localhost:5173' }, verifyIdToken: async (token) => {
    if (token !== 'test-valid-token') throw new Error('invalid token');
    return { uid: 'test-owner', email: 'demo@example.invalid' };
  } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (path, options) => fetch(base + path, options);
  const headers = { Authorization: 'Bearer test-valid-token', 'Content-Type': 'application/json' };

  for (const path of ['/api/my-products', '/api/my-purchase', '/api/my-favorites', '/api/MY-PURCHASE/']) {
    assert.equal((await send(path + '?uid=test-other')).status, 401);
  }
  assert.equal((await send('/api/users/test-other', { method: 'PUT', headers, body: JSON.stringify({ username: 'Demo' }) })).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await send('/api/users/test-owner', { method: 'PUT', headers: { Authorization: 'Bearer test-invalid-token' } })).status, 401);
  assert.equal((await send('/api/users/test-owner', { method: 'PUT', headers, body: JSON.stringify({ username: 'Demo', uid: 'test-other' }) })).status, 200);
  assert.deepEqual(calls.at(-1).params, ['Demo', 'test-owner']);

  await send('/api/register', { method: 'POST', headers, body: JSON.stringify({ username: 'Demo', uid: 'test-other', email: 'other@example.invalid' }) });
  assert.deepEqual(calls.at(-1).params, ['test-owner', 'Demo', 'demo@example.invalid']);
  await send('/api/my-purchase?uid=test-other', { headers });
  assert.deepEqual(calls.at(-1).params, ['test-owner']);
  assert.deepEqual(await (await send('/api/users/test-owner')).json(), { f_username: 'Demo user' });

  const product = new FormData();
  product.set('uid', 'test-other');
  product.set('productName', 'Demo product');
  product.set('price', '100');
  assert.equal((await send('/api/products', { method: 'POST', headers: { Authorization: headers.Authorization }, body: product })).status, 200);
  assert.equal(calls.at(-1).params[0], 'test-owner');
  assert.equal(calls.at(-1).params.length, 11);
  const before = calls.length;
  assert.equal((await send('/api/products', { method: 'POST', body: product })).status, 401);
  assert.equal(calls.length, before);
});
