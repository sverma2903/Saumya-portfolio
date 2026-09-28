import { gsap } from 'gsap';

/** The DATA · DESIGN · NERDS crossword from the original site, made tactile. */
export function mountTiles() {
  const wrap = document.querySelector<HTMLElement>('[data-tiles]');
  if (!wrap) return;
  const grid = wrap.querySelector<HTMLElement>('.tiles')!;
  const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  gsap.set(tiles, { transformPerspective: 800 });
  gsap.from(tiles, {
    rotateX: -110,
    y: -30,
    opacity: 0,
    duration: 1.1,
    ease: 'expo.out',
    delay: 0.35,
    stagger: { each: 0.035, from: 'random' },
  });

  // tilt the whole board toward the pointer
  const host = wrap.closest('section') ?? document.body;
  const qx = gsap.quickTo(grid, 'rotateY', { duration: 1, ease: 'power3.out' });
  const qy = gsap.quickTo(grid, 'rotateX', { duration: 1, ease: 'power3.out' });
  host.addEventListener('pointermove', (e) => {
    const r = wrap.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    qx(dx * 22);
    qy(-dy * 22);
  });
  host.addEventListener('pointerleave', () => {
    qx(0);
    qy(0);
  });

  // flip a tile on hover, then settle back
  const flip = (t: HTMLElement) => {
    if (t.dataset.busy) return;
    t.dataset.busy = '1';
    gsap
      .timeline({ onComplete: () => delete t.dataset.busy })
      .to(t, { rotateY: 180, z: 30, duration: 0.6, ease: 'power3.out' })
      .to(t, { rotateY: 360, z: 0, duration: 0.8, ease: 'power3.inOut', delay: 1.1 })
      .set(t, { rotateY: 0 });
  };
  tiles.forEach((t) => t.addEventListener('pointerenter', () => flip(t)));

  // click to scramble the board and let it re-assemble
  let scrambling = false;
  grid.addEventListener('click', () => {
    if (scrambling) return;
    scrambling = true;
    const tl = gsap.timeline({ onComplete: () => (scrambling = false) });
    tl.to(tiles, {
      x: () => gsap.utils.random(-260, 260),
      y: () => gsap.utils.random(-220, 220),
      z: () => gsap.utils.random(-200, 260),
      rotateZ: () => gsap.utils.random(-180, 180),
      rotateX: () => gsap.utils.random(-120, 120),
      duration: 0.9,
      ease: 'expo.out',
      stagger: { each: 0.01, from: 'center' },
    }).to(tiles, {
      x: 0,
      y: 0,
      z: 0,
      rotateZ: 0,
      rotateX: 0,
      duration: 1.4,
      ease: 'elastic.out(1, 0.6)',
      stagger: { each: 0.018, from: 'random' },
    });
  });

  // idle life: a random tile turns over every few seconds
  const idle = () => {
    if (document.visibilityState === 'visible' && !scrambling) flip(tiles[Math.floor(Math.random() * tiles.length)]);
    setTimeout(idle, gsap.utils.random(1800, 3600));
  };
  setTimeout(idle, 3000);
}
