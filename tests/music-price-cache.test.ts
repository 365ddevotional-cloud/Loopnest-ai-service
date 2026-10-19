import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const handlers: Record<string, Function> = {};
  const removed: string[] = [];
  const stored = [
    '/api/music-commerce/catalog',
    '/api/music-commerce/catalog?country=GB',
    '/api/user/download-access',
    '/api/songs/library',
  ].map(path => new Request(`https://365dailydevotional.com${path}`));
  const cache = { keys: async () => stored, delete: async (r: Request) => { removed.push(new URL(r.url).pathname); return true; } };
  vm.runInNewContext(readFileSync('client/public/service-worker.js', 'utf8'), {
    self: { location: { origin: 'https://365dailydevotional.com' }, clients: { claim() {} }, addEventListener: (name: string, fn: Function) => { handlers[name] = fn; } },
    caches: { keys: async () => ['365dd-api-v5'], open: async () => cache }, URL,
  });
  return { handlers, removed };
}

test('music prices and purchases always bypass the offline response cache', () => {
  const { handlers } = worker();
  for (const path of ['/api/music-commerce/catalog', '/api/music-commerce/catalog?localPriceVersion=2', '/api/music-commerce/purchases', '/api/user/download-access']) {
    let intercepted = false;
    handlers.fetch({ request: new Request(`https://365dailydevotional.com${path}`), respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
});

test('worker upgrade purges saved country prices without removing the music library', async () => {
  const { handlers, removed } = worker();
  const pending: Promise<unknown>[] = [];
  handlers.activate({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
  await Promise.all(pending);
  assert.equal(removed.filter(p => p === '/api/music-commerce/catalog').length, 2);
  assert.ok(removed.includes('/api/user/download-access'));
  assert.ok(!removed.includes('/api/songs/library'));
});
