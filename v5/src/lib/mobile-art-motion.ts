/** A small native-animation layer for the existing SVG artwork, not the demos.
 * The static SVG is complete before JS. Only the selected, visible illustration
 * runs. No frame callbacks, pointer tracking, graphics library or scroll loop. */
import { mobileMotionPaused } from './mobile-motion-preference';
type Connection = EventTarget & { saveData?: boolean };
type Artwork = {
  svg: SVGSVGElement;
  preview: Element | null;
  visible: boolean;
  animations: Animation[];
};

// Matches --ease-out-expo; apply per segment so coordinated events keep time.
const EASE = "cubic-bezier(.16,1,.3,1)";

/** Precompute position + tangent once from the artwork's real path. Native
 * transform keyframes then own playback; no JS geometry work during scrolling. */
function travel(path: SVGPathElement, slowsAtCorner = false): Keyframe[] {
  const length = path.getTotalLength();
  return Array.from({ length: 65 }, (_, i) => {
    const fraction = i / 64;
    const distance = fraction * length;
    const position = path.getPointAtLength(distance);
    const before = path.getPointAtLength(Math.max(0, distance - 1));
    const after = path.getPointAtLength(Math.min(length, distance + 1));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    // The Simi corner covers roughly .52–.80 of the actual L-route length.
    const progress = slowsAtCorner
      ? fraction < .52 ? fraction / .52 * .38
        : fraction < .8 ? .38 + (fraction - .52) / .28 * .38
          : .76 + (fraction - .8) / .2 * .24
      : fraction;
    return {
      offset: progress,
      transform: `translate(${position.x.toFixed(2)}px,${position.y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`,
      opacity: i === 0 || i === 64 ? 0 : 1,
    };
  });
}

function createMotion(svg: SVGSVGElement): Animation[] {
  const animations: Animation[] = [];
  const add = (selector: string, keyframes: Keyframe[], duration: number, easing = "linear") => {
    svg.querySelectorAll<SVGElement>(selector).forEach(element => {
      const animation = element.animate(keyframes.map(frame => ({ ...frame, easing })), {
        duration, iterations: Infinity, easing: "linear",
      });
      animation.pause();
      animation.currentTime = 0;
      animations.push(animation);
    });
  };
  svg.setAttribute("data-mobile-motion", "");

  switch (svg.dataset.mobileArt) {
    case "support":
      add(".pulse-in", [
        { offset: 0, transform: "translate(190px,225px)", opacity: 0 },
        { offset: .03, transform: "translate(193px,225px)", opacity: 1 },
        { offset: .22, transform: "translate(290px,225px)", opacity: 1 },
        { offset: .25, transform: "translate(290px,225px)", opacity: 0 },
        { offset: 1, transform: "translate(290px,225px)", opacity: 0 },
      ], 5200);
      add(".agent-msg", [
        { offset: 0, opacity: .28 }, { offset: .28, opacity: .28 },
        { offset: .4, opacity: .95 }, { offset: .78, opacity: .95 },
        { offset: 1, opacity: .28 },
      ], 5200, EASE);
      add(".waves", [
        { offset: 0, opacity: .4 }, { offset: .43, opacity: .4 },
        { offset: .54, opacity: 1 }, { offset: .7, opacity: .4 },
        { offset: 1, opacity: .4 },
      ], 5200);
      break;
    case "vision":
      add(".beam", [
        { offset: 0, transform: "translateY(62px)", opacity: .85 },
        { offset: .45, transform: "translateY(366px)", opacity: .85 },
        { offset: .52, transform: "translateY(366px)", opacity: 0 },
        { offset: .94, transform: "translateY(62px)", opacity: 0 },
        { offset: 1, transform: "translateY(62px)", opacity: .85 },
      ], 6000);
      add(".state-scanning", [
        { offset: 0, opacity: 1 }, { offset: .44, opacity: 1 },
        { offset: .46, opacity: 0 }, { offset: .95, opacity: 0 },
        { offset: 1, opacity: 1 },
      ], 6000);
      add(".state-match", [
        { offset: 0, opacity: 0 }, { offset: .45, opacity: 0 },
        { offset: .47, opacity: 1 }, { offset: .94, opacity: 1 },
        { offset: .96, opacity: 0 }, { offset: 1, opacity: 0 },
      ], 6000);
      add(".write-row", [
        { offset: 0, opacity: .32 }, { offset: .46, opacity: .32 },
        { offset: .58, opacity: 1 }, { offset: .93, opacity: 1 },
        { offset: 1, opacity: .32 },
      ], 6000);
      break;
    case "simiutopia": {
      const path = svg.querySelector<SVGPathElement>(".route");
      if (path) add(".vehicle-rig", travel(path, true), 8500);
      add(".speed-fast", [
        { offset: 0, opacity: 1 }, { offset: .37, opacity: 1 },
        { offset: .38, opacity: 0 }, { offset: .76, opacity: 0 },
        { offset: .77, opacity: 1 }, { offset: 1, opacity: 1 },
      ], 8500);
      add(".speed-slow", [
        { offset: 0, opacity: 0 }, { offset: .37, opacity: 0 },
        { offset: .38, opacity: 1 }, { offset: .76, opacity: 1 },
        { offset: .77, opacity: 0 }, { offset: 1, opacity: 0 },
      ], 8500);
      break;
    }
    case "subways": {
      const path = svg.querySelector<SVGPathElement>("path.m4");
      if (path) add(".train", travel(path), 8500);
      add(".crossing-ping", [
        { offset: 0, opacity: .25 }, { offset: .24, opacity: .25 },
        { offset: .34, opacity: 1 }, { offset: .53, opacity: 1 },
        { offset: .63, opacity: .25 }, { offset: 1, opacity: .25 },
      ], 8500);
      break;
    }
    case "classforge":
      add(".edge-suggest", [
        { offset: 0, transform: "scaleX(.15)", opacity: .25 },
        { offset: .26, transform: "scaleX(1)", opacity: 1 },
        { offset: .86, transform: "scaleX(1)", opacity: 1 },
        { offset: 1, transform: "scaleX(.15)", opacity: .25 },
      ], 5600, EASE);
      add(".chip", [
        { offset: 0, transform: "translateY(3px)", opacity: .4 },
        { offset: .2, transform: "translateY(3px)", opacity: .4 },
        { offset: .32, transform: "translateY(0)", opacity: 1 },
        { offset: .85, transform: "translateY(0)", opacity: 1 },
        { offset: 1, transform: "translateY(3px)", opacity: .4 },
      ], 5600, EASE);
      break;
  }
  return animations;
}

export function initMobileArtMotion(root: ParentNode = document): () => void {
  const compact = matchMedia("(max-width: 1023px), (pointer: coarse), (hover: none)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  const artworks: Artwork[] = Array.from(root.querySelectorAll<SVGSVGElement>("svg[data-mobile-art]")).map(svg => ({
    svg, preview: svg.closest(".work-art"), visible: false, animations: [],
  }));
  if (!artworks.length) return () => {};
  let disposed = false;
  let scrolling = false;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  const clear = (art: Artwork) => {
    art.animations.forEach(animation => animation.cancel());
    art.animations = [];
    art.svg.removeAttribute("data-mobile-motion");
  };
  const sync = () => {
    if (disposed) return;
    const enabled = compact.matches && !reduced.matches && !connection?.saveData;
    artworks.forEach(art => {
      if (!enabled) { clear(art); return; }
      const active = art.visible && !scrolling && !mobileMotionPaused() && !document.hidden && (!art.preview || art.preview.classList.contains("is-live"));
      if (active && !art.animations.length) art.animations = createMotion(art.svg);
      art.animations.forEach(animation => {
        if (active && animation.playState !== "running") animation.play();
        else if (!active && animation.playState === "running") animation.pause();
      });
    });
  };
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const art = artworks.find(candidate => candidate.svg === entry.target);
      if (art) art.visible = entry.isIntersecting && entry.intersectionRatio >= .12;
    });
    sync();
  }, { threshold: [0, .12] });
  artworks.forEach(art => intersection.observe(art.svg));
  const selection = new MutationObserver(sync);
  artworks.forEach(art => { if (art.preview) selection.observe(art.preview, { attributes: true, attributeFilter: ["class"] }); });
  compact.addEventListener("change", sync);
  reduced.addEventListener("change", sync);
  connection?.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("mobile-motion-preference", sync);
  // SVG descendant animation can repaint even without a JS frame loop.
  // Yield to native scrolling, then continue from the same scene position.
  const onScroll = () => {
    if (!compact.matches || reduced.matches || connection?.saveData || mobileMotionPaused()) return;
    if (!scrolling) { scrolling = true; sync(); }
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { scrolling = false; sync(); }, 160);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    disposed = true;
    clearTimeout(resumeTimer);
    window.removeEventListener('scroll', onScroll);
    intersection.disconnect();
    selection.disconnect();
    compact.removeEventListener("change", sync);
    reduced.removeEventListener("change", sync);
    connection?.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    document.removeEventListener("mobile-motion-preference", sync);
    artworks.forEach(clear);
  };
}
