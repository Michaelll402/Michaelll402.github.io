import type { CaseStudy } from "./types";

// Copy transcribed VERBATIM from docs/content/replay-vision.md (LOCKED).
// Chapters 04 BREAK and 05 FIX are honestly OMITTED (see omitted note).
export const vision: CaseStudy = {
  slug: "vision",
  position: "02",
  title: "Face Recognition Attendance",
  oneLiner:
    "A Python desktop prototype that watches a webcam, recognizes enrolled faces, logs attendance, and reads the visible emotion.",
  contextLine: "Built during the Intro to AI & Computer Vision summer program, Pixels Egypt",
  role: "Solo build: the application flow from camera to database",
  stack: [
    "Python 3.10",
    "OpenCV",
    "DeepFace",
    "TensorFlow/Keras",
    "Scikit-learn",
    "NumPy",
    "Pandas",
    "Tkinter",
    "SQLite",
  ],
  repoHref: "https://github.com/Michaelll402/face-recognition-attendance",
  heroCaption: "Synthetic reconstruction. No real faces or attendance data appear on this site.",
  product:
    "Point a webcam at a doorway and attendance writes itself. The prototype captures frames with OpenCV, matches faces against enrolled people using DeepFace's pretrained recognition, and classifies the visible emotion as happy, sad, or neutral. Each recognition becomes an attendance row in SQLite and a line in a CSV export, so the data is queryable and portable at the same time. A Tkinter interface runs the show on the desktop. It's a working prototype from a summer program, not a hosted product, and this page treats it as exactly that.",
  problem:
    "A vision pipeline is easy to demo and easy to overstate. Mine chains four different jobs: capture frames, find and match faces, classify emotion, persist attendance. The engineering problem worth showing is keeping those four responsibilities separate and understandable, so each stage can change without breaking the others. The honesty problem sits next to it: the recognition and emotion models are pretrained. My work is the integration, the structure, and the data flow. Not the models. This page keeps that line sharp.",
  chapters: [
    {
      num: "01",
      name: "UNDERSTAND",
      title: "Four questions between the camera and the database",
      story: [
        "Attendance is a pipeline with a camera at one end and a database at the other. Between them, every frame has to answer three questions in order. Is there a face? Whose is it? What does their expression look like right now? Each question needs different machinery: OpenCV for capture and detection, DeepFace's pretrained embeddings for matching, a CNN classifier for emotion. And the answers are worthless if they evaporate, so recognition has to end in a durable record. Understanding the project meant seeing it as four stages with clean handoffs, not one clever loop.",
      ],
      stepInto: [
        "The stage boundaries: capture produces frames. Detection and recognition consume frames, produce an identity match against enrolled faces. Emotion classification consumes the face region, produces one of happy, sad, neutral. Persistence consumes identity plus timestamp, writes SQLite and CSV. The source audit also records bounded threading and caching in the flow, keeping capture responsive while inference runs. Each stage only knows its input and output, which is what made the code explainable after the program ended.",
      ],
    },
    {
      num: "02",
      name: "DECIDE",
      title: "Pretrained models, and saying so",
      story: [
        "Two decisions shaped the build, and both are visible in the code. First: use pretrained models. DeepFace for recognition, an existing CNN for emotion. A summer program is not the place to train a face model, and pretending otherwise would've produced something worse than honest reuse. My contribution is the system around the models. Second: structure the code as classes along the pipeline's own joints. A vision layer, a classification layer, a data layer. Third, smaller: write attendance to SQLite and CSV at the same time, because a database is queryable and a CSV file is portable.",
      ],
      stepInto: [
        "What \"pretrained\" means concretely: I ship inference, not training. No dataset was assembled, no weights were tuned, and no accuracy number exists for this system because I never measured one on a declared dataset. Claiming a percentage without that would be fiction. The OOP split mirrors the stage handoffs from chapter 01, so the class diagram and the data flow are the same picture.",
      ],
    },
    {
      num: "03",
      name: "BUILD",
      title: "A loop that ends in a durable row",
      story: [
        "The build chains the stages into a loop that runs live. OpenCV opens the webcam and streams frames. Each frame passes through detection; when a face matches an enrolled person, the pipeline classifies the expression and writes the attendance row with both storage targets. The Tkinter window shows what the camera sees and what the system concluded. The stepper below walks the exact path a frame travels: capture, detect and match, classify, log. Step through it yourself. That handoff chain is the whole system.",
      ],
      stepInto: [
        "The loop in sequence: frame in, faces found, embedding compared against enrolled entries, emotion head run on the matched face region, row out. SQLite gets the structured insert (attendance.db), the CSV log (attendance_log.csv) gets the same event for spreadsheet users. Threading keeps the capture loop from blocking on inference, with caching bounding repeated work per subject.",
      ],
      demo: "vision",
    },
    {
      num: "06",
      name: "VERIFY",
      title: "The short, true list",
      story: [
        "Here's the honest state of verification: there isn't much. No automated test suite. No CI. No measured accuracy, frame rate, or benchmark, because measuring those properly needs a declared dataset and a protocol, and that work hasn't been done. What exists is a working prototype, a structured codebase, and a report. I'd rather show you a short, true list than a long, decorated one. If I extend this project, testing starts at the persistence layer, the one stage you can verify without a camera in the loop.",
      ],
      stepInto: [
        "Why persistence first: it's deterministic. Given an identity and a timestamp, the SQLite insert and CSV append either happen correctly or they don't, no model in the way. Recognition accuracy would need an enrolled test set and agreed thresholds; publishing a number without that methodology would be noise dressed as rigor.",
      ],
    },
    {
      num: "07",
      name: "SHIP",
      title: "A prototype, presented carefully",
      story: [
        "This project ships as a desktop prototype with a public repository, and that's the claim, all of it. No hosted service, no production deployment, no pilot at a real front desk. One boundary I hold on this site: privacy. The repository is public, but no real face, attendance row, or cached representation appears here. Every visual on this page is a synthetic reconstruction and is labeled as one. A system whose whole job is recognizing people should be presented by someone careful about people's data.",
      ],
      stepInto: [
        "The privacy boundary in practice: demo imagery is abstract glyphs, the pipeline stepper runs on synthetic data, and the attendance rows shown are invented examples marked as examples. The one place that rule bends reality: you can't see the real UI here. The repository and its Report.pdf carry the deeper detail.",
      ],
    },
  ],
  omittedAfterIndex: 2,
  omitted: {
    label: "04 BREAK · 05 FIX",
    note: "Chapters 04 and 05 are missing on purpose. No verifiable failure story exists for this project, and I won't invent one.",
  },
  learned:
    "Integration is its own discipline. The models were the easy part; the system around them, clean stage boundaries, durable records, a responsive loop, is what made it work. I also learned to say \"pretrained\" out loud. The distinction between using a model and building one costs nothing to admit and everything to blur.",
  improve:
    "Test the persistence layer first, since it's verifiable without a camera. Then, if the project grows up, do the measurement work properly: a declared enrollment set, a fixed protocol, and only then a published accuracy number. Until that exists, this page stays number-free on purpose.",
  next: { title: "Simiutopia", href: "/work/simiutopia" },
  metaTitle: "Face Recognition Attendance · Michael Tawfik",
  metaDescription:
    "A Python webcam pipeline: OpenCV capture, pretrained recognition, emotion classification, and attendance persisted to SQLite and CSV.",
};
