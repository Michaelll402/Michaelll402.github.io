import { createElement } from "react";
import { createRoot, extend } from "@react-three/fiber";
import {
  Group, IcosahedronGeometry, LineSegments, Mesh, MeshPhysicalMaterial,
  Points, ShaderMaterial, SphereGeometry,
} from "three";
import Experience from "./Experience";
import { DENSITY } from "./Centerpiece";
import { prepareFormations } from "./formations";
import { motion, type Tier } from "./store";

performance.mark("world:imported");

// Register only JSX objects used by the existing scene. Postprocessing builds
// effects as primitives and uses Group; no full THREE catalogue or DOM event
// manager is needed for this decorative, pointer-events:none canvas.
extend({ Group, Points, LineSegments, Mesh, SphereGeometry, ShaderMaterial, IcosahedronGeometry, MeshPhysicalMaterial });

let mounting: Promise<void> | null = null;

async function firstPresentedContent(signal: AbortSignal): Promise<void> {
  if (document.hidden) await new Promise<void>(resolve => {
    const done = () => {
      document.removeEventListener('visibilitychange', visible);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const visible = () => { if (!document.hidden) done(); };
    document.addEventListener('visibilitychange', visible);
    signal.addEventListener('abort', done, { once: true });
  });
  if (signal.aborted) return;
  if (performance.getEntriesByName('first-contentful-paint').length) return Promise.resolve();
  return new Promise(resolve => {
    let observer: PerformanceObserver | undefined;
    const finish = () => { observer?.disconnect(); clearTimeout(timeout); signal.removeEventListener('abort', finish); resolve(); };
    const timeout = setTimeout(finish, 1500);
    signal.addEventListener('abort', finish, { once: true });
    try {
      observer = new PerformanceObserver(list => {
        if (list.getEntries().some(entry => entry.name === 'first-contentful-paint')) finish();
      });
      observer.observe({ type: 'paint', buffered: true });
    } catch { finish(); }
  });
}

/** Keep the same R3F scene and shaders, but render directly into its one canvas.
 * This avoids React DOM, Canvas's measurement wrapper, and pointer raycasting.
 * Astro persists the host across route swaps; resize never reconfigures roots. */
export function mountWorld(host: HTMLElement, initialTier: Tier = "medium", signal?: AbortSignal): Promise<void> {
  if (mounting) return mounting;
  mounting = start(host, initialTier, signal);
  return mounting;
}

async function start(host: HTMLElement, initialTier: Tier, signal?: AbortSignal) {
  const lifetime = new AbortController();
  let active = true;
  let resizeFrame = 0;
  let resizeObserver: ResizeObserver | undefined;
  let root: ReturnType<typeof createRoot<HTMLCanvasElement>> | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let resize = () => {};

  const dispose = () => {
    if (!active) return;
    active = false;
    lifetime.abort();
    cancelAnimationFrame(resizeFrame);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pagehide", pageHide);
    signal?.removeEventListener("abort", dispose);
    root?.unmount();
    canvas?.remove();
  };
  const pageHide = (event: PageTransitionEvent) => {
    // A bfcache document retains its canvas and listeners. Visibility handling
    // pauses its loop; resuming the cached document must not rebuild the GPU.
    if (!event.persisted) dispose();
  };
  window.addEventListener("pagehide", pageHide);
  signal?.addEventListener("abort", dispose, { once: true });
  if (signal?.aborted) { dispose(); return; }
  try {
    motion.tier = initialTier;
    performance.mark("world:mount");
    performance.mark("world:geometry-start");
    await prepareFormations(DENSITY[initialTier].points);
    performance.mark("world:geometry-end");
    if (!active || !host.isConnected) { dispose(); return; }
    await firstPresentedContent(lifetime.signal);
    if (!active || !host.isConnected) { dispose(); return; }

    canvas = document.createElement("canvas");
    canvas.className = "world-canvas";
    canvas.dataset.renderer = "webgl";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    root = createRoot(canvas);
    await root.configure({
      size: { width: host.clientWidth, height: host.clientHeight, top: 0, left: 0 },
      dpr: [1, initialTier === "high" ? 1.75 : 1.3],
      // The lifecycle releases rendering only after asynchronous shader prep.
      frameloop: "never",
      // Postprocessing also uses NoToneMapping. Start in that same mode so
      // enabling it does not compile a second copy of every base shader.
      flat: true,
      gl: { antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: true },
      camera: { fov: 42, near: 0.1, far: 120, position: [0, 0.15, 6.5] },
      onCreated: ({ gl, scene, camera }) => {
        (window as unknown as Record<string, unknown>).__three = { gl, scene, camera };
        performance.mark("world:canvas-created");
      },
    });
    if (!active) { root.unmount(); return; }
    const store = root.render(createElement(Experience, { initialTier }));
    resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (!active || !host.isConnected) return;
        const state = store.getState();
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (width > 0 && height > 0 && (state.size.width !== width || state.size.height !== height)) {
          state.setSize(width, height, 0, 0);
        }
        const dpr = Math.min(Math.max(1, window.devicePixelRatio), motion.tier === "high" ? 1.75 : 1.3);
        if (state.viewport.dpr !== dpr) state.setDpr(dpr);
      });
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("resize", resize, { passive: true });
    resize();
  } catch (error) {
    dispose();
    motion.ready = false;
    document.documentElement.classList.remove("world-ready");
    document.documentElement.classList.add("no-webgl");
    performance.mark("world:unavailable");
    throw error;
  }
}
