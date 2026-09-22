import { clamp, motion, smoothstep } from '../webgl/store';

// Native scrolling owns position on every device. The world consumes a cached
// map only when position/layout changes, never a permanent DOM frame loop.
let anchors: { at: number; chapter: number; el: HTMLElement }[] = [];
let quietAt = Infinity;
let maxScroll = 1;
let refresh = () => {};

function measure() {
  const y = scrollY, height = innerHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
  anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-world]')).map(el => {
    const rect = el.getBoundingClientRect();
    return { at: rect.top + y + rect.height / 2 - height / 2, chapter: Number(el.dataset.world || 0), el };
  }).sort((a, b) => a.at - b.at);
  const quiet = document.querySelector<HTMLElement>('[data-quiet]');
  quietAt = quiet ? quiet.getBoundingClientRect().top + y : Infinity;
}
function chapterAt(y: number) {
  if (!anchors.length) return 0;
  if (y <= anchors[0].at) return anchors[0].chapter;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (y > b.at) continue;
    const t = b.at === a.at ? 0 : (y - a.at) / (b.at - a.at);
    return a.chapter + (b.chapter - a.chapter) * t * t * (3 - 2 * t);
  }
  return anchors.at(-1)!.chapter;
}
function update(y: number) {
  motion.scroll = y / maxScroll;
  motion.chapter = chapterAt(y);
  motion.calm = Number.isFinite(quietAt) ? smoothstep(quietAt - innerHeight * 1.15, quietAt - innerHeight * .25, y) : 0;
  document.documentElement.classList.toggle('world-quiet', motion.calm > .6);
  let best = -1, distance = Infinity;
  anchors.forEach((anchor, index) => {
    if (!anchor.el.dataset.project) return;
    const delta = Math.abs(anchor.at - y);
    if (delta < distance) { distance = delta; best = index; }
  });
  const next = distance < innerHeight * .62 ? best : -1;
  if (next !== motion.focus) {
    if (motion.focus >= 0) anchors[motion.focus]?.el.removeAttribute('data-in-focus');
    motion.focus = next;
    if (next >= 0) anchors[next].el.setAttribute('data-in-focus', '');
  }
}
export function initScroll() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)');
  let frame = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = true, disposed = false, previous = scrollY;
  const preferences = () => {
    motion.reduced = reduced.matches;
    motion.coarse = touch.matches || innerWidth < 1024;
  };
  const flush = () => {
    frame = 0;
    if (disposed) return;
    if (dirty) { measure(); dirty = false; }
    const y = scrollY;
    motion.velocity = clamp((y - previous) / Math.max(1, innerHeight) * 5.5, -1.4, 1.4);
    previous = y;
    update(y);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(flush); };
  const onScroll = () => {
    schedule();
    clearTimeout(timer);
    timer = setTimeout(() => { motion.velocity = 0; }, 100);
  };
  const onResize = () => { preferences(); dirty = true; schedule(); };
  preferences(); measure(); dirty = false; motion.focus = -1; update(scrollY);
  const observer = new ResizeObserver(() => { dirty = true; schedule(); });
  observer.observe(document.body);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  reduced.addEventListener('change', preferences);
  touch.addEventListener('change', preferences);
  document.fonts?.ready.then(() => { if (!disposed) { dirty = true; schedule(); } });
  refresh = () => { dirty = true; schedule(); };
  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame); clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    reduced.removeEventListener('change', preferences);
    touch.removeEventListener('change', preferences);
    motion.velocity = 0;
    refresh = () => {};
    anchors = [];
  };
}
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth', block: 'start' });
}
export function refreshScroll() { refresh(); }
