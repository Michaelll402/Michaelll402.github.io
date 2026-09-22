import type { CaseStudy } from "./types";

// Copy transcribed VERBATIM from docs/content/replay-subways.md (LOCKED).
// Chapter 05 FIX is honestly OMITTED (see omitted note).
export const subways: CaseStudy = {
  slug: "subways",
  position: "04",
  title: "Subways of Budapest",
  oneLiner:
    "A browser strategy game where you draw station cards and build one metro line at a time across a 10×10 Budapest grid.",
  contextLine: "Individual university assignment. Vanilla JavaScript by requirement: no frameworks, no libraries",
  role: "The integrated implementation: rules, geometry, state, interface",
  stack: ["HTML5", "CSS3", "Vanilla JavaScript", "JSON data", "LocalStorage"],
  repoHref: "https://github.com/Michaelll402/subways-of-budapest",
  heroCaption: "Reconstruction, drawn from the rule pipeline",
  product:
    "Subways of Budapest adapts the board game Next Station: London to Budapest's geography. You play the four metro lines M1 to M4 in sequence. Each turn deals a station card: a letter, a Joker, or a Switch. Legal target stations light up green. You draw one segment, maybe spend your line's pencil power, and the round ends after eight cards, or five of one platform type. Scoring multiplies districts visited by the largest district's station count, then adds Danube crossings and bonuses. High scores persist in LocalStorage. The assignment required plain HTML, CSS, and JavaScript, and that constraint shaped everything.",
  problem:
    "One click on a station has to satisfy four kinds of state at once. The card decides which station types you may target. The route decides which stations are already visited and where your endpoints are. The pencil power can bend the rules. And the geometry polices the board: no passing through stations, no crossing diagonals, no duplicate edges. An illegal click must change nothing. A legal one must update segments, visited stations, endpoints, counters, and turn state together. Half-applied moves corrupt the board permanently, because in a rules game, state is the game.",
  chapters: [
    {
      num: "01",
      name: "UNDERSTAND",
      title: "A rulebook read as predicates",
      story: [
        "I started by treating the board game's rulebook as a specification. Every rule became a predicate over game state. \"You may only build from an endpoint of your current line\" is a predicate on the route. \"The card must match the target's station type\" is a predicate on the card and the station. \"Segments may not cross\" is a predicate on geometry. Reading the rules this way exposed the real structure: a legal move is not one check but a chain of them, and the chain has an order, from cheap set lookups to geometric tests.",
      ],
      stepInto: [
        "The rule inventory, as implemented: permitted sources come from the current line's endpoints (or, under Switch, from visited stations). Targets must be unvisited and match the drawn card's letter, or the card is a Joker. Then geometry: the segment must be horizontal, vertical, or diagonal; must not pass through an intermediate station; must not duplicate an existing edge; must not cross an existing diagonal. Only a target that survives the whole chain lights up. (source: js/script.js lines 455 to 519)",
      ],
    },
    {
      num: "02",
      name: "DECIDE",
      title: "Compute every legal move before the click",
      story: [
        "The design decision that defines the game: compute every legal move before the player clicks, instead of validating after. Each turn, the code enumerates permitted sources, filters candidate targets through the card and route predicates, then runs the geometry checks, and the survivors glow green on the board. The alternative, validate on click and show an error, is easier to write and worse to play; you'd probe the board by trial and rejection. Precomputing turns the rulebook into something you can see. It also concentrates all rule knowledge in one pipeline, which kept the vanilla JavaScript honest.",
      ],
      stepInto: [
        "Precompute-then-commit also creates a clean transactional shape: between turns, the legal set is fixed, so a click on a lit station can commit immediately with no re-validation race, and a click anywhere else is a no-op by construction. The cost is bookkeeping: the legal set must be rebuilt whenever card, route, or power state changes. The benefit is that an illegal state transition has no code path that could produce it. (transition source: lines 784 to 877)",
      ],
    },
    {
      num: "03",
      name: "BUILD",
      title: "Cheap checks first, geometry last",
      story: [
        "The pipeline runs in stages, cheapest first. Set membership: which stations are permitted sources, which targets match the card and aren't visited. Then adjacency along the eight directions. Then the two geometric police: duplicate-edge detection and diagonal-crossing detection, walking existing segments. An accepted click commits everything at once: the new segment, the visited set, the line's endpoints, the counters, the turn state. Try it below. The demo runs this exact evaluation on five real stations from the game's data; pick a card, click a segment, and watch which rule passes or vetoes it.",
      ],
      stepInto: [
        "Diagonal-crossing check: two diagonal segments cross when they occupy the same grid cell on opposite diagonals, so the check tests intersecting cell-pairs against stored segments rather than solving line equations; integer grid work, no floating point. Duplicate-edge check normalizes segment endpoints so A→B and B→A are one edge. Pass-through check walks intermediate grid points on the segment and rejects if any holds a station. (geometry source: lines 948 to 1027)",
      ],
      demo: "subways",
    },
    {
      num: "04",
      name: "BREAK",
      title: "The flaw I didn't catch",
      story: [
        "I'll show you a flaw I didn't catch while building. It surfaced later, when this portfolio's evidence base was assembled by reading the source, and I haven't reproduced it in play, so I'm calling it what it is: an inferred design flaw. In Switch mode, several visited stations can all legally reach the same target. The lookup table that records \"which source leads to this target\" keeps one source per target. Whichever source the enumeration visits last wins, silently. The interface can then only ever offer one of the candidate edges, and the player never knows another existed.",
      ],
      stepInto: [
        "Mechanically: `legalFrom` is keyed by target ID and assigned during source enumeration, so a later source overwrites an earlier one for the same target (lines 743 to 779). The structure should be target → list of sources, with the interface letting the player disambiguate. Worth stating plainly: this is a data-structure choice quietly discarding legal moves, found by inspection, unconfirmed at runtime. Both the code and this description are public, which is the point of this page. (05 FIX is omitted: the fix does not exist yet.)",
      ],
    },
    {
      num: "06",
      name: "VERIFY",
      title: "No tests, and the reason why",
      story: [
        "The honest verification story is short: there are no automated tests and no CI in this repository. The rule pipeline is verifiable today only by reading it, which is why this page links straight into the source lines. The obstacle is structural. The predicates read global game state and write DOM feedback directly, so there's no seam where a test could call them with a synthetic board and assert on the result. That's the single most instructive mistake in this project, and unlike the Switch flaw, I can't claim inspection found it; the coupling is visible in every function signature.",
      ],
      stepInto: [
        "What testability would require: the rule chain refactored into pure functions over an explicit state object, board state in, verdict out, with DOM updates driven by the verdict afterwards. The current shape interleaves them. The demo on this page is, in a sense, the first test harness this rule chain has had: it re-implements the chain against fixture stations and makes the verdict inspectable. The original code deserves the same treatment natively.",
      ],
    },
    {
      num: "07",
      name: "SHIP",
      title: "Shipped plain, claimed precisely",
      story: [
        "The game ships as a static browser page: open it, draw cards, build lines, and your high scores persist in LocalStorage. No build step, no dependencies, exactly as the assignment demanded. One boundary I want on the record: this was an assignment, and the two-commit history can't cleanly separate supplied material, like starter structure, station data, rule text, and images, from what I wrote. The rule pipeline and state transitions this page walks through are the parts attributed to me. Where authorship of data or assets is unresolved, I say unresolved instead of mine.",
      ],
      stepInto: [
        "The provenance note lives in the repository README (lines 6 to 10), naming the assignment context and the Next Station: London inspiration. The five stations in this page's demo come from stations.json as pinned fixtures; the coordinates are used under that same unresolved-authorship label. Claiming precisely is cheaper than over-claiming and walking it back in an interview.",
      ],
    },
  ],
  omittedAfterIndex: 3,
  omitted: {
    label: "05 FIX",
    note: "Chapter 05 is missing on purpose. The fix for the flaw in 04 doesn't exist yet, and pretending otherwise would defeat this page.",
  },
  learned:
    "Rules engines are state machines wearing a game's clothes: the design work is deciding where state may change, then making every other path a no-op. Precompute-then-commit gave me that for free. The counter-lesson is testability: logic threaded through global state and the DOM works until you want to prove it works, and then it doesn't.",
  improve:
    "Extract the rule chain into pure functions over an explicit state object and put the first real tests on them; the demo on this page sketches what that harness looks like. Change `legalFrom` to hold a list of sources per target so Switch mode can offer every legal edge. Then add CI so the tests run on every push.",
  next: { title: "ClassForge", href: "/work/classforge" },
  metaTitle: "Subways of Budapest · Michael Tawfik",
  metaDescription:
    "A vanilla JavaScript strategy game where each move must clear card, route, and geometry rules before it can touch the board.",
};
