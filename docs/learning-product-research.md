# Learning Product Research For Replay

## Why This Research Matters

The original Replay problem is not "how do we show users what an AI agent did?"

The problem is:

> How do we make AI-assisted work transfer judgment, taste, and understanding back to the human?

Refactoring Guru and Build Your Own X are useful references, but they are only two examples. The broader landscape shows that strong learning products usually win by choosing a clear learning mechanism.

Replay should do the same.

## Reference Patterns

### 1. Refactoring Guru: Catalog Of Mental Models

Reference: https://refactoring.guru/

Core learning mechanism:

- name a recurring problem
- show why it appears
- show bad or naive code
- show the improved structure
- explain tradeoffs
- teach when to use and when not to use the pattern

What matters for Replay:

Refactoring Guru gives people vocabulary and pattern recognition. It helps them see a messy codebase and say, "This is a code smell," or "This is a Strategy-like decision."

Replay equivalent:

- "This was a client/server boundary decision."
- "This was a model-output protocol decision."
- "This was demo persistence, not production persistence."
- "This was product-loop-first implementation."

Replay should build a catalog of AI-session decision patterns.

### 2. Build Your Own X: Reconstruction From First Principles

Reference: https://github.com/codecrafters-io/build-your-own-x

Core learning mechanism:

- rebuild a known system from scratch
- remove magic
- force the learner to understand the parts by constructing them

What matters for Replay:

The learner does not merely read an explanation. They recreate the mechanism.

Replay equivalent:

After an AI session builds a feature, Replay should ask the learner to rebuild one small part:

- implement the naive version
- predict what breaks
- compare with the AI-generated version
- improve one edge case

This converts "AI did it" into "I understand the mechanism."

### 3. CodeCrafters: Staged Real-World Challenges

Reference: https://codecrafters.io/

Core learning mechanism:

- real systems
- staged progression
- local development in the user's own editor
- tests as feedback
- each stage exposes one concept

What matters for Replay:

CodeCrafters succeeds because every stage has a concrete pass/fail loop. The learner builds, runs tests, gets feedback, and moves to the next capability.

Replay equivalent:

For each extracted decision, generate a small challenge:

- "Break this by removing `use client`."
- "Move this provider call into the browser and explain the security problem."
- "Replace `goals.json` with an in-memory store. What behavior changes?"
- "Write a test for malformed `SAVE_GOALS` output."

The product should not only ask questions. It should make the learner perform a small proving action.

### 4. Exercism: Practice Plus Review

Reference: https://exercism.org/

Core learning mechanism:

- solve small exercises
- submit code
- receive mentor or peer feedback
- improve through review

What matters for Replay:

Exercism's strength is feedback. It turns practice into growth because someone or something reviews the learner's actual solution.

Replay equivalent:

Replay needs a real answer evaluator:

- learner explains a decision
- learner modifies code or writes a small test
- Replay reviews the answer
- Replay says what is strong, missing, or wrong

Without feedback, Replay becomes content. With feedback, it becomes apprenticeship.

### 5. Boot.dev: Guided Momentum And Habit

Reference: https://www.boot.dev/

Core learning mechanism:

- hands-on lessons
- gamified progression
- daily momentum
- AI help when stuck

What matters for Replay:

Boot.dev reduces the friction of showing up. It turns learning into a loop with visible progress.

Replay equivalent:

Replay should track growth over many sessions:

- concepts mastered
- repeated weak spots
- decision types encountered
- next best exercise
- learner confidence versus demonstrated understanding

### 6. OverTheWire / Wargames: Constraint-Based Discovery

Reference: https://overthewire.org/wargames/

Core learning mechanism:

- give a constrained environment
- learner discovers commands, clues, and failure modes
- progress requires solving, not reading

What matters for Replay:

Some engineering judgment is best learned by debugging or discovering the failure.

Replay equivalent:

Create "what breaks?" labs from AI sessions:

- remove an API boundary
- corrupt model output
- deny microphone permission
- simulate serverless file-system behavior
- expire state between calls

Then ask the learner to diagnose the failure.

### 7. The Missing Semester: Professional Tools And Mental Models

Reference: https://missing.csail.mit.edu/

Core learning mechanism:

- teach the practical tools and concepts that formal education skips
- focus on mental models behind everyday developer work

What matters for Replay:

Replay is also about the missing layer: not syntax, but professional reasoning.

Replay equivalent:

Teach the hidden decisions inside AI-assisted sessions:

- boundaries
- abstractions
- testing strategy
- error handling
- operational risk
- product tradeoffs
- when not to use a library

## What This Means For Replay

Replay should not primarily be:

- a replay viewer
- a markdown report generator
- a quiz generator
- a code explanation panel

Replay should be:

> A session-to-apprenticeship engine.

It should transform an AI coding session into a guided module that teaches one or more professional decisions through explanation, contrast, practice, and feedback.

## Better Product Shape

For each important decision, the module should contain:

1. **Decision Name**
   A durable mental model, such as "Client Boundary" or "Demo Persistence."

2. **Why It Appeared**
   Why this decision came up in this exact session.

3. **Naive Version**
   The simpler or wrong version a beginner might write.

4. **What Breaks**
   The failure mode that reveals why the decision matters.

5. **AI Session Version**
   What the AI actually built.

6. **Production Version**
   How the decision would change in a more serious system.

7. **Micro-Exercise**
   A small action the learner performs.

8. **Answer Review**
   Replay critiques the learner's answer or code.

9. **Taste Takeaway**
   A short rule of thumb the learner can reuse later.

## Example: Voice Accountability App

Decision:

> Put browser-only voice behavior behind a client component boundary.

Naive version:

```tsx
export default function Page() {
  const recognition = new window.SpeechRecognition();
}
```

What breaks:

- `window` does not exist on the server
- speech APIs are browser-specific
- unsupported browsers need fallback behavior

AI session version:

```tsx
'use client';
```

Micro-exercise:

> Remove the client boundary. Predict the error. Then restore it and add a browser-support fallback.

Answer review:

Replay checks whether the learner mentioned:

- server/client runtime boundary
- browser API availability
- user permission failure
- unsupported browser fallback
- evidence from `app/page.tsx`

Taste takeaway:

> If a feature depends on browser APIs, decide where the runtime boundary belongs before writing the component.

## The Core Product Loop

1. Import session and diff.
2. Extract decisions.
3. Convert decisions into learning modules.
4. Ask learner to predict or rebuild.
5. Review the learner's response.
6. Store mastery and weak spots.
7. Recommend the next module from their own work.

## Strongest MVP Revision

The next MVP should not be another report or single-page replay.

It should be one excellent module generated from one session:

> "Client Boundary: why the AI used `use client`, what breaks without it, and how to prove you understand it."

If that single module feels genuinely educational, then Replay has a product.

## Product Principle

Do not optimize for "Did Replay explain the session?"

Optimize for:

> Can the learner now make a better decision in a future session?

