import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from "astro:transitions/client";

// Astro owns fetching, document swaps, history, scroll and focus. This module
// adds only the optional desktop artwork pairing; it never delays the loader.
const PAIR = "enter-art";
const slugOf = (path: string) => path.match(/^\/work\/([a-z]+)\/?/)?.[1] ?? null;
let wired = false;
let pendingTarget: string | null = null;
let navigationId = 0;

function animateNavigation() {
  return matchMedia("(min-width: 1024px)").matches
    && matchMedia("(pointer: fine)").matches
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearPair() {
  document.querySelectorAll<HTMLElement>(".imm-center, .viewer-stage").forEach((el) => {
    el.style.viewTransitionName = "";
  });
  pendingTarget = null;
}

function pair(source: string, target: string) {
  const el = document.querySelector<HTMLElement>(source);
  if (!el) return;
  if (el.checkVisibility) {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return;
  } else {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < .1) return;
  }
  // A case-study hero hundreds of pixels above the viewport must not fly back
  // into view when a visitor follows a link at the bottom of the page.
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const visibleWidth = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
  const visibleHeight = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  if (visibleWidth < Math.min(r.width, innerWidth) * .4
    || visibleHeight < Math.min(r.height, innerHeight) * .4) return;
  el.style.viewTransitionName = PAIR;
  pendingTarget = target;
}

export function initTransition() {
  // Persistent lifecycle ownership: Base calls this on every page boot. The
  // listeners belong to ClientRouter's lifetime, not to the outgoing body.
  if (wired) return () => {};
  wired = true;

  document.addEventListener("astro:before-preparation", (e: TransitionBeforePreparationEvent) => {
    const id = ++navigationId;
    clearPair();
    if (!animateNavigation()) return;
    const from = slugOf(e.from.pathname);
    const to = slugOf(e.to.pathname);
    if (e.from.pathname === "/" && to) pair(".viewer-stage", ".imm-center");
    else if (from && e.to.pathname === "/") pair(".imm-center", ".viewer-stage");
    e.signal.addEventListener("abort", () => {
      if (id === navigationId) clearPair();
    }, { once: true });
  });

  document.addEventListener("astro:before-swap", (e: TransitionBeforeSwapEvent) => {
    const id = navigationId;
    // skipTransition does not cancel Astro's DOM update. Touch/narrow/reduced
    // visits keep immediate content, history and focus without snapshot motion.
    if (!animateNavigation()) {
      clearPair();
      // The platform rejects `ready` when an animation is deliberately skipped;
      // that expected cancellation must not become an unhandled page error.
      void e.viewTransition.ready.catch(() => {});
      e.viewTransition.skipTransition();
      return;
    }
    if (pendingTarget) {
      const target = e.newDocument.querySelector<HTMLElement>(pendingTarget);
      if (target) target.style.viewTransitionName = PAIR;
      else clearPair();
      pendingTarget = null;
    }
    // Completion owns cleanup, not a timer that can run during a slow or
    // interrupted navigation and accidentally clear the next pairing.
    const settle = () => { if (id === navigationId) clearPair(); };
    void e.viewTransition.finished.then(settle, settle);
  });
  return () => {};
}
