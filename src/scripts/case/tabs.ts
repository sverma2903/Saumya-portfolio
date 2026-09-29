/**
 * tabs.ts · WP4a. CAD layout tabs for a `tabs` block (Educademy personas), the WAI-ARIA tabs pattern:
 *  - role=tablist / tab / tabpanel, aria-selected, aria-controls, aria-labelledby; roving tabindex
 *  - ← → move and select (automatic activation: the swap is instant), Home / End; Tab leaves the list into the panel
 *    (the tablist precedes the panels in the DOM; CSS draws it along the sheet's bottom edge)
 *  - inactive panels are `hidden`; a panel's image loads on selection, or earlier on hover / focus of its tab
 * Keyboard-initiated changes never animate (nothing here animates at all). Without JS every panel is shown, stacked,
 * with her label as its heading (CSS in Tabs.astro), and print always shows every panel.
 */
function setup(el: HTMLElement): void {
  const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(el.querySelectorAll<HTMLElement>('[data-panel]'));
  const n = Math.min(tabs.length, panels.length);
  if (!n) return;

  const warm = (i: number) => {
    for (const img of panels[i].querySelectorAll('img')) if (img.loading === 'lazy') img.loading = 'eager';
  };
  const select = (i: number, focus: boolean) => {
    for (let j = 0; j < n; j++) {
      const on = j === i;
      tabs[j].setAttribute('aria-selected', String(on));
      tabs[j].tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    }
    warm(i);
    if (focus) tabs[i].focus();
  };

  for (let i = 0; i < n; i++) {
    const p = panels[i];
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', tabs[i].id);
    // the panel is a tab stop only when nothing inside it is (APG: else Tab lands on its first control, e.g. Enlarge)
    if (!p.querySelector('a[href], button, input, select, textarea, [tabindex]')) p.tabIndex = 0;
    tabs[i].addEventListener('click', () => select(i, false));
    tabs[i].addEventListener('pointerenter', () => warm(i), { passive: true });
    tabs[i].addEventListener('focus', () => warm(i));
    tabs[i].addEventListener('keydown', (e) => {
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j < 0) return;
      e.preventDefault();
      select(j, true);
    });
  }
  const start = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  select(start, false);
  el.classList.add('is-ready');
}

export function initTabs(root: ParentNode = document): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-tabs]:not(.is-ready)'))) setup(el);
}
