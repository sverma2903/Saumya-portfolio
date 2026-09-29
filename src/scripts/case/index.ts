/**
 * scripts/case/index.ts · WP5. The one module a case page loads (rendered after the article, never between blocks):
 * citations/landing (cite.ts), the Levels instrument + section marks (levels.ts) and Plan view (planview.ts).
 */
import { initCite } from './cite';
import { initLevels } from './levels';
import { initPlanview } from './planview';

initCite();
initPlanview();
initLevels();
