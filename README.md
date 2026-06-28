# Replay Labs

Replay Labs is a local-first learning layer for AI-assisted technical work.

AI coding agents can help people produce software faster, but speed alone does not guarantee understanding. Replay Labs turns local coding-agent sessions into guided mission labs that explain the decisions behind the work, the tradeoffs, the risks, and what the human should understand before calling the session complete.

## Local-First Beta

Replay Labs starts as an npm-only local app:

```bash
npx replay-labs
# opens http://127.0.0.1:<port>/inbox
```

The served app opens a Session Inbox that discovers local Claude and Codex
sessions on this machine. The user chooses a session, or lets Replay choose a
ready one. No upload or paste is required.

For local development from this repo:

```bash
node ./src/cli.js --no-open
```

Replay Labs writes generated labs to the local app data directory by default. Set
`REPLAY_HOME=/path/to/replay-data` to choose a different location.

Replay Labs separates three states:

- **ready lab**: concrete changed-code evidence exists and a practice lab can open
- **can try generation**: concrete diff evidence exists, but no hand-authored lab exists yet
- **needs real diff**: Replay Labs found decision signals, but not enough code evidence to build a trustworthy lab

The older CLI path is still useful for fixtures and development:

```bash
node ./src/cli.js learn \
  --goal "Add password reset flow" \
  --diff ./examples/password-reset.diff \
  --transcript ./examples/password-reset-transcript.md \
  --out ./reports/password-reset-understanding.md
```

Or run the bundled example:

```bash
npm run replay:example
```

Generate an interactive Replay Labs mission lab:

```bash
npm run replay:example:html
```

The output is a markdown Session Understanding Report with:

- session summary
- problem diagnosis
- meaningful timeline
- decision cards
- risks and edge cases
- alternative approaches
- understanding checklist
- quiz
- follow-up practice

The interactive HTML output is the current product direction. It turns one strong decision from the session into a four-stage lab:

- a pattern/smell/proof brief inspired by catalog-style learning products
- diagnose the decision from evidence
- predict what breaks, then read the failure simulation (real terminal output) and explain why it appears only at build time
- **repair the actual code in an editor** — reviewed criterion-by-criterion against a shipping rubric
- **transfer**: write the plan for a new browser-capability feature — reviewed for transfer, not recall
- explicit pass conditions and terminal-style check output
- wrong-answer feedback that names the misconception
- a final mastery artifact with the mental model, failure signature, shipping standard, and transfer rule
- a pattern catalog page per decision (`reports/patterns/runtime-boundary.html`) — intent, smell, naive/demo/production tiers, when not to use, checklist
- saved progress in local storage

### Real review

Serve the lab (instead of opening the file) to get real LLM review of the repair
and transfer stages:

```bash
node ./src/cli.js serve --port 4178
# open http://127.0.0.1:4178/
```

`replay-labs serve` hosts the reports and exposes `POST /api/review`, which sends the
learner's submission plus a strict rubric to the `claude` CLI and returns
per-criterion PASS/FAIL with concrete notes and the misconception it reveals.
Without the server (or without `claude`), the lab falls back to labeled
heuristic checks — it never pretends a pattern-match is a review.

Regenerate pattern catalog pages:

```bash
node ./src/cli.js patterns --out ./reports/patterns
```

## Why This Exists

Existing session replay tools help developers see what happened in an AI coding session. Replay Labs is focused on the next layer:

> Understand why it happened, what decisions mattered, and whether the human can own the result.

See:

- [Product Problem Memo](./docs/product-problem-memo.md)
- [MVP Execution Plan](./docs/mvp-execution-plan.md)
- [Production And Open Source Plan](./docs/production-open-source-plan.md)
- [Release Process](./docs/release-process.md)
- [Adjacent Research](./docs/adjacent-research.md)

## Development

Run tests:

```bash
npm test
```

Generate the example report:

```bash
npm run replay:example
```

## Near-Term Direction

The next meaningful step is to make the npm-only local beta trustworthy end to end: install, discover, mission lab, local data, privacy, QA, and contribution readiness.
