# Adjacent Research And Positioning Notes

## Summary

There is already movement around replaying, extracting, browsing, and sharing AI coding-agent sessions. That is a strong validation signal for Replay.

The current market is mostly solving:

- session visibility
- replay and sharing
- transcript extraction
- search and history
- token or productivity analytics
- team review and monitoring

Replay should not compete head-on as only a better viewer.

Replay's stronger wedge is:

> Turn session history into human learning and better engineering judgment.

## Adjacent Projects

### es617/claude-replay

Repository: https://github.com/es617/claude-replay

What it does:

- Converts sessions from Claude Code, Cursor, Codex CLI, Gemini CLI, and OpenCode into self-contained HTML replays.
- Supports interactive playback, speed control, collapsing tool calls and thinking blocks, bookmarks, secret redaction, themes, file activity sidebar, iframe embedding, live watch mode, and a web editor.
- Can auto-discover local sessions from common tool directories.

Why it matters:

- Validates that AI coding sessions are meaningful artifacts.
- Validates that raw transcripts are hard to navigate.
- Shows that multi-agent-tool transcript normalization is feasible.
- Provides a strong reference point for replay UX and import formats.

Positioning gap:

- It helps users see and share what happened.
- It does not appear primarily focused on measuring or improving the human's understanding.
- It has a "teaching" use case, but teaching is not the core product loop.

Implication for Replay:

Replay should avoid being "claude-replay plus a few summaries." The differentiated experience must be decision extraction, contrastive teaching, understanding checks, and learner memory.

### claude-code-transcripts by Simon Willison

Reference: https://simonw.substack.com/p/a-new-way-to-extract-detailed-transcripts

What it does:

- Converts Claude Code transcripts into detailed HTML pages.
- Emphasizes transcripts as important project context: prompts, suggestions, decisions, and implementation justifications.
- Supports sharing via static HTML and Gists.

Why it matters:

- Reinforces that coding-agent conversations are becoming part of the durable project record.
- Shows that developers want better ways to inspect, preserve, and publish agent work.

Positioning gap:

- Transcript extraction and presentation are not the same as guided learning.
- The tool preserves context; Replay should transform context into understanding.

### Mantra And Session-History Viewers

Reference: https://dev.to/gonewx/i-tested-4-tools-for-browsing-claude-code-session-history-17ie

The article compares several Claude Code history tools and describes Mantra as recording and replaying AI coding sessions with terminal I/O, code changes, and timeline support across Claude Code, Cursor, Codex, and Gemini CLI.

Why it matters:

- The replay/history space is real and becoming crowded.
- Users value seeing the actual coding process, not just the conversation.
- Security redaction and multi-tool support are expected capabilities.

Positioning gap:

- These tools optimize for browsing, replay, analytics, or review.
- Replay should optimize for post-session comprehension and skill growth.

### METR Transcript Analysis

Reference: https://metr.org/notes/2026-02-17-exploratory-transcript-analysis-for-estimating-time-savings-from-coding-agents/

What it does:

- Uses coding-agent transcripts to estimate productivity/time savings.
- Demonstrates that transcripts can support higher-level analysis beyond replay.

Why it matters:

- Validates transcripts as analyzable behavioral data.
- Suggests a path for deriving insights from sessions rather than merely displaying them.

Positioning gap:

- Productivity measurement is not learner development.
- Replay can use similar evidence, but aim at judgment, mastery, and decision quality.

### Anthropic Claude Code 101

Reference: https://anthropic.skilljar.com/claude-code-101

What it does:

- Teaches Claude Code workflows, including the agentic loop, prompting, plan mode, context management, subagents, MCP, hooks, and code review.

Why it matters:

- Confirms demand for structured AI-coding-agent education.
- Shows that tool-specific education is already emerging from vendors.

Positioning gap:

- Vendor courses teach how to use the tool.
- Replay should teach how to understand and evaluate the work produced through the tool.

## Strategic Takeaways

### 1. Do Not Start As A Generic Session Viewer

Session replay already exists. A basic viewer is not enough.

Replay can still use replay mechanics, but the user should come away saying:

> I understand the engineering decisions now.

Not merely:

> I can replay the session.

### 2. Make The Core Object A Decision, Not A Turn

Existing tools tend to organize around turns, messages, commands, files, and timestamps.

Replay should organize around decisions:

- architecture decision
- dependency decision
- testing decision
- state management decision
- error-handling decision
- product tradeoff
- performance tradeoff
- security boundary

The timeline is supporting context. The decision card is the teaching unit.

### 3. Use Existing Transcript Formats As Input

The MVP should support the same basic reality these tools expose:

- Claude Code sessions are stored locally.
- Codex sessions are stored locally.
- Cursor and Gemini also leave useful traces.
- Users may want to paste or upload transcripts manually.

Do not invent a proprietary recorder first. Start by analyzing existing artifacts.

### 4. Add A Learning Layer On Top Of Replay

Replay should include:

- decision extraction
- contrastive alternatives
- edge-case analysis
- senior-engineer review
- understanding checklist
- quiz or restatement
- follow-up practice
- learner memory

This is the layer existing replay tools mostly do not own.

### 5. Treat Redaction As Table Stakes

Any session tool must assume transcripts contain secrets, proprietary code, private prompts, and customer data.

Even an MVP should have a privacy stance:

- local-first by default
- explicit user control over uploaded content
- redaction before sharing
- no silent training or retention

## Updated MVP Direction

The original MVP direction still holds, but with a sharper distinction:

> Do not build replay first. Build understanding first.

The first prototype can consume outputs from tools like `claude-replay` or raw session logs, then generate the pedagogical layer:

- decision cards
- annotated risks
- alternatives
- mastery checklist
- quiz

Possible first command:

```bash
replay learn \
  --goal "Add password reset" \
  --diff ./session.diff \
  --transcript ./session.jsonl \
  --out ./session-understanding.md
```

This makes Replay complementary to existing viewers at first. Later, Replay can include its own viewer once the learning loop is proven.

## Product Positioning

Weak positioning:

> Replay AI coding sessions.

Stronger positioning:

> Understand the decisions behind your AI coding sessions.

Strongest positioning:

> Turn AI-assisted development into apprenticeship.

