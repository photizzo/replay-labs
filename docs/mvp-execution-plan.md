# Replay MVP Execution Plan

## MVP Goal

Prove that Replay can turn one AI-assisted coding session into a learning experience that improves the human's understanding of the code and the decisions behind it.

The MVP should answer one question:

> After using Replay, does the user understand the session better than they would from a normal AI summary, git diff, or chat transcript?

## Product Bet

The first product bet is not recording, replay UI, courses, teams, or certifications.

The first product bet is the learning artifact:

> An annotated decision replay generated from a coding-agent transcript and git diff.

If this artifact is compelling, Replay has a foundation. If it is weak, surrounding product features will not matter.

Adjacent tools such as `claude-replay` already prove that replaying and sharing AI coding sessions is useful. Replay should therefore start by proving the layer those tools do not primarily own: decision extraction, contrastive teaching, and demonstrated understanding.

## Ideal First User

The first user should be an AI-assisted builder with enough technical context to feel the pain, but not enough confidence to self-review deeply.

Best initial profile:

- junior to mid-level developer
- uses Claude Code, Codex, Cursor, or similar tools
- ships small features with AI
- often accepts generated code without fully understanding the tradeoffs
- wants to become genuinely better, not only faster

Avoid starting with total beginners. Their knowledge gaps may be too broad for the first version.

Avoid starting with large engineering teams. Their needs will pull the product toward management, compliance, and reporting before the core learning loop is proven.

## First Input Format

Start with the simplest input:

- a user-stated session goal
- a git diff
- an optional chat transcript or command log

This avoids depending too early on one vendor's session export format.

Example:

```text
Goal: Add password reset to the app.
Diff: git diff output.
Transcript: copied AI coding-agent conversation.
Commands: test output or terminal log, optional.
```

## First Output Format

Generate a markdown report first.

Do not start with a complex web UI. A markdown report can prove the core intelligence faster.

The report should contain:

1. Session summary
2. Problem diagnosis
3. Timeline of meaningful changes
4. Decision cards
5. Annotated risks and edge cases
6. Alternative approaches
7. Understanding checklist
8. Short quiz
9. Recommended follow-up practice

## Report Structure

### 1. Session Summary

Briefly explain what was built or changed.

### 2. Problem Diagnosis

Explain the underlying problem, why it existed, and what constraints shaped the solution.

### 3. Meaningful Timeline

Show the session as a sequence of meaningful events, not every tiny action.

Useful events:

- user clarified intent
- AI introduced a design direction
- new dependency was added
- state moved to a different layer
- error exposed a wrong assumption
- tests changed the implementation
- code was refactored

### 4. Decision Cards

Each decision card should include:

- Decision
- Why it mattered
- Evidence from the diff or transcript
- Alternatives
- Tradeoffs
- What a beginner might miss
- What a senior engineer would check

### 5. Risks And Edge Cases

List concrete things that could break:

- empty states
- auth boundaries
- concurrent updates
- data validation
- error handling
- performance bottlenecks
- accessibility issues
- test gaps

### 6. Alternative Approaches

Show at least two alternatives:

- simpler/prototype approach
- more production-ready approach

When useful, include:

- bad approach
- overengineered approach
- high-performance approach

### 7. Understanding Checklist

A compact checklist of what the user should understand.

Example:

```markdown
- [ ] Why validation belongs at the API boundary.
- [ ] Why optimistic UI needs rollback behavior.
- [ ] Why this state does not need a global store yet.
- [ ] How the test proves the edge case.
```

### 8. Quiz

Ask 3-5 questions that require reasoning, not memorization.

Good question:

> Why would moving this logic into middleware reduce duplication but not fully solve authorization?

Weak question:

> What file was changed?

### 9. Follow-Up Practice

Suggest one small exercise that reinforces the session's most important concept.

Example:

> Add one failing test for an expired reset token, then implement the smallest change that makes it pass.

## Experience Principles

### Teach From The User's Own Work

The user's code is the curriculum. Avoid generic lessons unless they directly explain a moment in the session.

### Prefer Contrast Over Certainty

Do not imply every engineering choice has one universal answer. Explain the conditions that make one choice better than another.

### Separate Production From Understanding

The coding agent helps produce. Replay helps understand. These can happen in separate moments.

### Make Mastery Demonstrable

The user should not only read explanations. They should answer, restate, predict, or modify something.

### Keep The Tone Adult

The product should not sound like school. It should sound like a sharp, generous senior engineer.

## Prototype Phases

### Phase 1: Manual Report Generator

Build a script or small local app that accepts:

- session goal
- git diff text
- transcript text

Then produces:

- markdown Session Understanding Report

Success criteria:

- 5 real sessions produce useful reports
- users say the report reveals decisions they had not noticed
- users can answer questions better after reading it

### Phase 2: Learning Viewer

Add a simple web UI:

- upload or paste transcript
- upload or paste diff
- view report
- expand decision cards
- mark checklist items
- answer quiz questions

Success criteria:

- users prefer the viewer over raw markdown
- decision cards become the most-used part of the experience
- users describe it as helping them understand decisions, not merely replaying events

### Phase 3: Repo-Aware Analysis

Allow Replay to inspect the local repository:

- changed files
- package manifest
- tests
- framework conventions
- existing patterns

This improves the quality of decision extraction.

Success criteria:

- Replay catches project-specific conventions
- Replay distinguishes idiomatic local choices from generic advice

### Phase 4: Learning Memory

Track recurring learner patterns:

- weak concepts
- repeated mistakes
- preferred explanation depth
- improvement over time

Success criteria:

- future reports are noticeably more personalized
- users feel the product is helping them develop taste, not only understand one session

## Evaluation

Replay should be evaluated against normal AI summaries.

For each test session, compare:

- generic summary
- Replay report

Ask users:

- What happened?
- Why did it happen that way?
- What alternatives were available?
- What could break?
- What would you do next?

Replay succeeds if users give better answers after using it.

## Early Validation Script

Interview prompt:

```text
Show me a recent thing you built with AI where you are not fully sure you understand the result.
```

Then:

1. Ask them to explain the code before Replay.
2. Generate a Replay report.
3. Ask them to explain it again.
4. Ask what changed in their understanding.
5. Ask which part of the report felt most valuable.

Look for:

- moments of realization
- increased confidence
- better vocabulary
- sharper tradeoff awareness
- desire to use it on another session

## Minimum Lovable Moment

The product is working when a user says:

> I knew what changed, but I did not understand why it changed that way until Replay showed me.

## What To Build First

Build a local markdown report generator with this command shape:

```bash
replay learn \
  --goal "Add password reset" \
  --diff ./examples/password-reset.diff \
  --transcript ./examples/password-reset-transcript.md \
  --out ./reports/password-reset-replay.md
```

The first implementation can use an LLM behind the scenes, but the product logic should enforce a strong report schema. This avoids producing generic summaries.

This can be complementary to tools such as `claude-replay`: use existing session logs or replay exports as input, then generate the educational layer on top.

## Non-Goals

For the MVP, do not build:

- accounts
- teams
- billing
- IDE integration
- session recording daemon
- marketplace
- certification
- long course content
- gamification

These may become useful later, but they are distractions before the core artifact works.

## Next Build Step

Create the first prototype:

- a CLI report generator
- a report schema
- one example session fixture
- one generated report
- a simple evaluation checklist

This is enough to test the core product promise with real users.
