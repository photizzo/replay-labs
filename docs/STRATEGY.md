# Replay — Strategy

Status: PLANNING (not execution). Written 2026-06-12, Fable 5 + photizzo.
Covers: audience expansion, workflow integration, GTM. Read top to bottom.

---

## 0. The one-sentence thesis

AI lets people ship software without understanding the decisions inside it; Replay
turns the AI sessions they already run into proof-of-judgment practice, so the human
gets better at the one thing AI does not do for them — deciding.

The metric we optimize is never "did Replay explain the session." It is **"can the
learner make a better decision in their next session."**

**Learning and decision-making are not a tradeoff — they are the same loop.** An
earlier draft of this doc posed them as an A/B ("am I still learning?" vs "own your
decisions"); that was wrong. Learning judgment IS getting better at decisions; the
decision you make is the output, the judgment you build is the input, and Replay is
the cycle between them. We never trade one for the other. When messaging differs by
audience it is emphasis, not a different product: a junior feels it as "I'm actually
learning," a senior feels it as "I own this call" — same loop, same lab.

---

## 1. The market: concentric rings, not a single segment

The user is right that the audience is *anyone who does technical work with AI*. That
is the destination. But you cannot put "everyone" on a landing page, and you cannot
build every pattern library at once. So we model the market as rings we light up in
order — each ring is reachable because the ring before it built the pattern library,
the proof, and the word-of-mouth that the next ring needs.

```
        ┌─────────────────────────────────────────────┐
        │  RING 4 — anyone technical using AI           │
        │   PMs writing SQL, analysts, IaC, ML, mobile  │
        │  ┌─────────────────────────────────────────┐  │
        │  │  RING 3 — backend / platform engineers    │  │
        │  │   APIs, auth, data, infra decisions       │  │
        │  │  ┌─────────────────────────────────────┐  │  │
        │  │  │  RING 2 — career-switchers / juniors  │  │  │
        │  │  │   the "am I actually learning?" fear  │  │  │
        │  │  │  ┌───────────────────────────────┐    │  │  │
        │  │  │  │  RING 1 — AI-first web devs     │    │  │  │
        │  │  │  │   Next.js/React + Claude Code   │    │  │  │
        │  │  │  │   ← we already have 2 labs here │    │  │  │
        │  │  │  └───────────────────────────────┘    │  │  │
        │  │  └─────────────────────────────────────┘  │  │
        │  └─────────────────────────────────────────┘  │
        └─────────────────────────────────────────────┘
```

**Why this order, not a values judgment about who matters:**
- Ring 1 is where our only two deep labs already land (Runtime Boundary, Secret
  Boundary). Zero new content to prove the loop. Fastest path to "this is real."
- Ring 2 is the same stack, but the *emotional* wedge is strongest — the skill-atrophy
  fear (Anthropic's own RCT: AI-assisted juniors scored 17pp lower on comprehension).
  Same labs, different message. Ring 1 proves it works; Ring 2 is who it's *for*.
- Ring 3 is unlocked by a backend pattern library. Our detector ALREADY finds these
  decisions (token lifecycle, API validation, secret boundary, model protocol — proven
  on a real Kotlin/Python session). We just have not built the deep labs yet.
- Ring 4 is everyone else, reachable once the pattern-library machine is humming and
  the community is contributing patterns (see §3).

The vision is the whole diagram. The *plan* is: win the center, expand by library.

### 1.1 CORRECTION — the dogfood user is not in Ring 1

The ring model above is right for a cold-outreach GTM funnel. It is **wrong for the
first user, who is the product author** (photizzo): personal projects are **mobile**,
work is **infra / backend / devops**. The real test — the one that decides whether
this is a product or a toy — is the author's own sentence:

> "Can I use it at work seamlessly, and show my colleagues to do the same?"

If the author lives in Ring 3 + mobile but the only deep labs are Ring 1 web, the
dogfood loop is broken: they cannot use their own product where their real work
happens, and "show your colleagues" (the single most credible distribution channel
this product has) never fires. A learning tool the author can't run at work has no
honest advocate.

So the sequencing splits in two, and they run in parallel, not series:
- **GTM/funnel sequencing** (cold strangers): still center-out by ring, because a
  landing page needs one message and the web labs already exist.
- **Dogfood sequencing** (the author + their colleagues): driven by *where the author
  actually works* — a backend/devops lab and a mobile lab, built from the author's own
  real sessions, are the true Phase-0 proof. Pick the next lab from an infra/backend
  session that already ingested cleanly.

The colleague-share path is the highest-leverage validation we have: it is real
distribution (warm, credible, inside a company) AND the harshest product test (would a
peer actually find it useful, not just polite). It only exists if the labs cover the
work the author and their colleagues do. That makes "a lab that works at work" not a
Ring-3 nicety but the **gating Phase-0 deliverable**.

---

## 2. What exists today (honest inventory)

Built and verified in-browser (commits through `a2a4c81`):
- **Ingestion** (`replay ingest`): parses real Claude Code session JSONL, filters
  machine turns, reconstructs the diff from Edit/Write tool calls. Proven on real
  8MB (web) and 3.5MB (Kotlin/Python) sessions.
- **Decision detection**: ~14 rules in `report.js`. Many are stack-agnostic (token
  lifecycle, API validation, test-net, CLI contract, schema-first).
- **The lab**: continuous flow, zero multiple-choice. Instruments: spot-the-decision
  in the real diff → click-the-line trace → animated crash → arbitrate-the-thread →
  repair (assemble OR type) → transfer (chips OR write). Real LLM rubric review.
- **2 deep labs**: Runtime Boundary, Secret Boundary. Both PASS/FAIL paths verified
  against the real reviewer.
- **Session map**, pattern catalog with illustrations, reference-solution escape hatch,
  instant lint, coverage dots, stub-on-fail.

The constraints the user named are ALREADY met:
- **Token-lean**: lab generation is 100% deterministic — zero LLM tokens. The only
  model call is on-demand review when the learner clicks "check."
- **Never blocks the active session**: nothing runs inline while you code. Integration
  is post-session by design.

Honest gaps:
- Only 2 deep labs (everything else falls back to a shallow generic module).
- Spot/trace beats are single-line only (no multi-line "blast radius" selection).
- Diagnose uses the learner's real diff, but repair/transfer use the module's canonical
  example, not their literal code — a narrative seam.
- Ingestion is Claude Code only (Codex schema mapped in research, not wired).
- No cross-session memory / spaced return of the mastery artifact.

---

## 3. Audience expansion = a pattern-library machine

"Everyone technical" becomes real exactly as fast as the pattern library grows. So the
library is the core asset, and the rate-limiter is how cheaply we can author a *great*
lab. Three sources, in order of leverage:

1. **Hand-authored gold labs** (now): each new pattern is a `modules.js` entry +
   `review.js` rubric + a catalog page. ~1 focused day each at current quality.
   Target the highest-frequency decisions per ring.
2. **Detector-to-lab pipeline** (next): the detector already finds far more decisions
   than we have labs for. A semi-automated authoring flow — detector finds the pattern,
   a generation pass drafts the lab (naive code, traps, rubric, arbitrate thread), a
   human approves — turns library growth from days into hours.
3. **Community patterns** (later): the pattern format is a contract. Let practitioners
   submit labs for their stack (Terraform drift, dbt model contracts, K8s resource
   limits). This is how Ring 4 actually gets covered — we do not author every stack;
   the community does, the way Refactoring Guru could never have but a marketplace can.

Per-ring first libraries:
- Ring 1/2 (web): Demo Persistence, Model Output Protocol, Hydration Boundary, Data
  Fetching Waterfall. (Detector already flags several.)
- Ring 3 (backend): Token Lifecycle, API Boundary Validation, Idempotency, Migration
  Safety, N+1. (Several already detected.)
- Ring 4 (broad): SQL injection / parameterization (PMs+analysts), IaC blast radius
  (devops), prompt-injection trust boundary (anyone building AI features).

---

## 4. Workflow integration — three surfaces, two hard guarantees

Two guarantees are non-negotiable and already true; integration must preserve them:
- **G1: never block the active session.** Nothing Replay does happens inline while
  you are coding.
- **G2: token-lean.** Generation stays deterministic and free; the only spend is a
  learner-initiated review.

Surfaces, in order of build:

**A. The hook (the magic moment).** A `SessionEnd` hook runs `replay-labs ingest` in the
background when a session finishes. Next time you open Replay: "Your last session had
5 decisions. The one worth learning is X." This is the loop that makes it a habit, not
a tool you remember to use. Proven feasible in the earlier exploration. Respects G1
(post-session) and G2 (ingest is free; review is later and optional).

**B. The CLI / local web (today).** `replay-labs ingest` + `replay-labs serve`. This is the
power-user surface and the dogfooding surface. Already works.

**C. IDE / inline nudge (later).** A non-blocking surface in the editor: after a
session, a subtle "1 lab ready" affordance. Never a modal, never mid-flow. Opens the
local web lab.

Explicitly NOT doing: anything that runs a model during the active coding session,
anything that adds latency to the user's real work, anything that phones home with
their code without consent (their transcripts are sensitive — local-first by default).

---

## 5. GTM — discovery, funnel, loops

### 5.1 The wedge message (Ring 1→2)
Landing message is NOT "learn to code." It is the fear made specific:
> "You're shipping faster than you're learning. Replay turns your AI sessions into
> proof you can still own the decisions."
The hero demo is a 30-second GIF of the arbitrate-the-thread beat or the spot-the-
decision-in-your-own-diff beat — both are visually self-explanatory and unlike anything
else in the category.

### 5.2 Install → first-lab funnel (the only funnel that matters early)
The whole game is time-to-first-"whoa." Target: under 5 minutes, on the user's OWN
session.
1. `npx replay-labs` →
2. it finds their latest Claude Code session automatically →
3. session map: "5 decisions in your last session" →
4. they spot the decision in THEIR OWN diff → first whoa.
Every step that isn't "their own code" is a leak. The reason ingestion matters for GTM
as much as for product: the demo is *their* session, not a fixture. That is the
unfair, uncopyable hook.

### 5.3 Viral / sharing loops (we have two natural ones)
- **The Mastery Artifact** is screenshot-bait by design — a clean "I can own Runtime
  Boundary" card. Add a one-click "share my artifact" that renders an OG image. Devs
  share proof-of-skill; each share is an ad with built-in credibility.
- **The Arbitrate Thread** is a self-contained, debatable artifact ("which engineer
  would you approve?"). Shareable as a standalone challenge — a "Wordle for engineering
  judgment" mechanic. Friends pick, then see the answer, then want their own.
- **Team leaderboard** (Ring 4 / B2B): agreement-with-reviewer rate over time, per
  team. A lead's dashboard of who is actually leveling up.

### 5.4 Channels by ring
- Ring 1/2: where AI-first devs already are — X/Twitter dev community, the Claude Code
  / Cursor ecosystems, a plugin in the Claude Code marketplace (distribution is built
  in), Show HN, dev newsletters.
- Ring 3: backend-leaning communities, the "I let AI write my migration and it bit me"
  story; conference talks on AI + judgment.
- Ring 4 / teams: bottoms-up (individuals bring it to their team) → a team plan.

### 5.5 Pricing (hypothesis, not commitment)
- Free: ingest your own sessions, the full single-player lab loop. (Generation is free
  to us — deterministic — so this is cheap to give away and it IS the growth engine.)
- Paid individual: the parts that cost us tokens (real review at volume), cross-session
  memory / spaced curriculum, private pattern history.
- Team: leaderboard, shared pattern libraries, admin. The review cost is the natural
  metering line because it maps to real usage.

---

## 6. Sequencing (even though the vision is everything)

- **Phase 0 — prove the habit AT WORK (now):** the SessionEnd hook + install→first-lab
  funnel on the author's own sessions, AND at least one deep lab covering the author's
  real work (backend/devops or mobile, built from an already-ingesting session). The
  acceptance test is literally: the author uses it on a work session and shows one
  colleague who finds it useful. This is the difference between a demo and a product.
- **Phase 1 — broaden labs + loops:** more labs across the author's stacks AND the web
  ring, the share-my-artifact loop, ship as a Claude Code plugin, Show HN. Goal: a
  population of devs (the author's colleagues first) who run a lab a week.
- **Phase 2 — open Ring 3:** backend pattern library (detector already finds the
  decisions), the detector-to-lab authoring pipeline to make library growth cheap.
- **Phase 3 — Ring 4 + community:** open the pattern format, team plan, leaderboard.

Each phase funds the next with proof and word-of-mouth. Skipping to "everyone" on day
one means an empty pattern library for most visitors and no message — the ocean.

---

## 7. Risks & open questions

- **Review latency (~45s).** Fine for one lab; a wall for a session. Mitigations: stream
  criteria as judged; cheaper model for lint-grade; batch. Token cost scales with
  engaged users — watch it as the metering line.
- **Library cold-start for new stacks.** A devops visitor with no matching lab sees
  "lab coming." The detector-to-lab pipeline and community submissions are the answer;
  until then, honest "coming" beats a shallow generic lab.
- **Transcript privacy.** Their code is sensitive. Local-first, explicit consent before
  anything leaves the machine. This is also a trust/marketing asset if we lead with it.
- **The narrative seam (§2).** Diagnose on their real diff, repair on a canonical
  example. Closing it (generate the naive snippet from their matched code) is the
  highest-value ingestion depth upgrade.
- **Is the wedge fear ("am I learning?") strong enough to pull installs, or is the
  pull "make me a better engineer"?** Test both messages early; they target Ring 2 vs
  Ring 1/3 respectively.

---

## 8. Metrics that matter

- **Activation:** % of installs that complete one lab on their own session (the funnel).
- **Habit:** labs completed per user per week; % who return after a new session.
- **Learning (the real one):** agreement-with-reviewer rate trending UP over a user's
  first N labs — proof the product does what it claims.
- **Loop:** shares per completed lab; installs attributed to a shared artifact.
- **Unit economics:** review-tokens per active user vs revenue per active user.

---

## 9. Immediate next decisions (for the human)

1. Confirm Phase 0 (hook + own-session funnel) as the next build, or reorder.
2. Pick the 3-4 Ring-1/2 labs to author next.
3. Decide lead message to A/B: "am I still learning?" vs "own your decisions."
4. Green-light the multi-line "blast radius" upgrade to the Diagnose beat (small, high
   teaching value).
