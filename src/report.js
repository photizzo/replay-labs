const MAX_SNIPPET_LINES = 8;
const DECISION_PRIORITY = {
  "next-client-boundary": 100,
  "api-secret-boundary": 100,
  "cli-contract": 90,
  "token-lifecycle": 85,
  "api-boundary-validation": 82,
  "prompt-protocol": 80,
  "demo-persistence": 78,
  "product-loop-first": 72,
  "dependency-choice": 70,
  "schema-first-reporting": 68,
  "fixture-driven-product-learning": 55,
  "test-regression-net": 35,
  "error-handling": 30
};

const DECISION_RULES = [
  {
    id: "next-client-boundary",
    title: "Put browser-only voice behavior behind a client component boundary",
    patterns: [/'use client'|"use client"/i, /SpeechRecognition/i, /speechSynthesis/i, /localStorage/i],
    why:
      "Browser speech APIs and localStorage only exist in the browser. In a Next.js app, that pushes the interactive voice experience into a client component.",
    beginnerMiss:
      "A beginner may call browser APIs from server-rendered code and only discover the problem at runtime or hydration time.",
    seniorCheck:
      "A senior engineer would check that browser APIs are guarded, loading states are explicit, and unsupported browsers fail gracefully.",
    alternatives: [
      "Browser-first demo: use Web Speech API and Speech Synthesis in a client component.",
      "Server-driven voice: use a phone provider or realtime audio API for more consistent voice behavior.",
      "Fragile: assume every browser supports the same speech APIs."
    ]
  },
  {
    id: "api-secret-boundary",
    title: "Keep model and telephony credentials behind API routes",
    patterns: [/app\/api/i, /ANTHROPIC_API_KEY/i, /Anthropic/i, /twilio/i, /NextRequest/i, /NextResponse/i],
    why:
      "API routes let the browser call application behavior without exposing provider secrets. This is the boundary between demo UI and trusted server work.",
    beginnerMiss:
      "A beginner may put provider calls directly in the browser because it feels simpler, accidentally leaking credentials or making the app impossible to deploy safely.",
    seniorCheck:
      "A senior engineer would inspect environment variables, error handling, request validation, and whether provider failures produce usable user feedback.",
    alternatives: [
      "Simple demo: call a Next.js API route that wraps the provider SDK.",
      "Production-ready: add validation, rate limits, structured errors, and observability.",
      "Unsafe: call Anthropic or Twilio directly from client code."
    ]
  },
  {
    id: "demo-persistence",
    title: "Use simple persistence only when the demo constraint is explicit",
    patterns: [/goals\.json/i, /fs\.writeFileSync/i, /fs\.readFileSync/i, /in-memory store/i, /new Map/i],
    why:
      "A text or JSON file can be the right choice for a single-user demo because it keeps the concept visible and avoids database setup.",
    beginnerMiss:
      "A beginner may confuse demo persistence with production persistence and miss concurrency, deployment, data loss, and multi-user problems.",
    seniorCheck:
      "A senior engineer would verify that the file-store limitation is documented and that the next production step is obvious.",
    alternatives: [
      "Demo: store goals in a local JSON file.",
      "Small production app: use SQLite, Postgres, or a hosted datastore.",
      "Wrong abstraction: add a complex data layer before proving the product loop."
    ]
  },
  {
    id: "prompt-protocol",
    title: "Define a small protocol between the model and app logic",
    patterns: [/SAVE_GOALS/i, /parseGoals/i, /MORNING_SYSTEM/i, /EVENING_SYSTEM/i, /system/i],
    why:
      "When an LLM response drives application state, the app needs a predictable protocol for extracting structured intent from natural language.",
    beginnerMiss:
      "A beginner may parse free-form prose casually and end up with brittle behavior whenever the model phrases things differently.",
    seniorCheck:
      "A senior engineer would check parsing robustness, prompt constraints, tests around malformed output, and whether structured tool calls would be better.",
    alternatives: [
      "Prototype: use a sentinel like SAVE_GOALS with JSON payload.",
      "Better: use structured outputs or tool calls where available.",
      "Fragile: infer goals from arbitrary prose without a contract."
    ]
  },
  {
    id: "product-loop-first",
    title: "Validate the product loop before hardening the platform",
    patterns: [/morning/i, /evening/i, /accountability/i, /check-in/i, /goals/i],
    why:
      "The core product question is whether a morning commitment and evening check-in feels useful. Implementation choices should serve that loop first.",
    beginnerMiss:
      "A beginner may optimize infrastructure, styling, or integrations before proving that the human workflow is compelling.",
    seniorCheck:
      "A senior engineer would ask whether each technical choice helps validate the behavioral loop or distracts from it.",
    alternatives: [
      "Loop-first: build the smallest morning/evening check-in that can be tried today.",
      "Integration-first: connect Notion, calendars, SMS, and billing before validating the habit loop.",
      "Research-first: prototype the conversation script manually before coding."
    ]
  },
  {
    id: "api-boundary-validation",
    title: "Validate at the API boundary",
    patterns: [/validate/i, /schema/i, /zod/i, /required/i],
    why:
      "Boundary validation keeps invalid or incomplete input out of the business logic. It also makes failure behavior easier to test and reason about.",
    beginnerMiss:
      "A beginner may only check that the happy path works and miss that malformed input should fail before any state changes happen.",
    seniorCheck:
      "A senior engineer would verify that validation errors are explicit, test-covered, and consistent with the rest of the API.",
    alternatives: [
      "Prototype: check only the fields needed for the immediate happy path.",
      "Production-ready: use a shared schema or validation helper so routes behave consistently.",
      "Fragile: trust the client to send valid data."
    ]
  },
  {
    id: "token-lifecycle",
    title: "Treat tokens as lifecycle-bound state",
    patterns: [/token/i, /expires/i, /expiry/i, /reset/i],
    why:
      "Password reset, invitation, and verification tokens are temporary authority. Their creation, expiry, and consumption rules define the security boundary.",
    beginnerMiss:
      "A beginner may store or check a token without thinking through reuse, expiration, or whether failed attempts leak account information.",
    seniorCheck:
      "A senior engineer would check expiration, one-time use, hashing at rest, account enumeration behavior, and tests for invalid tokens.",
    alternatives: [
      "Simple: store a reset token and expiry directly on the user record.",
      "More robust: store hashed tokens in a separate table with explicit consumed/expired state.",
      "Risky: persist raw tokens indefinitely."
    ]
  },
  {
    id: "test-regression-net",
    title: "Use tests as the regression net",
    patterns: [/test/i, /expect/i, /describe/i, /it\(/i, /assert/i],
    why:
      "Tests turn the session's intended behavior into an executable contract, which matters when AI-generated changes are revised later.",
    beginnerMiss:
      "A beginner may treat tests as proof that the code is correct without checking whether the tests cover important edge cases.",
    seniorCheck:
      "A senior engineer would look for tests that fail for the right reason before the fix and cover both happy path and important failure modes.",
    alternatives: [
      "Fast prototype: add one high-signal integration test.",
      "Production-ready: cover happy path, invalid input, expired state, and repeated actions.",
      "Weak: snapshot only the final UI or output without asserting behavior."
    ]
  },
  {
    id: "cli-contract",
    title: "Design the CLI as a stable product contract",
    patterns: [/bin":/i, /parseArgs/i, /Usage:/i, /process\.argv/i, /--goal|--diff|--transcript|--out/i],
    why:
      "A CLI command is a user-facing contract. Its flags, errors, usage text, and output paths define how people will automate and trust the tool.",
    beginnerMiss:
      "A beginner may focus on making the script run once and miss the importance of predictable flags, helpful errors, and repeatable output.",
    seniorCheck:
      "A senior engineer would verify required arguments, failure messages, exit codes, path handling, and whether the command shape matches the product's core workflow.",
    alternatives: [
      "Prototype: accept explicit file paths and write a markdown report.",
      "More robust: support stdin, glob inputs, config files, and structured JSON output.",
      "Fragile: rely on positional arguments with unclear ordering."
    ]
  },
  {
    id: "schema-first-reporting",
    title: "Keep the report schema stricter than the model output",
    patterns: [/Decision Cards/i, /Understanding Checklist/i, /Quiz/i, /generateLearningReport/i, /formatDecisions/i],
    why:
      "A strict report schema protects the product from becoming a generic summary generator. It forces every output to teach decisions, risks, alternatives, and mastery checks.",
    beginnerMiss:
      "A beginner may ask an LLM to summarize the session and accept fluent prose even when it does not teach judgment.",
    seniorCheck:
      "A senior engineer would check whether the schema creates consistent, reviewable sections and whether each section is grounded in session evidence.",
    alternatives: [
      "Loose: ask for a narrative summary of what happened.",
      "Schema-first: require decisions, risks, alternatives, checklist, quiz, and evidence.",
      "Evaluator-driven: score reports against a rubric for decision specificity and usefulness."
    ]
  },
  {
    id: "fixture-driven-product-learning",
    title: "Use fixtures to make product quality inspectable",
    patterns: [/examples\//i, /reports\//i, /password-reset/i, /fixture/i],
    why:
      "Fixtures make the product idea concrete. They let the team inspect whether the output feels educational before investing in heavier UI or integrations.",
    beginnerMiss:
      "A beginner may skip examples and only test implementation mechanics, making it harder to judge the user experience.",
    seniorCheck:
      "A senior engineer would keep representative fixtures and compare report quality across different session types.",
    alternatives: [
      "Fast: maintain one hand-written fixture that exercises the report shape.",
      "Better: add several real anonymized sessions across frontend, backend, debugging, and refactoring work.",
      "Weak: test only that files are written without checking report usefulness."
    ]
  },
  {
    id: "error-handling",
    title: "Make failure behavior explicit",
    patterns: [/throw/i, /catch/i, /error/i, /status/i, /400|401|403|404|500/],
    why:
      "Explicit failure handling makes the system predictable for users, callers, and future maintainers.",
    beginnerMiss:
      "A beginner may let exceptions bubble accidentally or return vague errors that make debugging and UX worse.",
    seniorCheck:
      "A senior engineer would check that expected failures are handled intentionally and unexpected failures are still observable.",
    alternatives: [
      "Simple: return clear status codes and messages at the route layer.",
      "Production-ready: use typed errors or a shared error mapper.",
      "Fragile: catch every error and return a generic success-like response."
    ]
  },
  {
    id: "dependency-choice",
    title: "Add dependencies only when they buy enough clarity",
    patterns: [/package\.json/i, /^\+\s*"dependencies":/m, /^\+\s*"devDependencies":/m],
    why:
      "A library can reduce implementation risk, but it also adds API surface, update burden, and conventions the team must understand.",
    beginnerMiss:
      "A beginner may add a library because it solves the immediate task without weighing whether the project already has a simpler pattern.",
    seniorCheck:
      "A senior engineer would check bundle/runtime impact, maintenance quality, security posture, and fit with existing project conventions.",
    alternatives: [
      "No dependency: implement the small behavior directly if it is truly simple.",
      "Use existing dependency: prefer a tool already present in the project.",
      "New dependency: add one when it removes meaningful complexity or risk."
    ]
  }
];

export function generateLearningReport({ goal, diff, transcript, diffPath, transcriptPath }) {
  const analysis = analyzeSession({ goal, diff, transcript, diffPath, transcriptPath });

  return formatLearningReport(analysis);
}

export function analyzeSession({ goal, diff, transcript, diffPath, transcriptPath }) {
  const changedFiles = extractChangedFiles(diff);
  const stats = summarizeDiff(diff);
  const transcriptSignals = extractTranscriptSignals(transcript);
  const decisions = extractDecisions({ diff, transcript });
  const risks = extractRisks({ diff, transcript });

  return {
    goal,
    diff,
    transcript,
    diffPath,
    transcriptPath,
    changedFiles,
    stats,
    transcriptSignals,
    decisions,
    risks
  };
}

function formatLearningReport(analysis) {
  const {
    goal,
    diff,
    transcript,
    diffPath,
    transcriptPath,
    changedFiles,
    stats,
    transcriptSignals,
    decisions,
    risks
  } = analysis;

  return [
    `# Session Understanding Report`,
    ``,
    `## Session Goal`,
    ``,
    goal,
    ``,
    `## Inputs`,
    ``,
    `- Diff: \`${diffPath}\``,
    `- Transcript: \`${transcriptPath}\``,
    ``,
    `## What Changed`,
    ``,
    `This session touched ${changedFiles.length || "no detected"} file${changedFiles.length === 1 ? "" : "s"} with ${stats.added} added line${stats.added === 1 ? "" : "s"} and ${stats.removed} removed line${stats.removed === 1 ? "" : "s"}.`,
    ``,
    ...formatChangedFiles(changedFiles),
    ``,
    `## Problem Diagnosis`,
    ``,
    buildProblemDiagnosis(goal, transcriptSignals),
    ``,
    `## Meaningful Timeline`,
    ``,
    ...formatTimeline(transcriptSignals, changedFiles, stats),
    ``,
    `## Decision Cards`,
    ``,
    ...formatDecisions(decisions),
    ``,
    `## Risks And Edge Cases`,
    ``,
    ...formatRisks(risks),
    ``,
    `## Alternative Approaches`,
    ``,
    ...formatAlternatives(decisions),
    ``,
    `## Understanding Checklist`,
    ``,
    ...formatChecklist(decisions, risks),
    ``,
    `## Quiz`,
    ``,
    ...formatQuiz(decisions, risks),
    ``,
    `## Follow-Up Practice`,
    ``,
    buildFollowUp(decisions, risks),
    ``,
    `## Evidence Snippets`,
    ``,
    ...formatEvidence(diff, transcript)
  ].join("\n");
}

function extractChangedFiles(diff) {
  const files = [];
  for (const line of diff.split("\n")) {
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (match) {
      files.push(match[2]);
    }
  }
  return [...new Set(files)];
}

function summarizeDiff(diff) {
  let added = 0;
  let removed = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    if (line.startsWith("-")) removed += 1;
  }

  return { added, removed };
}

function extractTranscriptSignals(transcript) {
  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const signals = [];
  for (const line of lines) {
    if (/^(user|assistant|tool|command|test|error):/i.test(line)) {
      signals.push(line);
    }
  }

  return signals.slice(0, 12);
}

function extractDecisions({ diff, transcript }) {
  const haystack = `${diff}\n${transcript}`;
  const decisions = DECISION_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(haystack))
  );

  if (decisions.length > 0) {
    return decisions
      .sort((a, b) => (DECISION_PRIORITY[b.id] || 50) - (DECISION_PRIORITY[a.id] || 50))
      .slice(0, 5);
  }

  return [
    {
      id: "implementation-shape",
      title: "Choose an implementation shape that matches the problem size",
      why:
        "The first engineering decision is whether the solution should be local and simple or abstracted for reuse.",
      beginnerMiss:
        "A beginner may copy the first working pattern without asking whether it fits the surrounding codebase.",
      seniorCheck:
        "A senior engineer would compare the change against existing project conventions and likely future requirements.",
      alternatives: [
        "Prototype: keep the change close to the use case.",
        "Production-ready: extract a shared abstraction only after repeated usage is clear.",
        "Overengineered: introduce a framework-level abstraction for a one-off behavior."
      ]
    }
  ];
}

function extractRisks({ diff, transcript }) {
  const haystack = `${diff}\n${transcript}`;
  const risks = [];

  if (/SpeechRecognition|speechSynthesis|localStorage|window\./i.test(haystack)) {
    risks.push("Browser capability: voice and storage APIs need unsupported-browser and permission-denied paths.");
  }
  if (/ANTHROPIC_API_KEY|Twilio|twilio|app\/api|NextRequest/i.test(haystack)) {
    risks.push("Secret boundary: provider credentials must stay server-side and errors should not leak sensitive details.");
  }
  if (/goals\.json|fs\.writeFileSync|fs\.readFileSync|new Map|in-memory/i.test(haystack)) {
    risks.push("Demo persistence: local files or memory will not survive serverless/runtime constraints or multi-user usage.");
  }
  if (/SAVE_GOALS|parseGoals|system prompt|MORNING_SYSTEM|EVENING_SYSTEM/i.test(haystack)) {
    risks.push("Model protocol: parsing model text needs tests for malformed, missing, or unexpected structured markers.");
  }
  if (/password|unauthorized|reset token|resetToken/i.test(haystack)) {
    risks.push("Security boundary: verify that unauthorized, expired, reused, or malformed credentials cannot succeed.");
  }
  if (/test|expect|assert|describe|it\(/i.test(haystack)) {
    risks.push("Test coverage: check whether tests prove failure modes, not only the happy path.");
  } else {
    risks.push("Missing tests: this session does not show obvious regression coverage.");
  }
  if (/error|throw|catch|status|400|401|403|404|500/i.test(haystack)) {
    risks.push("Failure semantics: make sure expected failures are distinguishable from unexpected system errors.");
  }
  if (/email|mail|notification/i.test(haystack)) {
    risks.push("External side effect: email or notification behavior should be idempotent enough for retries.");
  }
  if (/db|database|sql|migration|schema|prisma|drizzle/i.test(haystack)) {
    risks.push("Data model: confirm migration, rollback, and existing-data behavior.");
  }

  return [...new Set(risks)].slice(0, 6);
}

function buildProblemDiagnosis(goal, signals) {
  const signalText = signals.length
    ? ` The transcript suggests the work moved through ${signals.length} notable prompt/tool moments.`
    : "";

  return `The session goal was to ${lowercaseFirst(goal)}. The important learning question is not only whether the implementation works, but what constraints shaped it, which choices created future maintenance obligations, and what evidence proves the behavior.${signalText}`;
}

function formatChangedFiles(files) {
  if (files.length === 0) return ["No changed files were detected from the diff headers."];
  return files.map((file) => `- \`${file}\``);
}

function formatTimeline(signals, files, stats) {
  const timeline = [
    `1. The human set the goal and the session established the intended behavior.`,
    `2. The implementation changed ${files.length || "an unknown number of"} file${files.length === 1 ? "" : "s"}, creating the code evidence for review.`,
    `3. The diff added ${stats.added} line${stats.added === 1 ? "" : "s"} and removed ${stats.removed} line${stats.removed === 1 ? "" : "s"}, which should be read for both behavior and tradeoffs.`
  ];

  if (signals.length > 0) {
    timeline.push(`4. The transcript contains notable moments such as: ${signals.slice(0, 3).join(" / ")}`);
  }

  return timeline;
}

function formatDecisions(decisions) {
  return decisions.flatMap((decision, index) => [
    `### ${index + 1}. ${decision.title}`,
    ``,
    `**Why it mattered:** ${decision.why}`,
    ``,
    `**What a beginner might miss:** ${decision.beginnerMiss}`,
    ``,
    `**What a senior engineer would check:** ${decision.seniorCheck}`,
    ``
  ]);
}

function formatRisks(risks) {
  return risks.map((risk) => `- ${risk}`);
}

function formatAlternatives(decisions) {
  const alternatives = decisions.flatMap((decision) => decision.alternatives || []);
  return [...new Set(alternatives)].slice(0, 8).map((alternative) => `- ${alternative}`);
}

function formatChecklist(decisions, risks) {
  const checklist = decisions.map((decision) => `- [ ] Explain: ${lowercaseFirst(decision.title)}.`);
  for (const risk of risks.slice(0, 3)) {
    checklist.push(`- [ ] Identify how the implementation handles this risk: ${risk}`);
  }
  checklist.push("- [ ] Point to the exact code or test evidence that proves the intended behavior.");
  return checklist;
}

function formatQuiz(decisions, risks) {
  const questions = [];
  const primary = decisions[0];

  questions.push(`1. Why was "${primary.title}" an important decision in this session?`);
  questions.push(`2. What is one alternative approach, and what tradeoff would it create?`);
  questions.push(`3. Which edge case is most likely to break this implementation if it was missed?`);

  if (risks.length > 0) {
    questions.push(`4. What evidence would prove this risk is handled: ${risks[0]}`);
  }

  questions.push("5. If you had to review this change tomorrow, what would you inspect first and why?");
  return questions;
}

function buildFollowUp(decisions, risks) {
  const decision = decisions[0];
  const risk = risks[0] || "the most important failure mode";
  return `Write one small test or example that would fail if "${decision.title}" was implemented incorrectly. Use it to prove the handling of ${risk}`;
}

function formatEvidence(diff, transcript) {
  return [
    `### Diff`,
    ``,
    "```diff",
    ...diff.split("\n").slice(0, MAX_SNIPPET_LINES),
    "```",
    ``,
    `### Transcript`,
    ``,
    "```text",
    ...transcript.split("\n").slice(0, MAX_SNIPPET_LINES),
    "```"
  ];
}

function lowercaseFirst(value) {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}
