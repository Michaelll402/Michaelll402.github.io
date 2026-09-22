import type { CaseStudy } from "./types";

// Copy transcribed VERBATIM from docs/content/replay-simiutopia.md (LOCKED).
export const simiutopia: CaseStudy = {
  slug: "simiutopia",
  position: "03",
  title: "Simiutopia",
  oneLiner:
    "An isometric city-building simulation where the player lays roads, buys vehicles, and runs freight and transit routes through a live economy.",
  contextLine:
    "ELTE Software Technology, Spring 2026, Group 01. My part: the vehicle movement model and the save/load corrections",
  role: "Team member. Two attributable commits: continuous vehicle movement, persistence round-trip fixes",
  stack: [
    "Java 21",
    "LibGDX",
    "Scene2D",
    "Gradle",
    "JUnit 5",
    "JaCoCo",
    "A* pathfinding",
    "JSON persistence",
  ],
  repoHref: "https://github.com/Esam-05-14/Simiutopia",
  heroCaption: "Reconstruction, drawn from the movement model",
  product:
    "Simiutopia is our team's isometric logistics game. The player builds a road grid with auto-tiling, bridges water in wood, concrete, or metal, buys trucks, vans, and buses from a dealership, and routes wood, steel, and passengers through an A* pathfinder. A financial dashboard tracks taxes, profits, and maintenance; too much debt ends in bankruptcy. The codebase keeps a strict model-view-controller split in Java 21 and LibGDX, with save/load rebuilding the world from JSON. Six of us built it for ELTE's Software Technology course. This page replays the two pieces that are verifiably mine.",
  problem:
    "The game's world is discrete: tiles, stops, timetables. The player's eye is continuous: a truck should roll down the road and take corners like a vehicle, not teleport tile to tile. When I picked up movement, position lived in two places at once. The model tracked logical progress while the renderer reconstructed its own idea of where the vehicle looked like it was. Two representations of one truth drift. My job was to collapse them into one movement model that logic and rendering could both trust, without breaking stops, arrivals, or the rest of the team's code.",
  chapters: [
    {
      num: "01",
      name: "UNDERSTAND",
      title: "One truck, two opinions about where it is",
      story: [
        "Before touching anything, I mapped who consumed vehicle position. Game logic needed arrival events at stops on the discrete grid. The renderer needed a smooth position and a facing direction every frame. The old code answered these separately: the model stepped between tiles while the renderer interpolated its own path. That's how you get a truck that's logically at the depot while it's visibly mid-corner. A group codebase makes this riskier: whatever I changed had to hold at the model boundary, the renderer boundary, and the test boundary, in code five other people were actively changing.",
      ],
      stepInto: [
        "The core mismatch: tile-hopping gives correct events with ugly motion; renderer-side interpolation gives pretty motion with a second, unofficial source of truth. The before state is preserved at parent commit 2e4cc07. What consumers actually need is small: a position for any moment, a direction of travel for sprite rotation, and a way to know when a logical waypoint is reached. That's a path parameterized by distance, plus arrival bookkeeping.",
      ],
    },
    {
      num: "02",
      name: "DECIDE",
      title: "The path becomes the single source of truth",
      story: [
        "I decided the path itself should be the single source of truth. One object represents the route a vehicle is physically driving: straight segments for road runs, quadratic curves for corners, laid end to end. Everything else asks the path. The model asks \"where does distance d land, and did it pass a waypoint?\" The renderer asks \"what position and tangent should I draw?\" Neither reconstructs anything. The tradeoff I accepted: fixed tuning. Turn radius, speed scaling on curves, acceleration and braking rates are constants, and curve length is approximated by sampling. Good enough for a course project, and honestly labeled.",
      ],
      stepInto: [
        "Distance parameterization is the load-bearing choice. Time-based parameterization couples the path to speed, so changing acceleration reshapes geometry. Distance-based keeps geometry fixed while speed becomes \"how fast distance advances\", which lets curve zones scale speed down without touching the path. Quadratic Bezier corners give a tangent for free: the derivative is the facing direction. Arc length of a quadratic has no closed form, so I approximate with 16 samples per curve; a coarse but predictable error I preferred over numeric integration in a game loop.",
      ],
    },
    {
      num: "03",
      name: "BUILD",
      title: "One commit across model, vehicle, and renderer",
      story: [
        "The build landed as one commit, 06355a4, crossing three boundaries. VehicleMovementPath holds the segments and answers position, tangent, and speed scale for any distance. Vehicle tracks its distance along the path, advances it by speed each tick, slows into curves, and fires waypoint arrivals for the discrete game logic. WorldRenderer stopped guessing: it now draws exactly the position and tangent the model reports. The demo below is that geometry, live. Drag the vehicle along an L-route and watch the tangent swing through the corner. That swing is what the renderer draws and what the old code couldn't agree on.",
      ],
      stepInto: [
        "Segment layout for an L-route: straight run, quadratic corner joining the two legs at the fixed turn radius, straight run. The path exposes total length; the vehicle clamps its distance to it. Speed scale dips inside curve zones so corners read as deliberate driving, with fixed acceleration out and braking in. Arrival detection compares distance against per-waypoint thresholds, which keeps stop behavior on the discrete grid exact while motion between stops stays continuous.",
      ],
      demo: "simiutopia",
    },
    {
      num: "04",
      name: "BREAK",
      title: "Three ways a saved world came back wrong",
      story: [
        "Later, in a separate piece of work, I went into save/load and found reconstruction quietly lying. Three real defects. A setter in Truck assigned a field to itself, one character of typo, so every restored truck forgot its cargo. The economy's transaction history had no restoration path at all; loading a game silently discarded the ledger. And stops got fresh identities on load, so routes that referenced saved stops pointed at objects that no longer existed. Each bug had the same personality: no crash, no error, just a world that came back subtly wrong.",
      ],
      stepInto: [
        "The self-assignment bug is the humbling one: `this.field = field` where the parameter name didn't match, so the assignment was a no-op the compiler happily accepted. The stop-identity bug is the structural one: reconstruction regenerated objects and then resolved route references, so references resolved against new identities instead of saved ones. Ordering between restoring identity and resolving references was the actual defect. All three live in commit 7361825's diff, which is public.",
      ],
    },
    {
      num: "05",
      name: "FIX",
      title: "Small diffs, found the hard way",
      story: [
        "The fix commit, 7361825, repaired all three. The truck setter now assigns the parameter to the field, which is the whole patch and I'm comfortable saying so. EconomyManager gained an internal restoration path that rebuilds transaction history from the save data instead of dropping it. And SaveManager now preserves saved stop IDs first, then resolves route references against them, so identity survives the round trip and routes reconnect to the stops they actually meant. Small diffs. The value was in finding them and proving they stayed fixed.",
      ],
      stepInto: [
        "The ordering fix in SaveManager is the one with a lesson: reconstruction is a dependency graph, and identity is a root node. Restore IDs before anything that refers to them, or every defensive copy and regenerated object silently reseats your references. The transaction-restoration path is internal on purpose: save-time state flows through a controlled entry point rather than a public mutator the rest of the game could misuse.",
      ],
    },
    {
      num: "06",
      name: "VERIFY",
      title: "Tests with honest edges",
      story: [
        "Both commits carry their own tests, and both test suites have honest edges. Movement: fixed-delta synthetic tests drive a vehicle down an L-route and assert continuity of position and the speed drop through the corner. That checks the model's math, not the renderer's output, and covers one route shape, not all of them. Persistence: deterministic round-trip tests save a world and load it back, asserting truck cargo and type, stop and route identity, a vehicle assignment, and transaction fields. Truck-focused, not exhaustive. GitLab CI is configured for the Gradle test suite, but I can't show you a public passing run for the pinned snapshot, so I won't claim one.",
      ],
      stepInto: [
        "VehicleMovementTest steps simulated time at a fixed delta, asserting no position jumps between ticks and monotonic distance growth; renderer acceptance and frame-rate behavior sit outside it. SaveManagerRoundTripTest builds a known world, serializes, restores, and compares field by field; vehicle classes beyond trucks and several saved fields are uncovered. In-flight movement state (current path distance, speed, timer) is not persisted at all; a loaded vehicle resumes from a logical tile. Known, listed, unfixed.",
      ],
    },
    {
      num: "07",
      name: "SHIP",
      title: "Claiming exactly two commits",
      story: [
        "Simiutopia shipped as a coursework deliverable by six people, and the honest unit of shipping for me is the commit. Two of mine are in the pinned history with tests attached, and this page has tried to claim exactly those and nothing more. The wider game, the isometric renderer, the economy, the pathfinding, the UI, belongs to Group 01 collectively. Working in that codebase taught me a different discipline than solo work: my movement model had to survive other people's changes, and their systems had to survive mine.",
      ],
      stepInto: [
        "What \"attributable\" means here: matching Git identities on immutable commits in a multi-author repository, cross-checked when this portfolio's evidence base was built. The claims stop at those diffs. If an interviewer wants to walk either commit, both are public and this page links them directly.",
      ],
    },
  ],
  learned:
    "Shared state needs one owner; the movement bug and the persistence bugs were both two-sources-of-truth problems wearing different clothes. Reconstruction order matters as much as reconstruction logic. And in a team codebase, a change that crosses boundaries is only done when the tests that guard those boundaries exist.",
  improve:
    "Persist in-flight movement, so a vehicle loads back mid-route at its saved distance and speed instead of snapping to a tile. Widen round-trip coverage beyond trucks to every vehicle class and saved field. And get a green pipeline result on the pinned snapshot, so the CI claim can graduate from \"configured\" to \"passing\".",
  next: { title: "Subways of Budapest", href: "/work/subways" },
  metaTitle: "Simiutopia · Michael Tawfik",
  metaDescription:
    "A Java and LibGDX city simulation built by six students. My commits: a continuous vehicle movement model and save/load corrections, both tested.",
};
