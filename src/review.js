import { execFile } from "node:child_process";

// Rubrics are the contract between the lab UI, the LLM reviewer, and the
// heuristic fallback. Keyed by module id, then stage. Each criterion must be
// observable in the learner's submission.
export const RUBRICS = {
  "runtime-boundary": {
    repair: {
      title: "Repair the naive voice page so you would ship it",
      context:
        "Next.js App Router page. Naive version calls browser-only APIs with no boundary or guards:\n" +
        "export default function Page() {\n" +
        "  const recognition = new window.SpeechRecognition();\n" +
        "  localStorage.setItem(\"goals\", \"[]\");\n" +
        "}",
      criteria: [
        { id: "boundary", name: "Browser behavior isolated behind a client boundary", required: true },
        { id: "guards", name: "Browser APIs feature-checked before use", required: true },
        { id: "unsupported", name: "Unsupported browser gets a designed state, not a crash", required: true },
        { id: "denied", name: "Permission denial is a handled state", required: false },
        { id: "verify", name: "Names how the failure states get verified", required: false }
      ],
      passRule: "all required criteria pass, plus at least one of the optional two",
      intentNote:
        "Pseudo-code and comments are VALID evidence for the design criteria (unsupported, denied, verify) — " +
        "e.g. '// denied -> mic-help screen with retry' earns the denied criterion. " +
        "The client boundary and the capability guards must be real code, not comments. " +
        "Judge the thinking, not React fluency."
    },
    transfer: {
      title: "Transfer the judgment to geolocation + camera + localStorage",
      context:
        "Scenario: a future AI session adds geolocation, camera capture, and localStorage to a " +
        "Next.js dashboard. It works in the browser during development. The learner writes a plan.",
      criteria: [
        { id: "boundary", name: "Isolates the browser-capability work behind a client boundary", required: true },
        { id: "guards", name: "Feature-detects geolocation/camera before use", required: true },
        { id: "failure-states", name: "Designs denied/unsupported states up front", required: true },
        { id: "no-overfit", name: "Reasons about runtime ownership, not 'use client' as magic syntax", required: false },
        { id: "verify", name: "Verification beyond 'works in dev'", required: false }
      ],
      passRule: "all required criteria pass, plus at least one of the optional two"
    }
  },
  "secret-boundary": {
    repair: {
      title: "Move the Anthropic call behind a server boundary you would ship",
      context:
        "Naive version: a client module with NEXT_PUBLIC_ANTHROPIC_KEY calling api.anthropic.com " +
        "directly from the browser. The learner rewrites it (API route sketch plus what the client " +
        "now calls). Next.js App Router conventions apply.",
      criteria: [
        { id: "route", name: "A server-side route owns the provider call", required: true },
        { id: "secret", name: "Secret comes from server-only env (no NEXT_PUBLIC anywhere)", required: true },
        { id: "validation", name: "Request input is validated before use", required: true },
        { id: "safe-errors", name: "Errors to the client never leak provider details or the key", required: false },
        { id: "abuse", name: "Considers abuse: rate, size, or token caps", required: false }
      ],
      passRule: "all required criteria pass, plus at least one of the optional two",
      intentNote:
        "Pseudo-code and comments are VALID evidence for safe-errors and abuse — " +
        "e.g. '// 429 after 20 req/min per IP' earns the abuse criterion. " +
        "Route ownership, the server-only secret, and input validation must be real code. " +
        "Judge the thinking, not framework fluency."
    },
    transfer: {
      title: "Transfer the judgment to Stripe checkout + webhook",
      context:
        "Scenario: a future AI session adds Stripe checkout and a webhook that marks orders paid. " +
        "Works with test keys in dev. The learner writes the plan that makes it shippable.",
      criteria: [
        { id: "secret", name: "Stripe secret key lives server-side only", required: true },
        { id: "webhook", name: "Webhook is trusted via signature verification, not by URL secrecy", required: true },
        { id: "validation", name: "Validates event/order data before marking anything paid", required: true },
        { id: "idempotency", name: "Considers replayed/duplicate events (idempotency)", required: false },
        { id: "verify", name: "Verification beyond 'works with test keys'", required: false }
      ],
      passRule: "all required criteria pass, plus at least one of the optional two"
    }
  }
};

export function getRubric(moduleId, stage) {
  const mod = RUBRICS[moduleId];
  return mod ? mod[stage] : null;
}

export function reviewPrompt(rubric, submission) {
  return `You are the reviewer inside Replay, a lab that turns real AI coding sessions into
professional judgment training. Review the learner's submission against the rubric.

Be concrete and tough but fair, like a senior engineer reviewing a teammate's fix.
Every note must reference what the learner actually wrote (or failed to write) —
no generic praise, no hedging. A criterion passes only on evidence in the submission.

TASK: ${rubric.title}
CONTEXT:
${rubric.context}

RUBRIC (id | name | required):
${rubric.criteria.map((c) => `${c.id} | ${c.name} | ${c.required}`).join("\n")}

PASS RULE: ${rubric.passRule}
${rubric.intentNote ? `EVIDENCE POLICY: ${rubric.intentNote}` : ""}

LEARNER SUBMISSION:
<<<
${submission}
>>>

Respond with STRICT JSON only, no markdown fences:
{"criteria":[{"id":"...","pass":true,"note":"one concrete sentence citing their submission"}],
 "overall":"PASS"|"FAIL",
 "summary":"2-3 sentences: the strongest thing they did and the most important gap",
 "misconception":"the single misunderstanding their submission reveals, or null"}`;
}

const HEURISTICS = {
  "runtime-boundary": {
    repair: {
      boundary: (s) => /['"]use client['"]|dynamic\s*\(.*ssr:\s*false/.test(s),
      guards: (s) => /typeof window|in window|window\.SpeechRecognition\s*(\?\?|\|\|)|navigator\.|webkitSpeechRecognition/.test(s),
      unsupported: (s) => /unsupported|not supported|fallback/i.test(s),
      denied: (s) => /denied|permission|catch|onerror|NotAllowedError/i.test(s),
      verify: (s) => /test|verify|check\b|assert|playwright|vitest|jest/i.test(s)
    },
    transfer: {
      boundary: (s) => /client (component|boundary)|['"]use client['"]|isolate/i.test(s),
      guards: (s) => /feature.detect|capabilit|typeof|in navigator|getUserMedia|permissions\.query/i.test(s),
      "failure-states": (s) => /denied|unsupported|fallback|error state|graceful/i.test(s),
      "no-overfit": (s) => /runtime|server|render|boundary|ownership/i.test(s),
      verify: (s) => /test|verify|device|browser matrix|e2e|manual check/i.test(s)
    }
  },
  "secret-boundary": {
    repair: {
      route: (s) => /app\/api|route\.(ts|js)|NextResponse|export (async )?function (POST|GET)/.test(s),
      secret: (s) => !/NEXT_PUBLIC/.test(s) && /process\.env\./.test(s),
      validation: (s) => /validat|typeof|\.length|schema|zod|400|invalid|trim\(/i.test(s),
      "safe-errors": (s) => /try|catch|status\(5|generic|console\.error|safe/i.test(s),
      abuse: (s) => /rate|limit|429|max_tokens|cap|size/i.test(s)
    },
    transfer: {
      secret: (s) => /server|env|secret key.*(server|env)|never.*(client|browser)/i.test(s),
      webhook: (s) => /signature|constructEvent|stripe-signature|verif/i.test(s),
      validation: (s) => /validat|check|amount|schema|before marking/i.test(s),
      idempotency: (s) => /idempoten|replay|duplicate|already processed/i.test(s),
      verify: (s) => /test|verify|stripe cli|webhook.*local|e2e/i.test(s)
    }
  }
};

export function heuristicReview(moduleId, stage, submission) {
  const rubric = getRubric(moduleId, stage);
  if (!rubric || !HEURISTICS[moduleId]) {
    return unavailableReview(rubric, moduleId, stage);
  }
  const checks = HEURISTICS[moduleId][stage] || {};
  const criteria = rubric.criteria.map((c) => {
    const pass = Boolean(checks[c.id] && checks[c.id](submission));
    return {
      id: c.id,
      pass,
      note: pass
        ? `Detected evidence for "${c.name}" (pattern match — real review needs the claude CLI on the server).`
        : `No evidence found for "${c.name}".`
    };
  });
  return {
    criteria,
    overall: computeOverall(rubric, criteria),
    summary: "Heuristic review only: pattern-matching, not understanding. Run with the claude CLI available for a real reviewer.",
    misconception: null,
    reviewer: "heuristic"
  };
}

function unavailableReview(rubric, moduleId, stage) {
  return {
    criteria: rubric
      ? rubric.criteria.map((c) => ({ id: c.id, pass: false, note: `Cannot judge "${c.name}" without a reviewer for ${moduleId}:${stage}.` }))
      : [],
    overall: "FAIL",
    summary: `No offline reviewer is available for ${moduleId}:${stage}. Run with the claude CLI available for a real review.`,
    misconception: null,
    reviewer: "unavailable"
  };
}

export function computeOverall(rubric, criteria) {
  const byId = Object.fromEntries(criteria.map((c) => [c.id, c.pass]));
  const requiredOk = rubric.criteria.filter((c) => c.required).every((c) => byId[c.id]);
  const optionalOk = rubric.criteria.filter((c) => !c.required).some((c) => byId[c.id]);
  return requiredOk && optionalOk ? "PASS" : "FAIL";
}

export function reviewWithClaude(rubric, submission, { timeoutMs = 90000 } = {}) {
  return new Promise((resolvePromise) => {
    const child = execFile(
      "claude",
      ["-p", "--model", "sonnet"],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) return resolvePromise(null);
        const raw = stdout.trim();
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start === -1 || end === -1) return resolvePromise(null);
        try {
          const parsed = JSON.parse(raw.slice(start, end + 1));
          if (!Array.isArray(parsed.criteria) || !parsed.overall) return resolvePromise(null);
          // The model judges criteria; the pass rule stays deterministic.
          parsed.overall = computeOverall(rubric, parsed.criteria);
          parsed.reviewer = "claude";
          resolvePromise(parsed);
        } catch {
          resolvePromise(null);
        }
      }
    );
    child.stdin.write(reviewPrompt(rubric, submission));
    child.stdin.end();
  });
}

export async function review(stage, submission, moduleId = "runtime-boundary", inlineRubric = null) {
  // Generated labs carry their own rubric; hand-authored labs look it up by id.
  const rubric = inlineRubric || getRubric(moduleId, stage);
  if (!rubric) throw new Error(`Unknown review stage: ${moduleId}:${stage}`);
  if (!submission || submission.trim().length < 10) {
    return {
      criteria: [],
      overall: "FAIL",
      summary: "Submission is empty. Write the repair (or plan) before asking for review.",
      misconception: null,
      reviewer: "validator"
    };
  }
  const llm = await reviewWithClaude(rubric, submission);
  if (llm) return llm;
  // Heuristic fallback only knows hand-authored patterns. For generated labs with
  // no heuristic, fail honestly rather than fake a pass.
  if (!HEURISTICS[moduleId]) {
    return {
      criteria: rubric.criteria.map((c) => ({ id: c.id, pass: false, note: `Cannot judge "${c.name}" without the claude CLI — generated labs need a real reviewer.` })),
      overall: "FAIL",
      summary: "This is a generated lab; its review needs the claude CLI on the server. Start `replay-labs serve` where claude is available.",
      misconception: null,
      reviewer: "unavailable"
    };
  }
  return heuristicReview(moduleId, stage, submission);
}
