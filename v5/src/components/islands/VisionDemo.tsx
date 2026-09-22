// D-vision (motion.md): pipeline stepper FRAME → DETECT → CLASSIFY → LOG.
// Teaches: separate responsibilities with clean handoffs. Synthetic data only.
import { useState } from "react";

const STAGES = [
  {
    key: "FRAME",
    input: "The webcam stream, one frame at a time",
    job: "OpenCV captures the frame and hands it to the pipeline",
    output: "A frame ready for face detection",
  },
  {
    key: "DETECT",
    input: "The captured frame",
    job: "Find the face region, match its embedding against enrolled people (DeepFace, pretrained)",
    output: "An identity match for the synthetic subject",
  },
  {
    key: "CLASSIFY",
    input: "The matched face region",
    job: "Run the pretrained emotion head over the region",
    output: "One label: happy, sad, or neutral",
  },
  {
    key: "LOG",
    input: "Identity plus timestamp plus emotion",
    job: "Write the attendance row to SQLite and append the CSV line",
    output: "A durable record in both stores",
  },
];

function StageArt({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <rect x="30" y="8" width="140" height="104" fill="none" stroke="var(--line)" strokeWidth="2" />
      {stage === 0 && <circle cx="100" cy="56" r="24" fill="none" stroke="var(--ink-2)" strokeWidth="2" />}
      {stage >= 1 && (
        <g>
          <circle cx="100" cy="56" r="24" fill="none" stroke="var(--acc)" strokeWidth="2" />
          <circle cx="92" cy="50" r="2.5" fill="var(--acc)" />
          <circle cx="108" cy="50" r="2.5" fill="var(--acc)" />
          <path d="M92 66q8 7 16 0" fill="none" stroke="var(--acc)" strokeWidth="2" />
        </g>
      )}
      {stage === 1 && (
        <rect x="68" y="24" width="64" height="64" fill="none" stroke="var(--acc-deep)" strokeWidth="2" strokeDasharray="6 4" />
      )}
      {stage === 2 && (
        <text x="100" y="106" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" fill="var(--acc-deep)">
          HAPPY ▸
        </text>
      )}
      {stage === 3 && (
        <g stroke="var(--line)" strokeWidth="6">
          <line x1="48" y1="40" x2="152" y2="40" />
          <line x1="48" y1="60" x2="152" y2="60" />
          <line x1="48" y1="80" x2="152" y2="80" />
        </g>
      )}
    </svg>
  );
}

export default function VisionDemo() {
  const [stage, setStage] = useState(0);
  const s = STAGES[stage];

  return (
    <figure className="demo-panel">
      <figcaption className="demo-head">
        <span className="demo-label">Demo · pipeline stepper</span>
        <span className="demo-nojs-note">Static view · interactive with JavaScript</span>
        <button type="button" className="demo-reset demo-js-only" onClick={() => setStage(0)}>
          Reset
        </button>
      </figcaption>
      <div className="demo-body">
        <div
          className="demo-chips"
          role="group"
          aria-label="Pipeline stages"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setStage((v) => Math.min(3, v + 1));
            if (e.key === "ArrowLeft") setStage((v) => Math.max(0, v - 1));
          }}
        >
          {STAGES.map((st, i) => (
            <button
              key={st.key}
              type="button"
              className="demo-chip"
              aria-pressed={i === stage}
              aria-current={i === stage ? "step" : undefined}
              onClick={() => setStage(i)}
            >
              {String(i + 1).padStart(2, "0")} {st.key}
            </button>
          ))}
        </div>

        <div className="stepper-card">
          <div className="stepper-visual">
            <StageArt stage={stage} />
          </div>
          <dl className="stepper-facts" aria-live="polite">
            <div>
              <dt>Input</dt>
              <dd>{s.input}</dd>
            </div>
            <div>
              <dt>Job</dt>
              <dd>{s.job}</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>{s.output}</dd>
            </div>
          </dl>
        </div>

        {stage === 3 && (
          <pre className="stepper-rows">{`attendance.db   | 17 · SYNTHETIC SUBJECT · 09:04:12 · happy
attendance_log.csv | 17,SYNTHETIC SUBJECT,09:04:12,happy`}</pre>
        )}

        <div className="stepper-nav demo-js-only">
          <button type="button" className="demo-chip" onClick={() => setStage((v) => Math.max(0, v - 1))} disabled={stage === 0}>
            ← Back
          </button>
          <button type="button" className="demo-chip" onClick={() => setStage((v) => Math.min(3, v + 1))} disabled={stage === 3}>
            Next →
          </button>
        </div>

        <p className="demo-footnote">Synthetic frame. No real faces or attendance data appear on this site.</p>
      </div>
    </figure>
  );
}
