/**
 * clock.ts · WP1. The end sheet's LOCAL TIME (SPEC §4.3): Washington, D.C. time
 * (Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })), updated on the
 * minute boundary and ONLY while the element is visible (no timers run for an off-screen footer).
 */
import { idle } from './dom';
import { onVisibility } from './io';

// WP7: made on first use, not at module load. The first time-zone formatter loads the ICU zone data (≈ 35–45 ms on a
// 4× throttled CPU, on every page, for a footer nobody sees at load), so it now happens in idle time or on sight.
let fmt: Intl.DateTimeFormat | null = null;
let iso: Intl.DateTimeFormat | null = null;

/** "9:42 AM" in Washington, D.C. */
export const dcTime = (d = new Date()): string =>
  (fmt ??= new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })).format(d);

/** Machine-readable local time for <time datetime> ("2026-09-28T09:42"). */
function dcDatetime(d: Date): string {
  iso ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(iso.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Keep `el` showing the D.C. time while it is visible. Returns a stop function. */
export function startClock(el: HTMLTimeElement): () => void {
  let timer = 0;
  const paint = () => {
    const now = new Date();
    el.textContent = dcTime(now);
    el.dateTime = dcDatetime(now);
  };
  const schedule = () => {
    window.clearTimeout(timer);
    const now = Date.now();
    const toNextMinute = 60000 - (now % 60000) + 20; // land just after the boundary
    timer = window.setTimeout(() => { paint(); schedule(); }, toNextMinute);
  };
  // off-screen at load (the end sheet): the time is filled in idle time, so it is there to see and to print
  idle(paint, 2000);
  const off = onVisibility(el, (on) => {
    if (on) { paint(); schedule(); }
    else window.clearTimeout(timer);
  });
  return () => { off(); window.clearTimeout(timer); };
}
