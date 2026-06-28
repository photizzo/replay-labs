import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

// Generate a full lab module for a decision we have NO hand-authored module for,
// from the decision metadata + the session evidence. This is what lets Replay
// "do well for things it has never seen" — any detected decision becomes a deep lab.
//
// The lab UI and reviewer already render/grade ANY schema-conforming module.
// Only the CONTENT is decision-specific, so that is all we generate; a deterministic
// assembler fills the structural defaults so a partial generation still yields a
// working lab.

const GEN_SCHEMA_PROMPT = `You are authoring ONE decision lab for Replay, which turns local AI
coding sessions into practice. You are given a DECISION the AI made and the session
DIFF evidence from the session. Produce the decision-specific teaching content.

Hard rules:
- Ground everything in the session language/stack of the evidence (Go, Python, Rust,
  Terraform, SQL — whatever it is). Do NOT default to JavaScript/React.
- naiveCode: a short, runnable-looking snippet in the evidence's language that
  embodies the decision done the risky/naive way. 3-12 lines.
- The failure must be a specific failure mode of THIS decision in THIS stack.
- arbitrate: two engineers disagree about WHY it failed. Exactly one is correct. The
  wrong one is a plausible, common misconception with a specific rebuttal.
- repair blocks: slice a correct solution into 5-7 ordered blocks, PLUS 2-3 trap
  blocks (plausible-looking wrong choices). The correct blocks in order must form
  valid code. Mark traps with "trap": true.
- reviewCriteria.repair: 3 required + 2 optional, each OBSERVABLE in a submission.
- Keep it tight. This is judgment training, not a tutorial.

Respond with STRICT JSON only (no markdown fences), this exact shape:
{
 "name": "<short pattern name, 1-3 words>",
 "minutes": <int 5-12>,
 "takeaway": "<one sentence: the durable rule>",
 "why": "<2 sentences: why this decision appeared in this session>",
 "naive": "<one sentence describing the naive approach>",
 "naiveFile": "<plausible file path in the session stack>",
 "naiveCode": "<the naive snippet, code, \\n for newlines>",
 "breaks": "<one sentence: what breaks and why>",
 "aiVersion": "<one sentence: what the AI actually did in the session>",
 "production": "<one sentence: the more complete version with the missing safeguards>",
 "smell": "<2-4 word smell name>",
 "smellCopy": "<one sentence describing the smell>",
 "failureTerminal": "<realistic terminal output showing the failure, \\n for newlines>",
 "failureNarration": "<2 sentences explaining why it failed — the lesson>",
 "arbitrate": {
   "wrong": {"handle": "iyke.dev", "text": "<plausible wrong diagnosis>", "verdict": "<why rejecting it matters>"},
   "right": {"handle": "ada.builds", "text": "<correct diagnosis>", "verdict": "<why approving it is right>"}
 },
 "traceTarget": "<regex matching the line in naiveCode where it breaks>",
 "traceHit": "<one sentence: what that line reveals>",
 "diffTarget": "<a short literal substring (5-25 chars) copied EXACTLY from a line in the SESSION DIFF EVIDENCE below that carries this decision — must appear verbatim in the evidence>",
 "repairInstructions": "<one sentence telling the learner what to build>",
 "repairFilename": "<file path label for the editor>",
 "repairStarter": "<the naive code as the editor starting point, \\n for newlines>",
 "repairBlocks": [{"code": "<slice, \\n for newlines>", "trap": false}, ...],
 "repairSolution": "<the full correct solution, \\n for newlines>",
 "reviewCriteria": {
   "repair": [{"id": "<slug>", "name": "<observable criterion>", "required": true}, ...]
 },
 "transferScenario": "<2 sentences: a NEW situation needing the same judgment>",
 "transferRule": "<the reusable rule>",
 "transferFields": [{"key": "<slug>", "label": "<short question>", "ph": "<placeholder>"}, ...],
 "artifactFailure": "<the failure signature to remember>",
 "artifactStandard": "<the completion standard to remember>"
}`;

export function generateModule(decision, evidence, { timeoutMs = 180000 } = {}) {
  if (!hasUsableDiffEvidence(evidence)) return Promise.resolve(null);
  const prompt =
    GEN_SCHEMA_PROMPT +
    "\n\n## DECISION\nname: " + decision.title +
    "\nwhy it matters: " + (decision.why || "") +
    "\nbeginner miss: " + (decision.beginnerMiss || "") +
    "\nwhat to check: " + (decision.seniorCheck || "") +
    "\n\n## SESSION DIFF EVIDENCE (the actual stack — match it)\n" +
    String(evidence).slice(0, 6000) +
    "\n\nOutput ONLY the JSON.";

  return new Promise((resolvePromise) => {
    const child = execFile(
      "claude",
      ["-p", "--model", "sonnet"],
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => {
        if (error) return resolvePromise(null);
        const raw = stdout.trim();
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start === -1 || end === -1) return resolvePromise(null);
        try {
          resolvePromise(JSON.parse(raw.slice(start, end + 1)));
        } catch {
          resolvePromise(null);
        }
      }
    );
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Merge generated content with structural defaults into a full lab module.
// Anything the generator omitted gets a sane default so the lab always renders.
export function assembleGeneratedModule(decision, gen, evidence = "") {
  const id = "gen-" + slug(decision.id || decision.title);
  // Spot targets MUST exist in the real diff evidence or the diagnose beat is
  // unwinnable. Derive them from the decision's own detection patterns (which by
  // construction matched the evidence), filtered to those actually present.
  const evLines = String(evidence).split("\n");
  const inEvidence = (re) => {
    try { const rx = new RegExp(re, "i"); return evLines.some((l) => rx.test(l)); }
    catch { return false; }
  };
  // Prefer the generator's literal diffTarget (a line it quoted from the real
  // evidence); fall back to the decision's detection patterns. Keep only what
  // actually appears in the evidence so the diagnose beat is always winnable.
  const candidates = [];
  if (gen.diffTarget && gen.diffTarget.length >= 4) candidates.push(escapeForRe(gen.diffTarget));
  (decision.patterns || []).forEach((p) => candidates.push((p && p.source) ? p.source : String(p)));
  const spotTargets = candidates
    .filter(inEvidence)
    .slice(0, 2)
    .map((re) => ({ re, note: "a line that carries the " + (gen.name || decision.title) + " decision." }));
  const blocks = Array.isArray(gen.repairBlocks) && gen.repairBlocks.length
    ? gen.repairBlocks
    : null;
  const repairCriteria = (gen.reviewCriteria && Array.isArray(gen.reviewCriteria.repair) && gen.reviewCriteria.repair.length)
    ? normalizeCriteria(gen.reviewCriteria.repair)
    : [
        { id: "addresses", name: "Addresses the core decision in code", required: true },
        { id: "failure", name: "Handles the failure mode the naive version hits", required: true },
        { id: "reasoning", name: "Reasoning is about the decision, not surface syntax", required: true },
        { id: "edges", name: "Considers an edge case or failure state", required: false },
        { id: "verify", name: "Names how it would be verified", required: false }
      ];
  const fields = (Array.isArray(gen.transferFields) && gen.transferFields.length)
    ? gen.transferFields
    : [
        { key: "approach", label: "How would you make this decision here?", ph: "the core move is…" },
        { key: "failure", label: "What failure are you designing against?", ph: "the risk is…" },
        { key: "verify", label: "How do you verify before shipping?", ph: "I'd check…" }
      ];

  const module = {
    id,
    name: gen.name || decision.title,
    generated: true,
    minutes: clampInt(gen.minutes, 5, 12, 8),
    why: gen.why || decision.why || "This decision shaped how the session's code behaves.",
    takeaway: gen.takeaway || decision.seniorCheck || "Name the decision before you accept the code.",
    naive: gen.naive || decision.beginnerMiss || "Accept the first working version without naming the tradeoff.",
    naiveFile: gen.naiveFile || "session",
    naiveCode: gen.naiveCode || "// naive version",
    breaks: gen.breaks || "The code runs in this context, but the tradeoff is not clear enough to reuse.",
    aiVersion: gen.aiVersion || "The AI produced a working implementation.",
    production: gen.production || gen.safeguarded || "Name the decision, handle its failure mode, and verify it.",
    exercise: "Apply the same judgment to the next place this decision appears.",
    patternHref: null,
    challenge: {
      pattern: gen.name || decision.title,
      patternCopy: "A technical decision the learner should be able to explain and reuse.",
      smell: gen.smell || "Unowned decision",
      smellCopy: gen.smellCopy || "The code works but the tradeoff was never named.",
      proof: "Transfer, not recall",
      proofCopy: "You pass when you can apply the same judgment to a new case."
    },
    criteria: {
      diagnose: "Find the decision inside the session changes before any explanation appears.",
      break: "Trace the naive version and click the line where it breaks.",
      repair: "Rubric check against a checklist generated for this decision.",
      transfer: "Rubric check. Apply the judgment to a new situation."
    },
    reviewCriteria: {
      repair: repairCriteria.map((c) => c.name),
      transfer: fields.map((f) => f.label)
    },
    artifact: {
      failure: gen.artifactFailure || gen.breaks || "The decision's failure mode went unhandled.",
      standard: gen.artifactStandard || gen.production || gen.safeguarded || "Own the decision and verify it."
    },
    nextPatterns: [],
    lenses: {
      diagnose: { title: "Look for the decision", items: ["The line that makes the call", "What depends on it", "The tradeoff being made"] },
      break: { title: "Look for the failure", items: ["Where it breaks", "What changes under pressure", "What was assumed"] },
      repair: { title: "Look for the missing safeguard", items: repairCriteria.filter((c) => c.required).map((c) => c.name) },
      transfer: { title: "Look for reuse", items: ["A new context", "The same judgment", "A new failure to design against"] }
    },
    diagnose: { prompt: "What kind of decision is this?", choices: [] },
    spot: {
      prompt: "Find the " + (gen.name || decision.title) + " decision in this diff. Click the line that shows it.",
      targetRe: spotTargets.length ? spotTargets[0].re : escapeForRe(firstCodeToken(gen.naiveCode)),
      targets: spotTargets.length ? spotTargets : undefined,
      hit: gen.traceHit || "That line shows the decision this lab is about.",
      misses: [],
      missDefault: "That line is downstream of the decision. Look for where the call is actually made."
    },
    break: { prompt: "Where does the naive version break?", choices: [] },
    investigate: {
      prompt: "Trace it yourself: click the line where it breaks.",
      targetLine: lineMatching(gen.naiveCode, gen.traceTarget) || 1,
      hit: gen.traceHit || "That is where the decision's failure mode bites.",
      misses: {},
      missDefault: "That line survives. Look for the first line that breaks under the real failure mode."
    },
    failureSim: {
      terminal: gen.failureTerminal || "$ run\nError: the naive version fails here.",
      narration: gen.failureNarration || "The code changed nothing; the conditions it ran under did. That is the decision.",
      arbitrate: gen.arbitrate ? {
        intro: "Two engineers read the same failure. Click the review you would approve.",
        comments: [
          { handle: (gen.arbitrate.wrong && gen.arbitrate.wrong.handle) || "iyke.dev", text: gen.arbitrate.wrong.text, correct: false, verdict: gen.arbitrate.wrong.verdict },
          { handle: (gen.arbitrate.right && gen.arbitrate.right.handle) || "ada.builds", text: gen.arbitrate.right.text, correct: true, verdict: gen.arbitrate.right.verdict }
        ]
      } : null
    },
    repairLab: {
      filename: gen.repairFilename || gen.naiveFile || "your repair",
      instructions: gen.repairInstructions || "Edit it until you would trust it. Comments can explain intent; the core mechanism must be concrete.",
      starter: gen.repairStarter || gen.naiveCode || "",
      blocks: blocks,
      solution: gen.repairSolution || null
    },
    repair: { prompt: gen.repairInstructions || "Repair it so you would trust it." },
    transferLab: {
      instructions: "Capture the handoff rule — a sentence each is enough.",
      fields: fields
    },
    transfer: {
      prompt: "Apply the same judgment to a new situation.",
      scenario: gen.transferScenario || "A future session makes the same kind of decision in a different feature.",
      rule: gen.transferRule || gen.takeaway || "A decision is learned only when you can reapply it.",
      choices: []
    },
    // carried so the server can review generated labs with the right rubric
    rubric: {
      repair: {
        title: "Repair: " + (gen.name || decision.title),
        context: (gen.naiveCode || "").slice(0, 800),
        criteria: repairCriteria,
        passRule: "all required criteria pass, plus at least one optional",
        intentNote: "Comments can explain intent; the core mechanism still needs to be concrete. Check the decision, not only syntax."
      },
      transfer: {
        title: "Transfer: " + (gen.name || decision.title),
        context: gen.transferScenario || "",
        criteria: fields.map((f, i) => ({ id: f.key, name: f.label, required: i < Math.max(1, fields.length - 1) })),
        passRule: "all required criteria pass, plus at least one optional"
      }
    }
  };
  if (!blocks) module.repairLab.blocks = null; // editor-only if no blocks generated
  return module;
}

// Guarantee a satisfiable rubric: at least one required and at least one optional
// criterion, or the pass rule ("all required + 1 optional") can never be met.
function normalizeCriteria(criteria) {
  const cs = criteria.map((c, i) => ({
    id: c.id || ("c" + i),
    name: c.name || ("criterion " + i),
    required: Boolean(c.required)
  }));
  if (!cs.some((c) => c.required)) cs[0].required = true;
  if (!cs.some((c) => !c.required) && cs.length > 1) cs[cs.length - 1].required = false;
  return cs;
}

// Deterministic self-check (zero extra tokens). Blockers mean the lab would be
// broken or unwinnable; warnings mean degraded-but-usable.
export function validateGeneratedModule(module, evidence) {
  const blockers = [];
  const warnings = [];
  if (!hasUsableDiffEvidence(evidence)) {
    blockers.push("evidence does not include concrete changed lines");
  }

  // naive code must be real-ish code, not a stub
  const naive = String(module.naiveCode || "");
  const naiveLines = naive.split("\n").filter((l) => l.trim().length > 1);
  if (naiveLines.length < 2 || naive.length < 25 || !/[{}()=;:]|def |func /.test(naive)) {
    blockers.push("naiveCode is trivial or not reviewable");
  }

  // arbitrate must have exactly one correct of two
  const arb = module.failureSim && module.failureSim.arbitrate;
  if (!arb || !Array.isArray(arb.comments) || arb.comments.length !== 2) {
    blockers.push("arbitrate thread missing or not exactly two comments");
  } else {
    const correct = arb.comments.filter((c) => c.correct).length;
    if (correct !== 1) blockers.push("arbitrate must have exactly one correct comment, has " + correct);
    if (arb.comments.some((c) => !c.text || !c.verdict)) blockers.push("an arbitrate comment is missing text or verdict");
  }

  // repair must be reviewable: satisfiable rubric
  const rc = (module.rubric && module.rubric.repair && module.rubric.repair.criteria) || [];
  if (rc.length < 3) blockers.push("repair rubric has fewer than 3 criteria");
  if (!rc.some((c) => c.required) || !rc.some((c) => !c.required)) {
    blockers.push("repair rubric is not satisfiable (needs >=1 required and >=1 optional)");
  }

  // assemble mode: if blocks exist, the non-trap blocks must form a real solution
  // and traps must be distinct from correct blocks
  const blocks = module.repairLab && module.repairLab.blocks;
  if (Array.isArray(blocks) && blocks.length) {
    const correctBlocks = blocks.filter((b) => !b.trap);
    const traps = blocks.filter((b) => b.trap);
    if (correctBlocks.length < 3) blockers.push("fewer than 3 correct assemble blocks");
    if (traps.length < 1) warnings.push("no trap blocks — assembly is too easy");
    const correctCodes = new Set(correctBlocks.map((b) => (b.code || "").trim()));
    if (traps.some((t) => correctCodes.has((t.code || "").trim()))) {
      blockers.push("a trap block is identical to a correct block");
    }
    const assembled = correctBlocks.map((b) => b.code).join("\n");
    if (assembled.length < 30) blockers.push("assembled correct blocks are too short to review");
  }

  // failure simulation present
  if (!module.failureSim || String(module.failureSim.terminal || "").length < 15) {
    blockers.push("failure terminal missing or trivial");
  }

  // transfer must be reviewable
  const tf = (module.transferLab && module.transferLab.fields) || [];
  if (tf.length < 2) blockers.push("fewer than 2 transfer fields");

  // quality warnings (usable via safety nets, but degraded)
  const ev = String(evidence || "");
  const spotDefs = module.spot && (module.spot.targets || (module.spot.targetRe ? [{ re: module.spot.targetRe }] : []));
  const spotInEvidence = (spotDefs || []).some((t) => {
    try { return new RegExp(t.re, "i").test(ev); } catch { return false; }
  });
  if (!spotInEvidence) warnings.push("spot target not found in evidence — diagnose uses the click-any-line safety net");
  if (!module.repairLab || !module.repairLab.solution) warnings.push("no reference solution — the 'show solution' button is hidden");

  return { ok: blockers.length === 0, blockers, warnings };
}

export async function loadOrGenerate(cacheDir, decision, evidence) {
  const id = "gen-" + slug(decision.id || decision.title);
  const cachePath = resolve(cacheDir, id + ".json");
  if (!hasUsableDiffEvidence(evidence)) {
    console.log(`  generation skipped for "${decision.title}" — evidence does not include concrete changed lines.`);
    return null;
  }
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    const check = validateGeneratedModule(cached, evidence);
    if (check.ok) return cached;
    console.log(`  cached generated lab rejected for "${decision.title}": ${check.blockers.join("; ")}`);
  } catch { /* not cached */ }

  // Generate, self-check, and retry once if the result is broken. Never serve a
  // failing lab — fall back to "lab coming" rather than a frustrating one.
  let module = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const gen = await generateModule(decision, evidence);
    if (!gen) continue;
    const candidate = assembleGeneratedModule(decision, gen, evidence);
    const check = validateGeneratedModule(candidate, evidence);
    if (check.ok) {
      candidate._warnings = check.warnings;
      module = candidate;
      if (check.warnings.length) console.log(`  generated "${candidate.name}" with warnings: ${check.warnings.join("; ")}`);
      break;
    }
    console.log(`  generation attempt ${attempt} rejected: ${check.blockers.join("; ")}`);
  }
  if (!module) {
    console.log(`  generation failed self-check twice for "${decision.title}" — leaving as "lab coming".`);
    return null;
  }

  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(module, null, 1), "utf8");
  return module;
}

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }
function clampInt(v, lo, hi, dflt) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }
function escapeForRe(s) { return String(s || "x").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function hasUsableDiffEvidence(evidence) {
  const text = String(evidence || "");
  if (!text.includes("diff --git") && !text.includes("@@")) return false;
  if (/Codex session touched or inspected this file; use transcript evidence for details/i.test(text)) return false;
  const changed = text.split("\n").filter((line) =>
    /^[+-]/.test(line) &&
    !/^(---|\+\+\+)/.test(line) &&
    line.replace(/^[+-]\s*/, "").trim().length > 3
  );
  return changed.length >= 2;
}
function firstCodeToken(code) {
  const m = String(code || "").split("\n").find((l) => l.trim().length > 3);
  return m ? m.trim().split(/\s+/).slice(0, 2).join(" ") : "x";
}
function lineMatching(code, re) {
  if (!code || !re) return null;
  const lines = String(code).split("\n");
  for (let i = 0; i < lines.length; i++) {
    try { if (new RegExp(re, "i").test(lines[i])) return i + 1; } catch { return null; }
  }
  return null;
}
