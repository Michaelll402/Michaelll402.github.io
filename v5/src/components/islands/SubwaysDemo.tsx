// D-subways (motion.md): legal-move evaluation on the five pinned fixture stations
// (stations.json @ f51f2c6: 23 B · 24 C · 25 A+train · 29 D · 30 ?).
// Re-implements the real chain in the real order: card match → unvisited →
// adjacency → duplicate edge → diagonal crossing. First veto names its reason.
import { useEffect, useRef, useState } from "react";

const CELL = 110;
const OX = 90;
const OY = 90;
const STATIONS = [
  { id: 23, gx: 4, gy: 4, type: "B" },
  { id: 24, gx: 5, gy: 4, type: "C" },
  { id: 25, gx: 6, gy: 4, type: "A", train: true },
  { id: 29, gx: 5, gy: 5, type: "D" },
  { id: 30, gx: 6, gy: 5, type: "?" },
].map((s) => ({ ...s, x: OX + (s.gx - 4) * CELL, y: OY + (s.gy - 4) * CELL }));
const BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

const CANDIDATES: [number, number][] = [
  [23, 24],
  [24, 25],
  [24, 29],
  [24, 30],
  [25, 30],
  [29, 30],
  [23, 29],
  [25, 29],
];
const CARDS = ["A", "B", "C", "D", "JOKER"] as const;
type Card = (typeof CARDS)[number];

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const CHECKS = ["Card match", "Unvisited", "Adjacent", "No duplicate edge", "No diagonal cross"];

interface GameState {
  edges: string[];
  visited: number[];
  endpoints: number[];
}
const INITIAL: GameState = { edges: [edgeKey(23, 24)], visited: [23, 24], endpoints: [23, 24] };

function evaluate(a: number, b: number, card: Card, st: GameState) {
  // orient: source = an endpoint end; target = the other
  let source = a;
  let target = b;
  if (!st.endpoints.includes(source)) [source, target] = [b, a];
  const S = BY_ID.get(source)!;
  const T = BY_ID.get(target)!;
  const results: { state: "pass" | "fail"; reason?: string }[] = [];
  const fail = (reason: string) => {
    results.push({ state: "fail", reason });
    return { source, target, results, legal: false };
  };
  // 1 card match (joker card matches all; "?" station accepts any card)
  if (card !== "JOKER" && T.type !== "?" && T.type !== card)
    return fail(`Card ${card} only reaches ${card} stations; station ${T.id} is type ${T.type}`);
  results.push({ state: "pass" });
  // 2 unvisited
  if (st.visited.includes(T.id)) return fail(`Station ${T.id} is already on the line`);
  results.push({ state: "pass" });
  // 3 adjacency
  if (Math.abs(S.gx - T.gx) > 1 || Math.abs(S.gy - T.gy) > 1)
    return fail(`Stations ${S.id} and ${T.id} are not one step apart`);
  results.push({ state: "pass" });
  // 4 duplicate edge
  if (st.edges.includes(edgeKey(S.id, T.id))) return fail("That segment is already built");
  results.push({ state: "pass" });
  // 5 diagonal crossing
  const isDiag = S.gx !== T.gx && S.gy !== T.gy;
  if (isDiag) {
    const other1 = STATIONS.find((s) => s.gx === S.gx && s.gy === T.gy);
    const other2 = STATIONS.find((s) => s.gx === T.gx && s.gy === S.gy);
    if (other1 && other2 && st.edges.includes(edgeKey(other1.id, other2.id)))
      return fail(`It would cross the ${other1.id}–${other2.id} segment`);
  }
  results.push({ state: "pass" });
  return { source, target, results, legal: true };
}

export default function SubwaysDemo() {
  const [card, setCard] = useState<Card>("A");
  const [game, setGame] = useState<GameState>(INITIAL);
  const [checks, setChecks] = useState<("idle" | "pass" | "fail")[]>(Array(5).fill("idle"));
  const [reason, setReason] = useState("");
  const [verdict, setVerdict] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const attempt = (a: number, b: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const st = game;
    if (!st.endpoints.includes(a) && !st.endpoints.includes(b)) {
      setChecks(Array(5).fill("idle"));
      setReason("");
      setVerdict(`No permitted source: neither ${a} nor ${b} is a line endpoint`);
      return;
    }
    const ev = evaluate(a, b, card, st);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setChecks(Array(5).fill("idle"));
    setReason("");
    setVerdict("");
    const finalize = () => {
      if (ev.legal) {
        setVerdict(`Segment ${ev.source}–${ev.target} committed`);
        setGame((g) => ({
          edges: [...g.edges, edgeKey(ev.source, ev.target)],
          visited: [...g.visited, ev.target],
          endpoints: g.endpoints.map((e) => (e === ev.source ? ev.target : e)),
        }));
      } else {
        setVerdict("Move vetoed");
        setReason(ev.results[ev.results.length - 1].reason ?? "");
      }
    };
    if (reduced) {
      setChecks([
        ...ev.results.map((r) => r.state),
        ...Array(5 - ev.results.length).fill("idle"),
      ] as ("idle" | "pass" | "fail")[]);
      finalize();
      return;
    }
    ev.results.forEach((r, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setChecks((prev) => {
            const next = [...prev];
            next[i] = r.state;
            return next;
          });
          if (i === ev.results.length - 1) finalize();
        }, 90 * (i + 1))
      );
    });
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setGame(INITIAL);
    setChecks(Array(5).fill("idle"));
    setReason("");
    setVerdict("");
    setCard("A");
  };

  return (
    <figure className="demo-panel">
      <figcaption className="demo-head">
        <span className="demo-label">Demo · legal-move evaluation</span>
        <span className="demo-nojs-note">Static view · interactive with JavaScript</span>
        <button type="button" className="demo-reset demo-js-only" onClick={reset}>
          Reset
        </button>
      </figcaption>
      <div className="demo-body">
        <div className="board-row">
          <div className="board-figure">
            <svg
              viewBox="0 0 420 300"
              role="group"
              aria-label="Fixture board: five stations with one built segment. Pick a card, then activate a dashed segment to run the rule chain on it."
            >
              {Array.from({ length: 4 }, (_, i) => (
                <line key={`v${i}`} x1={35 + i * CELL} y1="20" x2={35 + i * CELL} y2="280" stroke="var(--line)" strokeWidth="1" />
              ))}
              {Array.from({ length: 3 }, (_, i) => (
                <line key={`h${i}`} x1="20" y1={35 + i * CELL} x2="400" y2={35 + i * CELL} stroke="var(--line)" strokeWidth="1" />
              ))}
              {CANDIDATES.map(([a, b]) => {
                const A = BY_ID.get(a)!;
                const B = BY_ID.get(b)!;
                const committed = game.edges.includes(edgeKey(a, b));
                const clickable = !committed && (game.endpoints.includes(a) || game.endpoints.includes(b));
                return (
                  <g key={`${a}-${b}`}>
                    <line
                      x1={A.x}
                      y1={A.y}
                      x2={B.x}
                      y2={B.y}
                      stroke={committed ? "var(--acc)" : "var(--line)"}
                      strokeWidth={committed ? 4 : 1.5}
                      strokeDasharray={committed ? undefined : "6 6"}
                    />
                    {clickable && (
                      <line
                        className="board-segment demo-js-only"
                        x1={A.x}
                        y1={A.y}
                        x2={B.x}
                        y2={B.y}
                        stroke="transparent"
                        strokeWidth="44"
                        tabIndex={0}
                        role="button"
                        aria-label={`Try segment ${a} to ${b}`}
                        onClick={() => attempt(a, b)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            attempt(a, b);
                          }
                        }}
                      />
                    )}
                  </g>
                );
              })}
              {STATIONS.map((s) => (
                <g key={s.id} transform={`translate(${s.x},${s.y})`}>
                  <circle
                    r="15"
                    fill={game.visited.includes(s.id) ? "var(--paper)" : "var(--paper-2)"}
                    stroke={game.endpoints.includes(s.id) ? "var(--acc-deep)" : "var(--ink)"}
                    strokeWidth={game.endpoints.includes(s.id) ? 3 : 2}
                  />
                  <text y="5" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="14" fontWeight="500" fill="var(--ink)">
                    {s.type}
                  </text>
                  <text y="-22" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="14" fill="var(--ink-2)">
                    {s.id}
                  </text>
                  {s.train && (
                    <text y="36" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" fill="var(--ink-2)">
                      TRAIN
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div>
            <p className="rules-label">Card drawn</p>
            <div className="demo-chips" role="radiogroup" aria-label="Card">
              {CARDS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={card === c} className="demo-chip" onClick={() => setCard(c)}>
                  {c}
                </button>
              ))}
            </div>
            <p className="rules-label checks-label">Check chain</p>
            <ul className="check-list">
              {CHECKS.map((c, i) => (
                <li key={c} className="check-item" data-state={checks[i] === "idle" ? undefined : checks[i]}>
                  {checks[i] === "pass" ? "✓ " : checks[i] === "fail" ? "✕ " : ""}
                  {c}
                  {checks[i] === "fail" && reason && <span className="check-reason">{reason}</span>}
                </li>
              ))}
            </ul>
            <p className="demo-status" role="status" aria-live="polite">
              {verdict && <span className={verdict.includes("committed") ? "ok" : "no"}>{verdict}</span>}
            </p>
            <p className="demo-status" aria-hidden="true">
              <span className="no">
                SEGMENTS {game.edges.length} · VISITED {game.visited.join(" ")} · ENDPOINTS {game.endpoints.join(" ")}
              </span>
            </p>
          </div>
        </div>

        <p className="demo-footnote">
          Stations 23, 24, 25, 29, 30 from the pinned stations.json fixture. Data authorship
          unresolved; used as rule-geometry fixtures only.
        </p>
      </div>
    </figure>
  );
}
