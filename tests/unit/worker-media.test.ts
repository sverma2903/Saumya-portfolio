/**
 * worker/media.js (polish r1): byte ranges for the local MP4s, whatever the asset layer answers.
 */
import { describe, expect, test } from 'vitest';
import worker, { parseRange } from '../../worker/media.js';

const FILE = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 251));
/** an asset layer without range support (wrangler dev's): 200 + the whole file, with or without Content-Length */
const assets = (withLength: boolean) => ({
  fetch: async (req: Request) => {
    void req; // it ignores Range, like wrangler dev's asset worker
    const h = new Headers({ 'Content-Type': 'video/mp4', ETag: '"e1"', 'Cache-Control': 'public, max-age=31536000, immutable' });
    if (withLength) h.set('Content-Length', String(FILE.byteLength));
    return new Response(FILE.slice(), { status: 200, headers: h });
  },
});
const get = (range?: string, extra: Record<string, string> = {}, method = 'GET') =>
  new Request('https://x.test/media/a.mp4', { method, headers: { ...(range ? { Range: range } : {}), ...extra } });

describe('parseRange', () => {
  test.each([
    ['bytes=0-1', { start: 0, end: 1 }], ['bytes=10-', { start: 10, end: 999 }], ['bytes=-100', { start: 900, end: 999 }],
    ['bytes=990-5000', { start: 990, end: 999 }], ['bytes=1000-', 'unsatisfiable'], ['bytes=-0', 'unsatisfiable'],
    ['bytes=5-2', 'unsatisfiable'], ['bytes=0-1,5-6', null], ['items=0-1', null], [null, null],
  ] as const)('%s', (h, want) => expect(parseRange(h, 1000)).toEqual(want));
});

describe.each([true, false])('asset layer sends Content-Length: %s', (withLength) => {
  const env = { ASSETS: assets(withLength) };
  test('a range gets 206 with exactly its bytes', async () => {
    const res = await worker.fetch(get('bytes=100-199'), env);
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 100-199/1000');
    expect(res.headers.get('Content-Length')).toBe('100');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(FILE.slice(100, 200));
  });
  test('HEAD with a range: 206, no body', async () => {
    const res = await worker.fetch(get('bytes=0-1', {}, 'HEAD'), env);
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-1/1000');
  });
  test('unsatisfiable → 416', async () => {
    const res = await worker.fetch(get('bytes=5000-'), env);
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe('bytes */1000');
  });
  test('no range, or a stale If-Range → the whole file', async () => {
    for (const req of [get(), get('bytes=0-1', { 'If-Range': '"old"' })]) {
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect((await res.arrayBuffer()).byteLength).toBe(1000);
    }
  });
});

test('an asset layer that already answers 206 passes through', async () => {
  const partial = new Response('ab', { status: 206, headers: { 'Content-Range': 'bytes 0-1/1000' } });
  const res = await worker.fetch(get('bytes=0-1'), { ASSETS: { fetch: async () => partial } });
  expect(res).toBe(partial);
});
