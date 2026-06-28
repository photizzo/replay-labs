# Replay Labs

Replay Labs is a local-first learning layer for AI-assisted technical work.

AI coding agents can help people produce software faster, but speed alone does not guarantee understanding. Replay Labs turns local coding-agent sessions into guided mission labs that explain the decisions behind the work, the tradeoffs, the risks, and what the human should understand before calling the session complete.

## Install

Replay Labs is distributed through npm.

Run it without installing:

```bash
npx replay-labs
```

Or install it globally:

```bash
npm install -g replay-labs
replay-labs
```

Replay Labs also ships a short command alias after global install:

```bash
npm install -g replay-labs
replay
```

Requirements:

- Node.js 20 or newer
- Local Claude Code or Codex sessions if you want Replay Labs to discover past AI work automatically

## First Run

Start the local app:

```bash
npx replay-labs
```

Replay Labs starts a local web server and opens:

```text
http://127.0.0.1:<port>/inbox
```

From the Session Inbox you can:

1. Review local AI sessions discovered on your machine.
2. Choose a specific session.
3. Let Replay Labs choose a strong candidate.
4. Generate or open a mission lab.
5. Work through the lab to understand the decision, risk, repair, and transfer pattern.

No upload or paste is required.

## What Users Get

Replay Labs looks at real local AI work and turns it into a guided lab. A useful lab helps you answer:

- What was the actual problem?
- What decision did the AI make?
- What evidence supports that decision?
- What could break if the decision is wrong?
- What should I understand before I ship or continue this work?
- Can I apply the same pattern in a new situation?

Replay Labs separates sessions into three states:

- **Ready lab**: concrete changed-code evidence exists and a practice lab can open.
- **Can try generation**: concrete diff evidence exists, but no generated lab exists yet.
- **Needs real diff**: Replay Labs found decision signals, but not enough code evidence to build a trustworthy lab.

## Privacy And Local Data

Replay Labs is local-first.

- Sessions are discovered from local Claude and Codex data on your computer.
- Generated labs are written to local app data.
- You do not need to upload or paste sessions into a website.
- Set `REPLAY_HOME=/path/to/replay-data` to choose a custom data location.

Example:

```bash
REPLAY_HOME=~/replay-labs-data npx replay-labs
```

## Common Commands

Start the app without opening a browser:

```bash
npx replay-labs --no-open
```

Use a specific port:

```bash
npx replay-labs --port 4192
```

Show help:

```bash
npx replay-labs --help
```

## Troubleshooting

If no sessions appear:

- Confirm you have used Claude Code or Codex locally on this machine.
- Click refresh in the Session Inbox.
- Check whether your agent stores sessions in a custom location.

If a session says **needs real diff**, Replay Labs found useful conversation signals but not enough concrete code-change evidence to create a trustworthy lab.

If the browser does not open automatically, copy the local URL printed in the terminal.

## Development

Clone the repo, install dependencies, and run tests:

```bash
npm install
npm test
```

Run the app from source:

```bash
node ./src/cli.js --no-open
```

Generate the bundled example report:

```bash
npm run replay:example
```

Generate the bundled example interactive lab:

```bash
npm run replay:example:html
```

## Fixture Commands

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

## Near-Term Direction

The next meaningful step is to make the npm-only local beta trustworthy end to end: install, discover, mission lab, local data, privacy, QA, and contribution readiness.
