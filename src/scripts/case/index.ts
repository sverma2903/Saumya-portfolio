/**
 * scripts/case/index.ts · WP5. The one module a case page loads (rendered after the article, never between blocks):
 * citations/landing (cite.ts), the Levels instrument + section marks (levels.ts) and Plan view (planview.ts).
 * WP7: sizes.ts, the chapters' real heights learned in idle time (content-visibility placeholders).
 */
import { initCite } from './cite';
import { initLevels } from './levels';
import { initPlanview } from './planview';
import { initSizes } from './sizes';

// polish r1: the Decision schedule is a closed disclosure on screen; paper gets it open (and closed again after)
const disc = document.querySelector<HTMLDetailsElement>('[data-decisions-disc]');
if (disc) {
  let was = false;
  addEventListener('beforeprint', () => { was = disc.open; disc.open = true; });
  addEventListener('afterprint', () => { disc.open = was; });
}

initCite();
initPlanview();
initLevels();
initSizes();
