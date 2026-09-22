/** A small decorative rule reveal on desktop. Copy and controls are always
 * visible. No text splitting, font gate or animation dependency is needed. */
export function initReveals(root: ParentNode = document) {
  if (!matchMedia('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return () => {};
  const animations: Animation[] = [];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      animations.push(entry.target.animate([{ transform: 'scaleX(.5)' }, { transform: 'scaleX(1)' }], { duration: 220, easing: 'ease-out' }));
    }
  });
  root.querySelectorAll('.label-rule').forEach(rule => observer.observe(rule));
  return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
}
