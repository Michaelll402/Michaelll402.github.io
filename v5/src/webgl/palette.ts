import { Color } from "three";
import { FORMATION_COUNT } from "./formations";

/* ============================================================================
   THE GRADE
   ----------------------------------------------------------------------------
   The world is graded, not recoloured. Each chapter owns a two-point ramp — a
   near, lit colour and a far, cooler one — and the chapter uniform blends
   between ramps exactly the way it blends between formations, so light and
   geometry always arrive together.

   Night is the authored grade. Day is a real second grade, not an inversion
   filter: the field becomes luminous and the particles become ink.
   ========================================================================== */

type Ramp = { near: string; far: string };

const NIGHT: Ramp[] = [
  { near: "#dfe6ff", far: "#5766a8" }, // instrument — cold ivory
  { near: "#9db4ff", far: "#2b3f9e" }, // graph      — cobalt
  { near: "#ff9db1", far: "#7a2340" }, // lattice    — rose
  { near: "#8bdcf2", far: "#17708a" }, // grid       — cyan
  { near: "#ffb87a", far: "#a8420c" }, // network    — amber
  { near: "#9df2c6", far: "#1d7f4b" }, // blueprint  — forge green
];

const DAY: Ramp[] = [
  { near: "#2b3350", far: "#8f98c0" },
  { near: "#16309f", far: "#7f92e8" },
  { near: "#8f1130", far: "#e08ba0" },
  { near: "#17708a", far: "#7fc6dc" },
  { near: "#a8420c", far: "#e8a876" },
  { near: "#155f38", far: "#8fd8b2" },
];

/* the ambient volume the sculpture hangs in */
export const FIELD = {
  night: { base: "#04050a", glowA: "#161e42", glowB: "#2a1c2c", strength: 0.62, grain: 0.012 },
  day: { base: "#e9e7e1", glowA: "#ffffff", glowB: "#e2e6f0", strength: 0.4, grain: 0.006 },
};

const toColors = (r: Ramp[]) => r.map((x) => ({ near: new Color(x.near), far: new Color(x.far) }));
const RAMPS = { night: toColors(NIGHT), day: toColors(DAY) };

const tmpNear = new Color();
const tmpFar = new Color();

/** blend the chapter ramps with the same triangular kernel the shader uses */
export function gradeAt(chapter: number, mode: "night" | "day") {
  const ramps = RAMPS[mode];
  tmpNear.setRGB(0, 0, 0);
  tmpFar.setRGB(0, 0, 0);
  for (let i = 0; i < FORMATION_COUNT; i++) {
    const w = Math.max(0, 1 - Math.abs(chapter - i));
    if (w <= 0) continue;
    tmpNear.r += ramps[i].near.r * w;
    tmpNear.g += ramps[i].near.g * w;
    tmpNear.b += ramps[i].near.b * w;
    tmpFar.r += ramps[i].far.r * w;
    tmpFar.g += ramps[i].far.g * w;
    tmpFar.b += ramps[i].far.b * w;
  }
  return { near: tmpNear, far: tmpFar };
}
