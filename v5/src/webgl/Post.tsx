import { useEffect, useMemo, useRef, useState } from "react";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer } from "@react-three/postprocessing";

/* @react-three/postprocessing generates this component's props as
   `Partial<Props | undefined>`, which collapses to accepting nothing but
   `offset`. Every other field errors at the call site even though the pass
   reads all of them, so they are passed as one checked object. */
type ChromaticAberrationExtras = {
  radialModulation: boolean;
  modulationOffset: number;
  blendFunction: BlendFunction;
};
import { BlendFunction, type EffectComposer as Composer } from "postprocessing";
import { Vector2 } from "three";
import { clamp, damp, motion, type Tier } from "./store";

/* ============================================================================
   POSTPROCESSING
   ----------------------------------------------------------------------------
   Two effects, both earned:

   Bloom      the particles carry a hot white core specifically so bloom has
              something real to catch. Threshold is high enough that the field
              and the type never glow.

   Chromatic  aberration is animated from zero. At rest it is literally off; it
              opens only while the sculpture is between two formations, which is
              the one moment the brief allows it. It is never a global RGB
              smear across the page.

   Depth of field is deliberately absent: project text must never go soft.
   ========================================================================== */

export function Post({ tier }: { tier: Tier }) {
  const invalidate = useThree(state => state.invalidate);
  const offset = useMemo(() => new Vector2(0, 0), []);
  const amount = useRef(0);
  const composer = useRef<Composer | null>(null);
  const [night, setNight] = useState(motion.mode === 'night');
  useEffect(() => {
    const sync = () => setNight(document.documentElement.dataset.mode !== 'day');
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const host = document.querySelector<HTMLElement>('[data-world-root]');
    let active = true;
    if (!night) { if (host) host.dataset.postReady = 'true'; return; }
    if (host) delete host.dataset.postReady;
    const stop = addAfterEffect(() => {
      if (composer.current && composer.current.passes.length > 1 && host?.dataset.postReady !== 'true') {
        host!.dataset.postReady = 'true';
        // addAfterEffect runs after R3F has computed whether to sleep. Request
        // the next demand frame after that loop finishes, not inside its tail.
        queueMicrotask(() => { if (active) invalidate(); });
      }
    });
    return () => { active = false; stop(); if (host) delete host.dataset.postReady; };
  }, [night, invalidate]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 30);
    const frac = motion.chapter - Math.floor(motion.chapter);
    const between = 1 - Math.abs(frac * 2 - 1);
    const want = motion.reduced ? 0 : between * between * clamp(1, 0, 1);
    amount.current = damp(amount.current, want, 5, d);
    offset.set(amount.current * 0.0016, amount.current * 0.0011);
  });

  if (tier === "low" || !night) return null;

  return (
    <EffectComposer ref={composer} enableNormalPass={false} multisampling={0}>
      <Bloom
        intensity={tier === "high" ? 0.85 : 0.6}
        luminanceThreshold={0.32}
        luminanceSmoothing={0.5}
        mipmapBlur
        radius={0.72}
      />
      {/* radialModulation makes the fringing stronger toward the frame edge,
          the way a real lens behaves — which is the only reason this effect is
          allowed here at all. */}
      <ChromaticAberration
        offset={offset}
        {...({
          radialModulation: true,
          modulationOffset: 0.35,
          blendFunction: BlendFunction.NORMAL,
        } satisfies ChromaticAberrationExtras)}
      />
    </EffectComposer>
  );
}
