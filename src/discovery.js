import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, relative, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { ingestClaudeSession } from "./ingest.js";
import { analyzeSession } from "./report.js";
import { MODULES } from "./modules.js";
import { hasUsableDiffEvidence } from "./generate.js";
import { findEvidenceSnippet } from "./interaction.js";

const MAX_SCAN_FILES = 300;
const MAX_SESSION_BYTES = 12 * 1024 * 1024;
const MAX_CODEX_TRANSCRIPT_CHARS = 60000;

export async function discoverSessions({ homeDir = homedir(), limit = 80 } = {}) {
  const roots = [
    { tool: "claude", root: join(homeDir, ".claude", "projects") },
    { tool: "codex", root: join(homeDir, ".codex", "sessions") }
  ];
  const sessions = [];

  for (const source of roots) {
    const files = await findJsonlFiles(source.root, MAX_SCAN_FILES);
    for (const file of files) {
      const item = await inspectSessionFile(file, source.tool, homeDir);
      if (item) sessions.push(item);
    }
  }

  sessions.sort(compareSessionUsefulness);
  return selectVisibleSessions(sessions, limit).map((session, index) => ({ ...session, rank: index + 1 }));
}

export async function loadDiscoveredSession(sessionPath) {
  const fullPath = resolve(sessionPath);
  const raw = await readFile(fullPath, "utf8");
  if (isClaudePath(fullPath)) {
    const ingested = ingestClaudeSession(raw);
    return { tool: "claude", path: fullPath, ...ingested };
  }
  if (isCodexPath(fullPath)) {
    return { tool: "codex", path: fullPath, ...ingestCodexSession(raw) };
  }
  // Try Claude first because Claude Code sessions carry edit/write tool inputs.
  const claude = ingestClaudeSession(raw);
  if (claude.stats.turns || claude.stats.edits) return { tool: "claude", path: fullPath, ...claude };
  return { tool: "codex", path: fullPath, ...ingestCodexSession(raw) };
}

export async function chooseBestSession(options = {}) {
  const sessions = await discoverSessions(options);
  return bestSessionFrom(sessions, options);
}

export async function writeSessionInbox({ sessions, outDir }) {
  const destination = resolve(outDir);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "sessions.json"), JSON.stringify({ sessions }, null, 2), "utf8");
  await writeFile(join(destination, "index.html"), generateInboxHtml(sessions), "utf8");
  return destination;
}

export function bestSessionFrom(sessions, { preferReady = true, excludeSessionIds = [], excludeSessionPaths = [] } = {}) {
  const excludedIds = new Set(excludeSessionIds);
  const excludedPaths = new Set(excludeSessionPaths);
  const available = sessions.filter((s) => !excludedIds.has(s.id) && !excludedPaths.has(s.path));
  const candidates = available.filter((s) =>
    s.state === "ready_lab" || s.state === "can_try_generation"
  );
  const ranked = (candidates.length ? candidates : sessions).slice()
    .sort((a, b) =>
      (preferReady ? stateRank(b.state) - stateRank(a.state) : 0) ||
      (b.score - a.score) ||
      (b.mtimeMs - a.mtimeMs)
    );
  return ranked[0] || null;
}

function compareSessionUsefulness(a, b) {
  return stateRank(b.state) - stateRank(a.state) ||
    (b.score - a.score) ||
    (b.mtimeMs - a.mtimeMs);
}

async function inspectSessionFile(file, tool, homeDir) {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_SESSION_BYTES) return null;
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return null;
  }

  const ingested = tool === "claude" ? ingestClaudeSession(raw) : ingestCodexSession(raw);
  const analysis = analyzeSession({
    goal: ingested.goal,
    diff: ingested.diff,
    transcript: ingested.transcript,
    diffPath: file,
    transcriptPath: file
  });
  const hasConcreteEvidence = hasUsableDiffEvidence(ingested.diff);
  const readiness = classifySessionReadiness(analysis.decisions, ingested.diff);
  const richLabs = readiness.readyLabs;
  const score = scoreSession({ ingested, analysis, size: info.size, tool, readiness, hasConcreteEvidence });
  const project = projectNameFor(file, homeDir, tool, ingested);

  return {
    id: stableId(tool, file),
    tool,
    path: file,
    project,
    title: titleFromGoal(ingested.goal, project),
    goal: ingested.goal,
    mtimeMs: info.mtimeMs,
    modified: new Date(info.mtimeMs).toISOString(),
    size: info.size,
    stats: ingested.stats,
    fileSignalLabel: hasConcreteEvidence ? "file changes" : "file references",
    decisions: analysis.decisions.map((d) => ({ id: d.id, title: d.title })).slice(0, 5),
    risks: analysis.risks.slice(0, 4),
    richLabs,
    readyLabs: readiness.readyLabs,
    generatableDecisions: readiness.generatableDecisions,
    decisionSignals: readiness.decisionSignals,
    hasConcreteEvidence,
    state: readiness.state,
    score: score.score,
    labPotential: score.potential,
    reason: score.reason,
    command: `node ./src/cli.js lab --session ${shellQuote(file)} --out-dir ./reports-${safeSlug(project)}${readiness.state === "can_try_generation" ? " --generate" : ""}`
  };
}

function ingestCodexSession(jsonlText) {
  const turns = [];
  const filesTouched = new Set();
  const commandLines = [];
  let goal = null;
  let cwd = null;

  for (const line of jsonlText.split("\n")) {
    if (!line.trim()) continue;
    let item;
    try { item = JSON.parse(line); } catch { continue; }
    if (item.type === "session_meta" && item.payload?.cwd) {
      cwd = item.payload.cwd;
      continue;
    }
    if (item.type !== "response_item") continue;
    const payload = item.payload;
    if (!payload) continue;

    if (payload.type === "message") {
      const text = codexContentText(payload.content);
      if (!text || text.startsWith("<permissions instructions>")) continue;
      if (payload.role === "user") {
        const cleaned = cleanCodexText(text);
        if (cleaned && !goal && cleaned.length > 20) goal = cleaned.slice(0, 200);
        if (cleaned) turns.push("User: " + clip(cleaned, 700));
      } else if (payload.role === "assistant") {
        const cleaned = cleanCodexText(text);
        if (cleaned) turns.push("Assistant: " + clip(cleaned, 700));
      }
      continue;
    }

    if (payload.type === "function_call") {
      const args = safeJson(payload.arguments);
      const command = args?.cmd || args?.command || payload.name || "";
      if (command) {
        commandLines.push(command);
        for (const file of filesFromCommand(command)) filesTouched.add(file);
        turns.push("Tool: " + clip(`${payload.name}: ${command}`, 700));
      }
    }
  }

  let transcript = turns.join("\n");
  if (transcript.length > MAX_CODEX_TRANSCRIPT_CHARS) {
    transcript = transcript.slice(0, MAX_CODEX_TRANSCRIPT_CHARS / 2) +
      "\n[...session truncated...]\n" +
      transcript.slice(-MAX_CODEX_TRANSCRIPT_CHARS / 2);
  }

  const diff = [...filesTouched].map((file) =>
    `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@\n+// Codex session touched or inspected this file; use transcript evidence for details.`
  ).join("\n");

  return {
    goal: goal || "Untitled Codex session",
    transcript,
    diff,
    stats: {
      records: jsonlText.split("\n").filter(Boolean).length,
      turns: turns.length,
      edits: filesTouched.size,
      files: [...filesTouched],
      commands: commandLines.length,
      cwd
    },
    cwd
  };
}

function selectVisibleSessions(sessions, limit) {
  if (!limit || sessions.length <= limit) return sessions.slice(0, limit || sessions.length);
  const selected = [];
  const seen = new Set();
  const tools = [...new Set(sessions.map((session) => session.tool))];
  const minimumPerTool = Math.max(3, Math.floor(limit * 0.15));

  for (const tool of tools) {
    const toolSessions = sessions.filter((session) => session.tool === tool);
    for (const session of toolSessions.slice(0, minimumPerTool)) {
      if (selected.length >= limit) break;
      selected.push(session);
      seen.add(session.id);
    }
  }

  for (const session of sessions) {
    if (selected.length >= limit) break;
    if (seen.has(session.id)) continue;
    selected.push(session);
    seen.add(session.id);
  }

  return selected.sort(compareSessionUsefulness).slice(0, limit);
}

async function findJsonlFiles(root, maxFiles) {
  const found = [];
  async function walk(dir, depth = 0) {
    if (found.length >= maxFiles || depth > 6) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= maxFiles) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        found.push(full);
      }
    }
  }
  await walk(root);
  return found;
}

function classifySessionReadiness(decisions, diff) {
  let readyLabs = 0;
  let generatableDecisions = 0;
  let evidenceBackedDecisions = 0;
  const hasSpecificDecisionSignals = decisions.some((decision) => decision.id !== "implementation-shape");

  for (const decision of decisions) {
    const evidence = findEvidenceSnippet(diff, decision.patterns);
    if (!hasUsableDiffEvidence(evidence)) continue;
    evidenceBackedDecisions += 1;
    if (MODULES[decision.id]) readyLabs += 1;
    else generatableDecisions += 1;
  }

  const state = readyLabs > 0
    ? "ready_lab"
    : generatableDecisions > 0
      ? "can_try_generation"
      : hasSpecificDecisionSignals
        ? "needs_real_diff"
        : "no_decision_evidence";

  return {
    state,
    readyLabs,
    generatableDecisions,
    evidenceBackedDecisions,
    decisionSignals: hasSpecificDecisionSignals ? decisions.length : 0
  };
}

function stateRank(state) {
  return {
    ready_lab: 4,
    can_try_generation: 3,
    needs_real_diff: 2,
    no_decision_evidence: 1
  }[state] || 0;
}

function scoreSession({ ingested, analysis, size, tool, readiness, hasConcreteEvidence }) {
  let score = 0;
  const reasons = [];
  if (ingested.stats.turns >= 4) { score += 2; reasons.push("has enough human/assistant context"); }
  if (ingested.stats.edits >= 1 && hasConcreteEvidence) {
    score += 3;
    reasons.push("has concrete changed-code evidence");
  } else if (ingested.stats.edits >= 1) {
    score += 1;
    reasons.push("has file references, but no concrete diff");
  }
  if (readiness.decisionSignals > 0 || readiness.evidenceBackedDecisions > 0) {
    score += 3;
    reasons.push("contains detectable decisions");
  }
  if (readiness.readyLabs > 0) {
    score += 5;
    reasons.push(`${readiness.readyLabs} ready lab${readiness.readyLabs === 1 ? " is" : "s are"} available`);
  } else if (readiness.generatableDecisions > 0) {
    score += 3;
    reasons.push(`${readiness.generatableDecisions} decision${readiness.generatableDecisions === 1 ? "" : "s"} have changed-line evidence; generation can be tried`);
  } else if (readiness.state === "needs_real_diff") {
    reasons.push("has decision signals, but no matching changed-line evidence");
  }
  if (analysis.risks.length >= 2) { score += 1; reasons.push("has concrete risks to teach"); }
  if (/test|error|fail|fix|review|build|deploy|permission|validate|secret|api|design|prd|product/i.test(ingested.transcript)) {
    score += 1;
    reasons.push("mentions verification, failure, product, or boundary work");
  }
  if (tool === "claude" && ingested.stats.edits > 0) score += 1;
  if (size > MAX_SESSION_BYTES / 2) score -= 1;

  const potential = readiness.state === "no_decision_evidence"
    ? "weak"
    : score >= 10 ? "strong" : score >= 5 ? "medium" : "weak";

  return {
    score,
    potential,
    reason: reasons.length ? reasons.join("; ") : "low signal or little recoverable evidence"
  };
}

export function generateInboxHtml(sessions, { interactive = false } = {}) {
  const cards = groupedSessionCards(sessions);
  const best = bestSessionFrom(sessions);
  const counts = countByTool(sessions);
  const projectCount = new Set(sessions.map((session) => session.project)).size;
  const readyCount = sessions.filter((s) => s.state === "ready_lab").length;
  const generateCount = sessions.filter((s) => s.state === "can_try_generation").length;
  const needsDiffCount = sessions.filter((s) => s.state === "needs_real_diff").length;
  const noDecisionCount = sessions.filter((s) => s.state === "no_decision_evidence").length;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Replay Labs Session Inbox</title>
<style>
body{margin:0;background:#0d0f12;color:#ebe7df;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:38px 22px 80px}
h1{font-size:40px;line-height:1.08;margin:0 0 10px}
p{color:#9da6b2;margin:0 0 26px}
.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}
.eyebrow{color:#34d399;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.pick{background:#34d399;color:#06291d;padding:12px 14px;border-radius:8px;font-weight:800}
.actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
button{border:0;border-radius:8px;padding:10px 12px;font:inherit;font-weight:800;cursor:pointer}
button.primary{background:#34d399;color:#052e1e}
button.secondary{background:#242b35;color:#e7e2da;border:1px solid #35404d}
button:disabled{opacity:.55;cursor:wait}
.mission-card{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.7fr);gap:18px;align-items:start;background:#131821;border:1px solid #252c36;border-radius:12px;padding:18px;margin:0 0 18px}
.mission-card h2{font-size:18px;margin:0 0 7px}
.mission-card p{margin:0;color:#9da6b2}
.mission-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mission-step{border:1px solid #303846;background:#0f141b;border-radius:9px;padding:12px}
.mission-step b{display:block;margin-bottom:3px}
.mission-step span{color:#8d96a3;font-size:13px}
.workspace{display:grid;grid-template-columns:250px minmax(0,1fr);gap:18px;align-items:start}
.side-panel{position:sticky;top:18px;background:#12161d;border:1px solid #252c36;border-radius:12px;padding:14px}
.side-panel h2{font-size:14px;margin:0 0 10px}
.side-panel p{font-size:13px;margin:12px 0 0;color:#8d96a3}
.grid{display:grid;gap:12px;min-width:0}
.summary{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.summary .tag{font-size:12px;padding:4px 9px}
.filters{display:grid;gap:8px;margin:0 0 14px}
.filter-btn{display:flex;justify-content:space-between;gap:10px;width:100%;background:#171d26;color:#cbd5e1;border:1px solid #303846;border-radius:8px;padding:9px 10px;font-size:13px}
.filter-btn.on{background:#34d399;color:#052e1e;border-color:#34d399}
.filter-btn span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;opacity:.78}
.summary-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0}
button.compact{background:#171d26;color:#cbd5e1;border:1px solid #303846;border-radius:7px;padding:7px 9px;font-size:12px}
.active-filter{color:#8d96a3;font-size:13px;margin:0 0 10px}
.project-group{margin:0 0 12px;border:1px solid #252c36;border-radius:10px;background:#12161d;overflow:hidden}
.project-group.is-hidden{display:none}
.project-head{display:flex;justify-content:space-between;gap:14px;align-items:center;margin:0;padding:14px 16px;cursor:pointer;list-style:none}
.project-head::-webkit-details-marker{display:none}
.project-head h2{font-size:16px;line-height:1.25;margin:0;overflow-wrap:anywhere}
.project-head p{margin:3px 0 0;color:#7d8794;font-size:12.5px}
.project-title{display:flex;gap:9px;align-items:flex-start;min-width:0}
.toggle-mark{flex:0 0 auto;display:inline-grid;place-items:center;width:19px;height:19px;margin-top:1px;border:1px solid #303846;border-radius:5px;color:#34d399;font:700 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.toggle-mark::before{content:"+"}
.project-group[open] .toggle-mark::before{content:"-"}
.project-count{flex:0 0 auto;color:#7d8794;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;text-transform:uppercase}
.project-cards{display:grid;gap:10px;padding:0 14px 14px}
.card{display:grid;grid-template-columns:132px minmax(0,1fr) 170px;gap:18px;align-items:center;min-width:0;max-width:100%;overflow:hidden;background:#151922;border:1px solid #252c36;border-radius:10px;padding:18px}
.card.is-hidden{display:none}
.card>*{min-width:0}
.meta{color:#7d8794;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;text-transform:uppercase}
.card h2{font-size:18px;line-height:1.25;margin:0 0 5px;overflow-wrap:anywhere}
.card p{margin:0;color:#9da6b2;overflow-wrap:anywhere}
.card-actions{min-width:0;text-align:right}
.card-status{display:none;grid-column:2 / 4;margin-top:-6px;color:#b7c0cc;font-size:13px;line-height:1.45}
.card-status a{color:#34d399;font-weight:800}
.result{border:1px solid #34d39944;background:#34d3990d;border-radius:10px;padding:12px 14px}
.result.warn{border-color:#fbbf2455;background:#fbbf240d}
.result b{display:block;color:#ebe7df;margin-bottom:2px}
.result p{margin:0 0 10px;color:#b7c0cc}
.result-actions{display:flex;gap:9px;flex-wrap:wrap}
.result-actions a{display:inline-flex;align-items:center;border-radius:8px;padding:8px 10px;text-decoration:none}
.result-actions a.primary{background:#34d399;color:#052e1e}
.result-actions a.secondary{border:1px solid #35404d;color:#e7e2da;background:#202632}
.tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.tag{min-width:0;overflow-wrap:anywhere;border:1px solid #303846;color:#8d96a3;border-radius:5px;padding:2px 7px;font-size:11px}
.tag.ready{color:#052e1e;background:#34d399;border-color:#34d399}
.tag.signal{color:#c7d2fe;border-color:#818cf855}
.tag.limited{color:#fbbf24;border-color:#fbbf2455}
.strong{color:#052e1e;background:#34d399;border-color:#34d399}
.medium{color:#fbbf24;border-color:#fbbf2455}
.weak{color:#f87171;border-color:#f8717155}
code{color:#c7d2fe}
.status{margin:18px 0;padding:14px;border:1px solid #2c3440;border-radius:8px;background:#12161d;color:#b7c0cc;display:none}
.status a{color:#34d399;font-weight:800}
@media(max-width:900px){.mission-card,.workspace{display:block}.side-panel{position:static;margin:0 0 16px}.mission-steps{grid-template-columns:1fr}.filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){main{padding:30px 16px 70px}h1{font-size:32px}.top,.card{display:block}.project-head{align-items:flex-start}.pick{display:inline-block;margin-top:14px}.actions{justify-content:flex-start}.meta{margin-bottom:8px}.card-actions{text-align:left;margin-top:14px}.card-actions code{max-width:100%}.card-status{margin-top:10px}.project-count{display:none}.filters{grid-template-columns:1fr}}
</style>
</head>
<body><main>
<div class="top"><div><div class="eyebrow">Replay Labs session inbox</div><h1>Replay Labs found ${sessions.length} local AI sessions.</h1>
<p>Choose a project, then turn one recovered session into a mission: understand the decision, practice the tradeoff, and leave with something reusable. No upload required.</p></div>
${best ? interactive
  ? `<div class="actions"><button class="primary" data-choose>${best.state === "ready_lab" ? "Start suggested ready lab" : "Let Replay choose"}</button><button class="secondary" data-refresh>Refresh sessions</button></div>`
  : `<div class="pick">Let Replay choose:<br><code>${escapeHtml(best.command)}</code></div>`
  : interactive ? `<div class="actions"><button class="secondary" data-refresh>Refresh sessions</button></div>` : ""}
</div>
<section class="mission-card">
  <div><h2>Mission approach</h2><p>Every lab should help someone own the decision, not merely replay what happened.</p></div>
  <div class="mission-steps">
    <div class="mission-step"><b>1. Find the decision</b><span>Recover the useful judgment from a real session.</span></div>
    <div class="mission-step"><b>2. Practice the tradeoff</b><span>Compare evidence, failure modes, and alternatives.</span></div>
    <div class="mission-step"><b>3. Carry it forward</b><span>Leave with a reusable rule or next-session brief.</span></div>
  </div>
</section>
<div class="status" id="status"></div>
<div class="workspace">
  <aside class="side-panel">
    <h2>At a glance</h2>
    <div class="summary">
      <span class="tag ready">${readyCount} ready</span>
      <span class="tag signal">${generateCount} can generate</span>
      <span class="tag limited">${needsDiffCount} need real diff</span>
      <span class="tag">${noDecisionCount} no decision evidence</span>
      <span class="tag">${projectCount} projects</span>
      <span class="tag">${counts.claude || 0} Claude</span>
      <span class="tag">${counts.codex || 0} Codex</span>
    </div>
    <h2>Focus</h2>
    <div class="filters">
      <button class="filter-btn on" data-filter="all">All sessions <span>${sessions.length}</span></button>
      <button class="filter-btn" data-filter="ready">Ready labs <span>${readyCount}</span></button>
      <button class="filter-btn" data-filter="generate">Can generate <span>${generateCount}</span></button>
      <button class="filter-btn" data-filter="map">Needs evidence <span>${needsDiffCount + noDecisionCount}</span></button>
      <button class="filter-btn" data-filter="codex">Codex <span>${counts.codex || 0}</span></button>
      <button class="filter-btn" data-filter="claude">Claude <span>${counts.claude || 0}</span></button>
    </div>
    <div class="summary-actions"><button class="compact" data-expand-all>Expand all</button><button class="compact" data-collapse-all>Collapse scanned</button></div>
    <p>Mission framing appears only on labs with grounded copy. When Replay lacks enough evidence, it says so instead of inventing a lab.</p>
  </aside>
  <section>
    <p class="active-filter" data-filter-label>Showing all sessions across ${projectCount} projects.</p>
    <div class="grid">${cards || emptyState()}</div>
  </section>
</div>
${interactive ? inboxScript() : ""}
</main></body></html>`;
}

function groupedSessionCards(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    if (!groups.has(session.project)) groups.set(session.project, []);
    groups.get(session.project).push(session);
  }
  return [...groups.entries()].map(([project, projectSessions], index) => {
    const counts = countByTool(projectSessions);
    const ready = projectSessions.filter((session) => session.state === "ready_lab").length;
    const canGenerate = projectSessions.filter((session) => session.state === "can_try_generation").length;
    const open = index < 2 || ready > 0 || counts.codex > 0;
    const meta = [
      `${projectSessions.length} session${projectSessions.length === 1 ? "" : "s"}`,
      `${ready} ready`,
      `${canGenerate} can try generation`,
      `${counts.claude || 0} Claude`,
      `${counts.codex || 0} Codex`
    ].join(" · ");
    return `<details class="project-group" data-project-group${open ? " open" : ""}>
  <summary class="project-head"><div class="project-title"><span class="toggle-mark" aria-hidden="true"></span><div><h2>${escapeHtml(project)}</h2><p>${escapeHtml(meta)}</p></div></div><div class="project-count">Project</div></summary>
  <div class="project-cards">${projectSessions.map(sessionCard).join("\n")}</div>
</details>`;
  }).join("\n");
}

function countByTool(sessions) {
  return sessions.reduce((acc, session) => {
    acc[session.tool] = (acc[session.tool] || 0) + 1;
    return acc;
  }, {});
}

function emptyState() {
  return `<article class="card" style="display:block">
  <h2>No local sessions found yet.</h2>
  <p>Replay Labs looks for Claude Code sessions in <code>~/.claude/projects</code> and Codex sessions in <code>~/.codex/sessions</code>. No upload or paste is required.</p>
  <p style="margin-top:9px">Run a technical/product session with Claude or Codex, then come back and refresh.</p>
</article>`;
}

function sessionCard(session) {
  const decisionTags = session.decisions.slice(0, 3)
    .map((d) => `<span class="tag">${escapeHtml(d.title)}</span>`).join("");
  const stateTag = session.state === "ready_lab"
    ? `<span class="tag ready">${session.readyLabs} ready lab${session.readyLabs === 1 ? "" : "s"}</span>`
    : session.state === "can_try_generation"
      ? `<span class="tag signal">${session.generatableDecisions} decision${session.generatableDecisions === 1 ? "" : "s"} can try generation</span>`
      : session.state === "needs_real_diff"
        ? `<span class="tag limited">needs real changed lines</span>`
        : `<span class="tag limited">no decision evidence yet</span>`;
  const action = session.state === "ready_lab"
    ? `<button class="primary" data-build>Build lab</button>`
    : session.state === "can_try_generation"
      ? `<button class="secondary" data-build data-generate="true">Generate lab</button>`
      : `<button class="secondary" data-build data-map-only="true">Inspect session</button>`;
  return `<article class="card" data-session-path="${escapeHtml(session.path)}" data-tool="${escapeHtml(session.tool)}" data-state="${escapeHtml(session.state)}">
  <div class="meta">${escapeHtml(session.tool)}<br>${escapeHtml(new Date(session.modified).toLocaleString())}</div>
  <div>
    <h2>${escapeHtml(session.title)}</h2>
    <p>${escapeHtml(session.project)} · ${session.stats.turns} turns · ${session.stats.edits} ${escapeHtml(session.fileSignalLabel)} · ${stateLabel(session.state)}</p>
    <div class="tags">${stateTag}${decisionTags}</div>
    <p style="margin-top:9px">${escapeHtml(session.reason)}</p>
  </div>
  <div class="card-actions">${action}</div>
  <div class="card-status"></div>
</article>`;
}

function stateLabel(state) {
  return {
    ready_lab: "ready lab",
    can_try_generation: "can try generation",
    needs_real_diff: "needs real diff",
    no_decision_evidence: "no decision evidence"
  }[state] || "unclassified";
}

function inboxScript() {
  return `<script>
const statusBox = document.getElementById("status");
let currentFilter = "all";
function resultHtml(data, heading) {
  const ready = data.state === "ready_lab" || (data.richLabs || 0) > 0;
  const title = heading || (ready ? "Lab ready." : data.state === "can_try_generation" ? "No ready lab yet." : data.state === "needs_real_diff" ? "Needs real changed-line evidence." : "No decision evidence yet.");
  const body = data.message || (ready ? "Open the lab and start with the strongest decision." : "Open the session map to inspect what Replay could recover.");
  const primary = ready && data.primaryLabHref
    ? '<a class="primary" href="' + data.primaryLabHref + '">Start lab</a>'
    : "";
  return '<div class="result' + (ready ? "" : " warn") + '"><b>' + title + '</b><p>' + body + '</p><div class="result-actions">' +
    primary + '<a class="' + (primary ? "secondary" : "primary") + '" href="' + data.href + '">Open session map</a></div></div>';
}
function showStatus(html, target) {
  const box = target || statusBox;
  box.style.display = "block";
  box.innerHTML = html;
}
function statusForSession(sessionPath) {
  const cards = Array.from(document.querySelectorAll("[data-session-path]"));
  const card = cards.find((item) => item.dataset.sessionPath === sessionPath);
  if (!card) return null;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  return card.querySelector(".card-status");
}
function cardMatchesFilter(card, filter) {
  if (filter === "all") return true;
  if (filter === "ready") return card.dataset.state === "ready_lab";
  if (filter === "generate") return card.dataset.state === "can_try_generation";
  if (filter === "map") return card.dataset.state === "needs_real_diff" || card.dataset.state === "no_decision_evidence";
  if (filter === "codex" || filter === "claude") return card.dataset.tool === filter;
  return true;
}
function applyFilter(filter) {
  currentFilter = filter;
  const groups = Array.from(document.querySelectorAll("[data-project-group]"));
  let visibleCards = 0;
  let visibleProjects = 0;
  groups.forEach((group) => {
    const cards = Array.from(group.querySelectorAll("[data-session-path]"));
    let groupHasVisibleCard = false;
    cards.forEach((card) => {
      const visible = cardMatchesFilter(card, filter);
      card.classList.toggle("is-hidden", !visible);
      if (visible) {
        visibleCards += 1;
        groupHasVisibleCard = true;
      }
    });
    group.classList.toggle("is-hidden", !groupHasVisibleCard);
    if (groupHasVisibleCard) {
      visibleProjects += 1;
      if (filter !== "all") group.open = true;
    }
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("on", button.dataset.filter === filter);
  });
  const label = document.querySelector("[data-filter-label]");
  if (label) {
    const names = { all: "all sessions", ready: "ready labs", generate: "sessions that can try generation", map: "sessions needing evidence", codex: "Codex sessions", claude: "Claude sessions" };
    label.textContent = "Showing " + (names[filter] || "sessions") + " across " + visibleProjects + " project" + (visibleProjects === 1 ? "" : "s") + " (" + visibleCards + " sessions).";
  }
}
async function buildLab(sessionPath, generate, statusTarget, mapOnly) {
  showStatus(mapOnly ? "Inspecting recovered signals..." : (generate ? "Trying generation from changed-line evidence..." : "Building lab locally..."), statusTarget);
  const res = await fetch("/api/build-lab", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionPath, generate })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Build failed");
  showStatus(resultHtml(data), statusTarget);
}
document.addEventListener("click", async (event) => {
  const build = event.target.closest("[data-build]");
  const choose = event.target.closest("[data-choose]");
  const refresh = event.target.closest("[data-refresh]");
  const expandAll = event.target.closest("[data-expand-all]");
  const collapseAll = event.target.closest("[data-collapse-all]");
  const filter = event.target.closest("[data-filter]");
  try {
    if (refresh) { location.reload(); return; }
    if (filter) {
      applyFilter(filter.dataset.filter || "all");
      return;
    }
    if (expandAll) {
      document.querySelectorAll("[data-project-group]:not(.is-hidden)").forEach((group) => { group.open = true; });
      return;
    }
    if (collapseAll) {
      document.querySelectorAll("[data-project-group]:not(.is-hidden)").forEach((group, index) => { group.open = index === 0; });
      return;
    }
    if (choose) {
      choose.disabled = true;
      try {
        showStatus("Replay is choosing a local session with enough evidence...");
        const chosen = JSON.parse(sessionStorage.getItem("replayRecentChoices") || "[]");
        const res = await fetch("/api/choose-lab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ excludeSessionIds: chosen.slice(-10) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Choose failed");
        if (data.sessionId) {
          chosen.push(data.sessionId);
          sessionStorage.setItem("replayRecentChoices", JSON.stringify(Array.from(new Set(chosen)).slice(-20)));
        }
        const prefix = data.state === "ready_lab" ? "Suggested ready lab." : data.state === "can_try_generation" ? "Suggested generation candidate." : "Suggested session to inspect.";
        const target = statusForSession(data.sessionPath) || statusBox;
        showStatus(resultHtml(data, prefix), target);
        if (target !== statusBox) statusBox.style.display = "none";
      } finally {
        choose.disabled = false;
      }
      return;
    }
    if (build) {
      build.disabled = true;
      const card = build.closest("[data-session-path]");
      try {
        await buildLab(card.dataset.sessionPath, build.dataset.generate === "true", card.querySelector(".card-status"), build.dataset.mapOnly === "true");
      } finally {
        build.disabled = false;
      }
    }
  } catch (error) {
    const target = build ? build.closest("[data-session-path]")?.querySelector(".card-status") : null;
    showStatus("<b>Could not complete action.</b><br>" + String(error.message || error), target);
  }
});
</script>`;
}

function projectNameFor(file, homeDir, tool, ingested = null) {
  if (tool === "claude") {
    const rel = relative(join(homeDir, ".claude", "projects"), file);
    const head = rel.split(/[\\/]/)[0] || "unknown-project";
    return head.replace(/^-Users-[^-]+-/, "").replaceAll("-", "/");
  }
  if (ingested?.cwd) return projectNameFromPath(ingested.cwd, homeDir);
  const rel = relative(join(homeDir, ".codex", "sessions"), file);
  return rel.split(/[\\/]/).slice(0, 3).join("/") || "codex";
}

function projectNameFromPath(path, homeDir) {
  const rel = relative(homeDir, path);
  if (rel && !rel.startsWith("..")) return rel.replaceAll("\\", "/");
  return String(path).replaceAll("\\", "/").split("/").slice(-3).join("/") || "codex";
}

function titleFromGoal(goal, project) {
  const cleaned = String(goal || "").replace(/\s+/g, " ").trim();
  if (!cleaned || /^untitled/i.test(cleaned)) return project;
  return cleaned.length > 86 ? cleaned.slice(0, 83) + "..." : cleaned;
}

function stableId(tool, file) {
  return `${tool}:${basename(file, ".jsonl")}`;
}

function isClaudePath(path) {
  return path.includes("/.claude/projects/") || path.includes("\\.claude\\projects\\");
}

function isCodexPath(path) {
  return path.includes("/.codex/sessions/") || path.includes("\\.codex\\sessions\\");
}

function codexContentText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part.type === "input_text" || part.type === "output_text" ? part.text || "" : "")
    .filter(Boolean)
    .join("\n");
}

function cleanCodexText(text) {
  return String(text)
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/g, " ")
    .replace(/<codex_internal_context[\s\S]*?<\/codex_internal_context>/g, " ")
    .replace(/# Files mentioned by the user:[\s\S]*?## My request for Codex:/g, " ")
    .replace(/# In app browser:[\s\S]*?## My request for Codex:/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filesFromCommand(command) {
  const files = [];
  const patterns = [
    /\b(?:src|app|test|tests|docs|scripts|lib|server|client|components)\/[A-Za-z0-9._/-]+\b/g,
    /\b[A-Za-z0-9._/-]+\.(?:js|ts|tsx|jsx|py|go|kt|java|swift|sql|md|json|yaml|yml|toml)\b/g
  ];
  for (const pattern of patterns) {
    for (const match of command.matchAll(pattern)) {
      const file = match[0].replace(/^["']|["']$/g, "");
      if (!file.includes("node_modules")) files.push(file);
    }
  }
  return [...new Set(files)].slice(0, 20);
}

function safeJson(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function clip(text, max) {
  const cleaned = String(text).trim();
  return cleaned.length > max ? cleaned.slice(0, max) + " [...]" : cleaned;
}

function safeSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "session";
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
