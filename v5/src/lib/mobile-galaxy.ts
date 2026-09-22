/** Lightweight mobile enhancement. Native animations do the continuous work;
 * JS responds only to real scroll, preference, visibility and route events. */
import { mobileMotionPaused } from './mobile-motion-preference';
let initialized = false;
export function initMobileGalaxy() {
  const host = document.querySelector<HTMLElement>('[data-mobile-galaxy]');
  const depth = host?.querySelector<HTMLElement>('[data-mobile-galaxy-depth]');
  if (initialized || !host || !depth) return;
  initialized = true;
  const device = matchMedia('(max-width: 1023px), (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  const layers = [...host.querySelectorAll<HTMLElement>('.mobile-galaxy-layer')];
  const animations: Animation[] = [];
  const lifetime = new AbortController();
  let frame = 0;
  let previousDepth = NaN;
  let disposed = false;
  const allowed = () => device.matches && !reduced.matches && !connection?.saveData;
  const sync = () => {
    const eligible = allowed();
    host.toggleAttribute('data-disabled', !eligible);
    if (eligible && !animations.length) {
      for (const [i, layer] of layers.entries()) {
        const sign = i ? 1 : -1;
        const tilt = i ? 16 : -10;
        const animation = layer.animate([
          { transform: `perspective(700px) rotateX(${tilt}deg) rotateZ(0deg)` },
          { transform: `perspective(700px) rotateX(${tilt}deg) rotateZ(${sign * 360}deg)` },
        ], { duration: i ? 64000 : 104000, iterations: Infinity, easing: 'linear' });
        animation.pause();
        animations.push(animation);
      }
    }
    const playing = eligible && !mobileMotionPaused() && !document.hidden && !document.documentElement.classList.contains('world-quiet');
    for (const animation of animations) {
      if (playing && animation.playState !== 'running') animation.play();
      if (!playing && animation.playState === 'running') animation.pause();
    }
    const state = playing ? 'running' : 'paused';
    if (host.dataset.motion !== state) host.dataset.motion = state;
  };
  const moveDepth = () => {
    frame = 0;
    if (!allowed() || mobileMotionPaused() || document.hidden || document.documentElement.classList.contains('world-quiet')) return;
    // A bounded depth response, not smooth-scroll replacement. No layout reads
    // and no inherited CSS variable writes across the document on each frame.
    const offset = Math.round(-Math.min(scrollY * .025, 24) * 100) / 100;
    if (offset === previousDepth) return;
    previousDepth = offset;
    depth.style.transform = `translate3d(-50%, ${offset}px, 0)`;
  };
  const scroll = () => { if (allowed() && !frame) frame = requestAnimationFrame(moveDepth); };
  const root = new MutationObserver(sync);
  root.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  device.addEventListener('change', sync, { signal: lifetime.signal });
  reduced.addEventListener('change', sync, { signal: lifetime.signal });
  connection?.addEventListener('change', sync, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', sync, { signal: lifetime.signal });
  document.addEventListener('mobile-motion-preference', sync, { signal: lifetime.signal });
  document.addEventListener('astro:page-load', () => { sync(); moveDepth(); }, { signal: lifetime.signal });
  window.addEventListener('scroll', scroll, { passive: true, signal: lifetime.signal });
  window.addEventListener('pagehide', event => {
    if (event.persisted) { animations.forEach(animation => animation.pause()); return; }
    disposed = true; lifetime.abort(); root.disconnect(); cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
  }, { signal: lifetime.signal });
  window.addEventListener('pageshow', () => { if (!disposed) sync(); }, { signal: lifetime.signal });
  sync(); moveDepth();
}
