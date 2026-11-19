import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import pilot from '../../../server/content-translations/2026-11-19-glorious-light.json';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.invalid/admin' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event'])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
const folder = path.resolve('node_modules/.cache/content-review-tests'); mkdirSync(folder, { recursive: true });
const outfile = path.join(folder, 'review.mjs');
await build({
  stdin: { contents: `export {ContentTranslationReview} from '@/components/ContentTranslationReview'; export {setReviewFixture} from '@/lib/queryClient';`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, outfile, format: 'esm', platform: 'node', jsx: 'automatic', tsconfig: 'tsconfig.json',
  external: ['react', 'react/*', 'react-dom', 'react-dom/*', '@tanstack/react-query'],
  plugins: [{ name: 'fixture-api', setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/queryClient$/ }, () => ({ path: 'fixture', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `let data;export const setReviewFixture=value=>data=value;export const apiRequest=async()=>({json:async()=>data});`, loader: 'js' }));
  } }],
});
const screen = await import(pathToFileURL(outfile).href);
const { createRoot } = await import('react-dom/client');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');

test('private review switches actual draft language, preserves Scripture and renders draft text safely', async () => {
  const fixture: any = { ...pilot, sourceMatches: false, sourceAvailable: true, publicAvailability: 'not-published' };
  fixture.drafts[0].title = '<img src=x onerror=alert(1)>';
  screen.setReviewFixture([fixture]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(screen.ContentTranslationReview))));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.ok(container.textContent?.includes('The English source has changed'));
    assert.ok(container.textContent?.includes('<img src=x onerror=alert(1)>'));
    assert.equal(container.querySelector('img'), null);
    assert.equal(container.querySelector('button'), null, 'no action can publish a draft');
    const select = container.querySelector('select')!;
    assert.equal(select.options.length, 5);
    await act(async () => { select.value = 'fr'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.ok(container.textContent?.includes('Lumière glorieuse'));
    assert.ok(container.textContent?.includes(pilot.drafts[1].content));
    assert.equal(container.querySelector('blockquote')?.textContent, pilot.source.scriptureText);
    assert.ok(container.textContent?.includes('Language review pending'));
  } finally {
    await act(async () => root.unmount()); client.clear(); container.remove();
  }
});
after(() => dom.window.close());
