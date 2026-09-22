// §15 v4.6 — THE IMMERSION ENGINE (Michael's Soda reference, whole-page).
// The entire case study is one stage inside the project's world:
//   · hero: centerpiece tilts to the cursor + floats; satellites parallax and
//     are repelled by the pointer (radius 400, strength -80, lerp .1)
//   · every chapter: its own scene of the project's objects that EXPLODE into
//     place as the chapter arrives and IMPLODE away as it leaves — the
//     reference's flavor-switch choreography (implode .5s power2.in → hold .3
//     → explode .9s back.out(1.5)) mapped onto the replay
//   · accent particles rise the whole page (400ms spawn, -110vh drift+spin)
// Discipline: only visible scenes animate, paused offscreen and on hidden tabs,
// physics gated to fine pointers, halved on small screens, still under
// reduced motion, absent without JavaScript.

const DURS = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10];
let disposeImmersion: Array<() => void> = [];
let deviceMode: MediaQueryList | undefined;

const SPRITES: Record<string, string[]> = {
  support: ["ticket", "chip-agent", "bell", "chip-admin"],
  vision: ["bracket", "face", "mesh"],
  simiutopia: ["truck", "tile", "stopm"],
  subways: ["st-a", "st-b", "st-c", "st-d", "seg"],
};

// where a chapter's objects live (right margin, clear of the reading column)
const CHAP_LAYOUT = [
  [
    { left: "72%", top: "10%", w: 84 },
    { left: "89%", top: "48%", w: 62 },
    { left: "67%", top: "80%", w: 54 },
  ],
  [
    { left: "87%", top: "16%", w: 70 },
    { left: "70%", top: "58%", w: 90 },
    { left: "90%", top: "86%", w: 54 },
  ],
  [
    { left: "68%", top: "20%", w: 62 },
    { left: "88%", top: "40%", w: 82 },
    { left: "75%", top: "84%", w: 68 },
  ],
  [
    { left: "84%", top: "12%", w: 76 },
    { left: "66%", top: "54%", w: 58 },
    { left: "88%", top: "80%", w: 72 },
  ],
];

interface FloaterState {
  el: HTMLElement;
  rx: number;
  ry: number;
  angle: number;
  dur: number;
  phase: number;
  live: boolean;
  /** page-space center, measured once — floaters only ever transform, so the
      loop needs zero getBoundingClientRect calls (layout thrash killed TBT) */
  pageX: number;
  pageY: number;
}

export function mountImmersion(stage: HTMLElement) {
  if (stage.dataset.mounted) return () => {};
  stage.dataset.mounted = "1";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const small = innerWidth < 1024;
  // The HTML is already a complete scene. Touch scrolling must not compete
  // with decorative bobbing, particle timers or a second animation clock.
  if (reduced || !fine || small) return () => { delete stage.dataset.mounted; };

  let disposed = false;
  const disposers: Array<() => void> = [];
  const timers = new Set<number>();
  const animations = new Set<Animation>();
  const later = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, delay);
    timers.add(id);
    return id;
  };
  const track = (animation: Animation) => {
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposers.forEach((fn) => fn());
    timers.forEach(clearTimeout);
    animations.forEach((animation) => animation.cancel());
    stage.querySelectorAll(".imm-particle, [data-chap-scene]").forEach((el) => el.remove());
    stage.querySelectorAll<HTMLElement>("[data-imm-center], .imm-layer, .imm-floater").forEach(el => {
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    });
    delete stage.dataset.mounted;
  };

  const slug = document.body.dataset.accent ?? "support";
  const sprites = SPRITES[slug] ?? SPRITES.support;

  /* ---------- build a scene of objects for every chapter ---------- */
  const chapters = Array.from(document.querySelectorAll<HTMLElement>(".chapter"));
  if (!small) {
    chapters.forEach((ch, ci) => {
      if (ch.querySelector("[data-chap-scene]")) return;
      const scene = document.createElement("div");
      scene.className = "chap-scene";
      scene.setAttribute("aria-hidden", "true");
      scene.dataset.chapScene = "";
      const layout = CHAP_LAYOUT[ci % CHAP_LAYOUT.length].slice(0, 2);
      layout.forEach((pos, i) => {
        const span = document.createElement("span");
        span.className = "imm-floater chap-floater";
        span.style.cssText = `left:${pos.left};top:${pos.top};width:${pos.w}px`;
        span.innerHTML = `<svg viewBox="0 0 100 100"><use href="#imm-${
          sprites[(ci * 3 + i) % sprites.length]
        }"></use></svg>`;
        scene.appendChild(span);
      });
      ch.appendChild(scene);
    });
  }

  /* ---------- collect everything the loop drives ---------- */
  const fg = stage.querySelector<HTMLElement>("[data-imm-fg]");
  const bg = stage.querySelector<HTMLElement>("[data-imm-bg]");
  const center = stage.querySelector<HTMLElement>("[data-imm-center]");
  const particlesHost = stage.querySelector<HTMLElement>("[data-imm-particles]");

  const floaters: FloaterState[] = Array.from(
    stage.querySelectorAll<HTMLElement>(".imm-floater")
  ).map((el, i) => ({
    el,
    rx: 0,
    ry: 0,
    angle: Math.random() * 360,
    dur: DURS[i % DURS.length],
    phase: i * 0.7,
    // hero floaters start live; chapter floaters wake with their scene
    live: !el.classList.contains("chap-floater"),
    pageX: 0,
    pageY: 0,
  }));

  const measure = () => {
    if (disposed) return;
    // batched: all writes, then all reads, then all writes — one reflow,
    // not one per floater (interleaving cost 200ms of TBT in QA)
    const sy = window.scrollY;
    const sx = window.scrollX;
    const prev = floaters.map((f) => f.el.style.transform);
    floaters.forEach((f) => (f.el.style.transform = "none"));
    const rects = floaters.map((f) => f.el.getBoundingClientRect());
    floaters.forEach((f, i) => {
      const r = rects[i];
      f.pageX = r.left + sx + r.width / 2;
      f.pageY = r.top + sy + r.height / 2;
      f.el.style.transform = prev[i];
    });
  };
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(measure, { timeout: 1200 });
    disposers.push(() => window.cancelIdleCallback(idleId));
  } else later(measure, 300);
  let measureTimer = 0;
  const onResize = () => {
    clearTimeout(measureTimer);
    timers.delete(measureTimer);
    measureTimer = later(measure, 200);
  };
  window.addEventListener("resize", onResize);
  disposers.push(() => window.removeEventListener("resize", onResize));
  const byEl = new Map(floaters.map((f) => [f.el, f]));

  /* ---------- the chapter choreography (reference timings) ---------- */
  const EXPLODE = "cubic-bezier(0.34, 1.56, 0.64, 1)"; // back.out(1.5)
  const IMPLODE = "cubic-bezier(0.55, 0, 1, 0.45)"; // power2.in
  let syncActivity = () => {};

  const formScene = (scene: HTMLElement) => {
    scene.querySelectorAll<HTMLElement>(".chap-floater").forEach((el, i) => {
      const st = byEl.get(el);
      const dx = (Math.random() - 0.5) * 160;
      const dy = 60 + Math.random() * 60;
      track(el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.1)`, opacity: 0 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ],
        { duration: 900, delay: i * 90, easing: EXPLODE, fill: "backwards" }
      ));
      later(() => {
        if (st && scene.dataset.formed) st.live = true;
        syncActivity();
      }, 900 + i * 90);
    });
  };

  const dismissScene = (scene: HTMLElement) => {
    scene.querySelectorAll<HTMLElement>(".chap-floater").forEach((el) => {
      const st = byEl.get(el);
      if (st) st.live = false;
      syncActivity();
      const anim = track(el.animate(
        [
          { transform: el.style.transform || "none", opacity: 1 },
          { transform: "translate(0, 40px) scale(0.1)", opacity: 0 },
        ],
        { duration: 500, easing: IMPLODE, fill: "forwards" }
      ));
      anim.onfinish = () => {
        el.style.transform = "";
        el.style.opacity = "0";
      };
    });
  };

  const sceneIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const scene = en.target as HTMLElement;
        if (en.isIntersecting && !scene.dataset.formed) {
          scene.dataset.formed = "1";
          scene.style.opacity = "1";
          formScene(scene);
        } else if (!en.isIntersecting && scene.dataset.formed) {
          delete scene.dataset.formed;
          dismissScene(scene);
        }
      });
    },
    { threshold: 0.12 }
  );
  stage.querySelectorAll<HTMLElement>("[data-chap-scene]").forEach((s) => sceneIO.observe(s));
  disposers.push(() => sceneIO.disconnect());

  /* ---------- the atmosphere shifts chapter by chapter ---------- */
  if (chapters.length) {
    const moodIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const i = chapters.indexOf(en.target as HTMLElement);
          if (i < 0) return;
          const t = chapters.length > 1 ? i / (chapters.length - 1) : 0;
          stage.style.setProperty("--mood-x", `${(64 - t * 28).toFixed(1)}%`);
          stage.style.setProperty("--mood-y", `${(30 + t * 34).toFixed(1)}%`);
          stage.style.setProperty("--mood-strength", `${(13 - t * 5).toFixed(1)}%`);
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    chapters.forEach((c) => moodIO.observe(c));
    disposers.push(() => moodIO.disconnect());
  }

  /* ---------- pointer ---------- */
  const mouse = { x: 0, y: 0, px: -9999, py: -9999 };
  const cur = { x: 0, y: 0 };
  let heroVisible = false;
  let stageVisible = false;
  const hero = stage.querySelector<HTMLElement>(".immersion");
  const heroIO = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    syncActivity();
  });
  if (hero) heroIO.observe(hero);
  disposers.push(() => heroIO.disconnect());
  if (fine) {
    const onMove = (e: PointerEvent) => {
      // The case stage fills the viewport width; no forced layout per pointer event.
      mouse.x = e.clientX / innerWidth - 0.5;
      mouse.y = e.clientY / innerHeight - 0.5;
      mouse.px = e.clientX;
      mouse.py = e.clientY;
    };
    const onLeave = () => {
      mouse.x = 0;
      mouse.y = 0;
      mouse.px = mouse.py = -9999;
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    disposers.push(() => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    });
  }

  /* ---------- loop ---------- */
  let running = false;
  let raf = 0;
  const loop = () => {
    if (disposed || !running) return;
    const time = Date.now() * 0.001;
    cur.x += (mouse.x - cur.x) * 0.05;
    cur.y += (mouse.y - cur.y) * 0.05;

    if (center && heroVisible) {
      const bob = Math.sin(time * (Math.PI * 2 / 6)) * 14;
      center.style.transform =
        `perspective(1100px) translateY(${bob.toFixed(1)}px) ` +
        `rotateY(${(cur.x * 14).toFixed(2)}deg) rotateX(${(-cur.y * 9).toFixed(2)}deg)`;
      center.style.setProperty("--gx", `${((cur.x + 0.5) * 100).toFixed(1)}%`);
      center.style.setProperty("--gy", `${((cur.y + 0.5) * 100).toFixed(1)}%`);
    }
    if (fg && heroVisible) fg.style.transform = `translate(${(cur.x * 60).toFixed(1)}px, ${(cur.y * 60).toFixed(1)}px)`;
    if (bg && heroVisible) bg.style.transform = `translate(${(cur.x * -30).toFixed(1)}px, ${(cur.y * -30).toFixed(1)}px)`;

    for (const f of floaters) {
      if (!f.live) continue;
      if (!heroVisible && !f.el.classList.contains("chap-floater")) continue;
      let targetRx = 0;
      let targetRy = 0;
      let speedMult = 1;
      if (fine && mouse.px > -999) {
        // viewport position from the cached page coords + current scroll
        const vy = f.pageY - window.scrollY;
        if (vy > -240 && vy < innerHeight + 240) {
          const dx = f.pageX - window.scrollX - mouse.px;
          const dy = vy - mouse.py;
          const dist = Math.hypot(dx, dy);
          if (dist < 400 && dist > 0.01) {
            const force = (400 - dist) / 400;
            targetRx = (dx / dist) * force * 80;
            targetRy = (dy / dist) * force * 80;
            speedMult = 1 + force * 5;
          }
        }
      }
      f.rx += (targetRx - f.rx) * 0.1;
      f.ry += (targetRy - f.ry) * 0.1;
      f.angle += 0.2 * speedMult;
      const phase = (time + f.phase) * (Math.PI * 2 / f.dur);
      const floatY = Math.sin(phase) * 15;
      const floatAngle = Math.cos(phase) * 6;
      f.el.style.opacity = "1";
      f.el.style.transform =
        `translate(${f.rx.toFixed(1)}px, ${(f.ry + floatY).toFixed(1)}px) ` +
        `rotate(${(f.angle * 0.1 + floatAngle).toFixed(1)}deg)`;
    }

    if (running) raf = requestAnimationFrame(loop);
  };

  /* ---------- particles, the length of the page ---------- */
  let particleTimer = 0;
  const spawn = () => {
    if (!heroVisible || !particlesHost || particlesHost.childElementCount > 26) return;
    const p = document.createElement("span");
    p.className = "imm-particle";
    const size = Math.random() * 14 + 6;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.opacity = String(Math.random() * 0.35 + 0.15);
    const dur = Math.random() * 6 + 4;
    p.style.animationDuration = `${dur}s`;
    particlesHost.appendChild(p);
    later(() => p.remove(), dur * 1000);
  };

  const start = () => {
    if (running || disposed || !stage.isConnected) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    clearInterval(particleTimer);
    particleTimer = 0;
  };

  syncActivity = () => {
    const activeScene = heroVisible || floaters.some(f => f.live && f.el.classList.contains("chap-floater"));
    if (!stageVisible || document.hidden || !activeScene) { stop(); return; }
    start();
    if (heroVisible && !particleTimer) particleTimer = window.setInterval(spawn, 400);
    else if (!heroVisible && particleTimer) { clearInterval(particleTimer); particleTimer = 0; }
  };

  const stageIO = new IntersectionObserver(([en]) => {
    stageVisible = en.isIntersecting;
    syncActivity();
  }, {
    threshold: 0,
  });
  stageIO.observe(stage);
  const onVisibility = () => {
    syncActivity();
  };
  document.addEventListener("visibilitychange", onVisibility);
  disposers.push(stop, () => stageIO.disconnect(), () => document.removeEventListener("visibilitychange", onVisibility));
  return dispose;
}

export function initImmersion() {
  // One persistent preference owner. Rebuild only at a capability boundary,
  // never for every resize pixel or scroll event. The HTML artwork stays put.
  if (!deviceMode) {
    deviceMode = matchMedia('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    deviceMode.addEventListener('change', () => { destroyImmersion(); initImmersion(); });
  }
  document.querySelectorAll<HTMLElement>("[data-immersion]:not([data-mounted])").forEach((stage) => {
    disposeImmersion.push(mountImmersion(stage));
  });
}

export function destroyImmersion() {
  disposeImmersion.forEach((dispose) => dispose());
  disposeImmersion = [];
}
