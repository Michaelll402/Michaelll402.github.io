import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { Scene } from "./Scene";
import { motion, type Tier } from "./store";

const Post = lazy(() => import("./Post").then((m) => ({ default: m.Post })));
const mark = (name: string) => performance.mark(`world:${name}`);
type FrameLoop = "always" | "demand" | "never";

function showFallback() {
  motion.ready = false;
  document.documentElement.classList.remove("world-ready", "world-presented");
  document.documentElement.classList.add("no-webgl");
}

class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); showFallback(); mark("error"); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** R3F's useFrame runs BEFORE rendering; addAfterEffect runs after it.
 * A submission mark is deliberately not a claim about browser presentation. */
function WorldLifecycle({ onReady, onLost, onRestore }: {
  onReady: () => void;
  onLost: () => void;
  onRestore: () => void;
}) {
  const { gl, scene, camera, clock, get, setFrameloop, invalidate } = useThree();
  const frames = useRef(0);
  useFrame(() => { frames.current += 1; });

  useEffect(() => {
    const canvas = gl.domElement;
    const host = canvas.parentElement!;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const staticViewport = window.matchMedia("(max-width: 1023px), (pointer: coarse), (prefers-reduced-motion: reduce)");
    let lost = false;
    let disposed = false;
    let compiled = false;
    let submitted = false;
    let released = false;
    let presented = false;
    let lastFrame = frames.current;
    let readyFrame = 0;
    let routeFrame = 0;
    motion.ready = true;

    const syncLoop = () => {
      motion.reduced = media.matches;
      // An obscured renderer must not consume every frame while an optional
      // effect/texture download is pending. React changes request the handful
      // of preparation frames; continuous animation starts at visible handoff.
      const next: FrameLoop = document.hidden || lost || !compiled || staticViewport.matches ? "never" : !presented ? "demand" : "always";
      if (get().frameloop !== next) {
        const elapsed = clock.elapsedTime;
        setFrameloop(next);
        clock.elapsedTime = elapsed;
      }
      if (next !== "never") invalidate();
    };
    const refresh = () => {
      cancelAnimationFrame(routeFrame);
      routeFrame = requestAnimationFrame(() => {
        routeFrame = requestAnimationFrame(() => invalidate());
      });
    };
    const onLoss = (event: Event) => {
      event.preventDefault();
      lost = true;
      submitted = false;
      released = false;
      presented = false;
      delete host.dataset.postReady;
      delete host.dataset.lensReady;
      cancelAnimationFrame(readyFrame);
      showFallback();
      mark("context-lost");
      onLost();
      syncLoop();
    };
    const onRestored = () => {
      lost = false;
      compiled = false;
      lastFrame = frames.current;
      motion.ready = true;
      mark("context-restored");
      onRestore();
      syncLoop();
    };
    const stopAfterFrame = addAfterEffect(() => {
      if (lost || document.hidden || staticViewport.matches || frames.current === lastFrame) return;
      lastFrame = frames.current;
      if (gl.getContext().isContextLost() || gl.info.render.calls === 0) return;
      if (!submitted) {
        submitted = true;
        mark("first-render-submitted");
        // Cross a frame boundary after submission before exposing the canvas.
        readyFrame = requestAnimationFrame(() => {
          if (lost || document.hidden) { submitted = false; return; }
          released = true;
          document.documentElement.classList.remove("no-webgl");
          document.documentElement.classList.add("world-ready");
          mark("revealed");
          onReady();
          invalidate();
        });
      }
      // Keep the faithful poster until the matching scene has actually drawn:
      // full formation, its night glow, and the high-tier hero lens if needed.
      const postDone = motion.mode === 'day' || motion.tier === 'low' || host.dataset.postReady === 'true';
      const lensDone = motion.tier !== 'high' || motion.chapter >= .85 || host.dataset.lensReady === 'true';
      if (released && !presented && postDone && lensDone) {
        presented = true;
        document.documentElement.classList.add('world-presented');
        host.dispatchEvent(new Event('world-presented'));
        mark('composition-presented');
        syncLoop();
        queueMicrotask(() => { if (!disposed && !lost) invalidate(); });
      }
    });
    const theme = new MutationObserver(() => {
      motion.mode = document.documentElement.dataset.mode === "day" ? "day" : "night";
      invalidate();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    canvas.addEventListener("webglcontextlost", onLoss);
    canvas.addEventListener("webglcontextrestored", onRestored);
    document.addEventListener("visibilitychange", syncLoop);
    document.addEventListener("astro:page-load", refresh);
    media.addEventListener("change", syncLoop);
    staticViewport.addEventListener("change", syncLoop);
    syncLoop();
    // Compilation/linking can complete on the driver thread. Waiting through
    // KHR_parallel_shader_compile prevents first-use reflection queries from
    // blocking the main thread while the initial poster carries the sculpture.
    mark('shader-prepare-start');
    gl.compileAsync(scene, camera).then(() => {
      if (disposed || lost) return;
      compiled = true;
      mark('shader-prepare-end');
      syncLoop();
    }).catch(() => { if (!disposed) showFallback(); });
    return () => {
      disposed = true;
      stopAfterFrame();
      theme.disconnect();
      cancelAnimationFrame(readyFrame);
      cancelAnimationFrame(routeFrame);
      canvas.removeEventListener("webglcontextlost", onLoss);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", syncLoop);
      document.removeEventListener("astro:page-load", refresh);
      media.removeEventListener("change", syncLoop);
      staticViewport.removeEventListener("change", syncLoop);
    };
  }, [gl, scene, camera, clock, get, setFrameloop, invalidate, onReady, onLost, onRestore]);
  return null;
}

function QualityWatch({ onDecline }: { onDecline: () => void }) {
  const acc = useRef({ t: 0, n: 0, bad: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    if (document.hidden || motion.reduced) {
      a.t = 0; a.n = 0; a.bad = 0;
      return;
    }
    // A resumed tab contributes one bounded sample; sustained slow rendering
    // must still trigger the quality ladder, including frames slower than 4fps.
    a.t += Math.min(dt, 0.25);
    a.n += 1;
    if (a.t < 1) return;
    const fps = a.n / a.t;
    a.t = 0;
    a.n = 0;
    if (fps >= 45) { a.bad = 0; return; }
    if (++a.bad >= 2) { a.bad = 0; onDecline(); }
  });
  return null;
}

/** Scene-only React tree in a direct R3F root. The HTML document already owns
 * the canvas, so mounting a second React DOM renderer is unnecessary. */
export default function Experience({ initialTier = "medium" }: { initialTier?: Tier }) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [enhanced, setEnhanced] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [recovery, setRecovery] = useState(0);
  const enhancementTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const baseTier = useRef(initialTier);
  const setDpr = useThree((state) => state.setDpr);
  const setFrameloop = useThree((state) => state.setFrameloop);

  useEffect(() => {
    setDpr([1, tier === "high" ? 1.75 : 1.3]);
  }, [tier, setDpr]);

  useEffect(() => {
    if (!baseReady || enhanced) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const schedule = () => {
      clearTimeout(enhancementTimer.current);
      if (document.hidden || reduced.matches) return;
      enhancementTimer.current = setTimeout(() => {
        if (document.hidden || reduced.matches) return;
        mark('enhancements-start');
        setEnhanced(true);
      }, 0);
    };
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    schedule();
    return () => {
      clearTimeout(enhancementTimer.current);
      document.removeEventListener('visibilitychange', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, [baseReady, enhanced]);
  const onReady = useCallback(() => { setBaseReady(true); }, []);
  const onLost = useCallback(() => {
    clearTimeout(enhancementTimer.current);
    setBaseReady(false);
    setEnhanced(false);
  }, []);
  const onRestore = useCallback(() => { setRecovery((n) => n + 1); }, []);
  const onDecline = useCallback(() => {
    setTier((current) => {
      const next: Tier = current === "high" ? "medium" : "low";
      motion.tier = next;
      return next;
    });
  }, []);

  return (
    <WorldBoundary onError={() => setFrameloop('never')}>
      <WorldLifecycle key={`lifecycle-${recovery}`} onReady={onReady} onLost={onLost} onRestore={onRestore} />
      <QualityWatch onDecline={onDecline} />
      <Scene key={`scene-${recovery}`} baseTier={baseTier.current} enhanced={enhanced && tier === "high"} />
      {enhanced && tier !== "low" && <Suspense fallback={null}><Post tier={tier} /></Suspense>}
    </WorldBoundary>
  );
}
