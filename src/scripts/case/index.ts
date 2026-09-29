/**
 * scripts/case/index.ts · WP5. The one module a case page loads (rendered after the article, never between blocks):
 * citations/landing (cite.ts), the Levels instrument + section marks (levels.ts) and Plan view (planview.ts).
 * WP7: sizes.ts, the chapters' real heights learned in idle time (content-visibility placeholders).
 */
import { initCite } from './cite';
import { initLevels } from './levels';
import { initPlanview } from './planview';
import { initSizes } from './sizes';

initCite();
initPlanview();
initLevels();
initSizes();
