# Replay Product Problem Memo

## Working Thesis

AI coding tools are making it easier to produce software, but they can also weaken the learning loop that turns a person into a better builder.

Replay exists to make every AI-assisted software session increase the human's judgment, taste, and understanding.

The goal is not to teach people how to prompt better. The goal is to help people understand the decisions behind the work: why the solution took this shape, what alternatives existed, what tradeoffs were made, what could go wrong, and how a stronger engineer would evaluate the result.

## The Problem

Modern AI coding agents collapse many layers of software development:

- translating intent into implementation
- choosing libraries and patterns
- modifying files
- debugging errors
- writing tests
- explaining code after the fact

This creates a paradox. A person can now ship more, but understand less.

For young professionals, this is risky because the traditional path to judgment often came from struggling through those collapsed layers. For senior professionals, the risk is different: they may become faster but less reflective, letting taste and review muscles weaken when the agent appears competent.

The durable human advantage is not typing code. It is decision-making:

- knowing what matters
- noticing constraints
- choosing the right level of abstraction
- recognizing bad code
- understanding failure modes
- knowing when a library helps and when it hides complexity
- seeing the product and human consequence of a technical choice

AI can accelerate production. Replay should make sure production also compounds human capability.

## The Core User Pain

The sharpest user pain is:

> I used AI to build or change something, but I do not deeply understand what happened or whether the result is good.

This pain appears in several forms:

- "The code works, but I cannot explain it."
- "I do not know if this is idiomatic or accidental."
- "I accepted the AI's suggestion, but I do not know the tradeoffs."
- "I cannot confidently debug this without the AI."
- "I am shipping faster, but I am not sure I am becoming better."
- "As a mentor or manager, I cannot tell whether my team is learning or merely delegating."

## Target Users

### Initial Users

Replay should start with people close enough to software development to feel the pain immediately:

- junior developers using Claude Code, Codex, Cursor, or similar tools
- self-taught builders trying to become real engineers
- bootcamp graduates entering an AI-native workflow
- product engineers who want to move faster without losing craft
- founders building software with AI but wanting durable understanding

### Secondary Users

Once the core learning artifact is strong, Replay can serve:

- senior engineers mentoring AI-assisted teams
- engineering managers concerned about skill growth
- coding bootcamps and technical education programs
- internal platform teams setting standards for AI-assisted development

## Why Now

The previous generation of developer education assumed the learner had to write most of the code.

The new generation does not.

That changes the educational problem. The important question is no longer only:

> Can the learner produce the implementation?

It becomes:

> Can the learner evaluate, explain, adapt, and responsibly own the implementation?

AI tools have improved the production loop. They have not solved the understanding loop.

Replay should own the understanding loop.

## Product Category

Replay is not primarily:

- a prompt library
- a static course platform
- a code explanation widget
- a generic session recorder
- a quiz generator
- a replacement coding agent

Replay is an apprenticeship layer for AI-assisted software development.

It turns real coding-agent sessions into guided learning experiences that expose decisions, alternatives, tradeoffs, mistakes, and mastery gaps.

## Product Principle

Every AI-assisted build session should leave the human more capable than before.

This principle should shape the product:

- Do not only summarize what happened.
- Extract decisions and explain why they mattered.
- Show alternatives, including worse and better approaches.
- Ask the human to actively restate or choose.
- Track understanding over time.
- Teach both high-level motivation and low-level mechanics.
- Treat code as a product of human judgment, not just generated text.

## The Core Loop

1. The user builds with an AI coding tool.
2. Replay captures or imports the session.
3. Replay reconstructs the timeline of prompts, tool calls, commands, errors, tests, and diffs.
4. Replay identifies meaningful learning moments.
5. Replay generates a guided explanation of the decisions behind the code.
6. The user answers questions, restates reasoning, or explores alternatives.
7. Replay identifies gaps and produces a personalized learning path.

## The Main Artifact

The first core artifact should be a Session Understanding Report.

It should answer:

- What problem was being solved?
- Why did the problem exist?
- What changed?
- What were the important design decisions?
- What alternatives could have been chosen?
- What edge cases matter?
- What code smells or risks appeared?
- What did the AI handle well?
- What should the human have questioned?
- What should the human now understand?
- What follow-up practice would improve judgment?

This report should feel like a senior engineer replaying the session with the learner, not like a school worksheet.

## Differentiated Features

### Decision Extraction

Replay must identify decisions, not only changes.

Weak summary:

> Added authentication middleware and tests.

Strong Replay explanation:

> Token validation was moved into middleware so unauthorized requests are rejected before reaching route handlers. This centralizes a shared concern, but route-specific authorization still belongs closer to business logic.

Decision extraction is the heart of the product.

### Contrastive Teaching

People develop taste through contrast. Replay should show:

- the simple approach
- the idiomatic approach
- the production-ready approach
- the overengineered approach
- the fragile approach
- the high-performance approach

The goal is not to say there is only one correct answer. The goal is to build judgment about context.

### Understanding Checks

Replay should ask the user to demonstrate understanding:

- "Explain why this state was kept local instead of global."
- "Which edge case is most likely to break this implementation?"
- "What would change if this needed to support 10x more users?"
- "When would this library be unnecessary?"

The product should avoid constant interruption during build mode. Understanding checks are most valuable after meaningful moments or at the end of a session.

### Learning Memory

Replay should maintain a model of the user's growth:

- overuses libraries
- under-tests edge cases
- struggles with async flow
- misses security implications
- understands product tradeoffs well
- needs practice reading diffs
- tends to accept abstractions too early

This memory should shape future explanations and quizzes.

## MVP Scope

The first version should be a post-session tool, not a full IDE.

### Input

Accept one or more of:

- a Claude Code session transcript
- a Codex session transcript
- a git diff
- command/test output
- a short user-provided goal for the session

### Output

Generate:

- a timeline of the session
- an annotated diff
- a set of decision cards
- an understanding checklist
- a short mastery quiz
- a recommended follow-up learning path

### First User Flow

1. User imports a session or points Replay at a local repo.
2. User adds a sentence describing what they were trying to build.
3. Replay analyzes the transcript and diff.
4. Replay produces a Session Understanding Report.
5. User walks through decision cards.
6. User answers 3-5 understanding questions.
7. Replay marks concepts as understood, shaky, or missing.

## MVP Screens

### Session Timeline

Shows prompts, file changes, commands, errors, tests, and key turning points.

### Diff Explorer

Shows code changes with teaching annotations attached to relevant lines or files.

### Decision Cards

Each card explains:

- the decision
- why it mattered
- alternatives
- tradeoffs
- what a beginner might miss
- what a senior engineer would check

### Understanding Checklist

A running list of concepts the learner should understand before considering the session complete.

### Quiz And Restate

Short questions that ask the user to explain reasoning, identify risks, or choose between approaches.

### Mastery Report

Summarizes:

- what the learner likely understands
- what remains weak
- what to practice next
- which future sessions should reinforce the same concept

## What Good Feels Like

The product should feel like watching a thoughtful senior engineer think out loud.

It should be:

- calm
- precise
- opinionated without being dogmatic
- encouraging without being shallow
- practical
- respectful of the learner's intelligence

The user should leave thinking:

> I not only built the thing. I understand the thing, and I can make better decisions next time.

## Risks

### Risk: It Becomes Generic Summarization

If Replay only summarizes transcripts, it will be easy to copy.

Countermeasure: focus on decision extraction, contrastive teaching, and demonstrated understanding.

### Risk: It Interrupts Flow Too Much

If Replay tries to teach during every step, builders may find it annoying.

Countermeasure: separate Build Mode from Learning Mode, while still allowing lightweight inline explanations when requested.

### Risk: It Over-Teaches Beginners

Too much explanation can overwhelm people.

Countermeasure: adapt depth by persona and current mastery.

### Risk: It Sounds Authoritative When Wrong

Teaching products carry trust risk.

Countermeasure: cite code evidence, show uncertainty, ask the user to verify important assumptions, and prefer concrete examples from the session.

## Open Questions

- Should Replay start as a CLI, local desktop app, web app, or IDE extension?
- Which session format should be supported first: Codex, Claude Code, Cursor, or generic git diff plus transcript?
- Should the first user be an individual learner or a senior engineer reviewing team sessions?
- How much should Replay rely on existing coding agents versus running its own analysis agent?
- What is the minimum artifact that creates a "wow, I understand this now" moment?
- Should mastery be private personal feedback or shareable with mentors/managers?

## Recommended First Bet

Build the smallest version that proves this claim:

> Replay can take one real AI coding session and make the human understand the decisions behind the code better than they did before.

That means the first prototype should not try to manage users, teams, courses, or long-term analytics.

It should do one thing beautifully:

> Turn a transcript and diff into an annotated decision replay with an understanding checklist.

If that artifact feels valuable, the rest of the product can grow around it.

