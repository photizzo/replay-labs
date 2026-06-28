// Session map: the landing page for a session's labs.
// "This session contains N decisions. Start with X."

export function generateOverviewHtml({ goal, labs }) {
  const rich = labs.filter((l) => l.rich);
  const primary = rich[0] || labs[0];
  const cards = labs.map((lab, index) => labCard(lab, index)).join("");
  const hasReadyLabs = rich.length > 0;
  const hasDecisionSignals = labs.length > 0;
  const decisionWord = labs.length === 1 ? "decision" : "decisions";
  const decisionNoun = labs.length === 1 ? "decision signal" : "decision signals";
  const headline = hasReadyLabs
    ? `This session contains <em>${labs.length} ${decisionWord}</em>. Start with ${escapeHtml(primary.module.name)}.`
    : hasDecisionSignals
      ? `Replay Labs found <em>${labs.length} ${decisionNoun}</em>, but no practice lab is ready yet.`
      : "Replay did not find enough decision evidence in this session.";
  const subcopy = hasReadyLabs
    ? "Use the lab to practice the decision: diagnose it, test the failure mode, repair it, and transfer it to a future session."
    : hasDecisionSignals
      ? "Replay Labs found decision signals, but it did not find enough concrete code evidence to build a practice lab."
      : "This session may still be useful to read, but Replay cannot honestly turn it into a decision map or lab yet.";
  const catalogLinks = rich
    .map((l) => l.module.patternHref ? `<a href="${escapeHtml(l.module.patternHref)}">${escapeHtml(l.module.name)}</a>` : "")
    .filter(Boolean);
  const foot = hasReadyLabs
    ? catalogLinks.length
      ? `Ready labs use this session's diff and transcript. Pattern catalog: ${catalogLinks.join(" · ")}`
      : "Ready labs use this session's diff and transcript. This session did not need a prebuilt catalog pattern."
    : hasDecisionSignals
      ? "No lab link is shown because this session only had weak or indirect evidence."
      : "No decision map is shown because Replay did not find enough decision evidence.";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Session map — Replay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0c0e11; --panel: #14171c; --panel2: #191d23;
    --line: #242a32; --line2: #303845;
    --ink: #e9e7e2; --muted: #98a1ac; --faint: #67707c;
    --accent: #34d399; --accent-dim: #34d39922; --accent-ink: #052e1e;
    --fail: #f87171; --warn: #fbbf24;
    --sans: "Inter", ui-sans-serif, system-ui, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans);
    font-size: 15.5px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--accent); color: var(--accent-ink); }
  a { color: var(--accent); text-decoration: none; }
  header.top { display: flex; align-items: center; padding: 14px 28px; border-bottom: 1px solid var(--line); }
  .wordmark { font-family: var(--mono); font-weight: 700; font-size: 15px; }
  .wordmark em { color: var(--accent); font-style: normal; }
  .wordmark span { color: var(--faint); font-weight: 400; margin-left: 10px; font-size: 12px;
    letter-spacing: .12em; text-transform: uppercase; }
  main { max-width: 880px; margin: 0 auto; padding: 52px 24px 90px; }
  .eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
    color: var(--faint); margin-bottom: 16px; }
  .eyebrow b { color: var(--accent); font-weight: 700; }
  h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.12; margin: 0 0 14px; max-width: 720px; }
  h1 em { font-style: normal; color: var(--accent); }
  .sub { color: var(--muted); font-size: 17px; max-width: 640px; margin: 0 0 10px; }
  .goal { color: var(--faint); font-size: 13.5px; margin: 0 0 38px; }
  .list { display: grid; gap: 14px; }
  .lab-card { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 18px; align-items: center;
    background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 22px 24px;
    color: inherit; transition: border-color .15s, transform .15s; }
  a.lab-card:hover { border-color: var(--accent); transform: translateY(-2px); text-decoration: none; }
  .lab-card.primary { border-color: var(--accent); background: linear-gradient(135deg, #34d39910, var(--panel) 50%); }
  .lab-card.locked { opacity: .62; }
  .rank { font-family: var(--mono); font-size: 22px; font-weight: 700; color: var(--faint); }
  .lab-card.primary .rank { color: var(--accent); }
  .lab-card h3 { margin: 0 0 4px; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .lab-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
  .tags { display: flex; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
  .tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
    border: 1px solid var(--line); border-radius: 5px; padding: 2px 8px; color: var(--faint); }
  .tag.smell { color: var(--fail); border-color: #f8717133; }
  .tag.start { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); font-weight: 700; }
  .cta-col { text-align: right; font-family: var(--mono); font-size: 12.5px; font-weight: 600; color: var(--accent); white-space: nowrap; }
  .lab-card.locked .cta-col { color: var(--faint); }
  .foot { margin-top: 36px; color: var(--faint); font-size: 13px; }
  .foot a { font-weight: 600; }
  .recovery { display:flex; gap:10px; flex-wrap:wrap; margin: 24px 0 0; }
  .recovery a { border:1px solid var(--line2); border-radius:8px; padding:9px 12px; color:var(--ink); font-weight:700; }
  .recovery a.primary { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
  @media (max-width: 700px) {
    h1 { font-size: 30px; }
    .lab-card { grid-template-columns: 1fr; gap: 8px; padding: 18px; }
    .rank { font-size: 16px; }
    .cta-col { text-align: left; }
  }
</style>
</head>
<body>
<header class="top"><div class="wordmark">replay labs<em>.</em><span>Session map</span></div></header>
<main>
  <div class="eyebrow"><b>Session analyzed</b> · decisions sorted by available evidence</div>
  <h1>${headline}</h1>
  <p class="sub">${escapeHtml(subcopy)}</p>
  <p class="goal">Session goal: ${escapeHtml(goal)}</p>
  ${hasReadyLabs ? "" : `<div class="recovery"><a class="primary" href="/inbox">Choose another session</a><a href="/inbox">Back to inbox</a></div>`}
  <div class="list">${cards}</div>
  <p class="foot">${foot}</p>
</main>
</body>
</html>`;
}

function labCard(lab, index) {
  const rank = String(index + 1).padStart(2, "0");
  const m = lab.module;
  const inner = `
    <div class="rank">${rank}</div>
    <div>
      <h3>${escapeHtml(m.name)}</h3>
      <p>${escapeHtml(firstSentence(m.why))}</p>
      <div class="tags">
        ${index === 0 && lab.rich ? '<span class="tag start">Start here</span>' : ""}
        ${lab.generated ? '<span class="tag" style="color:var(--accent);border-color:#34d39944">generated</span>' : ""}
        <span class="tag smell">smell: ${escapeHtml(m.challenge.smell)}</span>
        <span class="tag">${escapeHtml(m.challenge.proof || "Transfer, not recall")}</span>
        ${lab.rich && m.minutes ? `<span class="tag">≈ ${m.minutes} min</span>` : ""}
      </div>
    </div>
    <div class="cta-col">${lab.rich ? "Enter lab →" : "Needs changed lines"}</div>`;
  return lab.rich
    ? `<a class="lab-card${index === 0 ? " primary" : ""}" href="labs/${m.id}.html">${inner}</a>`
    : `<div class="lab-card locked">${inner}</div>`;
}

function firstSentence(text) {
  // Split only on sentence-ending punctuation (not the dot in "Next.js").
  const match = String(text).match(/^.+?[.!?](?=\s+[A-Z]|\s*$)/s);
  return match ? match[0] : String(text);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
