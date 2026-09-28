/**
 * boot.ts · P0. The one module Base.astro loads on every page (deferred, deduped by Astro).
 * Initialises prefs (theme-color, cross-tab sync) and pulls in the page-wide WP1 modules.
 * Other packages load their own modules from their own components' <script> tags.
 */
import { initPrefs } from './prefs';
import './vt';

initPrefs();
