import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import {
  BackSide,
  Color,
  Group,
  HalfFloatType,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { AMBIENT_FRAG, AMBIENT_VERT } from "./shaders/ambient";
import { FIELD } from "./palette";
import { Centerpiece } from "./Centerpiece";
import { clamp, damp, motion, type Tier } from "./store";
import { loadStudioEnvironment } from "./studio-environment";

/* ============================================================================
   THE CAMERA RIG
   ----------------------------------------------------------------------------
   Pointer never drives the camera directly. Everything is a target, and the
   camera is damped toward it frame-rate independently, which is what makes the
   movement read as a rig with mass rather than as a mouse-follower.

     scroll  →  chapter  →  keyframe  →  damp  →  camera
     pointer →  offset            ↗
   ========================================================================== */

type Key = { pos: [number, number, number]; look: [number, number, number] };

/* The keyframes carry the ANGLE of each chapter — how high the camera sits and
   what it is looking at. Horizontal composition is left entirely to the group
   offset below, because two systems both sliding the frame sideways is how a
   sculpture ends up off screen. */
const KEYS: Key[] = [
  { pos: [0.0, 0.15, 6.5], look: [0, 0, 0] }, // instrument — the hero
  { pos: [-0.3, 1.85, 5.4], look: [0, -0.2, 0] }, // graph — down into the orbits
  { pos: [0.0, 0.05, 4.9], look: [0, 0, 0.3] }, // lattice — straight on, like a sensor
  { pos: [0.35, 1.7, 5.0], look: [0, -0.62, 0] }, // grid — oblique over the city
  { pos: [0.0, 0.2, 5.6], look: [0, 0, 0] }, // network — flat on the map
  { pos: [0.15, 0.45, 5.3], look: [0, 0.1, 0] }, // blueprint — a drafting table, slightly above
];

/* which way the sculpture leans per chapter: +1 right, -1 left. Chapter 0 is
   handled separately; 1..4 mirror the alternating layout of the project list. */
const SIDE = [0, -1, 1, -1, 1, -1];

const tmpPos = new Vector3();
const tmpLook = new Vector3();
const curLook = new Vector3();

function CameraRig({ children }: { children: React.ReactNode }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const group = useRef<Group>(null);
  const state = useRef({ px: 0, py: 0, started: false });

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 30);
    const st = state.current;
    const snap = !st.started || motion.reduced;
    const c = clamp(motion.chapter, 0, KEYS.length - 1);
    const i = Math.floor(c);
    const j = Math.min(i + 1, KEYS.length - 1);
    const t = c - i;

    const a = KEYS[i];
    const b = KEYS[j];
    tmpPos.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    );
    tmpLook.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    );

    // a narrow viewport needs the camera further back or the sculpture clips
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < 1) tmpPos.z += (1 - aspect) * 3.6;
    // and it steps back again where the page turns to prose
    tmpPos.z += motion.calm * 3.4;

    /* THE DIVE. Opening a project pulls the camera toward the sculpture and
       lets it drift back out — the physical half of the page transition. The
       envelope rises fast and decays over about 900ms, so it reads as a push
       rather than a lurch, and it is skipped entirely for reduced motion. */
    if (motion.diveAt && !motion.reduced) {
      const t = (performance.now() - motion.diveAt) / 900;
      if (t < 1) {
        const env = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
        tmpPos.z -= env * 1.15;
      }
    }

    // pointer parallax: small, damped, and disabled for reduced motion
    const amp = motion.reduced || motion.coarse ? 0 : 1;
    st.px = damp(st.px, motion.pointer.x * amp, 2.2, d);
    st.py = damp(st.py, motion.pointer.y * amp, 2.2, d);
    tmpPos.x += st.px * 0.5;
    tmpPos.y += -st.py * 0.34;

    // the camera lags a little more when the page is moving fast
    const lag = 2.6 + Math.abs(motion.velocity) * 1.4;
    if (snap) {
      camera.position.copy(tmpPos);
      curLook.copy(tmpLook);
      st.started = true;
    } else {
      camera.position.x = damp(camera.position.x, tmpPos.x, lag, d);
      camera.position.y = damp(camera.position.y, tmpPos.y, lag, d);
      camera.position.z = damp(camera.position.z, tmpPos.z, lag, d);
      curLook.x = damp(curLook.x, tmpLook.x, lag, d);
      curLook.y = damp(curLook.y, tmpLook.y, lag, d);
      curLook.z = damp(curLook.z, tmpLook.z, lag, d);
    }
    camera.lookAt(curLook);

    /* The composition is art-directed, not centred: on a wide screen the
       sculpture sits off-axis against the type, and slides to centre once the
       type gives way to the project sequence. */
    if (group.current) {
      // In the hero the sculpture holds the upper right quadrant: clear of the
      // wordmark's baseline and clear of the supporting block underneath it,
      // so nothing important is ever read through a particle field.
      const wide = aspect > 1.15;
      const hero = 1 - clamp(motion.chapter, 0, 1);
      /* Chapter 0 puts the sculpture in the upper right, against the wordmark.
         Chapters 1-4 push it to the side the project's SURFACE is on, which is
         the opposite side from its words: the glass panel then has the world
         behind it, and the prose has the void behind it. */
      const side = wide ? SIDE[Math.round(clamp(motion.chapter, 0, SIDE.length - 1))] : 0;
      // and in the reading half it drifts off to the right margin and becomes
      // atmosphere again, which is where this object started
      const x = (wide ? hero * 1.75 + (1 - hero) * side * 1.4 : 0) + motion.calm * (wide ? 2.6 : 1.2);
      // on a narrow screen it rides high, above the reading column
      const y = (wide ? hero * 0.72 : 0.85 + hero * 0.35) - motion.calm * 0.5;
      group.current.position.x = snap ? x : damp(group.current.position.x, x, 2.0, d);
      group.current.position.y = snap ? y : damp(group.current.position.y, y, 2.0, d);
      // the diagrams are wider than the knot: pull them back a little
      const s = (1 - (1 - hero) * 0.22) * (1 - motion.calm * 0.42);
      group.current.scale.setScalar(snap ? s : damp(group.current.scale.x, s, 2.0, d));
    }
  });

  return <group ref={group}>{children}</group>;
}

/* ============================================================================
   THE AMBIENT FIELD — the volume, drawn on the inside of a large sphere.
   ========================================================================== */
function AmbientField() {
  const lastMode = useRef(motion.mode);
  const mat = useRef<any>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uChapter: { value: motion.chapter },
      uBase: { value: new Color(FIELD[motion.mode].base) },
      uGlowA: { value: new Color(FIELD[motion.mode].glowA) },
      uGlowB: { value: new Color(FIELD[motion.mode].glowB) },
      uStrength: { value: FIELD[motion.mode].strength },
      uGrain: { value: FIELD[motion.mode].grain },
    }),
    []
  );
  /* FIELD holds hex strings. Calling Color.set(string) every frame re-parses
     three strings sixty times a second for a value that changes twice a visit. */
  const grades = useMemo(
    () => ({
      night: {
        base: new Color(FIELD.night.base),
        glowA: new Color(FIELD.night.glowA),
        glowB: new Color(FIELD.night.glowB),
      },
      day: {
        base: new Color(FIELD.day.base),
        glowA: new Color(FIELD.day.glowA),
        glowB: new Color(FIELD.day.glowB),
      },
    }),
    []
  );

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 30);
    if (!motion.reduced) uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uChapter.value = motion.reduced ? motion.chapter : damp(uniforms.uChapter.value, motion.chapter, 2.2, d);
    const f = FIELD[motion.mode];
    const g = grades[motion.mode];
    const modeChanged = lastMode.current !== motion.mode;
    lastMode.current = motion.mode;
    const k = motion.reduced || modeChanged ? 1 : 1 - Math.exp(-2.5 * d);
    uniforms.uBase.value.lerp(g.base, k);
    uniforms.uGlowA.value.lerp(g.glowA, k);
    uniforms.uGlowB.value.lerp(g.glowB, k);
    uniforms.uStrength.value = motion.reduced || modeChanged ? f.strength : damp(uniforms.uStrength.value, f.strength, 2.5, d);
    uniforms.uGrain.value = motion.reduced || modeChanged ? f.grain : damp(uniforms.uGrain.value, f.grain, 2.5, d);
  });

  return (
    <mesh scale={40} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        ref={mat}
        vertexShader={AMBIENT_VERT}
        fragmentShader={AMBIENT_FRAG}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ============================================================================
   THE LENS
   ----------------------------------------------------------------------------
   One piece of real glass, not a scatter of floating polyhedra. It hangs in
   front of the sculpture during the opening chapter so the particles are seen
   THROUGH it — refracted, dispersed, doubled at the rim — and then withdraws as
   soon as there is a project to read. Transmission is the most expensive
   material in the scene, so it exists exactly once and only on the top tier.
   ========================================================================== */
/** Load the original lighting bake and compile the physical material before
 * adding it to the live scene. The same material/geometry is then rendered;
 * no placeholder lens or second shader instance is substituted. */
function Lens() {
  const { gl, scene, camera, invalidate } = useThree();
  const [mesh, setMesh] = useState<Mesh<IcosahedronGeometry, MeshPhysicalMaterial> | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = useRef(1);

  useEffect(() => {
    let active = true;
    let prepared = false;
    let candidate: Mesh<IcosahedronGeometry, MeshPhysicalMaterial> | undefined;
    const dispose = () => {
      candidate?.geometry.dispose();
      candidate?.material.dispose();
      candidate?.material.envMap?.dispose();
      candidate = undefined;
    };
    const prepare = async () => {
      const environment = await loadStudioEnvironment();
      if (!active) { environment.dispose(); return; }
      const material = new MeshPhysicalMaterial({
        envMap: environment, envMapIntensity: 1.1, transmission: 1,
        thickness: 0.85, ior: 1.42, roughness: 0.06, metalness: 0,
        clearcoat: 1, clearcoatRoughness: 0.1,
        attenuationColor: new Color("#b9c8ff"), attenuationDistance: 3.2,
      });
      candidate = new Mesh(new IcosahedronGeometry(1, 5), material);
      candidate.visible = false;
      candidate.onAfterRender = () => {
        const host = document.querySelector<HTMLElement>('[data-world-root]');
        if (host && host.dataset.lensReady !== 'true') { host.dataset.lensReady = 'true'; invalidate(); }
      };
      performance.mark("world:lens-prepare-start");
      gl.initTexture(environment);
      // The composer renders into a linear target. Prepare both output
      // variants while retaining the exact material that the lens will use.
      await gl.compileAsync(candidate, camera, scene);
      if (!active) { dispose(); return; }
      const warmTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
      const previousTarget = gl.getRenderTarget();
      const previousFace = gl.getActiveCubeFace();
      const previousLevel = gl.getActiveMipmapLevel();
      try {
        let compiling: Promise<unknown>;
        try {
          gl.setRenderTarget(warmTarget);
          compiling = gl.compileAsync(candidate, camera, scene);
        } finally {
          // Restore synchronously: the live frame loop must not target the
          // warmup buffer while compilation finishes on the driver thread.
          gl.setRenderTarget(previousTarget, previousFace, previousLevel);
        }
        await compiling;
      } finally {
        warmTarget.dispose();
      }
      prepared = true;
      if (!active) { dispose(); return; }
      performance.mark("world:lens-prepare-end");
      setMesh(candidate);
      invalidate();
    };
    prepare().catch(() => {
      dispose();
      if (active) { performance.mark("world:lens-unavailable"); setFailed(true); }
    });
    return () => {
      active = false;
      // compileAsync polls the material; don't dispose it during compilation.
      if (prepared) dispose();
    };
  }, [gl, scene, camera, invalidate]);

  useFrame((state, dt) => {
    if (!mesh) return;
    const d = Math.min(dt, 1 / 30);
    const t = state.clock.elapsedTime;
    const wanted = motion.chapter < 0.85 && motion.calm < 0.05 && motion.tier === "high" ? 1 : 0;
    shown.current = damp(shown.current, wanted, 2.6, d);
    mesh.visible = shown.current > 0.02;
    if (!mesh.visible) { mesh.scale.setScalar(0); return; }
    const slow = motion.reduced ? 0.08 : 1;
    mesh.scale.setScalar(0.34 * shown.current);
    mesh.rotation.set(t * 0.08 * slow, t * 0.11 * slow, 0.32);
    mesh.position.set(0.5 + Math.sin(t * 0.19) * 0.08, 0.26 + Math.cos(t * 0.23) * 0.06, 1.75);
  });

  // Let the world boundary stop the optional renderer. Do not leave a hidden
  // perpetual frame loop behind the poster if the matching scene cannot load.
  if (failed) throw new Error('Optional galaxy lens unavailable');
  return mesh ? <primitive object={mesh} dispose={null} /> : null;
}

function HeroLens() {
  const [enabled, setEnabled] = useState(motion.chapter < 0.85 && !motion.reduced);
  const mounted = useRef(enabled);
  useFrame(() => {
    if (mounted.current || motion.chapter >= 0.85 || motion.reduced) return;
    mounted.current = true;
    setEnabled(true);
  });
  // Once needed, retain the environment. Lens owns its gradual withdrawal;
  // crossing a chapter boundary must not force a new PMREM build or hard cut.
  return enabled ? <Lens /> : null;
}

export function Scene({ baseTier, enhanced = false }: { baseTier: Tier; enhanced?: boolean }) {
  return (
    <>
      <AmbientField />
      <CameraRig>
        <Centerpiece baseTier={baseTier} />
        {baseTier === "high" && enhanced && <HeroLens />}
      </CameraRig>
    </>
  );
}
