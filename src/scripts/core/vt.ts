/**
 * vt.ts · WP1. SM3 "Cut to sheet" — the script half of the native cross-document View Transitions
 * (styles/transitions.css holds the choreography). Loaded on every page by core/boot.ts.
 *
 *  - pageswap (old document, always reached: it fires on the loaded page the reader is leaving): Motion off →
 *    skipTransition(), so reduced-motion readers never see a cut, whatever the new page does.
 *  - pagereveal (new document): Motion off → skip; else mark html[data-vt] + [data-vt-dir] for the transition's
 *    lifetime. This module is deferred and may run after `pagereveal` (it fires before the first render): that is
 *    fine, because transitions.css derives the direction from html[data-page] and shows the cut line through
 *    :active-view-transition. Nothing waits on the transition; the new page is interactive immediately.
 */
type WithVT = Event & { viewTransition?: ViewTransition | null };

const root = document.documentElement;
const motionOff = () => root.dataset.motion === 'reduce';

addEventListener('pageswap', (e) => {
  const vt = (e as WithVT).viewTransition;
  if (vt && motionOff()) vt.skipTransition();
});

addEventListener('pagereveal', (e) => {
  const vt = (e as WithVT).viewTransition;
  if (!vt) return;
  if (motionOff()) { vt.skipTransition(); return; }
  root.dataset.vt = 'cut';
  root.dataset.vtDir = root.dataset.page === 'home' ? 'back' : 'forward';
  const done = () => { delete root.dataset.vt; delete root.dataset.vtDir; };
  vt.finished.then(done, done);
});

export {};
