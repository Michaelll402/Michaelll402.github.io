import type { CaseStudy } from "./types";

// Copy transcribed VERBATIM from docs/content/replay-support.md (LOCKED).
export const support: CaseStudy = {
  slug: "support",
  position: "01",
  title: "Customer Support Ticketing SaaS",
  oneLiner:
    "A B2B support platform where customers file tickets, agents work the queue, managers oversee it, and admins hold the keys.",
  contextLine: "Individual project, AI-assisted, built in five reviewable milestones",
  role: "Everything: framing, architecture, integration, debugging, verification",
  stack: [
    "Next.js 15",
    "React 19",
    "TypeScript",
    "NestJS",
    "Prisma",
    "PostgreSQL",
    "Redis",
    "BullMQ",
    "Socket.IO",
    "MinIO",
    "Docker",
    "GitHub Actions",
  ],
  repoHref: "https://github.com/Michaelll402/Customer-Support-Ticketing-SaaS",
  heroCaption: "Reconstruction, drawn from the codebase",
  product:
    "One company runs its support inside one workspace. Customers open tickets and reply in a public thread. Agents work the queue, write internal notes customers never see, and attach files through signed URLs. Managers assign, transfer, and approve reassignments. Admins manage users and read audit logs. The backend is a NestJS modular monolith behind a Next.js 15 frontend, in one pnpm monorepo. Realtime updates ride a Socket.IO gateway; notifications queue through Redis and BullMQ so the API never waits on background work. I built it alone, milestone by milestone, keeping every stage demoable.",
  problem:
    "A signed login token is a snapshot. The stored user keeps changing after it's issued: an admin demotes someone, deactivates an account, revokes access. My original JWT strategy validated the signature and then trusted the role inside the token. So authority could outlive the state it was copied from. A deactivated account kept working until its token expired. This page replays how I found the shape of that problem and closed it.",
  chapters: [
    {
      num: "01",
      name: "UNDERSTAND",
      title: "A support tool is a set of promises about who sees what",
      story: [
        "A support tool is mostly a set of promises about who sees what. Customers see their own tickets and the public side of each thread. Agents see the queue plus internal notes. Managers see team operations. Admins see everything and can change anyone. I wrote those promises down as four roles before writing code: CUSTOMER, AGENT, MANAGER, ADMIN. The dangerous part was obvious early. Privacy rules can't live in the frontend, because the frontend belongs to whoever opens devtools. Every rule had to be enforced where the data leaves the system, on the server.",
      ],
      stepInto: [
        "The privacy model in one rule: an internal note is a row that customers must never receive, not a row the UI hides. Server-side filters strip staff-only content by role before serialization. The four roles map to guarded route groups in a NestJS modular monolith split into identity, ticket-core, conversation, and operational slices. Filtering at the serialization boundary means a new endpoint is private by default rather than public by accident.",
      ],
    },
    {
      num: "02",
      name: "DECIDE",
      title: "Boring pieces, chosen on purpose",
      story: [
        "I picked boring, inspectable pieces. One pnpm monorepo so the frontend, API, and shared types version together. NestJS as a modular monolith, not microservices, because one person maintains this. Prisma over PostgreSQL for the ticket domain. JWT for auth, stored in an httpOnly cookie so scripts can't read it. And a milestone plan, M0 through M4, where each stage had to stay demoable and reviewable before the next began. That plan is the reason the project survived. There was always a working version to come back to.",
      ],
      stepInto: [
        "The tradeoff I accepted with JWTs: they're stateless by design, which makes every request cheap and every claim stale. I knew the token carried a role snapshot. What I underestimated was how much authority would come to depend on it. The milestone ledger: M0/M1 foundation, auth, roles, app shell. M2 ticket CRUD and metadata. M3 conversation, internal notes, attachments. M4 workflow actions, notifications, Socket.IO realtime. M5 (SLA logic, dashboards) is still in progress and says so.",
      ],
    },
    {
      num: "03",
      name: "BUILD",
      title: "Four milestones, then the system starts talking back",
      story: [
        "Four milestones of steady accretion. Tickets got CRUD, filtering, pagination, and status workflows. Conversations got public replies, staff-only internal notes, and file attachments through MinIO with signed URLs. Workflow actions arrived: assign, prioritize, tag, transfer, an approval flow for agent reassignment. Then the system started talking back. I added an in-app notification API backed by a BullMQ queue on Redis, with idempotent job IDs, so a failed background job can retry without duplicating notifications and the REST API never blocks on one. Last came realtime: a Socket.IO gateway that authenticates the same JWT cookie and sorts connections into per-user, per-ticket, and staff rooms.",
      ],
      stepInto: [
        "The queue detail that matters: notification jobs carry deterministic IDs, so BullMQ deduplicates retries instead of double-notifying. The API enqueues and returns; delivery is the queue's problem. The realtime detail that matters: the Socket.IO handshake reads the same httpOnly cookie as REST, so there's one auth story, not two. Rooms scope broadcast: a ticket event reaches that ticket's participants and staff, not the whole workspace.",
      ],
      figure: {
        art: "support-flow",
        caption: "Reconstruction: request → queue → socket flow, drawn from the codebase",
      },
    },
    {
      num: "04",
      name: "BREAK",
      title: "The token kept a promise the database took back",
      story: [
        "The flaw was already in the repo history, waiting. My JWT strategy checked the signature, then believed the token's contents: user ID, role, all of it. Tokens lived until expiry. Which meant an admin could deactivate an account and the account would keep working. A demoted manager would stay a manager to every guard in the system until their token ran out. Nothing crashed. No error fired. The system just kept honoring a promise the database had already taken back. That's the worst kind of bug: silent, and by design.",
      ],
      stepInto: [
        "The before state is public in the history: jwt.strategy.ts at commit 3d4dff7 returns the payload's claims as the request user. Guards then authorize against that snapshot. Deactivation flips a database flag no request path ever reads again. Role change updates a row the guards never consult. The gap isn't a coding slip; it's the default shape of stateless auth. Signature validity and current authority are different questions, and I was only asking one.",
      ],
    },
    {
      num: "05",
      name: "FIX",
      title: "Authority moves back into the database",
      story: [
        "I made authority live in the database again. The hardened strategy validates the signature, then reloads the stored user and asks four questions: does the account still exist, is it active, does the token's version match the user's current tokenVersion, and what is the role right now. REST guards and new Socket.IO handshakes both run these checks. Then the follow-through: admin actions that change authority, like role change, deactivation, and explicit revocation, increment tokenVersion and write an audit record. Old tokens don't need hunting down. They fail the version check on their next request.",
      ],
      stepInto: [
        "Revocation by version counter: the user row carries tokenVersion; every issued token embeds the version it was born with. Incrementing the counter strands every earlier token at once, no token blacklist needed. Cost: one indexed read per guarded request. That's the price of being able to take authority back, and I accepted it deliberately. The audit record means an admin action leaves evidence, not just an effect. Commits b9e0dcf (hardening) and d5c8ba3 (admin follow-through) hold the whole change.",
      ],
      demo: "support",
    },
    {
      num: "06",
      name: "VERIFY",
      title: "What green CI proves, and what it doesn't",
      story: [
        "I wrote regression tests for the paths I'd just changed: auth integration tests for the strategy's four checks, gateway tests for the socket handshake, service tests for the admin mutations. They run in GitHub Actions alongside lint, typecheck, and build, and both hardening commits have observed passing runs. I want to be precise about what that proves. The revocation tests mock Prisma. Green CI proves the business and privacy rules hold in the service layer. It does not exercise live storage, live queue processing, or a live WebSocket connection. Those are different tests, and I haven't written them yet.",
      ],
      stepInto: [
        "The test seams: auth.integration.spec.ts drives the strategy through existence, active-state, version, and role failures. realtime.gateway.spec.ts rejects handshakes the same four ways. admin-users.service.spec.ts asserts version increments and audit writes. CI runs 27470443310 and 27508741880 are the observed-passing evidence. The honest boundary: mocked persistence verifies behavior, not migrations, and an already-open socket isn't covered at all. That gap is real and listed below.",
      ],
    },
    {
      num: "07",
      name: "SHIP",
      title: "Demoable at every milestone, honest about the rest",
      story: [
        "Shipping here means each milestone landed reviewable: the app runs locally on Docker Compose with PostgreSQL, Redis, and MinIO, and main stays green. There's an older deployment of this project on Azure, and I'll be straight about it: it predates the auth hardening and diverges from main. I'd rather tell you that than point you at a stale build and call it current. M5, with SLA logic and dashboards, is in progress. The replay you just read is the part I consider done, tested, and worth explaining.",
      ],
      stepInto: [
        "Delivery model: no one-shot full build. Every milestone M0 through M4 stayed independently demoable, which meant integration problems surfaced in weeks-sized chunks, not at the end. Local stack: docker compose up brings PostgreSQL, Redis, and MinIO; pnpm workspaces wire web and api. Husky runs lint and format pre-commit.",
      ],
    },
  ],
  learned:
    "Stateless auth means every claim is a cached read with no invalidation. I now treat \"who are you\" and \"what may you do right now\" as separate questions with separate freshness. And the milestone discipline mattered more than any single technical choice; a project one person can always demo is a project one person can always continue.",
  improve:
    "Three things, in order. Disconnect live sockets when authority changes; today the version check catches the next handshake, but an already-open connection keeps its room until it drops. Run the revocation suite against a real PostgreSQL container in CI instead of mocked Prisma, so migrations are exercised too. Then finish M5: SLA timers, dashboards, admin controls.",
  next: { title: "Face Recognition Attendance", href: "/work/vision" },
  metaTitle: "Customer Support Ticketing SaaS · Michael Tawfik",
  metaDescription:
    "A B2B ticketing platform in Next.js and NestJS: four roles, realtime updates, and the auth hardening that made permissions revocable.",
};
