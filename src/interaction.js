import { analyzeSession } from "./report.js";
import { generateLabHtml } from "./lab-ui.js";
import { buildLabModule as buildModule, MODULES } from "./modules.js";
import { hasUsableDiffEvidence } from "./generate.js";

export function generateDecisionReplayHtml({ goal, diff, transcript, diffPath, transcriptPath }) {
  const analysis = analyzeSession({ goal, diff, transcript, diffPath, transcriptPath });
  const primary = analysis.decisions[0];
  const module = buildModule(primary);
  const evidence = findEvidenceSnippet(analysis.diff, primary.patterns);
  return generateLabHtml({ goal, module, evidence });
}

// One item per session decision, plus the data the session map needs to rank and
// link it. Concrete evidence alone is not a ready lab: it is either a full seed
// module, a successfully generated module, or a decision scaffold waiting for
// generation.
export async function generateSessionLabs({ goal, diff, transcript, diffPath, transcriptPath, generate = false, cacheDir = null, maxGenerated = 1, generationTimeoutMs = 30000, generationAttempts = 1 }) {
  const analysis = analyzeSession({ goal, diff, transcript, diffPath, transcriptPath });
  const labs = [];
  let generatedCount = 0;
  let loadOrGenerate = null;
  if (generate && cacheDir) {
    ({ loadOrGenerate } = await import("./generate.js"));
  }

  for (const decision of analysis.decisions) {
    const hasRichModule = Boolean(MODULES[decision.id]);
    const evidence = findEvidenceSnippet(analysis.diff, decision.patterns);
    const hasConcreteEvidence = hasUsableDiffEvidence(evidence);
    let module = buildModule(decision);
    let rich = hasRichModule && hasConcreteEvidence;
    let generated = false;
    let kind = rich ? "catalog" : hasConcreteEvidence ? "scaffold" : "signals";

    // For decisions we have no hand-authored module for, try to generate a full
    // module from the real changed-line evidence. If generation is unavailable
    // or fails validation, keep it as a scaffold instead of pretending it is a
    // ready practice lab.
    if (!hasRichModule && hasConcreteEvidence && loadOrGenerate && generatedCount < maxGenerated) {
      const gen = await loadOrGenerate(cacheDir, decision, evidence, {
        timeoutMs: generationTimeoutMs,
        attempts: generationAttempts
      });
      if (gen) {
        module = gen;
        rich = true;
        generated = true;
        kind = "generated";
        generatedCount += 1;
      }
    }

    labs.push({
      decision,
      module,
      rich,
      generated,
      kind,
      hasConcreteEvidence,
      evidence,
      html: null
    });
  }

  const availableLabFiles = new Set(labs.filter((lab) => lab.rich).map((lab) => `${lab.module.id}.html`));
  for (const lab of labs.filter((item) => item.rich)) {
    const hasRichModule = Boolean(MODULES[lab.decision.id]);
    const moduleForHtml = {
      ...lab.module,
      nextPatterns: (lab.module.nextPatterns || []).filter((pattern) =>
        pattern.href && availableLabFiles.has(pattern.href)
      )
    };
    lab.module = moduleForHtml;
    lab.html = generateLabHtml({
      goal,
      module: moduleForHtml,
      evidence: lab.evidence,
      patternHref: hasRichModule ? `../patterns/${moduleForHtml.id}.html` : null,
      homeHref: "../index.html",
      sessionKey: hashForStorage([goal, diffPath, transcriptPath, lab.evidence, moduleForHtml.id].join("\n"))
    });
  }
  return { analysis, labs };
}

// Previous lab shell, kept for reference while v3 proves itself. Not called.
// eslint-disable-next-line no-unused-vars
function legacyLabTemplate({ goal, diffPath, transcriptPath, module, evidence, primary, diff }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Replay Labs</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f4ef;
      --ink: #171716;
      --muted: #666158;
      --line: #d8d1c6;
      --paper: #fffdf8;
      --soft: #eee8dd;
      --dark: #181817;
      --green: #22685d;
      --blue: #2f5f9f;
      --gold: #8b661d;
      --red: #9a3d2f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, textarea { font: inherit; }
    button {
      border: 0;
      border-radius: 7px;
      padding: 10px 13px;
      background: var(--green);
      color: white;
      font-weight: 750;
      cursor: pointer;
    }
    button.secondary { background: var(--soft); color: var(--ink); }
    button.ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
    button:disabled { opacity: .45; cursor: not-allowed; }
    textarea {
      width: 100%;
      min-height: 128px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: white;
      color: var(--ink);
      line-height: 1.5;
    }
    textarea:focus { outline: 2px solid #9ecac3; border-color: var(--green); }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 28px;
      background: var(--dark);
      color: #fbf4e8;
    }
    .brand {
      color: #91d3c8;
      font-size: 13px;
      font-weight: 850;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .sidebar h1 {
      margin: 13px 0 12px;
      font-size: 31px;
      line-height: 1.08;
      letter-spacing: 0;
    }
    .sidebar p { margin: 0; color: #cbc3b8; line-height: 1.5; }
    .progress { margin: 24px 0; }
    .track { height: 11px; background: #403c35; border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; width: 0%; background: linear-gradient(90deg, #74c7bb, #6fa3d8); transition: width .2s ease; }
    .stage-list { display: grid; gap: 8px; margin-top: 22px; }
    .stage-button {
      width: 100%;
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 9px;
      text-align: left;
      background: transparent;
      border: 1px solid #403c35;
      color: #fbf4e8;
    }
    .stage-button.active { border-color: #91d3c8; background: #24221f; }
    .stage-button.done { border-color: #35665b; }
    .number {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #403c35;
      color: #fbf4e8;
      font-size: 12px;
    }
    main { padding: 32px; }
    .workspace { max-width: 1180px; margin: 0 auto; }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .eyebrow {
      display: inline-flex;
      padding: 6px 9px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
    }
    .goal { max-width: 820px; margin: 10px 0 0; color: var(--muted); line-height: 1.5; }
    .lab {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 390px;
      gap: 18px;
      align-items: start;
    }
    .brief {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .brief-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .brief-card span {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .brief-card b { display: block; margin-bottom: 6px; }
    .brief-card p { margin: 0; color: var(--muted); line-height: 1.45; }
    .panel {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 20px;
    }
    .panel h2 { margin: 0 0 8px; font-size: 26px; letter-spacing: 0; }
    .panel h3 { margin: 0 0 8px; font-size: 18px; letter-spacing: 0; }
    .panel p { margin: 0; color: var(--muted); line-height: 1.55; }
    .prompt {
      margin: 18px 0;
      padding-left: 14px;
      border-left: 4px solid var(--green);
      font-size: 18px;
      line-height: 1.45;
    }
    .choice-grid { display: grid; gap: 10px; margin: 16px 0; }
    .choice {
      width: 100%;
      text-align: left;
      background: #fbf7ef;
      color: var(--ink);
      border: 1px solid var(--line);
      display: block;
    }
    .choice.selected { border-color: var(--green); box-shadow: inset 0 0 0 1px var(--green); }
    .choice.wrong { border-color: var(--red); }
    .choice b { display: block; margin-bottom: 4px; }
    .pass-criteria {
      display: grid;
      gap: 7px;
      margin: 16px 0 0;
      padding: 12px;
      border-radius: 8px;
      background: #f7f1e7;
      border: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.45;
    }
    .pass-criteria b { color: var(--ink); }
    .check-output {
      display: none;
      margin-top: 14px;
      padding: 12px;
      border-radius: 8px;
      background: #201f1d;
      color: #fff4df;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .check-output.open { display: block; }
    .unlock {
      display: none;
      margin-top: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f1eadf;
      overflow: hidden;
    }
    .unlock.open { display: block; }
    .unlock-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      background: #e9e0d3;
      font-weight: 850;
    }
    .unlock-body { padding: 14px; display: grid; gap: 12px; }
    .contrast {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fffaf1;
    }
    .card b { display: block; margin-bottom: 6px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    pre {
      margin: 0;
      max-height: 430px;
      overflow: auto;
      padding: 14px;
      border-radius: 8px;
      background: #24211d;
      color: #fff4df;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    code.block {
      display: block;
      padding: 12px;
      border-radius: 8px;
      background: #24211d;
      color: #fff4df;
      white-space: pre-wrap;
      line-height: 1.45;
      font-size: 13px;
    }
    mark { background: #f2ca69; color: #14110e; padding: 0 2px; border-radius: 3px; }
    .feedback {
      display: none;
      margin-top: 14px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f0eadf;
      line-height: 1.5;
    }
    .feedback.open { display: block; }
    .evidence p { margin-bottom: 12px; }
    .lens {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #fbf7ef;
    }
    .lens b { display: block; }
    .lens ul { margin: 0; padding-left: 18px; color: var(--muted); line-height: 1.45; }
    .mastery {
      display: none;
      margin-top: 18px;
      border: 1px solid #9fbfb8;
      border-radius: 8px;
      background: #eef7f4;
      padding: 16px;
    }
    .mastery.open { display: block; }
    .mastery-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .footer-note { margin-top: 18px; color: var(--muted); font-size: 13px; }
    .code-editor, textarea[id^="editor-"] {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.55;
      background: #24211d;
      color: #fff4df;
      border-color: #4a453d;
      min-height: 220px;
      tab-size: 2;
    }
    textarea#editor-transfer { background: white; color: var(--ink); font-family: inherit; min-height: 150px; }
    .code-editor:focus { outline: 2px solid #74c7bb; }
    .sim { margin-top: 18px; padding-top: 6px; border-top: 1px dashed var(--line); }
    .sim-title { font-weight: 850; font-size: 13px; text-transform: uppercase; color: var(--red); margin: 10px 0; }
    .terminal { border-left: 4px solid var(--red); }
    .retry-note { color: var(--muted); font-size: 13.5px; align-self: center; }
    .unlock-body a { color: var(--green); font-weight: 700; }
    @media (max-width: 950px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: relative; height: auto; }
      .lab, .contrast, .brief, .mastery-grid { grid-template-columns: 1fr; }
      main { padding: 22px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">Replay Labs</div>
      <h1>Turn one AI session into one durable skill.</h1>
      <p>This is not a replay viewer. It is a practice lab generated from real work: diagnose, break, repair, transfer.</p>
      <div class="progress">
        <div class="track"><div id="fill" class="fill"></div></div>
        <p id="progress-label" style="margin-top: 8px;">0 of 4 stages complete</p>
      </div>
      <div id="stage-list" class="stage-list"></div>
    </aside>
    <main>
      <section class="workspace">
        <div class="topbar">
          <div>
            <div class="eyebrow">Generated from a real AI coding session</div>
            <p class="goal">${escapeHtml(goal)}</p>
          </div>
          <button id="reset" class="ghost">Reset lab</button>
        </div>
        <section class="brief">
          <div class="brief-card">
            <span>Pattern</span>
            <b>${escapeHtml(module.challenge.pattern)}</b>
            <p>${escapeHtml(module.challenge.patternCopy)}</p>
            ${module.patternHref ? `<p style="margin-top:8px"><a href="${escapeHtml(module.patternHref)}" style="color:var(--green);font-weight:750;">Catalog entry →</a></p>` : ""}
          </div>
          <div class="brief-card">
            <span>Smell</span>
            <b>${escapeHtml(module.challenge.smell)}</b>
            <p>${escapeHtml(module.challenge.smellCopy)}</p>
          </div>
          <div class="brief-card">
            <span>Proof</span>
            <b>${escapeHtml(module.challenge.proof)}</b>
            <p>${escapeHtml(module.challenge.proofCopy)}</p>
          </div>
        </section>
        <div class="lab">
          <section class="panel">
            <h2 id="stage-title"></h2>
            <p id="stage-copy"></p>
            <div id="stage-content"></div>
            <div class="actions">
              <button id="prev" class="secondary">Previous</button>
              <button id="next">Next stage</button>
            </div>
          </section>
          <aside class="panel evidence">
            <h3>Session Evidence</h3>
            <p>Use this first. The product should train the learner to read evidence before accepting an explanation.</p>
            <div class="lens">
              <b id="lens-title"></b>
              <ul id="lens-items"></ul>
            </div>
            <pre>${highlightEvidence(evidence, primary.patterns)}</pre>
          </aside>
        </div>
        <section id="mastery" class="mastery">
          <h2>Mastery Artifact</h2>
          <p>This is what the learner should carry into the next AI session.</p>
          <div class="mastery-grid">
            <div class="card"><b>Mental model</b><p id="artifact-model"></p></div>
            <div class="card"><b>Failure signature</b><p id="artifact-failure"></p></div>
            <div class="card"><b>Shipping standard</b><p id="artifact-standard"></p></div>
            <div class="card"><b>Transfer rule</b><p id="artifact-transfer"></p></div>
          </div>
        </section>
        <p class="footer-note">This lab focuses on one decision from the session so the exercise stays specific.</p>
      </section>
    </main>
  </div>
  <script>
    const module = ${JSON.stringify(module)};
    const storageKey = "replay-lab:${hashForStorage(goal + diffPath + transcriptPath)}";
    const state = JSON.parse(localStorage.getItem(storageKey) || '{"stage":0,"complete":{},"answers":{},"choices":{}}');
    state.complete ||= {};
    state.answers ||= {};
    state.choices ||= {};
    state.reviews ||= {};
    state.reviewing = null;

    const stages = [
      {
        id: "diagnose",
        title: "1. Diagnose the decision",
        copy: "Before the lesson appears, decide what kind of engineering judgment the AI exercised.",
        render: renderDiagnose
      },
      {
        id: "break",
        title: "2. Predict what breaks",
        copy: "Taste comes from knowing failure modes. Choose the breakage that explains why the decision matters.",
        render: renderBreak
      },
      {
        id: "repair",
        title: "3. Repair the design",
        copy: "Now propose the production-minded improvement. This is where explanation becomes ownership.",
        render: renderRepair
      },
      {
        id: "transfer",
        title: "4. Transfer to a new situation",
        copy: "The point is not to remember this code. The point is to make the next similar decision without help.",
        render: renderTransfer
      }
    ];

    function save() {
      localStorage.setItem(storageKey, JSON.stringify(state));
      updateProgress();
    }

    function render() {
      const stage = stages[state.stage];
      document.getElementById("stage-title").textContent = stage.title;
      document.getElementById("stage-copy").textContent = stage.copy;
      document.getElementById("stage-content").innerHTML = stage.render();
      renderEvidenceLens(stage.id);
      document.getElementById("prev").disabled = state.stage === 0;
      document.getElementById("next").disabled = !state.complete[stage.id];
      bindStage();
      updateProgress();
    }

    function renderDiagnose() {
      return \`
        <div class="prompt">\${escapeForClient(module.diagnose.prompt)}</div>
        <div class="choice-grid">
          \${module.diagnose.choices.map((choice, index) => choiceButton("diagnose", choice, index)).join("")}
        </div>
        \${passCriteria("diagnose")}
        \${checkOutput("diagnose")}
        \${lesson("diagnose", "Mental model unlocked", \`
          <div class="contrast">
            <div class="card"><b>Decision name</b><p>\${escapeForClient(module.name)}</p></div>
            <div class="card"><b>Why it appeared</b><p>\${escapeForClient(module.why)}</p></div>
          </div>
          <div class="card"><b>Taste takeaway</b><p>\${escapeForClient(module.takeaway)}</p></div>
        \`)}
      \`;
    }

    function renderBreak() {
      const simReady = module.failureSim && isChoiceCorrect("break");
      return \`
        <div class="prompt">\${escapeForClient(module.break.prompt)}</div>
        <code class="block">\${escapeForClient(module.naiveCode)}</code>
        <div class="choice-grid">
          \${module.break.choices.map((choice, index) => choiceButton("break", choice, index)).join("")}
        </div>
        \${passCriteria("break")}
        \${checkOutput("break")}
        \${simReady ? \`
          <div class="sim">
            <div class="sim-title">Failure simulation — this is what your terminal would show</div>
            <pre class="terminal">\${escapeForClient(module.failureSim.terminal)}</pre>
            <div class="prompt">\${escapeForClient(module.failureSim.prompt)}</div>
            <div class="choice-grid">
              \${module.failureSim.choices.map((choice, index) => choiceButton("breakFix", choice, index)).join("")}
            </div>
            \${checkOutput("breakFix")}
          </div>\` : ""}
        \${lesson("break", "Failure mode unlocked", \`
          <div class="contrast">
            <div class="card"><b>Naive version</b><p>\${escapeForClient(module.naive)}</p></div>
            <div class="card"><b>What breaks</b><p>\${escapeForClient(module.breaks)}</p></div>
          </div>
        \`)}
      \`;
    }

    function renderRepair() {
      if (!module.repairLab) return renderChoiceStage("repair", "Better design unlocked");
      const review = state.reviews.repair;
      return \`
        <div class="prompt">\${escapeForClient(module.repair.prompt)}</div>
        <p>\${escapeForClient(module.repairLab.instructions)}</p>
        <textarea id="editor-repair" class="code-editor" spellcheck="false" rows="14">\${escapeForClient(state.answers.repair ?? module.repairLab.starter)}</textarea>
        <div class="actions">
          <button data-review="repair" \${state.reviewing ? "disabled" : ""}>\${state.reviewing === "repair" ? "reviewing…" : "replay check repair"}</button>
          \${review && review.overall === "FAIL" ? '<span class="retry-note">Edit and check again — the rubric tells you exactly what is missing.</span>' : ""}
        </div>
        \${passCriteria("repair")}
        \${reviewOutput("repair")}
        \${lesson("repair", "Better design unlocked", \`
          <div class="contrast">
            <div class="card"><b>AI session version</b><p>\${escapeForClient(module.aiVersion)}</p></div>
            <div class="card"><b>Production version</b><p>\${escapeForClient(module.production)}</p></div>
          </div>
          \${module.patternHref ? \`<div class="card"><b>Catalog entry</b><p>Runtime Boundary is now part of your catalog. <a href="\${module.patternHref}">Read the full pattern page →</a></p></div>\` : ""}
        \`)}
      \`;
    }

    function renderTransfer() {
      if (!module.transferLab) return renderChoiceStage("transfer", "Transfer rule unlocked");
      const review = state.reviews.transfer;
      return \`
        <div class="prompt">\${escapeForClient(module.transfer.prompt)}</div>
        <div class="card"><b>New situation</b><p>\${escapeForClient(module.transfer.scenario)}</p></div>
        <p style="margin-top:12px">\${escapeForClient(module.transferLab.instructions)}</p>
        <textarea id="editor-transfer" spellcheck="true" rows="8" placeholder="\${escapeForClient(module.transferLab.placeholder)}">\${escapeForClient(state.answers.transfer ?? "")}</textarea>
        <div class="actions">
          <button data-review="transfer" \${state.reviewing ? "disabled" : ""}>\${state.reviewing === "transfer" ? "reviewing…" : "replay check transfer"}</button>
          \${review && review.overall === "FAIL" ? '<span class="retry-note">Sharpen the plan and check again.</span>' : ""}
        </div>
        \${passCriteria("transfer")}
        \${reviewOutput("transfer")}
        \${lesson("transfer", "Transfer rule unlocked", \`
          <div class="card"><b>Reusable rule</b><p>\${escapeForClient(module.transfer.rule)}</p></div>
          <div class="card"><b>Next practice</b><p>\${escapeForClient(module.exercise)}</p></div>
        \`)}
      \`;
    }

    function renderChoiceStage(stageId, unlockTitle) {
      const m = getStageModule(stageId);
      return \`
        <div class="prompt">\${escapeForClient(m.prompt)}</div>
        \${m.scenario ? \`<div class="card"><b>New situation</b><p>\${escapeForClient(m.scenario)}</p></div>\` : ""}
        <div class="choice-grid">
          \${m.choices.map((choice, index) => choiceButton(stageId, choice, index)).join("")}
        </div>
        \${passCriteria(stageId)}
        \${checkOutput(stageId)}
        \${lesson(stageId, unlockTitle, \`
          <div class="card"><b>Takeaway</b><p>\${escapeForClient(module.takeaway)}</p></div>
        \`)}
      \`;
    }

    function reviewOutput(stageId) {
      const review = state.reviews[stageId];
      if (!review) return "";
      const lines = (review.criteria || []).map((criterion) =>
        \`[\${criterion.pass ? "PASS" : "FAIL"}] \${escapeForClient(criterion.note)}\`
      ).join("\\n");
      const reviewer = review.reviewer === "claude"
        ? "reviewer: claude (real review)"
        : review.reviewer === "heuristic"
          ? "reviewer: heuristic fallback — start replay-labs serve with the claude CLI for real review"
          : review.reviewer === "offline"
            ? "reviewer: offline heuristic — this page is not being served by replay-labs serve"
            : "reviewer: validator";
      return \`<div class="check-output open">replay review \${stageId}
\${reviewer}
\${lines}
overall: \${review.overall}
\${escapeForClient(review.summary || "")}\${review.misconception && review.overall !== "PASS" ? "\\nmisconception: " + escapeForClient(review.misconception) : ""}</div>\`;
    }

    function isChoiceCorrect(stageId) {
      const m = getStageModule(stageId);
      return m && state.choices[stageId] != null && Boolean(m.choices[state.choices[stageId]].correct);
    }

    async function runReview(stageId) {
      const editor = document.getElementById("editor-" + stageId);
      const submission = editor ? editor.value : "";
      state.answers[stageId] = submission;
      state.reviewing = stageId;
      save();
      render();
      let result = null;
      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stage: stageId, submission })
        });
        if (response.ok) result = await response.json();
      } catch { /* not served by replay-labs serve */ }
      if (!result) result = offlineHeuristic(stageId, submission);
      state.reviewing = null;
      state.reviews[stageId] = result;
      state.complete[stageId] = result.overall === "PASS";
      save();
      render();
    }

    function offlineHeuristic(stageId, submission) {
      const checks = stageId === "repair"
        ? [
            ["Client boundary", /['"]use client['"]|ssr:\\s*false/.test(submission), true],
            ["Capability guards", /typeof window|in window|\\?\\?|\\|\\||navigator\\./.test(submission), true],
            ["Unsupported state", /unsupported|not supported|fallback/i.test(submission), true],
            ["Permission denial", /denied|permission|catch/i.test(submission), false],
            ["Verification", /test|verify|check\\b/i.test(submission), false]
          ]
        : [
            ["Boundary isolation", /client (component|boundary)|['"]use client['"]|isolate/i.test(submission), true],
            ["Capability checks", /detect|capabilit|typeof|in navigator|permissions/i.test(submission), true],
            ["Failure states", /denied|unsupported|fallback|error state/i.test(submission), true],
            ["Ownership reasoning", /runtime|server|render|ownership|boundary/i.test(submission), false],
            ["Verification", /test|verify|device|browser/i.test(submission), false]
          ];
      const criteria = checks.map(([name, pass]) => ({ id: name, pass, note: (pass ? "Detected: " : "Missing: ") + name }));
      const requiredOk = checks.filter((c) => c[2]).every((c) => c[1]);
      const optionalOk = checks.filter((c) => !c[2]).some((c) => c[1]);
      return {
        criteria,
        overall: requiredOk && optionalOk ? "PASS" : "FAIL",
        summary: "Offline pattern-match only. Run 'node ./src/cli.js serve' and reload for a real reviewer.",
        misconception: null,
        reviewer: "offline"
      };
    }

    function choiceButton(stageId, choice, index) {
      const selected = state.choices[stageId] === index;
      const completed = Boolean(state.complete[stageId]);
      const className = selected ? (choice.correct ? "choice selected" : "choice wrong") : "choice";
      return \`
        <button class="\${className}" data-choice-stage="\${stageId}" data-choice-index="\${index}" type="button">
          <b>\${escapeForClient(choice.label)}</b>
          <span>\${selected ? escapeForClient(choice.feedback) : escapeForClient(choice.description)}</span>
        </button>
      \`;
    }

    function passCriteria(stageId) {
      return \`
        <div class="pass-criteria">
          <b>Pass condition</b>
          <span>\${escapeForClient(module.criteria[stageId])}</span>
        </div>
      \`;
    }

    function checkOutput(stageId) {
      if (!(stageId in state.choices)) return "";
      const choice = getStageModule(stageId).choices[state.choices[stageId]];
      const status = choice.correct ? "PASS" : "FAIL";
      return \`
        <div class="check-output open">replay check \${stageId}
status: \${status}
reason: \${escapeForClient(choice.feedback)}</div>
      \`;
    }

    function lesson(stageId, title, body) {
      return \`<div class="unlock \${state.complete[stageId] ? "open" : ""}">
        <div class="unlock-header">\${escapeForClient(title)}</div>
        <div class="unlock-body">\${body}</div>
      </div>\`;
    }

    function bindStage() {
      document.querySelectorAll("[data-choice-stage]").forEach((button) => {
        button.addEventListener("click", () => {
          const stageId = button.getAttribute("data-choice-stage");
          const index = Number(button.getAttribute("data-choice-index"));
          state.choices[stageId] = index;
          if (stageId === "break" || stageId === "breakFix") {
            state.complete.break = isChoiceCorrect("break") && (!module.failureSim || isChoiceCorrect("breakFix"));
          } else {
            state.complete[stageId] = isChoiceCorrect(stageId);
          }
          save();
          render();
        });
      });
      document.querySelectorAll("[data-review]").forEach((button) => {
        button.addEventListener("click", () => runReview(button.getAttribute("data-review")));
      });
      document.querySelectorAll("textarea[id^='editor-']").forEach((editor) => {
        editor.addEventListener("input", () => {
          state.answers[editor.id.replace("editor-", "")] = editor.value;
          localStorage.setItem(storageKey, JSON.stringify(state));
        });
      });
    }

    function getStageModule(stageId) {
      if (stageId === "breakFix") return module.failureSim;
      return stageId === "diagnose" ? module.diagnose : stageId === "break" ? module.break : stageId === "repair" ? module.repair : module.transfer;
    }

    function updateProgress() {
      const done = stages.filter((stage) => state.complete[stage.id]).length;
      const pct = Math.round((done / stages.length) * 100);
      document.getElementById("fill").style.width = pct + "%";
      document.getElementById("progress-label").textContent = done + " of " + stages.length + " stages complete";
      document.getElementById("mastery").classList.toggle("open", done === stages.length);
      document.getElementById("artifact-model").textContent = module.name;
      document.getElementById("artifact-failure").textContent = module.artifact.failure;
      document.getElementById("artifact-standard").textContent = module.artifact.standard;
      document.getElementById("artifact-transfer").textContent = module.transfer.rule;
      document.getElementById("stage-list").innerHTML = stages.map((stage, index) => \`
        <button class="stage-button \${index === state.stage ? "active" : ""} \${state.complete[stage.id] ? "done" : ""}" data-stage="\${index}" type="button">
          <span class="number">\${state.complete[stage.id] ? "OK" : index + 1}</span>
          <span>\${escapeForClient(stage.title.replace(/^\\d+\\. /, ""))}</span>
        </button>
      \`).join("");
      document.querySelectorAll("[data-stage]").forEach((button) => {
        button.addEventListener("click", () => {
          state.stage = Number(button.getAttribute("data-stage"));
          save();
          render();
        });
      });
    }

    function renderEvidenceLens(stageId) {
      const lens = module.lenses[stageId];
      document.getElementById("lens-title").textContent = lens.title;
      document.getElementById("lens-items").innerHTML = lens.items
        .map((item) => "<li>" + escapeForClient(item) + "</li>")
        .join("");
    }

    document.getElementById("prev").addEventListener("click", () => {
      state.stage = Math.max(0, state.stage - 1);
      save();
      render();
    });
    document.getElementById("next").addEventListener("click", () => {
      state.stage = Math.min(stages.length - 1, state.stage + 1);
      save();
      render();
    });
    document.getElementById("reset").addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      location.reload();
    });
    render();

    function escapeForClient(value) {
      return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }
  </script>
</body>
</html>`;
}

function buildLabModule(decision) {
  if (decision.id === "next-client-boundary") {
    return {
      name: "Runtime Boundary",
      why:
        "The session used browser-only APIs such as speech synthesis, microphone input, and localStorage inside a Next.js app. That makes the client/server boundary the central decision.",
      takeaway:
        "When code depends on browser APIs, decide the runtime boundary before you design the component.",
      naive:
        "Use browser APIs directly in a component without deciding whether the component runs on the server or in the browser.",
      naiveCode: `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`,
      patternHref: "patterns/runtime-boundary.html",
      failureSim: {
        terminal: `$ next build

   Creating an optimized production build ...
 ✓ Compiled successfully

   Generating static pages (0/3) ...
ReferenceError: window is not defined
    at Page (app/page.tsx:2:28)
    at renderToHTML (node_modules/next/dist/server/render.js:387:14)

> Export encountered an error on /page: /, exiting the build.`,
        prompt:
          "This exact code worked all afternoon in the browser. Why does the error appear only at build time?",
        choices: [
          {
            label: "The code now executes on the server first",
            description: "Build-time prerendering runs the component in Node, where browser globals do not exist.",
            feedback: "Correct. Nothing about the code changed — the runtime that executes it changed. That is the whole pattern.",
            correct: true
          },
          {
            label: "Next.js deprecated window in this version",
            description: "The framework removed access to the window object.",
            feedback: "No. window is fine — in the browser. The error names the place this ran: renderToHTML, on the server.",
            correct: false
          },
          {
            label: "The browser blocked the speech API for security",
            description: "Permission policies stopped SpeechRecognition.",
            feedback: "Permissions fail differently and at click-time. Read the stack trace: this never reached a browser.",
            correct: false
          }
        ]
      },
      repairLab: {
        instructions:
          "Edit the code until you would ship it. Keep it small — this is judgment, not typing practice. Your repair is reviewed against the shipping rubric, criterion by criterion.",
        starter: `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`
      },
      transferLab: {
        instructions:
          "Write the handoff rule: where the boundary goes, what gets checked, which failure states exist, and how you verify. 4-8 sentences.",
        placeholder:
          "My plan: the geolocation/camera work goes in… before using the APIs I check… if the user denies or the browser lacks support, the dashboard shows… I verify this by…"
      },
      breaks:
        "`window`, microphone APIs, speech synthesis, and localStorage do not exist during server rendering. Even in the browser, unsupported APIs and denied permissions need a designed fallback.",
      aiVersion:
        "The AI put the main voice experience behind a client boundary with `'use client'` and kept browser behavior in `app/page.tsx`.",
      production:
        "Keep the client boundary, add capability checks, show unsupported-browser and permission-denied states, and consider server-driven voice if reliability matters more than browser-native speed.",
      exercise:
        "Create a scratch version without the client boundary, predict the failure, then add a browser-support fallback before restoring the working design.",
      challenge: {
        pattern: "Runtime Boundary",
        patternCopy: "A professional decision about which environment owns a behavior.",
        smell: "Browser API leak",
        smellCopy: "Server-rendered code reaches for window, localStorage, microphone, or speech APIs.",
        proof: "Transfer, not recall",
        proofCopy: "You pass only when you can apply the same rule to a different browser-capability feature."
      },
      criteria: {
        diagnose: "Identify the decision type from evidence before reading the explanation.",
        break: "Predict the first runtime failure, then explain the failure simulation: why only at build time?",
        repair: "Real review. Required: client boundary, capability guards, designed unsupported state. Seal it with permission-denied handling or named verification.",
        transfer: "Real review. Required: boundary isolation, capability checks, failure states. Seal it with ownership reasoning or verification beyond dev."
      },
      artifact: {
        failure: "Server-rendered code touches browser globals such as window, speechSynthesis, microphone APIs, or localStorage.",
        standard: "Keep browser behavior inside a client boundary, add capability and permission fallbacks, and verify those states."
      },
      lenses: {
        diagnose: {
          title: "Look for the decision type",
          items: ["Browser-only APIs", "Next.js runtime boundary", "Evidence that this is not only styling or data modeling"]
        },
        break: {
          title: "Look for the first failure",
          items: ["Any reference to window", "APIs that only exist in the browser", "Code that would execute before the page reaches a user"]
        },
        repair: {
          title: "Look for the shipping gap",
          items: ["Unsupported browser behavior", "Denied microphone permission", "A verification path for failure states"]
        },
        transfer: {
          title: "Look for the reusable pattern",
          items: ["New browser capabilities", "Client/server ownership", "Fallback states beyond local success"]
        }
      },
      diagnose: {
        prompt: "What kind of decision did the AI make when it added `'use client'` to the voice experience?",
        choices: [
          {
            label: "Runtime boundary",
            description: "It decided which parts of the feature must run in the browser instead of on the server.",
            feedback: "Correct. This is a client/server runtime boundary decision, not just a Next.js syntax detail.",
            correct: true
          },
          {
            label: "Styling architecture",
            description: "It chose how the UI should be organized visually.",
            feedback: "Not quite. The evidence is about browser APIs and rendering environment, not visual structure.",
            correct: false
          },
          {
            label: "Database modeling",
            description: "It chose how goals should be stored.",
            feedback: "That is another decision in the session, but it does not explain `'use client'`.",
            correct: false
          }
        ]
      },
      break: {
        prompt: "If this naive version runs during server rendering, what is the most important failure?",
        choices: [
          {
            label: "`window` is undefined",
            description: "Server rendering has no browser globals, so the code can fail before the user reaches the page.",
            feedback: "Correct. The first failure is runtime ownership: the server cannot access browser globals.",
            correct: true
          },
          {
            label: "The CSS bundle gets larger",
            description: "Bundle size may matter, but it is not the core failure here.",
            feedback: "Not the primary issue. The problem happens before styling performance matters.",
            correct: false
          },
          {
            label: "The database loses goals",
            description: "Persistence is a separate risk, not the reason this code needs a client boundary.",
            feedback: "Different decision. Here the evidence points to browser-only APIs.",
            correct: false
          }
        ]
      },
      repair: {
        prompt: "Which improvement would you require before shipping this beyond a demo?",
        choices: [
          {
            label: "Keep client boundary, add capability checks, fallback UI, and verification",
            description: "Treat browser support and permission denial as designed states, not accidental runtime surprises.",
            feedback: "Correct. This is the minimum standard that turns the demo decision into shippable judgment.",
            correct: true
          },
          {
            label: "Remove the client boundary so the page renders faster",
            description: "Optimize for server rendering even though the feature depends on browser APIs.",
            feedback: "Wrong tradeoff. The feature needs browser ownership before rendering optimization matters.",
            correct: false
          },
          {
            label: "Keep the demo unchanged because it works locally",
            description: "Accept local success as enough evidence.",
            feedback: "This is the exact behavior Replay should challenge: local success is not ownership.",
            correct: false
          }
        ]
      },
      transfer: {
        prompt: "Apply the same judgment to a new feature.",
        scenario:
          "A future AI session adds geolocation, camera capture, and localStorage to a Next.js dashboard. The feature works in the browser during development.",
        rule:
          "If the feature depends on browser-only capabilities, isolate that behavior behind a client boundary, design fallback states, and keep server code free of browser globals.",
        choices: [
          {
            label: "Create a client component with capability checks",
            description: "Put browser-only behavior in a client boundary and handle unsupported or denied states.",
            feedback: "Correct. You transferred the runtime-boundary decision to a new browser-capability feature.",
            correct: true
          },
          {
            label: "Move all code into an API route",
            description: "Server routes protect secrets, but they cannot access the user's camera or geolocation directly.",
            feedback: "Not enough. API routes solve secret boundaries, not browser capability ownership.",
            correct: false
          },
          {
            label: "Keep it in the page and rely on development behavior",
            description: "If it works locally, ship it unchanged.",
            feedback: "This is the trap Replay exists to fight: working once is not the same as owning the decision.",
            correct: false
          }
        ]
      }
    };
  }

  return {
    name: decision.title,
    why: decision.why,
    takeaway: decision.seniorCheck,
    naive: decision.beginnerMiss,
    naiveCode: "// Naive version: accept the first working implementation without naming the decision.",
    breaks: "The human can ship the code but cannot evaluate, adapt, or debug the same decision later.",
    aiVersion: "The AI produced a working implementation in the session.",
    production: "Name the decision, compare alternatives, identify failure modes, and verify the code with evidence.",
    exercise: "Name one alternative, one failure mode, and one line of evidence from the diff.",
    challenge: {
      pattern: "Decision Ownership",
      patternCopy: "A professional decision is one the human can explain and reuse.",
      smell: "Fluent but unowned code",
      smellCopy: "The implementation exists, but the learner cannot name the tradeoff.",
      proof: "Transfer, not summary",
      proofCopy: "The learner must reuse the idea in a new context."
    },
    criteria: {
      diagnose: "Identify the decision as a tradeoff, not a formatting detail.",
      break: "Name what the learner cannot do if the decision is unowned.",
      repair: "Choose a review standard that requires evidence and verification.",
      transfer: "Reuse the decision in another session."
    },
    artifact: {
      failure: "The learner can repeat the code but cannot adapt the decision when context changes.",
      standard: "Name the decision, compare alternatives, identify a failure mode, and verify the behavior."
    },
    lenses: {
      diagnose: { title: "Look for the decision type", items: ["Changed behavior", "A constraint", "A tradeoff"] },
      break: { title: "Look for the failure", items: ["What would be hard to debug later", "What the learner could not adapt"] },
      repair: { title: "Look for the review standard", items: ["Evidence", "Alternative", "Failure mode", "Verification"] },
      transfer: { title: "Look for reuse", items: ["A future context", "The same judgment in different code"] }
    },
    diagnose: {
      prompt: "What kind of decision is this?",
      choices: [
        { label: "A design tradeoff", description: decision.why, feedback: "Correct. Start by naming the tradeoff.", correct: true },
        { label: "A formatting choice", description: "The code style changed.", feedback: "Too shallow. Look for behavior and constraints.", correct: false },
        { label: "A random implementation detail", description: "The AI just happened to write it this way.", feedback: "That assumption prevents learning. Ask what constraint shaped it.", correct: false }
      ]
    },
    break: {
      prompt: "What breaks if the learner cannot explain this decision?",
      choices: [
        { label: "They cannot adapt it later", description: "The next similar problem will still require blind delegation.", feedback: "Correct. Transfer is the real goal.", correct: true },
        { label: "Nothing breaks", description: "The code already runs.", feedback: "Running code can still fail as education.", correct: false },
        { label: "Only naming gets worse", description: "This is cosmetic.", feedback: "The issue is judgment, not vocabulary alone.", correct: false }
      ]
    },
    repair: {
      prompt: "Which review standard would you apply before accepting this implementation?",
      choices: [
        { label: "Name the decision, evidence, alternative, failure mode, and verification", description: "This standard proves the human can own the work.", feedback: "Correct.", correct: true },
        { label: "Ask the AI for a nicer explanation", description: "This may help reading, but it does not prove judgment.", feedback: "Too passive.", correct: false },
        { label: "Ship because the diff exists", description: "A diff is not evidence of understanding.", feedback: "That misses the point.", correct: false }
      ]
    },
    transfer: {
      prompt: "How would you reuse this lesson in a new session?",
      scenario: "A future AI session makes a similar implementation choice in a different feature.",
      rule: "A decision is learned only when you can recognize and apply it in a new context.",
      choices: [
        { label: "Name the decision and compare alternatives", description: "Use the prior session as a mental model.", feedback: "Correct.", correct: true },
        { label: "Ask for a summary", description: "Summaries help, but they do not prove transfer.", feedback: "Too passive.", correct: false },
        { label: "Accept the working code", description: "Working code is not proof of understanding.", feedback: "That is the anti-goal.", correct: false }
      ]
    }
  };
}

export function findEvidenceSnippet(diff, patterns = []) {
  const lines = diff.split("\n");
  const index = lines.findIndex((line) =>
    isChangedEvidenceLine(line) && patterns.some((pattern) => pattern.test(line))
  );
  if (index < 0) return "";
  // Wider window so a decision's blast radius (directive + dependent lines, often
  // 30-50 lines apart) lands in one evidence snippet — enables multi-line diagnosis.
  const start = Math.max(0, index - 7);
  const end = Math.min(lines.length, index + 56);
  return lines.slice(start, end).join("\n");
}

function isChangedEvidenceLine(line) {
  return /^[+-]/.test(line) && !/^(---|\+\+\+)/.test(line);
}

function highlightEvidence(value, patterns = []) {
  const escaped = escapeHtml(value);
  const literalPatterns = patterns
    .map((pattern) => extractLiteral(pattern))
    .filter((text) => text.length > 3)
    .sort((a, b) => b.length - a.length)
    .filter((text, index, values) => {
      const lower = text.toLowerCase();
      return !values.slice(0, index).some((previous) => previous.toLowerCase().includes(lower));
    })
    .slice(0, 5);

  return literalPatterns.reduce((html, literal) => {
    const expression = new RegExp(escapeRegExp(literal), "gi");
    return html.replace(expression, (match) => `<mark>${match}</mark>`);
  }, escaped);
}

function extractLiteral(pattern) {
  const source = pattern.source
    .replaceAll("\\/", "/")
    .replaceAll("\\.", ".")
    .replaceAll("\\s", " ")
    .replaceAll("\\+", "+")
    .replaceAll("|", " ");
  const match = source.match(/[A-Za-z_/@.-]{4,}/);
  return match ? match[0] : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hashForStorage(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}
