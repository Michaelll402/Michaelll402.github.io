import { motion } from '../webgl/store';

/** Native-scroll progress: cached geometry and one update per actual event.
 * Neither a page at rest nor a hidden progress rail owns an animation loop. */
export function initPlayhead() {
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  if (!chapters.length) return () => {};
  const ticks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-tick]'));
  const rail = document.querySelector<HTMLElement>('[data-playhead-rail]');
  const list = rail?.querySelector('ul');
  const dot = document.querySelector<HTMLElement>('[data-rail-dot]');
  const current = document.querySelector<HTMLElement>('[data-bar-current]');
  const name = document.querySelector<HTMLElement>('[data-bar-name]');
  const progress = document.querySelector<HTMLElement>('[data-bar-progress]');
  let positions: { top: number; bottom: number }[] = [];
  let frame = 0, focusFrame = 0, dirty = true, disposed = false, active = '';
  const update = () => {
    frame = 0;
    if (disposed) return;
    const y = scrollY;
    if (dirty) {
      positions = chapters.map(chapter => { const r = chapter.getBoundingClientRect(); return { top: r.top + y, bottom: r.bottom + y }; });
      dirty = false;
    }
    let index = 0;
    positions.forEach((position, i) => { if (position.top <= y + innerHeight * .4) index = i; });
    const chapter = chapters[index];
    const number = chapter.dataset.chapter ?? '01';
    if (number !== active) {
      active = number;
      ticks.forEach(tick => tick.toggleAttribute('aria-current', tick.dataset.tick === number));
      // aria-current requires a useful token, not an empty boolean attribute.
      ticks.find(tick => tick.dataset.tick === number)?.setAttribute('aria-current', 'true');
      if (current) current.textContent = number;
      if (name) name.textContent = chapter.dataset.chapterName ?? '';
      const tick = ticks.find(tick => tick.dataset.tick === number);
      if (dot && tick) dot.style.transform = `translate3d(0,${tick.offsetTop + tick.offsetHeight / 2}px,0)`;
    }
    const first = positions[0], last = positions.at(-1)!;
    const amount = Math.max(0, Math.min(1, (y + innerHeight * .6 - first.top) / Math.max(1, last.bottom - first.top)));
    if (list) list.style.setProperty('--rail-progress', amount.toFixed(4));
    if (progress) progress.style.transform = `scaleX(${amount})`;
    if (rail) { const visible = last.bottom - y >= innerHeight * .55; rail.style.opacity = visible ? '1' : '0'; rail.style.pointerEvents = visible ? '' : 'none'; }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resized = () => { dirty = true; schedule(); };
  const controller = new AbortController();
  for (const tick of ticks) tick.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = tick.hash.slice(1), target = document.getElementById(id);
    if (!target) return;
    // Focus is the only enhancement. Let Astro/the browser own the anchor and
    // its history state; pushing null here breaks later route Back/Forward.
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      if (!disposed && location.hash === tick.hash) target.querySelector<HTMLElement>('.chapter-title')?.focus({ preventScroll: true });
    });
  }, { signal: controller.signal });
  if (dot && !motion.reduced) dot.style.transition = 'transform 150ms ease-out';
  const observer = new ResizeObserver(resized); observer.observe(document.body);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resized, { passive: true });
  update();
  return () => { disposed = true; controller.abort(); observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(focusFrame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resized); };
}
