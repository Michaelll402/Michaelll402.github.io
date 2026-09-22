/* ============================================================================
   SINGLE SOURCE OF MOTION STATE
   ----------------------------------------------------------------------------
   One plain object, mutated imperatively, read every frame. Nothing here is
   React state: at 60fps React state is a bug, not an architecture.

   Ownership is strict, and this comment is the contract:

     lib/scroll.ts    OWNS  scroll, velocity, chapter, focus
     lib/pointer.ts   OWNS  pointer, pointerVel, coarse
     lib/quality.ts   OWNS  tier, reduced, mode
     useFrame         OWNS  every actual object transform, damped toward the above

   CSS owns static hover states and nothing that any of the above also touches.

   It hangs off globalThis so the Astro page scripts and the React island share
   one instance even if the bundler gives them separate chunks.
   ========================================================================== */

export type Tier = "low" | "medium" | "high";

export interface MotionState {
  /** 0..1 progress through the whole document */
  scroll: number;
  /** signed, clamped, decaying scroll velocity in "screens per second"-ish units */
  velocity: number;
  /** continuous position in the chapter sequence, e.g. 2.4 = 40% from ch2 to ch3 */
  chapter: number;
  /** index of the project currently held in focus, or -1 */
  focus: number;
  /** -1..1 normalised pointer, raw (consumers damp it themselves) */
  pointer: { x: number; y: number };
  /** pointer speed 0..1, clamped */
  pointerVel: number;
  /** true on touch / coarse pointers: no tilt, no magnetism, no custom cursor */
  coarse: boolean;
  /** rendering tier, lowered at runtime by the performance monitor */
  tier: Tier;
  /** prefers-reduced-motion */
  reduced: boolean;
  /** "night" | "day" — the world is graded, not recoloured */
  mode: "night" | "day";
  /** set once the entrance sequence has finished */
  ready: boolean;
  /** 0 = the world performs · 1 = the world withdraws so prose can be read */
  calm: number;
  /** ms timestamp of the last page swap; the world hurries for a moment after */
  swappedAt: number;
  /** ms timestamp of the last "open a project" gesture; the camera dives on it */
  diveAt: number;
}

const KEY = "__mt_motion_v4__";

function create(): MotionState {
  return {
    scroll: 0,
    velocity: 0,
    chapter: 0,
    focus: -1,
    pointer: { x: 0, y: 0 },
    pointerVel: 0,
    coarse: false,
    tier: "high",
    reduced: false,
    mode: "night",
    ready: false,
    calm: 0,
    swappedAt: 0,
    diveAt: 0,
  };
}

const g = globalThis as unknown as Record<string, MotionState | undefined>;
export const motion: MotionState = (g[KEY] ??= create())!;

/** frame-rate independent damping — the only smoothing primitive in the project */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 ramp with smooth ends */
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
