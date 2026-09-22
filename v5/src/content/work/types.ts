// Case-study content model. All strings come VERBATIM from docs/content/replay-<slug>.md
// (locked Phase 0). Components render; they never write copy.

export type Accent = "support" | "vision" | "simiutopia" | "subways" | "classforge";

export interface ChapterContent {
  num: string; // "01"
  name: string; // "UNDERSTAND"
  title: string; // display title
  story: string[]; // story-layer paragraphs (≤120 words total per chapter)
  stepInto: string[]; // deep-layer paragraphs
  /** id of a figure slot rendered between story and step-into */
  figure?: { art: Accent | "support-flow"; caption: string };
  /** signature demo slot (rendered after step-into) */
  demo?: Accent;
}

export interface OmittedNote {
  label: string; // e.g. "04 BREAK · 05 FIX"
  note: string; // exact omission copy from site-copy.md
}

export interface CaseStudy {
  slug: Accent;
  position: string; // "01" … "04"
  title: string;
  oneLiner: string;
  contextLine: string;
  role: string;
  stack: string[];
  repoHref: string;
  heroCaption: string;
  product: string;
  problem: string;
  chapters: ChapterContent[];
  /** where the omitted-note aside renders: index into chapters AFTER which it appears */
  omittedAfterIndex?: number;
  omitted?: OmittedNote;
  learned: string;
  improve: string;
  next: { title: string; href: string };
  metaTitle: string;
  metaDescription: string;
}
