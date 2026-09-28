/**
 * core/io.ts pooling under a fake IntersectionObserver: every subscriber to a shared element gets
 * that element's current state, including subscribers added after the initial entry was delivered.
 */
import { describe, expect, test } from 'vitest';

type Entry = { target: object; isIntersecting: boolean; intersectionRatio: number };
const observers: FakeIO[] = [];
class FakeIO {
  targets = new Set<object>();
  constructor(public cb: (e: Entry[]) => void, public opts: unknown) { observers.push(this); }
  observe(el: object) { this.targets.add(el); queueMicrotask(() => this.targets.has(el) && this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }])); }
  unobserve(el: object) { this.targets.delete(el); }
  fire(el: object, vis: boolean) { if (this.targets.has(el)) this.cb([{ target: el, isIntersecting: vis, intersectionRatio: vis ? 1 : 0 }]); }
}
Object.assign(globalThis, { IntersectionObserver: FakeIO });
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('io pooling', async () => {
  const io = await import('../../src/scripts/core/io');

  test('two subscribers, same options, same visible element: both called', async () => {
    const el = {}; const log: string[] = [];
    io.whenVisible(el as Element, () => log.push('a'));
    io.whenVisible(el as Element, () => log.push('b'));
    await tick();
    expect(log.sort()).toEqual(['a', 'b']);
  });

  test('a late subscriber to an already-observed element gets its current state once', async () => {
    const el = {}; const log: string[] = [];
    io.onVisibility(el as Element, (v) => log.push('first:' + v));
    await tick();
    io.onVisibility(el as Element, (v) => log.push('late:' + v));
    io.whenVisible(el as Element, () => log.push('once'), 0);
    await tick();
    expect(log).toEqual(['first:true', 'late:true', 'once']);
    const pool = observers.find((o) => o.targets.has(el))!;
    pool.fire(el, false);
    expect(log.slice(3)).toEqual(['first:false', 'late:false']);
  });

  test('an unsubscribed callback gets no replay', async () => {
    const el = {}; const log: string[] = [];
    io.onVisibility(el as Element, () => log.push('keep'));
    await tick();
    const off = io.onVisibility(el as Element, () => log.push('gone'));
    off();
    await tick();
    expect(log).toEqual(['keep']);
  });
});
