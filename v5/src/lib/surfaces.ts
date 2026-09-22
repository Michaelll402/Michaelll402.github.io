import { clamp, damp, motion } from "../webgl/store";
import { onFrame } from "./clock";

/* ============================================================================
   PHYSICAL SURFACES
   ----------------------------------------------------------------------------
   Card tilt, magnetic controls, the glass specular and the cursor all run in
   ONE rAF loop over a registry of elements. Not one loop each: a portfolio with
   fourteen requestAnimationFrame loops is a portfolio that drops frames.

   Every value is a target that gets damped. Nothing snaps, nothing overshoots,
   nothing is bound directly to the cursor. On a coarse pointer none of this
   runs at all — it registers no listeners and starts no loop.
   ========================================================================== */

interface Surface {
  el: HTMLElement;
  kind: "tilt" | "magnet";
  /* current */ rx: number; ry: number; tx: number; ty: number; hi: number;
  /* target  */ trx: number; try_: number; ttx: number; tty: number; thi: number;
  /* cached page-space rect, refreshed on resize and scroll-idle only */
  cx: number; cy: number; w: number; h: number;
  hover: boolean;
}

const surfaces: Surface[] = [];
let stopClock: (() => void) | null = null;
let cursor: HTMLElement | null = null;
const cur = { x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1 };

function rect(s: Surface) {
  const r = s.el.getBoundingClientRect();
  s.cx = r.left + r.width / 2;
  s.cy = r.top + r.height / 2;
  s.w = Math.max(1, r.width);
  s.h = Math.max(1, r.height);
}

function frame(dt: number) {
  let moving = false;
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    // damping is stiffer on the way in than on the way out: arriving should feel
    // immediate, leaving should feel like the object settling back
    const k = s.hover ? 9 : 5;
    if (Math.abs(s.rx - s.trx) + Math.abs(s.ry - s.try_) + Math.abs(s.tx - s.ttx) + Math.abs(s.ty - s.tty) + Math.abs(s.hi - s.thi) > .005) moving = true;
    s.rx = damp(s.rx, s.trx, k, dt);
    s.ry = damp(s.ry, s.try_, k, dt);
    s.tx = damp(s.tx, s.ttx, k, dt);
    s.ty = damp(s.ty, s.tty, k, dt);
    s.hi = damp(s.hi, s.thi, 7, dt);

    if (Math.abs(s.rx) + Math.abs(s.ry) + Math.abs(s.tx) + Math.abs(s.ty) < 0.0008 && s.hi < 0.002) {
      s.el.style.transform = "";
      s.el.style.removeProperty("--hi");
      continue;
    }

    if (s.kind === "tilt") {
      s.el.style.transform =
        `perspective(1100px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg) ` +
        `translate3d(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px, 0)`;
    } else {
      s.el.style.transform = `translate3d(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px, 0)`;
    }
    s.el.style.setProperty("--hi", s.hi.toFixed(3));
  }

  if (cursor) {
    if (Math.abs(cur.x - cur.tx) + Math.abs(cur.y - cur.ty) + Math.abs(cur.s - cur.ts) > .05) moving = true;
    cur.x = damp(cur.x, cur.tx, 22, dt);
    cur.y = damp(cur.y, cur.ty, 22, dt);
    cur.s = damp(cur.s, cur.ts, 12, dt);
    cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${cur.s.toFixed(3)})`;
  }
  if (!moving) { stopClock?.(); stopClock = null; }
}

function wake() { if (!stopClock) stopClock = onFrame(frame); }

function onPointerMove(e: PointerEvent) {
  cur.tx = e.clientX;
  cur.ty = e.clientY;
  wake();
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    if (!s.hover) continue;
    const dx = (e.clientX - s.cx) / (s.w / 2);
    const dy = (e.clientY - s.cy) / (s.h / 2);
    if (s.kind === "tilt") {
      // tasteful maximum: 6 degrees. Anything more and it reads as a gimmick.
      s.try_ = clamp(dx, -1, 1) * 6;
      s.trx = clamp(-dy, -1, 1) * 4.5;
      s.ttx = clamp(dx, -1, 1) * 5;
      s.tty = clamp(dy, -1, 1) * 4;
      s.el.style.setProperty("--mx", `${((e.clientX - s.cx) / s.w + 0.5) * 100}%`);
      s.el.style.setProperty("--my", `${((e.clientY - s.cy) / s.h + 0.5) * 100}%`);
    } else {
      const reach = 0.32;
      s.ttx = clamp(dx, -1.4, 1.4) * s.w * reach * 0.4;
      s.tty = clamp(dy, -1.4, 1.4) * s.h * reach * 0.6;
      s.el.style.setProperty("--mx", `${((e.clientX - s.cx) / s.w + 0.5) * 100}%`);
      s.el.style.setProperty("--my", `${((e.clientY - s.cy) / s.h + 0.5) * 100}%`);
    }
  }
}

function attach(el: HTMLElement, kind: Surface["kind"]) {
  const s: Surface = {
    el, kind,
    rx: 0, ry: 0, tx: 0, ty: 0, hi: 0,
    trx: 0, try_: 0, ttx: 0, tty: 0, thi: 0,
    cx: 0, cy: 0, w: 1, h: 1, hover: false,
  };
  surfaces.push(s);
  el.addEventListener("pointerenter", () => {
    rect(s);
    s.hover = true;
    s.thi = 1;
    wake();
  });
  el.addEventListener("pointerleave", () => {
    s.hover = false;
    s.trx = 0; s.try_ = 0; s.ttx = 0; s.tty = 0; s.thi = 0;
    wake();
  });
  // keyboard users get the same affordance, without the pointer maths
  el.addEventListener("focusin", () => { s.thi = 1; wake(); });
  el.addEventListener("focusout", () => { s.thi = 0; wake(); });
}

export function initSurfaces(root: ParentNode = document) {
  // no tilt, no magnetism, no custom cursor on touch — and no listeners either
  if (motion.coarse || motion.reduced) return () => {};

  root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => attach(el, "tilt"));
  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => attach(el, "magnet"));

  const pageCursor = document.querySelector<HTMLElement>("[data-cursor]");
  cursor = pageCursor;
  const hot = "a, button, [data-tilt], [role='button'], input, textarea";
  const onOver = (e: PointerEvent) => {
    const t = (e.target as HTMLElement | null)?.closest?.(hot);
    cur.ts = t ? 2.6 : 1;
    wake();
    if (pageCursor) pageCursor.dataset.state = t ? (t.matches("[data-tilt]") ? "read" : "link") : "idle";
  };
  const onDown = () => { cur.ts *= 0.82; wake(); };
  if (cursor) {
    document.documentElement.classList.add("has-cursor");
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", onDown);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  const remeasure = () => surfaces.forEach(rect);
  window.addEventListener("resize", remeasure, { passive: true });

  wake();

  return () => {
    stopClock?.();
    stopClock = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", remeasure);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerdown", onDown);
    document.documentElement.classList.remove("has-cursor");
    cursor = null;
    surfaces.length = 0;
  };
}
