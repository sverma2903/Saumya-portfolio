import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { mountFields } from './field';
import { mountTiles } from './tiles';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
root.classList.remove('no-js');
root.classList.add('app-ready');
if (reduced) root.classList.add('reduced');

/* ------------------------------------------------------------ smooth scroll */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
    else el.scrollIntoView();
    history.replaceState(null, '', `#${id}`);
  });
});
if (location.hash && lenis) {
  const el = document.getElementById(location.hash.slice(1));
  if (el) setTimeout(() => lenis!.scrollTo(el, { offset: -80, immediate: true }), 50);
}

/* ------------------------------------------------------------ webgl + tiles */
mountFields();
mountTiles();

const heroCanvas = document.querySelector<HTMLCanvasElement & { field?: { setFade(v: number): void } }>('.hero canvas[data-field]');
if (heroCanvas?.field) {
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    onUpdate: (s) => heroCanvas.field!.setFade(s.progress * 0.85),
  });
}

/* ------------------------------------------------------------ nav theme + hide */
const nav = document.querySelector<HTMLElement>('.nav');
const darkZones = [...document.querySelectorAll<HTMLElement>('[data-nav="dark"]')];
let lastY = scrollY;
const updateNav = () => {
  if (!nav) return;
  const y = 36;
  const dark = darkZones.some((z) => {
    const r = z.getBoundingClientRect();
    return r.top <= y && r.bottom >= y;
  });
  nav.dataset.theme = dark ? 'dark' : 'light';
  const cur = scrollY;
  if (nav.hasAttribute('data-autohide')) nav.classList.toggle('is-hidden', cur > 400 && cur > lastY + 2);
  if (cur < lastY - 2 || cur < 400) nav.classList.remove('is-hidden');
  lastY = cur;
};
addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ------------------------------------------------------------ text splits */
const splitReveal = (el: HTMLElement, delay = 0, immediate = false) => {
  const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
  gsap.set(el, { opacity: 1 });
  const tween = {
    yPercent: 110,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.08,
    delay,
  };
  if (immediate) gsap.from(split.lines, tween);
  else gsap.from(split.lines, { ...tween, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
};

document.fonts.ready.then(() => {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    splitReveal(el, Number(el.dataset.delay ?? 0), el.hasAttribute('data-immediate'));
  });
  ScrollTrigger.refresh();
});

/* ------------------------------------------------------------ reveals */
if (!reduced) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });

  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amt = Number(el.dataset.parallax) || 0.12;
    gsap.fromTo(
      el,
      { yPercent: -amt * 50 },
      {
        yPercent: amt * 50,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  // hairlines draw themselves
  document.querySelectorAll<HTMLElement>('.chapter .rule').forEach((el) => {
    gsap.from(el, { scaleX: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  // case cover unmask
  const cover = document.querySelector<HTMLElement>('.case-cover');
  if (cover) {
    gsap.fromTo(
      cover,
      { clipPath: 'inset(12% 6% 0% 6% round 36px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 36px)', duration: 1.6, ease: 'expo.out', delay: 0.2 },
    );
    const imgs = cover.querySelectorAll('img');
    gsap.to(imgs[0], {
      yPercent: 8,
      scale: 1.08,
      ease: 'none',
      scrollTrigger: { trigger: cover, start: 'top top+=80', end: 'bottom top', scrub: true },
    });
    if (imgs[1]) {
      gsap.to(imgs[1], { yPercent: -6, ease: 'none', scrollTrigger: { trigger: cover, start: 'top top+=80', end: 'bottom top', scrub: true } });
    }
  }
}

/* ------------------------------------------------------------ counting stats */
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
counters.forEach((el) => {
  const original = el.textContent ?? '';
  const match = original.match(/\d[\d,]*(\.\d+)?/);
  if (!match || reduced) return;
  const target = parseFloat(match[0].replace(/,/g, ''));
  const decimals = match[1] ? match[1].length - 1 : 0;
  const commas = match[0].includes(',');
  const fmt = (n: number) => {
    const s = n.toFixed(decimals);
    return commas ? Number(s).toLocaleString('en-US') : s;
  };
  const obj = { n: 0 };
  el.textContent = original.replace(match[0], fmt(0));
  gsap.to(obj, {
    n: target,
    duration: 1.8,
    ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    onUpdate: () => (el.textContent = original.replace(match[0], fmt(obj.n))),
    onComplete: () => (el.textContent = original),
  });
});

/* ------------------------------------------------------------ project stack */
const cards = gsap.utils.toArray<HTMLElement>('.pcard');
if (!reduced && innerWidth > 900) {
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    const shade = card.querySelector('.pcard-shade');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=120', scrub: true },
    });
    tl.to(card, { scale: 0.9, yPercent: -2, ease: 'none' }, 0);
    if (shade) tl.to(shade, { opacity: 0.45, ease: 'none' }, 0);
  });
}

/* ------------------------------------------------------------ quests rail */
const rail = document.querySelector<HTMLElement>('.rail');
if (rail && !reduced) {
  const section = rail.closest('section')!;
  gsap.fromTo(
    rail,
    { x: () => innerWidth * 0.15 },
    {
      x: () => -(rail.scrollWidth - innerWidth * 0.85),
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
    },
  );
}

/* ------------------------------------------------------------ case study rail */
const sections = [...document.querySelectorAll<HTMLElement>('.content > section[id]')];
const railLinks = new Map([...document.querySelectorAll<HTMLAnchorElement>('.rail-nav a')].map((a) => [a.hash.slice(1), a]));
const progressBar = document.querySelector<HTMLElement>('.progress');
const railFill = document.querySelector<HTMLElement>('.rail-fill');
if (sections.length) {
  sections.forEach((s) => {
    ScrollTrigger.create({
      trigger: s,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (st) => {
        if (!st.isActive) return;
        railLinks.forEach((a) => a.classList.remove('is-active'));
        railLinks.get(s.id)?.classList.add('is-active');
      },
    });
  });
  const content = document.querySelector('.content');
  ScrollTrigger.create({
    trigger: content,
    start: 'top 60%',
    end: 'bottom bottom',
    onUpdate: (s) => {
      progressBar?.style.setProperty('--p', s.progress.toFixed(4));
      railFill?.style.setProperty('--p', s.progress.toFixed(4));
    },
  });
}

/* ------------------------------------------------------------ videos: play only in view */
const vids = document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]');
const vio = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        v.play().catch(() => {});
      } else v.pause();
    }),
  { rootMargin: '200px 0px' },
);
vids.forEach((v) => vio.observe(v));

/* ------------------------------------------------------------ tabs */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((box) => {
  const tabs = [...box.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...box.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const select = (i: number) => {
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j));
      t.tabIndex = i === j ? 0 : -1;
    });
    panels.forEach((p, j) => (p.hidden = i !== j));
    if (!reduced) gsap.fromTo(panels[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') tabs[(i + 1) % tabs.length].focus(), select((i + 1) % tabs.length);
      if (e.key === 'ArrowLeft') tabs[(i - 1 + tabs.length) % tabs.length].focus(), select((i - 1 + tabs.length) % tabs.length);
    });
  });
});

/* ------------------------------------------------------------ lightbox */
const zoomables = [...document.querySelectorAll<HTMLElement>('[data-zoom]')];
if (zoomables.length) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image viewer');
  box.innerHTML = `<div class="lb-stage"></div><div class="lightbox-bar"><button class="prev" aria-label="Previous">←</button><span class="count mono"></span><button class="next" aria-label="Next">→</button><button class="close" aria-label="Close">✕</button></div>`;
  document.body.appendChild(box);
  const stage = box.querySelector<HTMLElement>('.lb-stage')!;
  const count = box.querySelector<HTMLElement>('.count')!;
  let idx = 0;
  let lastFocus: HTMLElement | null = null;
  const show = (i: number) => {
    idx = (i + zoomables.length) % zoomables.length;
    const src = zoomables[idx].dataset.zoom!;
    const isVid = src.endsWith('.mp4');
    stage.innerHTML = isVid
      ? `<video src="${src}" autoplay muted loop playsinline controls></video>`
      : `<img src="${src}" alt="${zoomables[idx].querySelector('img')?.alt ?? ''}">`;
    count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(zoomables.length).padStart(2, '0')}`;
    if (!reduced) gsap.fromTo(stage.firstElementChild, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' });
  };
  const open = (i: number) => {
    lastFocus = document.activeElement as HTMLElement;
    show(i);
    box.classList.add('is-open');
    lenis?.stop();
    box.querySelector<HTMLButtonElement>('.close')!.focus();
  };
  const close = () => {
    box.classList.remove('is-open');
    lenis?.start();
    setTimeout(() => (stage.innerHTML = ''), 400);
    lastFocus?.focus();
  };
  zoomables.forEach((z, i) => {
    z.setAttribute('tabindex', '0');
    z.setAttribute('role', 'button');
    z.setAttribute('aria-label', 'Open image in viewer');
    z.addEventListener('click', () => open(i));
    z.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });
  box.querySelector('.close')!.addEventListener('click', close);
  box.querySelector('.prev')!.addEventListener('click', () => show(idx - 1));
  box.querySelector('.next')!.addEventListener('click', () => show(idx + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target === stage) close();
  });
  addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
}

/* ------------------------------------------------------------ cursor */
if (finePointer && !reduced) {
  root.classList.add('has-cursor');
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<div class="cursor-ring"><span class="cursor-label"></span></div><div class="cursor-dot"></div>';
  document.body.appendChild(cur);
  const ring = cur.querySelector<HTMLElement>('.cursor-ring')!;
  const dot = cur.querySelector<HTMLElement>('.cursor-dot')!;
  const label = cur.querySelector<HTMLElement>('.cursor-label')!;
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  let shown = false;
  addEventListener('pointermove', (e) => {
    if (!shown) {
      shown = true;
      gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
      gsap.to(cur, { opacity: 1, duration: 0.4 });
    }
    rx(e.clientX);
    ry(e.clientY);
    dx(e.clientX);
    dy(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const labelled = t.closest<HTMLElement>('[data-cursor]');
    const link = t.closest('a, button, [role="button"], summary');
    cur.classList.toggle('has-label', !!labelled);
    cur.classList.toggle('is-link', !!link && !labelled);
    if (labelled) label.textContent = labelled.dataset.cursor!;
  });
  document.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
  document.addEventListener('pointerenter', () => gsap.to(cur, { opacity: 1, duration: 0.3 }));
}

/* ------------------------------------------------------------ magnetic */
if (finePointer && !reduced) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * 0.3);
      qy((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener('pointerleave', () => {
      qx(0);
      qy(0);
    });
  });
}

/* ------------------------------------------------------------ local time (Washington, D.C.) */
const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 20_000);
}

/* keep ScrollTrigger in sync with late-loading media */
addEventListener('load', () => ScrollTrigger.refresh());
