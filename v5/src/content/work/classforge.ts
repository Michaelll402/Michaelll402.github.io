import type { CaseStudy } from "./types";

// Copy derived STRICTLY from docs/facts/classforge.md (mined from the repo at
// github.com/Michaelll402/ClassForge — README, docs/ARCHITECTURE.md, CHANGELOG,
// pom.xml, and the source tree itself). Chapters 04 BREAK and 05 FIX are
// honestly OMITTED: the public history is one squashed commit, so there is no
// verifiable bug story to tell until Michael supplies one.
export const classforge: CaseStudy = {
  slug: "classforge",
  position: "05",
  title: "ClassForge",
  oneLiner:
    "A JavaFX desktop app for designing Java class diagrams, where a class is a real software-design object instead of a rectangle with text in it.",
  contextLine: "Solo build · Java 25 · local-first Windows desktop application",
  role: "Everything: domain, commands, canvas, import, codegen, tests, release",
  stack: [
    "Java",
    "JavaFX 25",
    "JavaParser",
    "Eclipse ELK",
    "Apache PDFBox",
    "JUnit 5",
    "Maven",
  ],
  repoHref: "https://github.com/Michaelll402/ClassForge",
  heroCaption: "Reconstruction, drawn from the codebase",
  product:
    "ClassForge is a free, local-first Windows desktop application for designing Java-oriented UML class diagrams. Instead of treating classes as rectangles with text inside them, it understands the things being designed: classes, interfaces, records, enums, fields, constructors, methods, generics, packages and relationships. The editor knows Java's rules, so it can catch invalid inheritance structures or impossible modifiers before they become code. It imports an existing Java project into a diagram, generates Java source back out of one, auto-arranges with the ELK layout engine, and exports cleanly. No account, no server, no subscription. MIT licensed, version 1.0.0.",
  problem:
    "Making class diagrams for my university projects, I spent more time managing the diagram than thinking about the software: creating boxes, splitting them into sections, choosing the correct arrows, re-routing lines every time I moved a class. The questions I actually cared about — does Student extend Person, should this be an interface, is this an association or a composition — were exactly the ones a generic diagram tool could not help me with. So I built the editor around those questions instead.",
  chapters: [
    {
      num: "01",
      name: "UNDERSTAND",
      title: "The diagram is not the work; the design is",
      story: [
        "Every general-purpose tool treats a class as a decorated rectangle, which pushes the real design questions back onto me: is this inheritance legal, does that field imply an association, what happens to the arrows when I move a class. What I wanted was an editor that knew Java well enough to answer those itself, so I made the unit of work the software-design object rather than the shape.",
      ],
      stepInto: [
        "I put the Java semantics into the domain model itself. In TypeElement I made abstract a kind rather than a modifier, and final, sealed and non-sealed modifier bits whose setters enforce both mutual exclusivity and kind legality — so a record can never carry final, and changing a kind normalizes the impossible bits away. I modelled members as what they actually are: constructors have visibility and parameters but no name and no return type, and enum constants and record components each got a dedicated model instead of being strings in a box.",
      ],
    },
    {
      num: "02",
      name: "DECIDE",
      title: "A strict dependency direction, and a domain with zero UI in it",
      story: [
        "I gave the architecture one rule I was not allowed to break: domain ← command ← persistence/validation/layout/canvas/ui ← app. The domain layer has zero UI or framework dependencies, and everything above it talks through commands and events. That single direction is what kept 131 files navigable — I can test, persist and reason about the model without JavaFX existing at all.",
      ],
      stepInto: [
        "Two decisions I wrote down at the time. First, no index maps inside the document: lookups scan the live lists, which is negligible for the few-hundred-element diagrams I am targeting, and I would rather keep the structure simple than carry an index I have to keep correct. Second, change notification goes through fine-grained immutable DocEvents for element, relationship, package and settings changes, so the canvas, outline, problems panel and autosave all react to one stream instead of reaching into the model.",
      ],
      figure: { art: "classforge", caption: "The dependency direction, drawn from docs/ARCHITECTURE.md" },
    },
    {
      num: "03",
      name: "BUILD",
      title: "Every mutation is a command, so every mistake is an undo",
      story: [
        "I funnelled every change through one editor into an undo manager, so there is no second path that can mutate the document. Multi-part operations compose into single undo steps: creating a connected type is one step, an auto-layout run is one step, and importing a whole Java project collapses into one composite, so undoing it puts the document back exactly as it was.",
      ],
      stepInto: [
        "The command layer is where that decision paid off. MemberListCommand covers add, remove and reorder across all five member sections, and I capture full before/after order snapshots so undo is exact whatever the index conventions do. MoveElementsCommand moves elements and packages in one step with no-op detection. SettingsChangeCommand puts display settings into dirty state, so save → toggle → undo → clean holds for every filter. I derive dirty state from saved-depth plus top-of-stack identity in the undo manager rather than from a boolean I would have to remember to set.",
        "The Java round-trip rides the same machinery. Import walks a project with JavaParser, auto-detects the source roots, skips build directories, and reports per-file diagnostics so one malformed file cannot block the rest of an import. I map extends to inheritance and implements to realization, preserve sealed/permits and bounded generics, and derive associations from fields with multiplicity — Optional becomes 0..1, collections become *. Generation goes the other way: File ▸ Generate Java writes a per-package directory layout with resolved imports, and renders enums, records, sealed types and interfaces correctly.",
      ],
    },
    {
      num: "06",
      name: "VERIFY",
      title: "43 test classes, and a guard against stale layout",
      story: [
        "I have 43 JUnit 5 test classes across the domain, commands, canvas interaction, route planning, code generation, import, persistence and validation. The layering is what made that practical: because the domain carries no framework dependencies, I can test most of the system without a UI running at all.",
      ],
      stepInto: [
        "One check lives in the architecture rather than in a test. The document carries a monotonically increasing revision counter, and the layout coordinator compares it to spot stale results — if an auto-layout finishes after the diagram has already changed, I throw the result away instead of applying it. Route planning, canvas interaction and generation each have their own test class (RoutePlannerTest, DiagramCanvasInteractionTest, CodeGenerationTest).",
      ],
    },
    {
      num: "07",
      name: "SHIP",
      title: "1.0.0: documented, licensed, released",
      story: [
        "I shipped it as 1.0.0 with the things I would want if I were picking the tool up myself: a written architecture document, a user guide, a changelog of user-visible changes, an MIT license with third-party notices, an example document, and release build tooling. I also versioned the file format, so diagrams saved today keep loading as it changes.",
      ],
      stepInto: [
        "None of that is something you have to take on trust — it is all in the repository. docs/ARCHITECTURE.md and docs/USER-GUIDE.md are documents I keep current, CHANGELOG.md records what 1.0.0 actually contains, tools/build-release.ps1 produces the distributable, and the persistence DTO carries an explicit schema version (currently 2) with mappers that keep older files loading.",
      ],
    },
  ],
  omittedAfterIndex: 2,
  omitted: {
    label: "04 BREAK · 05 FIX",
    note: "Omitted. The public history is a single squashed commit, so there is no verifiable debugging story to replay here yet. When there is a real one, it will be written the way the others are — from the evidence.",
  },
  learned:
    "That a strict dependency direction is something you can feel while working. Once I had a domain layer with zero UI dependencies and a single command path for every mutation, undo, autosave, dirty state and testing fell out of the structure instead of being things I had to fight for afterwards.",
  improve:
    "Take it beyond Windows — I built it Windows-only, and the JavaFX stack can carry it further than that. And keep the engineering history properly from day one: this replay is missing its BREAK and FIX chapters because I squashed the history, and I would rather have the record.",
  metaTitle: "ClassForge · Michael Tawfik",
  metaDescription:
    "ClassForge: a JavaFX desktop app for Java UML class diagrams — layered architecture, command-pattern undo, Java import and code generation, 43 test classes.",
  next: { title: "Customer Support Ticketing SaaS", href: "/work/support" },
};
