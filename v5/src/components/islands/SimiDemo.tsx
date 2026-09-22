// D-simiutopia (motion.md): movement scrub along an L-route.
// Implements the described mechanism for real: straight + quadratic + straight,
// parameterized by distance; position, tangent, and speed scale all come from
// one distance value. 16-sample curve-length approximation, like the source.
import { useMemo, useState } from "react";

const P0 = { x: 60, y: 90 };
const P1 = { x: 400, y: 90 };
const C = { x: 480, y: 90 };
const P2 = { x: 480, y: 170 };
const P3 = { x: 480, y: 250 };
const SAMPLES = 16;

function quadPoint(t: number) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return { x: a * P1.x + b * C.x + c * P2.x, y: a * P1.y + b * C.y + c * P2.y };
}
function quadTangent(t: number) {
  const dx = 2 * (1 - t) * (C.x - P1.x) + 2 * t * (P2.x - C.x);
  const dy = 2 * (1 - t) * (C.y - P1.y) + 2 * t * (P2.y - C.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export default function SimiDemo() {
  const model = useMemo(() => {
    const l1 = Math.hypot(P1.x - P0.x, P1.y - P0.y);
    // curve length ≈ sum over 16 samples (the source's approximation count)
    let lc = 0;
    let prev = quadPoint(0);
    const samplePts = [] as { x: number; y: number }[];
    for (let i = 1; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const p = quadPoint(t);
      samplePts.push(p);
      lc += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
    }
    const l3 = Math.hypot(P3.x - P2.x, P3.y - P2.y);
    return { l1, lc, l3, total: l1 + lc + l3, samplePts };
  }, []);

  const [dist, setDist] = useState(0);
  const [showSamples, setShowSamples] = useState(false);

  const d = (dist / 100) * model.total;
  let pos: { x: number; y: number };
  let tan: { x: number; y: number };
  let speed = 1;
  if (d <= model.l1) {
    pos = { x: P0.x + (d / model.l1) * (P1.x - P0.x), y: P0.y };
    tan = { x: 1, y: 0 };
  } else if (d <= model.l1 + model.lc) {
    const u = (d - model.l1) / model.lc;
    pos = quadPoint(u);
    tan = quadTangent(u);
    // speed scale dips through the curve zone (demo's own fixed constants)
    speed = 1 - 0.4 * Math.sin(Math.PI * u);
  } else {
    const u = (d - model.l1 - model.lc) / model.l3;
    pos = { x: P2.x, y: P2.y + u * (P3.y - P2.y) };
    tan = { x: 0, y: 1 };
  }
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;

  return (
    <figure className="demo-panel">
      <figcaption className="demo-head">
        <span className="demo-label">Demo · movement scrub</span>
        <span className="demo-nojs-note">Static view · interactive with JavaScript</span>
        <button
          type="button"
          className="demo-reset demo-js-only"
          onClick={() => {
            setDist(0);
            setShowSamples(false);
          }}
        >
          Reset
        </button>
      </figcaption>
      <div className="demo-body">
        <div className="scrub-figure">
          <svg viewBox="0 0 640 300" aria-hidden="true">
            <path
              d={`M${P0.x} ${P0.y} L${P1.x} ${P1.y} Q${C.x} ${C.y} ${P2.x} ${P2.y} L${P3.x} ${P3.y}`}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="3"
            />
            <rect x={P0.x - 7} y={P0.y - 7} width="14" height="14" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2" />
            <rect x={P3.x - 7} y={P3.y - 7} width="14" height="14" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2" />
            <text x={P0.x - 8} y={P0.y - 18} fontFamily="var(--font-mono)" fontSize="14" fill="var(--ink-2)">
              STOP A
            </text>
            <text x={P3.x + 20} y={P3.y + 4} fontFamily="var(--font-mono)" fontSize="14" fill="var(--ink-2)">
              STOP B
            </text>
            {showSamples &&
              model.samplePts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--acc-deep)" />)}
            <line x1={pos.x} y1={pos.y} x2={pos.x + tan.x * 52} y2={pos.y + tan.y * 52} stroke="var(--acc-deep)" strokeWidth="2" />
            <path
              d={`M${pos.x + tan.x * 52} ${pos.y + tan.y * 52} l-9 -4 v8 z`}
              fill="var(--acc-deep)"
              transform={`rotate(${angle} ${pos.x + tan.x * 52} ${pos.y + tan.y * 52})`}
            />
            <g transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}>
              <rect x="-16" y="-10" width="32" height="20" fill="var(--ink)" />
            </g>
          </svg>
        </div>

        <div className="scrub-controls">
          <label className="scrub-label" htmlFor="simi-distance">
            Distance along path
          </label>
          <input
            id="simi-distance"
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={dist}
            onChange={(e) => setDist(Number(e.target.value))}
            aria-describedby="simi-readout"
          />
          <p className="scrub-readout" id="simi-readout" aria-live="polite">
            d = {Math.round(d)} / {Math.round(model.total)} · speed scale {speed.toFixed(2)}
          </p>
          <label className="scrub-toggle demo-js-only">
            <input type="checkbox" checked={showSamples} onChange={(e) => setShowSamples(e.target.checked)} />
            Show the 16 curve-length samples
          </label>
        </div>
      </div>
    </figure>
  );
}
