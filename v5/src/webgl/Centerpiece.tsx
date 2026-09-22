import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  ShaderMaterial,
} from "three";
import { buildFilaments, buildFormations } from "./formations";
import {
  CENTERPIECE_FRAG,
  CENTERPIECE_VERT,
  FILAMENT_FRAG,
  FILAMENT_VERT,
} from "./shaders/centerpiece";
import { gradeAt } from "./palette";
import { clamp, damp, motion, type Tier } from "./store";

/* Fewer, larger particles read better than more, smaller ones: a dot under
   about two physical pixels is grey haze, not structure. Size is in pixels at
   one world unit from the camera and is rescaled every frame for the viewport
   height and the device pixel ratio, so the sculpture carries the same weight
   on a laptop and on a 4K display. */
export const DENSITY: Record<Tier, { points: number; lines: number; size: number }> = {
  high: { points: 22000, lines: 800, size: 30 },
  medium: { points: 11000, lines: 520, size: 34 },
  low: { points: 4800, lines: 280, size: 40 },
};

/**
 * The sculpture: one THREE.Points holding every formation at once, one
 * LineSegments holding every set of filaments, and nothing else.
 *
 * The geometry is allocated once, at the density the device was first judged
 * capable of. When the performance monitor lowers the tier nothing is rebuilt —
 * the draw range shrinks and the particles grow. Rebuilding 22,000 points
 * because the frame rate dipped is how a quality ladder becomes a stutter loop.
 *
 * The materials are constructed here rather than declared as JSX so that this
 * component owns the exact uniform objects it writes to every frame.
 */
export function Centerpiece({ baseTier }: { baseTier: Tier }) {
  const group = useRef<Group>(null);
  const max = DENSITY[baseTier];

  const built = useMemo(() => {
    const { targets, rnd } = buildFormations(max.points);
    const pointGeo = new BufferGeometry();
    // `position` is required by three but unused: the shader builds the position
    pointGeo.setAttribute("position", new BufferAttribute(targets[0], 3));
    targets.forEach((t, i) => pointGeo.setAttribute(`aT${i}`, new BufferAttribute(t, 3)));
    pointGeo.setAttribute("aRnd", new BufferAttribute(rnd, 3));
    pointGeo.computeBoundingSphere();

    const fil = buildFilaments(max.lines);
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new BufferAttribute(fil[0], 3));
    fil.forEach((t, i) => lineGeo.setAttribute(`aT${i}`, new BufferAttribute(t, 3)));
    lineGeo.computeBoundingSphere();

    const grade = gradeAt(motion.chapter, motion.mode);
    const uniforms = {
      uTime: { value: 0 },
      uChapter: { value: motion.chapter },
      uTurb: { value: 0 },
      uReveal: { value: 1 },
      uSize: { value: max.size },
      uDpr: { value: 1 },
      uPointer: { value: { x: 0, y: 0 } },
      uPointerAmp: { value: 0 },
      uVelocity: { value: 0 },
      uNear: { value: grade.near.clone() },
      uFar: { value: grade.far.clone() },
      uCore: { value: new Color(motion.mode === "day" ? "#0d0d14" : "#ffffff") },
      uOpacity: { value: 1 },
    };
    const lineUniforms = {
      uTime: { value: 0 },
      uChapter: { value: motion.chapter },
      uReveal: { value: 1 },
      uColor: { value: grade.near.clone() },
      uOpacity: { value: 0 },
    };

    const pointMat = new ShaderMaterial({
      vertexShader: CENTERPIECE_VERT,
      fragmentShader: CENTERPIECE_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: motion.mode === "day" ? NormalBlending : AdditiveBlending,
    });
    const lineMat = new ShaderMaterial({
      vertexShader: FILAMENT_VERT,
      fragmentShader: FILAMENT_FRAG,
      uniforms: lineUniforms,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    return { pointGeo, lineGeo, pointMat, lineMat, uniforms, lineUniforms };
  }, [max.points, max.lines, max.size]);

  useEffect(
    () => () => {
      built.pointGeo.dispose();
      built.lineGeo.dispose();
      built.pointMat.dispose();
      built.lineMat.dispose();
    },
    [built]
  );

  /* damped mirrors of the store, so the sculpture lags the page slightly */
  const s = useRef({
    chapter: motion.chapter, px: 0, py: 0, vel: 0,
    reveal: 1, spin: 0, calm: motion.calm,
    tier: baseTier,
    mode: motion.mode as string,
  });
  const CORE_NIGHT = useMemo(() => new Color("#ffffff"), []);
  const CORE_DAY = useMemo(() => new Color("#0d0d14"), []);
  const frameMarks = useRef({ first: false, ready: false });
  const onRendered = useCallback(() => {
    // Three calls this after submitting the points. The browser harness still
    // checks pixels: shader state alone cannot prove a presented frame.
    if (!frameMarks.current.first && built.uniforms.uReveal.value > 0.05) {
      frameMarks.current.first = true;
      performance.mark("world:first-meaningful-frame-submitted");
    }
    if (!frameMarks.current.ready && built.uniforms.uReveal.value >= 0.9) {
      frameMarks.current.ready = true;
      performance.mark("world:visual-ready");
    }
  }, [built]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 30);
    const st = s.current;
    const { uniforms, lineUniforms, pointGeo, lineGeo } = built;

    /* Additive light on a white page is invisible: adding to 1.0 stays 1.0.
       The day grade therefore composites normally and its particles are ink,
       with the hot core resolving toward black instead of white. This is the
       one place the two grades are genuinely different code. */
    const modeChanged = st.mode !== motion.mode;
    if (modeChanged) {
      st.mode = motion.mode;
      const day = st.mode === "day";
      built.pointMat.blending = day ? NormalBlending : AdditiveBlending;
      built.pointMat.needsUpdate = true;
      uniforms.uCore.value.copy(day ? CORE_DAY : CORE_NIGHT);
    }

    // the quality ladder: draw fewer of the same particles, a little larger
    if (st.tier !== motion.tier) {
      st.tier = motion.tier;
      pointGeo.setDrawRange(0, Math.min(max.points, DENSITY[st.tier].points));
      lineGeo.setDrawRange(0, Math.min(max.lines, DENSITY[st.tier].lines) * 2);
    }

    /* Normally the sculpture arrives at a new chapter a beat after the words —
       that lag is the point when you are scrolling. Across a NAVIGATION it is a
       defect: the page is fully rendered in the next project's colour while the
       world is still holding the previous project's diagram for about a second.
       So for a moment after a swap it hurries to catch up. */
    const sinceSwap = motion.swappedAt ? performance.now() - motion.swappedAt : Infinity;
    const chase = sinceSwap < 1100 ? 9 : 3.4;
    st.chapter = motion.reduced ? motion.chapter : damp(st.chapter, motion.chapter, chase, d);
    st.px = motion.reduced ? 0 : damp(st.px, motion.pointer.x, 4.2, d);
    st.py = motion.reduced ? 0 : damp(st.py, motion.pointer.y, 4.2, d);
    st.vel = damp(st.vel, clamp(motion.velocity, -1, 1), 6, d);
    st.reveal = 1;
    st.calm = motion.reduced ? motion.calm : damp(st.calm, motion.calm, 2.2, d);

    // turbulence peaks exactly halfway between two formations
    const frac = st.chapter - Math.floor(st.chapter);
    const between = 1 - Math.abs(frac * 2 - 1);
    const turb = between * between * (motion.reduced ? 0.25 : 1) + Math.abs(st.vel) * 0.12;

    const t = state.clock.elapsedTime;
    if (!motion.reduced) uniforms.uTime.value = t;
    uniforms.uChapter.value = st.chapter;
    uniforms.uTurb.value = turb;
    uniforms.uReveal.value = st.reveal;
    uniforms.uVelocity.value = st.vel;
    uniforms.uPointer.value.x = st.px;
    uniforms.uPointer.value.y = st.py;
    uniforms.uPointerAmp.value = motion.coarse || motion.reduced ? 0 : 0.5;
    /* On a phone the sculpture and the words share the same rectangle — there
       is no margin to move it into. So it becomes a much fainter atmosphere
       rather than a foreground object: still alive, never in the way. */
    const narrow = state.size.width < 900 ? 0.42 : 1;
    /* Ink on paper does not accumulate the way light does: where additive
       blending lets a thousand faint dots build into a structure, normal
       blending needs each dot to carry its own weight. The day grade therefore
       runs the particles roughly twice as opaque to read at the same density. */
    const ink = st.mode === "day" ? 2.0 : 1;
    uniforms.uOpacity.value = (1 - st.calm * 0.86) * narrow * ink;
    uniforms.uSize.value = DENSITY[st.tier].size * (state.size.height / 900);
    uniforms.uDpr.value = Math.min(2, state.viewport.dpr || 1);

    const grade = gradeAt(st.chapter, motion.mode);
    const k = motion.reduced || modeChanged ? 1 : 1 - Math.exp(-3 * d);
    uniforms.uNear.value.lerp(grade.near, k);
    uniforms.uFar.value.lerp(grade.far, k);

    lineUniforms.uTime.value = uniforms.uTime.value;
    lineUniforms.uChapter.value = st.chapter;
    lineUniforms.uReveal.value = st.reveal;
    lineUniforms.uColor.value.copy(uniforms.uNear.value);
    // filaments between two different diagrams are nonsense: hide them mid-morph
    lineUniforms.uOpacity.value = (1 - between) * 0.13 * st.reveal * (1 - st.calm);

    // a slow, controlled rotation, plus a little pointer parallax on the group
    if (group.current) {
      // and it slows down as it withdraws, rather than spinning on unwatched
      if (!motion.reduced) st.spin += d * 0.028 * (1 - st.calm * 0.7);
      group.current.rotation.y = st.spin + st.px * 0.22;
      group.current.rotation.x = -st.py * 0.16;
    }
  });

  return (
    <group ref={group}>
      <points geometry={built.pointGeo} material={built.pointMat} frustumCulled={false} onAfterRender={onRendered} />
      <lineSegments geometry={built.lineGeo} material={built.lineMat} frustumCulled={false} />
    </group>
  );
}
