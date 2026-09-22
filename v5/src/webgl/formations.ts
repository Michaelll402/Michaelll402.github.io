/* ============================================================================
   THE FORMATIONS
   ----------------------------------------------------------------------------
   The centrepiece is not decoration bolted onto a portfolio: it is the work.
   One particle system holds five procedurally generated formations and the
   scroll position blends between them.

     0  INSTRUMENT   the hero — a wound core of filaments inside an orbital shell
     1  GRAPH        Customer Support SaaS — four role orbits, tickets streaming
     2  LATTICE      Face Recognition — a sampling grid and a landmark constellation
     3  GRID         Simiutopia — a street lattice with towers and moving traffic
     4  NETWORK      Subways of Budapest — metro lines on 45 degree geometry

   Nothing here is a planet, a brain, a galaxy or a starfield. Every formation is
   a diagram of something Michael actually built, drawn in points.

   Everything is deterministic: same seed, same sculpture, every visit.
   ========================================================================== */

/** deterministic PRNG so the sculpture is identical on every load */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FORMATION_COUNT = 6;
export const FORMATION_NAMES = ["instrument", "graph", "lattice", "grid", "network", "blueprint"] as const;

type Writer = (i: number, x: number, y: number, z: number) => void;

/* ---------------------------------------------------------------- 0 INSTRUMENT
   A knot wound from three strands, wrapped in a sparse orbital shell. Dense,
   coherent, slowly breathing — an object that looks engineered rather than
   scattered. */
function instrument(n: number, put: Writer, rand: () => number) {
  const shell = Math.floor(n * 0.28);
  const core = n - shell;
  for (let i = 0; i < core; i++) {
    const strand = i % 3;
    const t = (i / core) * Math.PI * 2 * 3 + strand * 2.09;
    const r = 1 + 0.34 * Math.cos(3 * t + strand);
    const x = r * Math.cos(2 * t);
    const y = r * Math.sin(2 * t) * 0.82 + 0.18 * Math.sin(5 * t);
    const z = 0.62 * Math.sin(3 * t + strand * 1.2);
    const a = rand() * Math.PI * 2;
    const j = Math.pow(rand(), 1.7) * 0.085;
    put(i, x * 1.35 + Math.cos(a) * j, y * 1.35 + Math.sin(a) * j, z * 1.35 + (rand() - 0.5) * j);
  }
  for (let i = 0; i < shell; i++) {
    const k = i + 0.5;
    const phi = Math.acos(1 - (2 * k) / shell);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;
    const r = 2.15 + Math.pow(rand(), 3) * 0.9;
    put(
      core + i,
      Math.cos(theta) * Math.sin(phi) * r,
      Math.cos(phi) * r * 0.7,
      Math.sin(theta) * Math.sin(phi) * r
    );
  }
}

/* -------------------------------------------------------------------- 1 GRAPH
   Customer Support: four roles on four tilted orbits, and the tickets moving
   between them. The streams are arcs, so the eye reads direction. */
function graph(n: number, put: Writer, rand: () => number) {
  const ROLES = 4;
  const nodes = Math.floor(n * 0.42);
  const streams = n - nodes;
  const radii = [0.85, 1.45, 2.05, 2.6];
  const tilt = [0.0, 0.42, -0.3, 0.16];
  for (let i = 0; i < nodes; i++) {
    const ring = i % ROLES;
    const r = radii[ring];
    const cluster = Math.floor(rand() * 7);
    const base = (cluster / 7) * Math.PI * 2 + ring * 0.4;
    const a = base + (rand() - 0.5) * 0.55;
    const rr = r + (rand() - 0.5) * 0.1;
    const ct = Math.cos(tilt[ring]);
    const st = Math.sin(tilt[ring]);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const y = (rand() - 0.5) * 0.12;
    put(i, x, y * ct - z * st, y * st + z * ct);
  }
  for (let i = 0; i < streams; i++) {
    const from = Math.floor(rand() * (ROLES - 1));
    const t = rand();
    const a0 = rand() * Math.PI * 2;
    const a1 = a0 + (rand() - 0.5) * 1.6;
    const r0 = radii[from];
    const r1 = radii[from + 1];
    const a = a0 + (a1 - a0) * t;
    const r = r0 + (r1 - r0) * t;
    const lift = Math.sin(t * Math.PI) * 0.55;
    put(nodes + i, Math.cos(a) * r, lift + (rand() - 0.5) * 0.05, Math.sin(a) * r);
  }
}

/* ------------------------------------------------------------------ 2 LATTICE
   Face Recognition: the sampling grid the pipeline works on, and the landmark
   constellation it resolves to. Deliberately abstract — a geometry of
   recognition, never a face. */
function lattice(n: number, put: Writer, rand: () => number) {
  const gridN = Math.floor(n * 0.62);
  const marks = n - gridN;
  const side = Math.ceil(Math.sqrt(gridN));
  for (let i = 0; i < gridN; i++) {
    const gx = i % side;
    const gy = Math.floor(i / side);
    const u = gx / (side - 1) - 0.5;
    const v = gy / (side - 1) - 0.5;
    const bow = (0.25 - (u * u + v * v)) * 1.5;
    const edge = Math.max(Math.abs(u), Math.abs(v)) * 2;
    // the grid stays a grid; only the outermost ring dissolves into samples
    const scatter = Math.pow(edge, 6) * 0.42;
    put(
      i,
      u * 4.0 + (rand() - 0.5) * scatter,
      v * 3.0 + (rand() - 0.5) * scatter,
      bow + (rand() - 0.5) * (0.015 + scatter * 0.5)
    );
  }
  const anchors = [
    [-0.42, 0.28],
    [0.42, 0.28],
    [0, 0.0],
    [-0.3, -0.36],
    [0.3, -0.36],
  ];
  for (let i = 0; i < marks; i++) {
    if (i % 3 === 0) {
      const a = rand() * Math.PI * 2;
      const r = 0.92 + (rand() - 0.5) * 0.06;
      put(gridN + i, Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.7, 0.62 + (rand() - 0.5) * 0.08);
    } else {
      const anchor = anchors[Math.floor(rand() * anchors.length)];
      const s = Math.pow(rand(), 2) * 0.2;
      const a = rand() * Math.PI * 2;
      put(
        gridN + i,
        anchor[0] * 1.35 + Math.cos(a) * s,
        anchor[1] * 1.7 + Math.sin(a) * s,
        0.68 + (rand() - 0.5) * 0.1
      );
    }
  }
}

/* --------------------------------------------------------------------- 3 GRID
   Simiutopia: a city seen from above and slightly to the side — streets on a
   lattice, towers rising at the blocks, traffic strung along the roads. */
function grid(n: number, put: Writer, rand: () => number) {
  const roadsN = Math.floor(n * 0.44);
  const towersN = Math.floor(n * 0.4);
  const carsN = n - roadsN - towersN;
  const LINES = 7;
  const span = 4.2;
  for (let i = 0; i < roadsN; i++) {
    const along = rand() * span - span / 2;
    const idx = Math.floor(rand() * LINES);
    const at = (idx / (LINES - 1) - 0.5) * span;
    const j = (rand() - 0.5) * 0.05;
    if (i % 2 === 0) put(i, along, -1.05 + j * 0.4, at + j);
    else put(i, at + j, -1.05 + j * 0.4, along);
  }
  for (let i = 0; i < towersN; i++) {
    const bx = Math.floor(rand() * (LINES - 1));
    const bz = Math.floor(rand() * (LINES - 1));
    const cx = ((bx + 0.5) / (LINES - 1) - 0.5) * span;
    const cz = ((bz + 0.5) / (LINES - 1) - 0.5) * span;
    const d = Math.hypot(cx, cz) / (span * 0.6);
    const h = (1.5 - d) * (0.35 + rand() * 0.95);
    const t = rand();
    put(
      roadsN + i,
      cx + (rand() - 0.5) * 0.34,
      -1.05 + Math.max(0.05, h) * t,
      cz + (rand() - 0.5) * 0.34
    );
  }
  for (let i = 0; i < carsN; i++) {
    const along = rand() * span - span / 2;
    const idx = Math.floor(rand() * LINES);
    const at = (idx / (LINES - 1) - 0.5) * span;
    const dash = (rand() - 0.5) * 0.16;
    if (i % 2 === 0) put(roadsN + towersN + i, along + dash, -0.99, at);
    else put(roadsN + towersN + i, at, -0.99, along + dash);
  }
}

/** the four metro polylines, shared by the points and the filaments */
const METRO: number[][][] = [
  [
    [-2.6, 1.05],
    [-1.2, 1.05],
    [-0.3, 0.15],
    [1.0, 0.15],
    [2.3, -1.15],
  ],
  [
    [-2.2, -1.35],
    [-0.75, 0.1],
    [0.15, 0.1],
    [1.15, 1.1],
    [2.5, 1.1],
  ],
  [
    [-1.75, 1.75],
    [-1.75, 0.35],
    [-0.55, -0.85],
    [-0.55, -1.9],
  ],
  [
    [2.05, 1.7],
    [0.75, 0.4],
    [0.75, -0.7],
    [1.7, -1.65],
  ],
];

/* ------------------------------------------------------------------ 4 NETWORK
   Subways of Budapest: four lines on the 45 degree geometry a metro map
   actually uses, stations knotting at the vertices, the river running through. */
function network(n: number, put: Writer, rand: () => number) {
  const riverN = Math.floor(n * 0.1);
  const trackN = n - riverN;
  const per = Math.floor(trackN / METRO.length);
  let w = 0;
  for (let l = 0; l < METRO.length; l++) {
    const pts = METRO[l];
    const segs = pts.length - 1;
    const lens: number[] = [];
    let total = 0;
    for (let s = 0; s < segs; s++) {
      const d = Math.hypot(pts[s + 1][0] - pts[s][0], pts[s + 1][1] - pts[s][1]);
      lens.push(d);
      total += d;
    }
    const count = l === METRO.length - 1 ? trackN - w : per;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      if (rand() < 0.22) {
        const v = Math.floor(rand() * pts.length);
        const a = rand() * Math.PI * 2;
        const r = Math.pow(rand(), 0.6) * 0.09;
        x = pts[v][0] + Math.cos(a) * r;
        y = pts[v][1] + Math.sin(a) * r;
      } else {
        let d = rand() * total;
        let s = 0;
        while (s < segs - 1 && d > lens[s]) {
          d -= lens[s];
          s++;
        }
        const t = lens[s] > 0 ? d / lens[s] : 0;
        x = pts[s][0] + (pts[s + 1][0] - pts[s][0]) * t + (rand() - 0.5) * 0.035;
        y = pts[s][1] + (pts[s + 1][1] - pts[s][1]) * t + (rand() - 0.5) * 0.035;
      }
      put(w++, x * 1.15, y * 1.15, (l - 1.5) * 0.16 + (rand() - 0.5) * 0.05);
    }
  }
  for (let i = 0; i < riverN; i++) {
    const t = rand();
    const x = -2.9 + t * 5.8;
    const y = 1.5 - t * 3.1 + Math.sin(t * 3.4) * 0.42;
    put(w++, x * 1.15, y * 1.15, -0.45 + (rand() - 0.5) * 0.06);
  }
}

/** the class cards of the BLUEPRINT, shared by the points and the filaments:
    [cx, cy, w, h] — one superclass, a middle tier, a wide base, like the
    auto-layout in the app it diagrams */
const CARDS: [number, number, number, number][] = [
  [0.0, 1.3, 1.0, 0.56], // the root type
  [-1.3, 0.1, 0.9, 0.5],
  [0.0, 0.1, 0.9, 0.5],
  [1.3, 0.1, 0.9, 0.5],
  [-1.75, -1.15, 0.8, 0.46],
  [-0.6, -1.15, 0.8, 0.46],
  [0.6, -1.15, 0.8, 0.46],
  [1.75, -1.15, 0.8, 0.46],
];
/** orthogonal connectors: child-top → riser → bus → parent-bottom */
const WIRES: [number, number][] = [
  [1, 0], [2, 0], [3, 0],
  [4, 1], [5, 1], [6, 2], [7, 3],
];

/* ---------------------------------------------------------------- 5 BLUEPRINT
   ClassForge: a class diagram on a drafting table. Card outlines carry most of
   the points, dotted member rows sit inside each card, and the inheritance
   wiring runs orthogonally — risers and buses, the way the app's own route
   planner draws them. Shallow in z: a drawing, not a volume. */
function blueprint(n: number, put: Writer, rand: () => number) {
  const edgeN = Math.floor(n * 0.58);
  const rowN = Math.floor(n * 0.24);
  const wireN = n - edgeN - rowN;

  for (let i = 0; i < edgeN; i++) {
    const [cx, cy, w, h] = CARDS[i % CARDS.length];
    // walk the perimeter at a uniform parameter
    const t = rand() * 2 * (w + h);
    let x: number, y: number;
    if (t < w) { x = cx - w / 2 + t; y = cy + h / 2; }
    else if (t < w + h) { x = cx + w / 2; y = cy + h / 2 - (t - w); }
    else if (t < 2 * w + h) { x = cx + w / 2 - (t - w - h); y = cy - h / 2; }
    else { x = cx - w / 2; y = cy - h / 2 + (t - 2 * w - h); }
    put(i, x + (rand() - 0.5) * 0.02, y + (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.08);
  }
  for (let i = 0; i < rowN; i++) {
    // member rows: dotted horizontal lines inside the card, under a head rule
    const [cx, cy, w, h] = CARDS[i % CARDS.length];
    const row = 1 + Math.floor(rand() * 2);
    const y = cy + h / 2 - 0.16 - row * 0.14;
    const x = cx - w / 2 + 0.1 + rand() * (w - 0.2);
    put(edgeN + i, x, y, (rand() - 0.5) * 0.06);
  }
  for (let i = 0; i < wireN; i++) {
    const [a, b] = WIRES[i % WIRES.length];
    const [ax, ay, , ah] = CARDS[a];
    const [bx, by, , bh] = CARDS[b];
    const top = ay + ah / 2;
    const bot = by - bh / 2;
    const mid = (top + bot) / 2;
    // three legs: rise from the child, run the bus, drop to the parent
    const t = rand() * 3;
    let x: number, y: number;
    if (t < 1) { x = ax; y = top + (mid - top) * t; }
    else if (t < 2) { x = ax + (bx - ax) * (t - 1); y = mid; }
    else { x = bx; y = mid + (bot - mid) * (t - 2); }
    put(edgeN + rowN + i, x + (rand() - 0.5) * 0.015, y + (rand() - 0.5) * 0.015, (rand() - 0.5) * 0.05);
  }
}

const BUILDERS = [instrument, graph, lattice, grid, network, blueprint];

/**
 * Build every formation into one set of attribute arrays: five Float32Arrays of
 * length count*3, plus a per-particle (seed, phase, size) array.
 *
 * All five live on the GPU at once, so changing chapter costs nothing — the
 * vertex shader blends between them from a single uniform.
 */
type Built = { targets: Float32Array[]; rnd: Float32Array };
let cache: { count: number; built: Built } | null = null;

/**
 * Generate the formations across short tasks rather than one blocking build.
 *
 * Building five formations for 22,000 particles is a single long task, and a
 * long task while the page is still settling is exactly the stutter a visitor
 * reads as "heavy". One formation per task lets input and rendering run between
 * them. Idle periods are not a prerequisite: an active page can stay busy long
 * enough to postpone every one of six idle callbacks.
 */
export function prepareFormations(count: number): Promise<void> {
  if (cache?.count === count) return Promise.resolve();
  const nextTask = (cb: () => void) => setTimeout(cb, 0);

  return new Promise((resolve) => {
    const targets: Float32Array[] = [];
    let f = 0;
    const step = () => {
      const arr = new Float32Array(count * 3);
      const put: Writer = (i, x, y, z) => {
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = z;
      };
      BUILDERS[f](count, put, rng(0x5eed + f * 7919));
      targets.push(arr);
      f += 1;
      if (f < FORMATION_COUNT) return nextTask(step);
      cache = { count, built: { targets, rnd: randomAttributes(count) } };
      resolve();
    };
    nextTask(step);
  });
}

function randomAttributes(count: number) {
  const rand = rng(0xc0ffee);
  const rnd = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    rnd[i * 3] = rand(); // seed  — noise offset
    rnd[i * 3 + 1] = rand() * Math.PI * 2; // phase — breathing / twinkle
    rnd[i * 3 + 2] = 0.35 + Math.pow(rand(), 2.2) * 0.9; // size — a few big, many small
  }
  return rnd;
}

export function buildFormations(count: number): Built {
  if (cache?.count === count) return cache.built;
  const targets: Float32Array[] = [];
  for (let f = 0; f < FORMATION_COUNT; f++) {
    const arr = new Float32Array(count * 3);
    const put: Writer = (i, x, y, z) => {
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    };
    BUILDERS[f](count, put, rng(0x5eed + f * 7919));
    targets.push(arr);
  }
  const built = { targets, rnd: randomAttributes(count) };
  cache = { count, built };
  return built;
}

/* ----------------------------------------------------------------------------
   FILAMENTS
   The lines that make the point cloud read as a structure rather than a mist.
   One shared segment buffer, five sets of endpoints, morphed by the same clock.
   -------------------------------------------------------------------------- */
export function buildFilaments(segments: number) {
  const rand = rng(0xf11a);
  const targets: Float32Array[] = [];
  for (let f = 0; f < FORMATION_COUNT; f++) targets.push(new Float32Array(segments * 6));

  // 0 INSTRUMENT — short segments ALONG the strand. Chords across it produced a
  // spiderweb; following the curve produces a wound filament, which is the
  // whole point of the object.
  for (let s = 0; s < segments; s++) {
    const t0 = rand() * Math.PI * 2 * 3;
    const t1 = t0 + 0.06;
    const at = (t: number, o: number) => {
      const r = (1 + 0.34 * Math.cos(3 * t)) * 1.35;
      targets[0][s * 6 + o] = r * Math.cos(2 * t);
      targets[0][s * 6 + o + 1] = r * Math.sin(2 * t) * 0.82 + 0.18 * Math.sin(5 * t);
      targets[0][s * 6 + o + 2] = 0.62 * Math.sin(3 * t) * 1.35;
    };
    at(t0, 0);
    at(t1, 3);
  }
  // 1 GRAPH — spokes between adjacent role orbits
  const radii = [0.85, 1.45, 2.05, 2.6];
  for (let s = 0; s < segments; s++) {
    const ring = Math.floor(rand() * 3);
    const a = rand() * Math.PI * 2;
    const a2 = a + (rand() - 0.5) * 0.8;
    targets[1].set(
      [
        Math.cos(a) * radii[ring],
        0,
        Math.sin(a) * radii[ring],
        Math.cos(a2) * radii[ring + 1],
        0,
        Math.sin(a2) * radii[ring + 1],
      ],
      s * 6
    );
  }
  // 2 LATTICE — the scanning raster
  for (let s = 0; s < segments; s++) {
    const v = (rand() - 0.5) * 3.4;
    const x = 2.2 * (rand() < 0.5 ? -1 : 1);
    targets[2].set([-x, v, 0.2, x * (0.2 + rand() * 0.8), v, 0.2], s * 6);
  }
  // 3 GRID — the streets themselves
  const LINES = 7;
  const span = 4.2;
  for (let s = 0; s < segments; s++) {
    const at = (Math.floor(rand() * LINES) / (LINES - 1) - 0.5) * span;
    if (s % 2 === 0) targets[3].set([-span / 2, -1.05, at, span / 2, -1.05, at], s * 6);
    else targets[3].set([at, -1.05, -span / 2, at, -1.05, span / 2], s * 6);
  }
  // 4 NETWORK — the metro lines, drawn properly
  for (let s = 0; s < segments; s++) {
    const line = METRO[s % METRO.length];
    const i = Math.floor(rand() * (line.length - 1));
    const z = ((s % METRO.length) - 1.5) * 0.16;
    targets[4].set(
      [line[i][0] * 1.15, line[i][1] * 1.15, z, line[i + 1][0] * 1.15, line[i + 1][1] * 1.15, z],
      s * 6
    );
  }
  // 5 BLUEPRINT — card borders and the orthogonal wiring
  for (let seg = 0; seg < segments; seg++) {
    if (seg % 3 !== 0) {
      // a full edge of a card
      const [cx, cy, w, h] = CARDS[seg % CARDS.length];
      const e = seg % 4;
      const pts =
        e === 0 ? [cx - w / 2, cy + h / 2, cx + w / 2, cy + h / 2] :
        e === 1 ? [cx + w / 2, cy + h / 2, cx + w / 2, cy - h / 2] :
        e === 2 ? [cx + w / 2, cy - h / 2, cx - w / 2, cy - h / 2] :
                  [cx - w / 2, cy - h / 2, cx - w / 2, cy + h / 2];
      targets[5].set([pts[0], pts[1], 0, pts[2], pts[3], 0], seg * 6);
    } else {
      // one leg of a connector
      const [a, b] = WIRES[seg % WIRES.length];
      const [ax, ay, , ah] = CARDS[a];
      const [bx, by, , bh] = CARDS[b];
      const top = ay + ah / 2;
      const bot = by - bh / 2;
      const mid = (top + bot) / 2;
      const leg = seg % 3;
      const p =
        leg === 0 ? [ax, top, ax, mid] :
        leg === 1 ? [ax, mid, bx, mid] :
                    [bx, mid, bx, bot];
      targets[5].set([p[0], p[1], 0.02, p[2], p[3], 0.02], seg * 6);
    }
  }
  return targets;
}
