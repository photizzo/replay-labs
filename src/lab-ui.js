// Replay Labs UI v3.
// Dark IDE-grade workspace, editorial typography, one accent, code chrome,
// terminal moments with staggered reveals, and reuse notes worth keeping.

export function generateLabHtml({ goal, module: baseModule, evidence, patternHref, homeHref, sessionKey = "" }) {
  const module = patternHref ? { ...baseModule, patternHref } : baseModule;
  const evidenceHtml = renderDiff(evidence);
  const storageKey = `replay-lab-v5:${hash([goal, module.id, module.name, sessionKey, evidence].join("\n"))}`;
  const payload = JSON.stringify({ module, evidenceHtml, evidenceRaw: evidence, storageKey, goal })
    .replaceAll("<", "\\u003c");
  const wordmark = homeHref
    ? `<a class="wordmark" href="${escapeHtml(homeHref)}" style="color:inherit">replay labs<em>.</em><span>Mission Lab</span></a>`
    : `<div class="wordmark">replay labs<em>.</em><span>Mission Lab</span></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(module.name)} — Replay Labs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0c0e11; --panel: #14171c; --panel2: #191d23;
    --line: #242a32; --line2: #303845;
    --ink: #e9e7e2; --muted: #98a1ac; --faint: #67707c;
    --accent: #34d399; --accent-dim: #34d39922; --accent-ink: #052e1e;
    --fail: #f87171; --fail-dim: #f8717118; --warn: #fbbf24;
    --code-bg: #0f1216;
    --sans: "Inter", ui-sans-serif, system-ui, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans);
    font-size: 15.5px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--accent); color: var(--accent-ink); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  button { font: inherit; cursor: pointer; }

  header.top {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 28px;
    padding: 14px 28px; background: #0c0e11e6; backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .wordmark { font-family: var(--mono); font-weight: 700; font-size: 15px; letter-spacing: .04em; }
  .wordmark em { color: var(--accent); font-style: normal; }
  .wordmark span { color: var(--faint); font-weight: 400; margin-left: 10px; font-size: 12px;
    letter-spacing: .12em; text-transform: uppercase; }
  .stepper { display: flex; align-items: center; gap: 0; margin-left: auto; }
  .step { display: flex; align-items: center; gap: 8px; background: none; border: 0; color: var(--faint);
    padding: 4px 8px; font-size: 12.5px; font-weight: 600; letter-spacing: .02em; }
  .step .pip { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
    border: 1.5px solid var(--line2); font-family: var(--mono); font-size: 11px; color: var(--muted);
    transition: all .2s ease; }
  .step.active { color: var(--ink); }
  .step.active .pip { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 0 4px var(--accent-dim); }
  .step.done { color: var(--muted); }
  .step.done .pip { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 700; }
  .step-link { width: 22px; height: 1px; background: var(--line2); }
  .ghost { background: none; border: 1px solid var(--line); color: var(--muted); border-radius: 8px;
    padding: 7px 12px; font-size: 12.5px; font-weight: 600; }
  .ghost:hover { border-color: var(--line2); color: var(--ink); }

  main { max-width: 880px; margin: 0 auto; padding: 44px 24px 90px; }
  .hero { margin-bottom: 34px; }
  .eyebrow { font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: .16em;
    text-transform: uppercase; color: var(--faint); margin-bottom: 14px; }
  .eyebrow b { color: var(--accent); font-weight: 700; }
  h1 { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 10px; line-height: 1.1; }
  .tagline { color: var(--muted); font-size: 17px; margin: 0 0 20px; max-width: 640px; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .chip { display: inline-flex; align-items: baseline; gap: 8px; border: 1px solid var(--line);
    background: var(--panel); border-radius: 999px; padding: 7px 14px; font-size: 13px; }
  .chip i { font-style: normal; font-family: var(--mono); font-size: 10px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--faint); }
  .chip b { font-weight: 600; }
  .chip.smell b { color: var(--fail); }
  .chip.pattern b { color: var(--accent); }
  .goal-line { color: var(--faint); font-size: 13.5px; }
  .goal-line a { font-weight: 600; }

  .stage-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
    padding: 30px 32px; animation: fadeUp .35s ease both; }
  .beat { background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
    padding: 26px 30px; margin-bottom: 16px; animation: fadeUp .4s ease both; }
  .beat.done { border-color: #34d39930; }
  .beat-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent); margin-bottom: 8px; font-weight: 700; }
  .beat.done .beat-eyebrow { color: var(--muted); }
  .bprompt { font-size: 17px; font-weight: 600; margin: 0 0 14px; line-height: 1.4; }
  .crashbox { background: var(--code-bg); border: 1px solid #f8717133; border-radius: 12px;
    padding: 14px 16px; margin: 0 0 14px; font-family: var(--mono); font-size: 12.5px;
    line-height: 1.6; color: #aeb7c2; overflow-x: auto; }
  .crashbox .t-line { white-space: pre; }
  .crashbox .err { color: var(--fail); font-weight: 700; }
  .thread-intro { font-size: 15px; font-weight: 600; margin: 18px 0 10px; }
  .rc { display: flex; gap: 12px; align-items: flex-start; width: 100%; text-align: left;
    background: var(--panel2); border: 1px solid var(--line); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 10px; color: var(--ink); cursor: pointer;
    transition: border-color .15s, transform .15s; }
  .rc:hover { border-color: var(--line2); transform: translateY(-1px); }
  .rc .avatar { flex: 0 0 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
    background: var(--bg); border: 1px solid var(--line2); font-family: var(--mono); font-size: 11px;
    font-weight: 700; color: var(--muted); }
  .rc .handle { font-family: var(--mono); font-size: 12px; color: var(--faint); margin-bottom: 4px; }
  .rc p { margin: 0; font-size: 14px; line-height: 1.55; }
  .rc .approve { margin-left: auto; align-self: center; font-family: var(--mono); font-size: 11px;
    color: var(--faint); white-space: nowrap; opacity: 0; transition: opacity .15s; }
  .rc:hover .approve { opacity: 1; color: var(--accent); }
  .rc.is-right { border-color: var(--accent); background: var(--accent-dim); cursor: default; }
  .rc.is-right .avatar { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .rc.is-wrong { border-color: var(--fail); background: var(--fail-dim); animation: shake .3s ease; }
  .rc.is-faded { opacity: .45; cursor: default; }
  .verdict-note { border-left: 3px solid var(--line2); padding: 4px 0 4px 14px; margin: 4px 0 14px;
    font-size: 13.5px; color: var(--muted); line-height: 1.55; }
  .verdict-note.good { border-color: var(--accent); }
  .verdict-note.bad { border-color: var(--fail); }
  .btn-lint { background: none; border: 1px solid var(--line2); color: var(--muted); border-radius: 10px;
    padding: 12px 18px; font-family: var(--mono); font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: border-color .15s, color .15s; }
  .btn-lint:hover { color: var(--ink); border-color: var(--warn); }
  .term.lint { border-color: #fbbf2433; }
  .dot-cov { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--line2);
    margin-left: 8px; vertical-align: 1px; transition: background .25s; }
  .dot-cov.on { background: var(--accent); }
  .mode-row { display: flex; gap: 8px; margin: 0 0 14px; }
  .mode-btn { background: none; border: 1px solid var(--line); color: var(--faint); border-radius: 8px;
    padding: 7px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .mode-btn.on { border-color: var(--accent); color: var(--ink); background: var(--accent-dim); }
  .bin-label { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--faint); margin: 14px 0 8px; }
  .blk { display: block; width: 100%; text-align: left; font-family: var(--mono); font-size: 12.5px;
    line-height: 1.55; background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
    padding: 10px 14px; margin-bottom: 8px; color: #d6dde6; cursor: pointer; white-space: pre-wrap;
    transition: border-color .15s, transform .15s; }
  .blk:hover { border-color: var(--accent); transform: translateY(-1px); }
  .asm-line { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start;
    font-family: var(--mono); font-size: 12.5px; line-height: 1.55; white-space: pre-wrap;
    border-bottom: 1px dashed var(--line); padding: 8px 4px; cursor: pointer; color: #d6dde6; }
  .asm-line:hover { background: #f8717111; }
  .asm-line .rm { color: var(--faint); font-size: 11px; flex: 0 0 auto; }
  .asm-line:hover .rm { color: var(--fail); }
  .asm-empty { color: var(--faint); font-size: 13.5px; padding: 18px 14px; }
  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
  .pchip { font-size: 12px; border: 1px solid var(--line); background: var(--panel); border-radius: 999px;
    padding: 4px 11px; color: var(--muted); cursor: pointer; transition: border-color .15s, color .15s; }
  .pchip:hover { border-color: var(--accent); color: var(--ink); }
  .stage-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent); margin-bottom: 10px; font-weight: 700; }
  .stage-card h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 6px; line-height: 1.25; }
  .stage-copy { color: var(--muted); margin: 0 0 22px; max-width: 620px; }
  .mission-strip { display: flex; align-items: center; justify-content: space-between; gap: 14px;
    border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 14px 16px;
    margin: 0 0 16px; }
  .mission-strip b { display: block; font-size: 14px; margin-bottom: 2px; }
  .mission-strip span { color: var(--muted); font-size: 13px; }
  .mission-toggle { flex: 0 0 auto; border: 1px solid var(--line2); background: transparent; color: var(--muted);
    border-radius: 999px; padding: 8px 12px; font-family: var(--mono); font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase; font-weight: 700; }
  .mission-toggle.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .mission-brief { border: 1px solid #34d39933; border-radius: 14px; background: #34d3990d;
    margin: 0 0 16px; padding: 18px; }
  .mission-brief .eyebrow { margin-bottom: 8px; }
  .mission-brief h2 { font-size: 22px; line-height: 1.2; margin: 0 0 8px; letter-spacing: -0.01em; }
  .mission-brief p { color: #cdd4dc; margin: 0 0 14px; max-width: 720px; }
  .mission-brief ul { margin: 0; padding-left: 18px; color: var(--muted); }
  .mission-brief li { margin: 4px 0; }
  .mission-starter { border: 1px solid #34d39933; background: #34d3990d; border-radius: 12px;
    padding: 14px; margin: 0 0 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .mission-starter b { display: block; margin-bottom: 4px; }
  .mission-starter p { margin: 0; color: var(--muted); font-size: 14px; }
  .mission-starter .btn-lint { white-space: nowrap; }

  details.evidence { border: 1px solid var(--line); border-radius: 12px; background: var(--panel2);
    margin: 0 0 22px; overflow: hidden; }
  details.evidence summary { cursor: pointer; list-style: none; padding: 13px 16px; display: flex;
    align-items: center; gap: 10px; font-weight: 600; font-size: 13.5px; color: var(--muted); }
  details.evidence summary::before { content: "▸"; color: var(--accent); transition: transform .15s; }
  details.evidence[open] summary::before { transform: rotate(90deg); }
  details.evidence summary:hover { color: var(--ink); }
  .evidence-body { padding: 0 16px 16px; }
  .lens { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .lens b { width: 100%; font-size: 12.5px; color: var(--muted); font-weight: 600; }
  .lens span { border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px;
    font-size: 12.5px; color: var(--muted); background: var(--panel); }

  .code-win { border: 1px solid var(--line); border-radius: 12px; background: var(--code-bg);
    overflow: hidden; margin: 0 0 18px; }
  .code-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    border-bottom: 1px solid var(--line); }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--line2); }
  .dot.r { background: #f8717155; } .dot.y { background: #fbbf2455; } .dot.g { background: #34d39955; }
  .code-bar .fname { margin-left: 8px; font-family: var(--mono); font-size: 12px; color: var(--faint); }
  .code-bar .flag { margin-left: auto; font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--fail); border: 1px solid var(--fail-dim);
    background: var(--fail-dim); border-radius: 5px; padding: 2px 8px; }
  .code-tools { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .code-tools .flag { margin-left: 6px; }
  .view-toggle { border: 1px solid var(--line); background: transparent; color: var(--faint);
    border-radius: 7px; padding: 4px 8px; font-family: var(--mono); font-size: 10.5px;
    letter-spacing: .06em; text-transform: uppercase; }
  .view-toggle.on { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); font-weight: 700; }
  .code-body { display: flex; }
  .gutter { padding: 14px 0 14px 16px; text-align: right; user-select: none; color: #3d4654;
    font-family: var(--mono); font-size: 13px; line-height: 1.62; white-space: pre; }
  pre.code { margin: 0; padding: 14px 18px; flex: 1; overflow: auto; font-family: var(--mono);
    font-size: 13px; line-height: 1.62; color: #d6dde6; max-height: 440px; }
  .k { color: #b794f6; } .s { color: #7ee0a3; } .m { color: #5b6472; font-style: italic; }
  code.inl { font-family: var(--mono); font-size: .88em; background: #ffffff0d;
    border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; color: #cdb9f9; }
  .cl { display: block; cursor: pointer; border-radius: 4px; padding: 0 6px; margin: 0 -6px; }
  .cl:hover { background: #ffffff0a; }
  .cl-hit { background: #34d39922; outline: 1px solid #34d39966; }
  .cl-miss { background: #f8717122; outline: 1px solid #f8717144; }
  .code-win.done .cl { cursor: default; }
  .code-win.done .cl:hover { background: transparent; }
  .code-win.done .cl-hit:hover { background: #34d39922; }
  .f-label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin: 14px 0 6px; }
  textarea.f-small { min-height: 56px; }
  pre.diff { margin: 0; padding: 14px 16px; border-radius: 10px; background: var(--code-bg);
    border: 1px solid var(--line); overflow: auto; font-family: var(--mono); font-size: 12.5px;
    line-height: 1.6; color: #aeb7c2; max-height: 360px; }
  .d-add { color: #7ee0a3; } .d-del { color: #f88; } .d-hunk { color: #6f9ff0; }
  .d-meta { color: var(--faint); }
  .d-prefix { display: inline-block; min-width: 18px; color: var(--faint); user-select: none; }
  .d-code { white-space: pre-wrap; }
  .diff-readable .d-prefix { display: none; }
  .diff-readable .d-meta, .diff-readable .d-hunk { display: none; }
  .diff-readable .cl, pre.diff.diff-readable .d-add, pre.diff.diff-readable .d-del, pre.diff.diff-readable .d-line {
    display: block;
    border-left: 2px solid transparent; padding: 1px 0 1px 14px; margin: 1px 0;
    background: transparent; border-radius: 0;
  }
  .diff-readable .d-add { border-left-color: var(--accent); }
  .diff-readable .d-del { border-left-color: var(--fail); opacity: .62; }
  .diff-readable .d-meta, .diff-readable .d-hunk { display: none; }
  .diff-readable .d-code { min-width: 0; }
  .d-mark { background: #fbbf2426; color: #fbd34d; border-radius: 3px; padding: 0 2px; }

  .choices { display: grid; gap: 10px; margin: 18px 0; }
  .choice { display: flex; gap: 14px; align-items: flex-start; text-align: left; width: 100%;
    background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 15px 16px;
    color: var(--ink); transition: border-color .15s, transform .15s; }
  .choice:hover { border-color: var(--line2); transform: translateY(-1px); }
  .choice .key { flex: 0 0 26px; height: 26px; border-radius: 7px; display: grid; place-items: center;
    background: var(--bg); border: 1px solid var(--line2); font-family: var(--mono); font-size: 12px;
    color: var(--muted); font-weight: 700; }
  .choice b { display: block; font-size: 14.5px; font-weight: 600; margin-bottom: 3px; }
  .choice p { margin: 0; font-size: 13.5px; color: var(--muted); line-height: 1.5; }
  .choice.is-right { border-color: var(--accent); background: var(--accent-dim); }
  .choice.is-right .key { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .choice.is-right p { color: var(--ink); }
  .choice.is-wrong { border-color: var(--fail); background: var(--fail-dim); animation: shake .3s ease; }
  .choice.is-wrong .key { border-color: var(--fail); color: var(--fail); }
  .choice.is-faded { opacity: .45; }

  .pass-line { display: flex; gap: 10px; align-items: baseline; border-top: 1px dashed var(--line);
    padding-top: 14px; margin-top: 4px; font-size: 13px; color: var(--faint); }
  .pass-line b { color: var(--muted); font-weight: 600; white-space: nowrap; }

  .term { background: var(--code-bg); border: 1px solid var(--line); border-radius: 12px;
    padding: 14px 16px; margin-top: 16px; font-family: var(--mono); font-size: 12.5px; line-height: 1.7; }
  .t-line { animation: fadeUp .3s ease both; }
  .t-cmd { color: var(--muted); } .t-cmd::before { content: "$ "; color: var(--accent); }
  .t-pass { color: var(--accent); } .t-fail { color: var(--fail); } .t-meta { color: var(--faint); }
  .t-sum { color: #c6cdd6; margin-top: 6px; white-space: pre-wrap; }
  .t-mis { color: var(--warn); margin-top: 6px; white-space: pre-wrap; }
  .stamp { display: inline-block; margin-top: 10px; font-weight: 700; letter-spacing: .1em;
    border-radius: 7px; padding: 3px 12px; animation: stampIn .35s cubic-bezier(.2,1.6,.4,1) both; }
  .stamp.pass { color: var(--accent-ink); background: var(--accent); }
  .stamp.fail { color: #2e0c0c; background: var(--fail); }
  .spin::after { content: ""; display: inline-block; width: 10px; height: 10px; margin-left: 8px;
    border: 2px solid var(--faint); border-top-color: var(--accent); border-radius: 50%;
    animation: rot .7s linear infinite; vertical-align: -1px; }

  .sim-block { border-top: 1px dashed var(--line); margin-top: 22px; padding-top: 18px; animation: fadeUp .35s ease both; }
  .sim-label { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--fail); font-weight: 700; margin-bottom: 12px; }
  pre.crash { margin: 0 0 18px; padding: 14px 16px; border-radius: 12px; border: 1px solid #f8717133;
    background: var(--code-bg); font-family: var(--mono); font-size: 12.5px; line-height: 1.6;
    color: #aeb7c2; overflow: auto; }
  .crash .err { color: var(--fail); font-weight: 700; }

  textarea.editor { display: block; width: 100%; border: 0; outline: none; resize: vertical;
    background: var(--code-bg); color: #d6dde6; font-family: var(--mono); font-size: 13px;
    line-height: 1.62; padding: 14px 18px; min-height: 280px; tab-size: 2; }
  textarea.plan { width: 100%; background: var(--panel2); color: var(--ink); border: 1px solid var(--line);
    border-radius: 12px; padding: 14px 16px; font: 14.5px/1.6 var(--sans); min-height: 150px; resize: vertical; }
  textarea.plan:focus, .code-win:focus-within { border-color: var(--line2); outline: none; }
  textarea.plan::placeholder { color: var(--faint); }
  textarea.plan.f-small { min-height: 56px; }

  .cta-row { display: flex; align-items: center; gap: 14px; margin-top: 24px; }
  .cta { background: var(--accent); color: var(--accent-ink); font-weight: 700; border: 0;
    border-radius: 10px; padding: 12px 20px; font-size: 14.5px; transition: transform .12s, filter .12s; }
  .cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .cta:disabled { background: var(--panel2); color: var(--faint); cursor: not-allowed; transform: none; filter: none; }
  .cta.run { font-family: var(--mono); font-weight: 600; font-size: 13.5px; }
  .cta-note { font-size: 13px; color: var(--faint); }
  .backlink { background: none; border: 0; color: var(--faint); font-size: 13.5px; font-weight: 600; padding: 0; }
  .backlink:hover { color: var(--muted); }

  .unlock { border: 1px solid var(--accent); border-radius: 12px; background: var(--accent-dim);
    margin-top: 22px; padding: 18px; animation: fadeUp .4s ease both; }
  .unlock h4 { margin: 0 0 12px; font-size: 12px; font-family: var(--mono); letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent); }
  .unlock-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
  .ucard { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 13px 15px; }
  .ucard b { display: block; font-size: 13px; margin-bottom: 4px; }
  .ucard p { margin: 0; font-size: 13.5px; color: var(--muted); line-height: 1.5; }

  .mastery { margin-top: 40px; border: 1px solid var(--accent); border-radius: 18px; padding: 34px;
    background: radial-gradient(120% 140% at 50% 0%, #34d39914 0%, var(--panel) 55%);
    animation: fadeUp .45s ease both; }
  .mastery .eyebrow b { color: var(--accent); }
  .mastery h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.01em; margin: 4px 0 6px; }
  .mastery .sub { color: var(--muted); margin: 0 0 22px; }
  .m-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .m-card { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
  .m-card i { font-style: normal; display: block; font-family: var(--mono); font-size: 10.5px;
    letter-spacing: .14em; text-transform: uppercase; color: var(--faint); margin-bottom: 7px; }
  .m-card p { margin: 0; font-size: 14px; line-height: 1.55; color: #cdd4dc; }
  .next-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 22px; }
  .next-card { border: 1px dashed var(--line2); border-radius: 12px; padding: 14px 16px; }
  .next-card b { display: block; font-size: 13.5px; margin-bottom: 3px; color: var(--muted); }
  .next-card span { font-size: 12px; color: var(--faint); }
  .next-card .lock { float: right; font-family: var(--mono); font-size: 10px; letter-spacing: .12em;
    color: var(--faint); border: 1px solid var(--line); border-radius: 4px; padding: 1px 7px; }

  footer { max-width: 880px; margin: 0 auto; padding: 0 24px 50px; color: var(--faint); font-size: 12.5px; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  @keyframes stampIn { from { opacity: 0; transform: scale(.6) rotate(-4deg); } to { opacity: 1; transform: none; } }
  @keyframes rot { to { transform: rotate(360deg); } }
  @media (max-width: 760px) {
    header.top { flex-wrap: wrap; gap: 12px; padding: 12px 16px; }
    .stepper { margin-left: 0; order: 3; width: 100%; justify-content: space-between; }
    .step-link { display: none; }
    .step span.lbl { display: none; }
    main { padding: 28px 16px 70px; }
    .stage-card { padding: 22px 18px; border-radius: 14px; }
    h1 { font-size: 30px; }
    .mission-strip { display: block; }
    .mission-toggle { margin-top: 10px; }
  }
</style>
</head>
<body>
<header class="top">
  ${wordmark}
  <div class="stepper" id="stepper"></div>
  <button class="ghost" id="reset" type="button">Reset</button>
</header>
<main>
  <section class="hero">
    <div class="eyebrow"><b>Practice lab</b> · based on this session evidence · diagnose, break, repair, transfer${module.minutes ? ` · ≈ ${module.minutes} min` : ""}</div>
    <h1>${escapeHtml(module.name)}</h1>
    <p class="tagline">${escapeHtml(module.takeaway)}</p>
    <div class="chips">
      <span class="chip pattern"><i>Pattern</i><b>${escapeHtml(module.challenge.pattern)}</b></span>
      <span class="chip smell"><i>Smell</i><b>${escapeHtml(module.challenge.smell)}</b></span>
      <span class="chip"><i>Check</i><b>${escapeHtml(module.challenge.proof)}</b></span>
    </div>
    <p class="goal-line">Session goal: ${escapeHtml(goal)}${module.patternHref ? ` · <a href="${escapeHtml(module.patternHref)}">catalog entry →</a>` : ""}</p>
  </section>
  <section id="stage-root"></section>
  <section id="mastery-root"></section>
</main>
<footer>This lab focuses on one decision from the session so the exercise stays specific.</footer>
<script>
const BOOT = ${payload};
${CLIENT_JS}
</script>
</body>
</html>`;
}

// Client runtime. Written without template literals so it can live inside the
// server-side template safely (no backtick or dollar-brace escaping).
const CLIENT_JS = String.raw`
var MODULE = BOOT.module, EVIDENCE_HTML = BOOT.evidenceHtml, EVIDENCE_RAW = BOOT.evidenceRaw || "", KEY = BOOT.storageKey;
var state = JSON.parse(localStorage.getItem(KEY) || "{}");
state.complete = state.complete || {}; state.answers = state.answers || {};
state.choices = state.choices || {}; state.reviews = state.reviews || {};
if (state.spotPick === undefined) state.spotPick = null;
if (state.spotFound === undefined) state.spotFound = [];
if (state.spotHit === undefined) state.spotHit = false;
if (state.inv === undefined) state.inv = null;
if (state.lints === undefined) state.lints = {};
if (state.diffViews === undefined) state.diffViews = {};
if (state.asm === undefined) state.asm = [];
if (state.solShown === undefined) state.solShown = false;
if (state.missionMode === undefined) state.missionMode = false;
if (state.repairMode === undefined) state.repairMode = MODULE.repairLab && MODULE.repairLab.blocks ? "asm" : "type";
if (state.arbPick === undefined) state.arbPick = null;
if (state.arbHit === undefined) state.arbHit = false;
state.reviewing = null; state.flash = null;

var STAGE_META = [
  { id: "diagnose", label: "Diagnose" },
  { id: "break", label: "Break" },
  { id: "repair", label: "Repair" },
  { id: "transfer", label: "Transfer" }
];

function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function diffToggles(id, extra) {
  var on = state.diffViews[id] === "patch";
  return '<span class="code-tools">' +
    '<button type="button" class="view-toggle' + (on ? " on" : "") + '" aria-pressed="' + (on ? "true" : "false") + '" data-diff-toggle="' + id + '">Patch</button>' +
    (extra || "") +
    "</span>";
}
function diffView(id, html) {
  var readable = state.diffViews[id] === "patch" ? "" : " diff-readable";
  return '<div class="code-win"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="fname">session excerpt</span>' + diffToggles(id) +
    '</div><pre class="diff' + readable + '" data-diff-box="' + id + '">' + html + "</pre></div>";
}
function diffLineHtml(line) {
  if (line.indexOf("diff --git") === 0 || line.indexOf("index ") === 0 || line.indexOf("---") === 0 || line.indexOf("+++") === 0) {
    return '<span class="d-prefix"></span><span class="d-code">' + esc(line) + "</span>";
  }
  if (line.charAt(0) === "+" || line.charAt(0) === "-") {
    return '<span class="d-prefix">' + esc(line.slice(0, 1)) + '</span><span class="d-code">' + (esc(line.slice(1)) || "&nbsp;") + "</span>";
  }
  return '<span class="d-prefix"></span><span class="d-code">' + (esc(line) || "&nbsp;") + "</span>";
}
var BT = String.fromCharCode(96);
var BT_RE = new RegExp(BT + "([^" + BT + "]+)" + BT, "g");
function fmt(v) { return esc(v).replace(BT_RE, '<code class="inl">$1</code>'); }
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

function hl(code) {
  var toks = [];
  var s = esc(code).replace(/(\/\/[^\n]*)|('[^'\n]*')|("[^"\n]*")/g, function (m) {
    toks.push(m); return " " + (toks.length - 1) + " ";
  });
  s = s.replace(/\b(export|default|function|return|const|let|var|new|import|from|type|async|await|if|else|try|catch)\b/g, '<span class="k">$1</span>');
  s = s.replace(/ (\d+) /g, function (_, i) {
    var t = toks[Number(i)];
    var cls = t.charAt(0) === "/" ? "m" : "s";
    return '<span class="' + cls + '">' + t + "</span>";
  });
  return s;
}
function gutterFor(code) { return code.split("\n").map(function (_, i) { return i + 1; }).join("\n"); }

// ---- beats ----
function missionEnabled() {
  return state.missionMode && Boolean(missionDef());
}
function missionDef() {
  return MODULE.mission && MODULE.mission.title && MODULE.mission.brief ? MODULE.mission : null;
}
function missionMeta(id, fallbackTitle, fallbackCopy) {
  if (!missionEnabled()) return { title: fallbackTitle, copy: fallbackCopy };
  var mission = missionDef();
  var beat = mission && mission.beats && mission.beats[id];
  return beat || { title: fallbackTitle, copy: fallbackCopy };
}
function buildBeats() {
  var beats = [];
  var meta;
  if (MODULE.spot) { meta = missionMeta("spot", "Diagnose the decision", "Start with the evidence. Find the lines that show the decision before reading the explanation."); beats.push({ id: "spot", type: "spot", stage: "diagnose", title: meta.title, copy: meta.copy }); }
  else { meta = missionMeta("diagnose", "Diagnose the decision", "Decide what kind of engineering judgment the AI exercised."); beats.push({ id: "diagnose", type: "mc", stage: "diagnose", title: meta.title, copy: meta.copy }); }
  if (MODULE.investigate) { meta = missionMeta("inv", "Predict what breaks", "Here is the same work with the decision removed. Find where the missing safeguard fails."); beats.push({ id: "inv", type: "inv", stage: "break", title: meta.title, copy: meta.copy }); }
  else { meta = missionMeta("break", "Predict what breaks", "Choose the breakage that explains why the decision matters."); beats.push({ id: "break", type: "mc", stage: "break", title: meta.title, copy: meta.copy }); }
  if (MODULE.failureSim) { meta = missionMeta("crash", "Watch it break", ""); beats.push({ id: "crash", type: "crash", stage: "break", title: meta.title, copy: meta.copy }); }
  if (MODULE.repairLab) { meta = missionMeta("repair", "Repair the design", "Edit the repair, then run the rubric check against your submission."); beats.push({ id: "repair", type: "editor", stage: "repair", title: meta.title, copy: meta.copy }); }
  else { meta = missionMeta("repair", "Repair the design", "Choose the standard you would require before trusting the change."); beats.push({ id: "repair", type: "mc", stage: "repair", title: meta.title, copy: meta.copy }); }
  if (MODULE.transferLab) { meta = missionMeta("transfer", "Transfer to a new situation", "Apply the same judgment to a new situation."); beats.push({ id: "transfer", type: "fields", stage: "transfer", title: meta.title, copy: meta.copy }); }
  else { meta = missionMeta("transfer", "Transfer to a new situation", "Reuse the judgment in a new context."); beats.push({ id: "transfer", type: "mc", stage: "transfer", title: meta.title, copy: meta.copy }); }
  return beats;
}
var BEATS = buildBeats();

function beatDone(b) {
  if (b.type === "spot") return spotComplete();
  if (b.type === "inv") return state.inv === MODULE.investigate.targetLine;
  if (b.type === "crash") {
    if (MODULE.failureSim.arbitrate) return state.arbHit;
    return state.inv === MODULE.investigate.targetLine;
  }
  if (b.type === "editor") return Boolean(state.complete.repair);
  if (b.type === "fields") return Boolean(state.complete.transfer);
  return isRight(b.id);
}
function stageDone(stageId) {
  return BEATS.filter(function (b) { return b.stage === stageId; }).every(beatDone);
}
function isRight(stageId) {
  var m = stageMod(stageId);
  return m && state.choices[stageId] != null && Boolean(m.choices[state.choices[stageId]].correct);
}
function stageMod(stageId) {
  return MODULE[stageId === "diagnose" ? "diagnose" : stageId === "break" ? "break" : stageId === "repair" ? "repair" : "transfer"];
}

// ---- shared pieces ----
function passLine(stageId) {
  return '<div class="pass-line"><b>Pass condition</b><span>' + esc(MODULE.criteria[stageId]) + "</span></div>";
}
function unlock2(open, title, inner) {
  if (!open) return "";
  return '<div class="unlock"><h4>' + esc(title) + '</h4><div class="unlock-grid">' + inner + "</div></div>";
}
function ucard(label, text, html) {
  return '<div class="ucard"><b>' + esc(label) + "</b><p>" + (html || fmt(text)) + "</p></div>";
}
function missionTone(text) {
  if (!missionEnabled()) return text;
  var out = String(text || "");
  var replacements = (missionDef() && missionDef().replacements) || [];
  replacements.forEach(function (pair) {
    if (!pair || !pair.from) return;
    out = out.split(pair.from).join(pair.to || "");
  });
  return out;
}
function evidenceDrawer(stageId, open) {
  var lens = MODULE.lenses[stageId] || MODULE.lenses.diagnose;
  var pills = lens.items.map(function (i) { return "<span>" + esc(i) + "</span>"; }).join("");
  return '<details class="evidence"' + (open ? " open" : "") + '><summary>Session Evidence — the original diff</summary>' +
    '<div class="evidence-body"><div class="lens"><b>' + esc(lens.title) + "</b>" + pills + "</div>" +
    diffView("drawer", EVIDENCE_HTML) + "</div></details>";
}
function choicesHtml(stageId) {
  var m = stageMod(stageId);
  var picked = state.choices[stageId];
  return '<div class="choices">' + m.choices.map(function (c, i) {
    var cls = "choice";
    if (picked === i) cls += c.correct ? " is-right" : " is-wrong";
    else if (picked != null && m.choices[picked] && m.choices[picked].correct) cls += " is-faded";
    var body = picked === i ? c.feedback : c.description;
    return '<button type="button" class="' + cls + '" data-pick="' + stageId + ':' + i + '">' +
      '<span class="key">' + (picked === i ? (c.correct ? "✓" : "✗") : String.fromCharCode(65 + i)) + "</span>" +
      "<span><b>" + fmt(c.label) + "</b><p>" + fmt(body) + "</p></span></button>";
  }).join("") + "</div>";
}
function checkTerm(stageId) {
  if (!(stageId in state.choices)) return "";
  var c = stageMod(stageId).choices[state.choices[stageId]];
  var status = c.correct ? '<span class="t-pass">status: PASS</span>' : '<span class="t-fail">status: FAIL</span>';
  return '<div class="term"><div class="t-line t-cmd">replay check ' + esc(stageId) + "</div>" +
    '<div class="t-line">' + status + '</div><div class="t-line t-meta">reason: ' + fmt(c.feedback) + "</div></div>";
}

// ---- spot beat (multi-line blast radius) ----
// Targets are the lines that together carry the decision. Only targets that
// actually appear in this session's evidence are required, so it degrades to
// single-line on any diff. Backward compatible with the old targetRe.
function spotTargets() {
  var defs = MODULE.spot.targets || [{ re: MODULE.spot.targetRe, note: MODULE.spot.hit }];
  var raw = EVIDENCE_RAW.split("\n");
  return defs.filter(function (t) {
    return raw.some(function (l) { return new RegExp(t.re, "i").test(l); });
  });
}
function targetIndexFor(line) {
  var defs = spotTargets();
  for (var i = 0; i < defs.length; i++) {
    if (new RegExp(defs[i].re, "i").test(line)) return i;
  }
  return -1;
}
function spotComplete() {
  var req = spotTargets().length;
  // Safety net: if no target line could be located in this evidence (e.g. a
  // generated lab whose target did not match the session diff), the beat must still
  // be completable — one click anywhere reveals the decision and continues.
  if (req === 0) return Boolean(state.spotHit);
  return state.spotFound.length >= req;
}
function diffWindow() {
  var lines = EVIDENCE_RAW.split("\n");
  var done = spotComplete();
  var inner = lines.map(function (l, i) {
    var cls = "cl";
    if (l.indexOf("diff --git") === 0 || l.indexOf("index ") === 0 || l.indexOf("---") === 0 || l.indexOf("+++") === 0) cls += " d-meta";
    else if (l.charAt(0) === "+") cls += " d-add"; else if (l.charAt(0) === "-") cls += " d-del";
    else if (l.indexOf("@@") === 0) cls += " d-hunk";
    var ti = targetIndexFor(l);
    if (ti >= 0 && state.spotFound.indexOf(ti) !== -1) cls += " cl-hit";
    else if (state.spotPick === i && ti < 0) cls += " cl-miss";
    return '<span class="' + cls + '" data-dline="' + i + '">' + diffLineHtml(l) + "</span>";
  }).join("");
  var req = spotTargets().length;
  var flag = done ? "" : (req > 1
    ? '<span class="flag" style="color:var(--warn);border-color:#fbbf2433;background:#fbbf2415">found ' + state.spotFound.length + " of " + req + "</span>"
    : '<span class="flag" style="color:var(--warn);border-color:#fbbf2433;background:#fbbf2415">click a line</span>');
  return '<div class="code-win' + (done ? " done" : "") + '"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="fname">session excerpt</span>' + diffToggles("spot", flag) +
    '</div><div class="code-body"><pre class="code' + (state.diffViews.spot === "patch" ? "" : " diff-readable") + '" data-diff-box="spot" style="width:100%">' + inner + "</pre></div></div>";
}
function spotPrompt() {
  var base = MODULE.spot.prompt;
  var req = spotTargets().length;
  if (req === 0) return base.replace(/Click the line.*$/i, "") + "Read the evidence, then click any line to surface the decision.";
  return req > 1
    ? base.replace(/Click the line.*$/i, "") + "Click each line that supports this decision or depends on it."
    : base;
}
function spotFeedback() {
  var lines = [];
  // the most recent found target's note (progress), or the all-found reveal
  if (spotComplete()) {
    lines.push('<div class="t-line t-pass">status: PASS</div>');
    lines.push('<div class="t-line t-meta">reason: ' + fmt(MODULE.spot.hit) + "</div>");
  } else if (state.spotFound.length > 0) {
    var lastTi = state.spotFound[state.spotFound.length - 1];
    var def = spotTargets()[lastTi];
    var req = spotTargets().length;
    lines.push('<div class="t-line t-pass">✓ ' + fmt(def.note) + "</div>");
    var rem = req - state.spotFound.length;
    lines.push('<div class="t-line t-meta">' + rem + " more line" + (rem === 1 ? " carries" : "s carry") + " this decision — keep tracing.</div>");
  } else if (state.spotPick != null) {
    var line = EVIDENCE_RAW.split("\n")[state.spotPick] || "";
    lines.push('<div class="t-line t-fail">status: keep looking</div>');
    lines.push('<div class="t-line t-meta">reason: ' + fmt(missNote(line)) + "</div>");
  }
  if (!lines.length) return "";
  return '<div class="term"><div class="t-line t-cmd">replay check diagnose</div>' + lines.join("") + "</div>";
}
function missNote(line) {
  var rules = MODULE.spot.misses || [];
  for (var i = 0; i < rules.length; i++) {
    if (new RegExp(rules[i].re, "i").test(line)) return rules[i].note;
  }
  return MODULE.spot.missDefault;
}

// ---- inv beat ----
function clickableCode(code) {
  var done = state.inv === MODULE.investigate.targetLine;
  var lines = code.split("\n").map(function (l, i) {
    var n = i + 1;
    var cls = "cl";
    if (state.inv === n) cls += (n === MODULE.investigate.targetLine ? " cl-hit" : " cl-miss");
    return '<span class="' + cls + '" data-line="' + n + '">' + (hl(l) || "&nbsp;") + "</span>";
  }).join("");
  return '<div class="code-win' + (done ? " done" : "") + '"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="fname">' + esc(MODULE.naiveFile || "") + " — naive version</span>" +
    (done ? "" : '<span class="flag" style="color:var(--warn);border-color:#fbbf2433;background:#fbbf2415">click a line</span>') +
    '</div><div class="code-body"><div class="gutter">' + gutterFor(code) + '</div><pre class="code">' + lines + "</pre></div></div>";
}
function invFeedback() {
  var inv = MODULE.investigate;
  if (state.inv == null) return "";
  var hitIt = state.inv === inv.targetLine;
  var text = hitIt ? inv.hit : ((inv.misses && inv.misses[String(state.inv)]) || inv.missDefault);
  return '<div class="term"><div class="t-line t-cmd">replay check break</div>' +
    '<div class="t-line ' + (hitIt ? "t-pass" : "t-fail") + '">status: ' + (hitIt ? "PASS" : "FAIL") + "</div>" +
    '<div class="t-line t-meta">reason: ' + fmt(text) + "</div></div>";
}

// ---- crash beat ----
function crashBox() {
  var fresh = state.flash === "crash";
  var lines = MODULE.failureSim.terminal.split("\n");
  var inner = lines.map(function (l, i) {
    var style = fresh ? ' style="animation-delay:' + (i * 170) + 'ms"' : "";
    var html = esc(l).replace(/(ReferenceError[^<]*|usage alert[^<]*)/g, '<span class="err">$1</span>');
    return '<div class="t-line"' + style + ">" + (html || "&nbsp;") + "</div>";
  }).join("");
  return '<div class="crashbox">' + inner + "</div>";
}

function arbThread() {
  var arb = MODULE.failureSim.arbitrate;
  if (!arb) {
    return '<div class="term"><div class="t-line t-sum">' + fmt(MODULE.failureSim.narration || "") + "</div></div>";
  }
  var fresh = state.flash === "crash";
  var introDelay = fresh ? ' style="animation-delay:' + (MODULE.failureSim.terminal.split("\n").length * 170 + 500) + 'ms"' : "";
  var html = '<div class="thread-intro t-line"' + introDelay + ">" + esc(arb.intro) + "</div>";
  arb.comments.forEach(function (c, i) {
    var cls = "rc";
    if (state.arbPick === i) cls += c.correct ? " is-right" : " is-wrong";
    else if (state.arbHit) cls += " is-faded";
    var initials = c.handle.split(".")[0].slice(0, 2).toUpperCase();
    html += '<div class="t-line"' + introDelay + '><button type="button" class="' + cls + '" data-arb="' + i + '">' +
      '<span class="avatar">' + esc(initials) + "</span>" +
      '<span><span class="handle">' + esc(c.handle) + " commented</span><p>" + fmt(c.text) + "</p></span>" +
      '<span class="approve">approve ▸</span></button>' +
      (state.arbPick === i ? '<div class="verdict-note ' + (c.correct ? "good" : "bad") + '">' + fmt(c.verdict) + "</div>" : "") +
      "</div>";
  });
  if (state.arbHit) {
    html += '<div class="term"><div class="t-line t-sum">' + fmt(MODULE.failureSim.narration || "") + "</div></div>";
  }
  return html;
}

// ---- review ----
function reviewTerm(stageId) {
  if (state.reviewing === stageId) {
    var names = (MODULE.reviewCriteria && MODULE.reviewCriteria[stageId]) || [];
    var checking = names.map(function (n, i) {
      return '<div class="t-line t-meta" style="animation-delay:' + (i * 450 + 400) + 'ms">· reading for: ' + esc(n) + "</div>";
    }).join("");
    return '<div class="term"><div class="t-line t-cmd">replay check ' + esc(stageId) + '</div>' +
      '<div class="t-line t-meta">reviewer: Claude check running on your submission</div>' +
      checking +
      '<div class="t-line t-meta spin" style="animation-delay:' + (names.length * 450 + 600) + 'ms">judging against the pass rule <span id="elapsed-' + esc(stageId) + '"></span></div>' +
      '<div class="t-line t-sum" style="animation-delay:' + (names.length * 450 + 2200) + 'ms">while you wait — the rule being checked: ' + esc(MODULE.takeaway) + "</div></div>";
  }
  var r = state.reviews[stageId];
  if (!r) return "";
  var animate = state.flash === stageId;
  var d = 0;
  function line(html) {
    d += 1;
    var style = animate ? ' style="animation-delay:' + (d * 110) + 'ms"' : "";
    return '<div class="t-line"' + style + ">" + html + "</div>";
  }
  var out = '<div class="term">' + line('<span class="t-cmd">replay check ' + esc(stageId) + "</span>");
  var who = r.reviewer === "claude" ? "reviewer: Claude check on your submission"
    : r.reviewer === "heuristic" ? "reviewer: heuristic fallback (claude CLI unavailable on the server)"
    : r.reviewer === "offline" ? "reviewer: offline pattern-match — run 'node ./src/cli.js serve' and reload for Claude checks"
    : "reviewer: validator";
  out += line('<span class="t-meta">' + esc(who) + "</span>");
  (r.criteria || []).forEach(function (c) {
    out += line(c.pass ? '<span class="t-pass">✓ ' + esc(c.note) + "</span>" : '<span class="t-fail">✗ ' + esc(c.note) + "</span>");
  });
  out += line('<span class="stamp ' + (r.overall === "PASS" ? "pass" : "fail") + '">' + esc(r.overall) + "</span>");
  if (r.summary) out += line('<div class="t-sum">' + esc(r.summary) + "</div>");
  if (r.misconception && r.overall !== "PASS") out += line('<div class="t-mis">misconception: ' + esc(r.misconception) + "</div>");
  return out + "</div>";
}

// ---- beat rendering ----
function beatInner(b) {
  if (b.type === "spot") {
    return '<div class="bprompt">' + spotPrompt() + "</div>" + diffWindow() + spotFeedback() + passLine("diagnose") +
      unlock2(beatDone(b), "Mental model unlocked",
        ucard("Decision name", MODULE.name) + ucard("Why it appeared", MODULE.why) + ucard("Reusable rule", MODULE.takeaway));
  }
  if (b.type === "inv") {
    return '<div class="sim-label" style="color:var(--warn)">Investigate — trace the mechanism yourself</div>' +
      '<div class="bprompt">' + fmt(MODULE.investigate.prompt) + "</div>" + clickableCode(MODULE.naiveCode) + invFeedback() + passLine("break");
  }
  if (b.type === "crash") {
    return '<div class="sim-label">Run — the terminal, ten seconds later</div>' + crashBox() + arbThread() +
      unlock2(beatDone(b), "Failure mode unlocked",
        ucard("Naive version", MODULE.naive) + ucard("What breaks", MODULE.breaks));
  }
  if (b.type === "editor") {
    var code = state.answers.repair != null ? state.answers.repair : MODULE.repairLab.starter;
    var review = state.reviews.repair;
    var hasBlocks = Boolean(MODULE.repairLab.blocks);
    var modeRow = hasBlocks
      ? '<div class="mode-row"><button type="button" class="mode-btn' + (state.repairMode === "asm" ? " on" : "") + '" data-mode="asm">Assemble it</button>' +
        '<button type="button" class="mode-btn' + (state.repairMode === "type" ? " on" : "") + '" data-mode="type">Type it</button></div>'
      : "";
    var workspace = (hasBlocks && state.repairMode === "asm")
      ? assemblyUi()
      : '<div class="code-win"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
        '<span class="fname">' + esc(MODULE.repairLab.filename || "your repair") + "</span></div>" +
        '<textarea class="editor" id="editor-repair" spellcheck="false">' + esc(code) + "</textarea></div>";
    return '<div class="bprompt">' + fmt(MODULE.repair.prompt) + "</div>" +
      evidenceDrawer("repair", false) +
      '<p class="stage-copy" style="margin-bottom:14px">' + esc(MODULE.repairLab.instructions) + "</p>" +
      modeRow + workspace +
      (MODULE.repairLab.solution && state.solShown
        ? '<div class="bin-label" style="color:var(--muted)">Reference option — compare it with your submission</div>' +
          '<div class="code-win"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
          '<span class="fname">reference option</span></div>' +
          '<div class="code-body"><div class="gutter">' + gutterFor(MODULE.repairLab.solution) + '</div><pre class="code">' + hl(MODULE.repairLab.solution) + "</pre></div></div>"
        : "") +
      '<div class="cta-row"><button class="btn-lint" data-lint="repair">replay lint · instant</button>' +
      '<button class="cta run" data-review="repair"' + (state.reviewing ? " disabled" : "") + ">" +
      (state.reviewing === "repair" ? "reviewing…" : "▶ replay check repair") + "</button>" +
      (review && review.overall === "FAIL" && state.repairMode !== "asm" ? '<button class="btn-lint" data-stub="repair">stub what is missing</button>' : "") +
      (MODULE.repairLab.solution ? '<button class="btn-lint" data-solution="1">' + (state.solShown ? "hide reference" : "show a reference solution") + "</button>" : "") +
      "</div>" + lintTerm("repair") + reviewTerm("repair") + passLine("repair") +
      unlock2(beatDone(b), "Better design unlocked",
        ucard("Session version", missionTone(MODULE.aiVersion)) + ucard("More complete version", missionTone(MODULE.production)) +
        (MODULE.patternHref ? ucard("Catalog entry", "", esc(MODULE.name) + ' joins your catalog. <a href="' + esc(MODULE.patternHref) + '">Read the full pattern page →</a>') : ""));
  }
  if (b.type === "fields") {
    var review2 = state.reviews.transfer;
    var inputs;
    var missionTransfer = missionEnabled();
    var transferInstructions = missionTransfer
      ? "Use the starter checklist, then edit only what you disagree with."
      : MODULE.transferLab.instructions;
    var starterApplied = missionTransfer && MODULE.transferLab.fields && MODULE.transferLab.fields.every(function (f) {
      return Boolean(state.answers["transfer." + f.key]);
    });
    var missionStarter = missionTransfer
      ? '<div class="mission-starter"><div><b>Release check starter</b><p>' +
        (starterApplied ? "Checklist is filled. Edit only the parts that do not fit this situation." : "One click fills the checklist. You only revise the parts that do not fit this situation.") +
        '</p></div><button type="button" class="btn-lint" data-mission-transfer-starter>' +
        (starterApplied ? "Starter applied" : "Use starter checklist") + "</button></div>"
      : "";
    if (MODULE.transferLab.fields) {
      inputs = MODULE.transferLab.fields.map(function (f) {
        var v = state.answers["transfer." + f.key] || "";
        var on = FIELD_CHECKS[f.key] && FIELD_CHECKS[f.key].test(v);
        var chips = (f.chips || []).map(function (c, ci) {
          return '<button type="button" class="pchip" data-chip="' + esc(f.key) + ':' + ci + '">' + esc(c.length > 64 ? c.slice(0, 61) + "…" : c) + "</button>";
        }).join("");
        return '<label class="f-label">' + esc(f.label) + '<span class="dot-cov' + (on ? " on" : "") + '" id="dot-' + esc(f.key) + '" title="looks covered — a hint, not a verdict"></span></label>' +
          '<textarea class="plan f-small" rows="2" data-field="' + esc(f.key) + '" placeholder="' + esc(f.ph) + '">' + esc(v) + "</textarea>" +
          (chips ? '<div class="chip-row">' + chips + "</div>" : "");
      }).join("");
    } else {
      inputs = '<textarea class="plan" id="editor-transfer" placeholder="' + esc(MODULE.transferLab.placeholder) + '">' + esc(state.answers.transfer || "") + "</textarea>";
    }
    return '<div class="bprompt">' + fmt(MODULE.transfer.prompt) + "</div>" +
      '<div class="ucard" style="margin-bottom:14px"><b>New situation</b><p>' + fmt(MODULE.transfer.scenario) + "</p></div>" +
      '<p class="stage-copy" style="margin-bottom:4px">' + esc(transferInstructions) + "</p>" +
      missionStarter +
      inputs +
      '<div class="cta-row"><button class="btn-lint" data-lint="transfer">replay lint · instant</button>' +
      '<button class="cta run" data-review="transfer"' + (state.reviewing ? " disabled" : "") + ">" +
      (state.reviewing === "transfer" ? "reviewing…" : "▶ replay check transfer") + "</button>" +
      (review2 && review2.overall === "FAIL" ? '<span class="cta-note">Sharpen the plan and check again.</span>' : "") +
      "</div>" + lintTerm("transfer") + reviewTerm("transfer") + passLine("transfer") +
      unlock2(beatDone(b), "Transfer rule unlocked",
        ucard("Reusable rule", missionTone(MODULE.transfer.rule)) + ucard("Next practice", missionTone(MODULE.exercise)));
  }
  // mc fallback (generic modules)
  var m = stageMod(b.id);
  return (m.scenario ? '<div class="ucard" style="margin-bottom:14px"><b>New situation</b><p>' + fmt(m.scenario) + "</p></div>" : "") +
    '<div class="bprompt">' + fmt(m.prompt) + "</div>" +
    (b.id === "diagnose" ? evidenceDrawer("diagnose", true) : "") +
    choicesHtml(b.id) + checkTerm(b.id) + passLine(b.stage) +
    unlock2(beatDone(b), "Unlocked", ucard("Takeaway", MODULE.takeaway));
}

function visibleBeats() {
  var out = [];
  for (var i = 0; i < BEATS.length; i++) {
    out.push(BEATS[i]);
    if (!beatDone(BEATS[i])) break;
  }
  return out;
}

function missionPanel() {
  var mission = missionDef();
  var eligible = Boolean(mission);
  if (!eligible) return "";
  var toggle = '<section class="mission-strip"><div><b>Mission mode</b><span>' +
    "Run this lab with a purpose frame grounded in this session." +
    '</span></div><button type="button" class="mission-toggle' + (state.missionMode ? " on" : "") + '"' +
    (eligible ? "" : " disabled") + ' data-mission-toggle>' + (state.missionMode ? "On" : "Off") + "</button></section>";
  if (!missionEnabled()) return toggle;
  return toggle + '<section class="mission-brief">' +
    '<div class="eyebrow"><b>Mission brief</b>' + (mission.context ? " · " + esc(mission.context) : "") + '</div>' +
    '<h2>' + esc(mission.title) + '</h2>' +
    '<p>' + esc(mission.brief) + '</p>' +
    (Array.isArray(mission.steps) && mission.steps.length
      ? '<ul>' + mission.steps.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join("") + '</ul>'
      : "") +
    "</section>";
}

function renderStepper() {
  var firstOpen = null;
  STAGE_META.forEach(function (sm) { if (firstOpen === null && !stageDone(sm.id)) firstOpen = sm.id; });
  var html = STAGE_META.map(function (sm) {
    var done = stageDone(sm.id);
    var cls = "step" + (sm.id === firstOpen ? " active" : "") + (done ? " done" : "");
    return '<button type="button" class="' + cls + '" data-goto="' + sm.id + '"><span class="pip">' + (done ? "✓" : String(STAGE_META.indexOf(sm) + 1)) + '</span><span class="lbl">' + esc(sm.label) + "</span></button>";
  });
  document.getElementById("stepper").innerHTML = html.join('<span class="step-link"></span>');
}

function renderMastery() {
  var root = document.getElementById("mastery-root");
  var allDone = STAGE_META.every(function (sm) { return stageDone(sm.id); });
  if (!allDone) { root.innerHTML = ""; return; }
  var next = (MODULE.nextPatterns || []).map(function (p) {
    return p.href
      ? '<a class="next-card" href="' + esc(p.href) + '"><b>' + esc(p.name) + "</b><span>" + esc(p.copy) + " Enter the lab →</span></a>"
      : '<div class="next-card"><span class="lock">LOCKED</span><b>' + esc(p.name) + "</b><span>" + esc(p.copy) + "</span></div>";
  }).join("");
  root.innerHTML = '<section class="mastery">' +
    '<div class="eyebrow"><b>Lab complete</b> · this is what you carry into the next session</div>' +
    "<h2>Reuse Notes</h2>" +
    '<p class="sub">' + esc(MODULE.name) + " — completed after the repair and transfer checks passed.</p>" +
    '<div class="m-grid">' +
    '<div class="m-card"><i>Mental model</i><p>' + esc(MODULE.takeaway) + "</p></div>" +
    '<div class="m-card"><i>Failure signature</i><p>' + esc(MODULE.artifact.failure) + "</p></div>" +
    '<div class="m-card"><i>Completion standard</i><p>' + esc(MODULE.artifact.standard) + "</p></div>" +
    '<div class="m-card"><i>Transfer rule</i><p>' + esc(MODULE.transfer.rule) + "</p></div>" +
    "</div>" +
    (MODULE.patternHref ? '<div class="next-row">' +
      '<a class="next-card" href="' + esc(MODULE.patternHref) + '"><b>' + esc(MODULE.name) + "</b><span>Read the catalog entry →</span></a>" + next + "</div>" : "") +
    "</section>";
}

var prevCount = -1;
function capturePanelScroll() {
  var out = {};
  document.querySelectorAll("[data-diff-box]").forEach(function (el) {
    out[el.getAttribute("data-diff-box")] = { top: el.scrollTop, left: el.scrollLeft };
  });
  return out;
}
function restorePanelScroll(scrolls) {
  Object.keys(scrolls || {}).forEach(function (id) {
    var el = document.querySelector('[data-diff-box="' + id + '"]');
    if (el) {
      el.scrollTop = scrolls[id].top;
      el.scrollLeft = scrolls[id].left;
    }
  });
}
function render() {
  BEATS = buildBeats();
  var panelScroll = prevCount !== -1 ? capturePanelScroll() : null;
  var beats = visibleBeats();
  var html = beats.map(function (b, i) {
    var done = beatDone(b);
    return '<section class="beat' + (done ? " done" : "") + '" id="beat-' + b.id + '">' +
      '<div class="beat-eyebrow">' + (done ? "✓ " : "0" + (i + 1) + " · ") + esc(b.title) + "</div>" +
      (b.copy && !done ? '<p class="stage-copy">' + esc(b.copy) + "</p>" : "") +
      beatInner(b) + "</section>";
  }).join("");
  document.getElementById("stage-root").innerHTML = missionPanel() + html;
  renderStepper();
  renderMastery();
  bind();
  if (prevCount !== -1 && beats.length > prevCount) {
    var newest = document.getElementById("beat-" + beats[beats.length - 1].id);
    if (newest) setTimeout(function () { newest.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150);
  }
  prevCount = beats.length;
  state.flash = null;
  if (panelScroll) requestAnimationFrame(function () { restorePanelScroll(panelScroll); });
}

function bind() {
  document.querySelectorAll("[data-mission-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.missionMode = !state.missionMode;
      save(); render();
    });
  });
  document.querySelectorAll("[data-pick]").forEach(function (button) {
    button.addEventListener("click", function () {
      var parts = button.getAttribute("data-pick").split(":");
      state.choices[parts[0]] = Number(parts[1]);
      save(); render();
    });
  });
  document.querySelectorAll("[data-dline]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (spotComplete()) return;
      var i = Number(el.getAttribute("data-dline"));
      // Zero-target safety net: any click completes and reveals the decision.
      if (spotTargets().length === 0) { state.spotHit = true; save(); render(); return; }
      var line = EVIDENCE_RAW.split("\n")[i] || "";
      var ti = targetIndexFor(line);
      if (ti >= 0 && state.spotFound.indexOf(ti) === -1) {
        state.spotFound.push(ti);
        state.spotPick = null;
      } else if (ti < 0) {
        state.spotPick = i;
      }
      state.spotHit = spotComplete();
      save(); render();
    });
  });
  document.querySelectorAll("[data-diff-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-diff-toggle");
      var box = document.querySelector('[data-diff-box="' + id + '"]');
      if (!box) return;
      var patchOn = state.diffViews[id] === "patch";
      state.diffViews[id] = patchOn ? "clean" : "patch";
      save();
      box.classList.toggle("diff-readable", patchOn);
      button.classList.toggle("on", !patchOn);
      button.setAttribute("aria-pressed", !patchOn ? "true" : "false");
    });
  });
  document.querySelectorAll("[data-line]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (state.inv === MODULE.investigate.targetLine) return;
      state.inv = Number(el.getAttribute("data-line"));
      if (state.inv === MODULE.investigate.targetLine) state.flash = "crash";
      save(); render();
    });
  });
  document.querySelectorAll("[data-arb]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (state.arbHit) return;
      var i = Number(el.getAttribute("data-arb"));
      state.arbPick = i;
      if (MODULE.failureSim.arbitrate.comments[i].correct) state.arbHit = true;
      save(); render();
    });
  });
  document.querySelectorAll("[data-review]").forEach(function (button) {
    button.addEventListener("click", function () { runReview(button.getAttribute("data-review")); });
  });
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = button.getAttribute("data-mode");
      // Carry assembled work into the editor so switching to type-mode never
      // silently reverts the submission to the naive starter.
      if (next === "type" && state.repairMode === "asm" && state.asm.length &&
          (state.answers.repair == null || state.answers.repair === MODULE.repairLab.starter)) {
        state.answers.repair = state.asm.map(function (i) { return MODULE.repairLab.blocks[i].code; }).join("\n");
      }
      state.repairMode = next; save(); render();
    });
  });
  document.querySelectorAll("[data-add]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.asm.push(Number(button.getAttribute("data-add"))); save(); render();
    });
  });
  document.querySelectorAll("[data-rm]").forEach(function (el) {
    el.addEventListener("click", function () {
      state.asm.splice(Number(el.getAttribute("data-rm")), 1); save(); render();
    });
  });
  document.querySelectorAll("[data-chip]").forEach(function (button) {
    button.addEventListener("click", function () {
      var parts = button.getAttribute("data-chip").split(":");
      var f = MODULE.transferLab.fields.filter(function (x) { return x.key === parts[0]; })[0];
      var text = f.chips[Number(parts[1])];
      var cur = state.answers["transfer." + f.key] || "";
      state.answers["transfer." + f.key] = cur ? cur.replace(/\s*$/, "") + " " + text : text;
      save(); render();
    });
  });
  document.querySelectorAll("[data-mission-transfer-starter]").forEach(function (button) {
    button.addEventListener("click", applyMissionTransferStarter);
  });
  document.querySelectorAll("[data-lint]").forEach(function (button) {
    button.addEventListener("click", function () { runLint(button.getAttribute("data-lint")); });
  });
  document.querySelectorAll("[data-solution]").forEach(function (button) {
    button.addEventListener("click", function () { state.solShown = !state.solShown; save(); render(); });
  });
  document.querySelectorAll("[data-stub]").forEach(function (button) {
    button.addEventListener("click", applyStubs);
  });
  document.querySelectorAll("textarea[data-field]").forEach(function (ed) {
    ed.addEventListener("input", function () {
      var key = ed.getAttribute("data-field");
      state.answers["transfer." + key] = ed.value; save();
      var dot = document.getElementById("dot-" + key);
      if (dot && FIELD_CHECKS[key]) dot.className = "dot-cov" + (FIELD_CHECKS[key].test(ed.value) ? " on" : "");
    });
  });
  document.querySelectorAll("textarea[id^='editor-']").forEach(function (ed) {
    ed.addEventListener("input", function () {
      state.answers[ed.id.replace("editor-", "")] = ed.value; save();
    });
    ed.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var st = ed.selectionStart;
        ed.value = ed.value.slice(0, st) + "  " + ed.value.slice(ed.selectionEnd);
        ed.selectionStart = ed.selectionEnd = st + 2;
      }
    });
  });
  document.querySelectorAll("[data-goto]").forEach(function (button) {
    button.addEventListener("click", function () {
      var stageId = button.getAttribute("data-goto");
      var beat = BEATS.filter(function (b) { return b.stage === stageId; })[0];
      var el = beat && document.getElementById("beat-" + beat.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  if (state.reviewing) {
    var span = document.getElementById("elapsed-" + state.reviewing);
    if (span) {
      var tick = setInterval(function () {
        if (!state.reviewing || !document.body.contains(span)) { clearInterval(tick); return; }
        span.textContent = "· " + Math.round((Date.now() - state.reviewStart) / 1000) + "s";
      }, 1000);
    }
  }
}

function getSubmission(stageId) {
  if (stageId === "transfer" && MODULE.transferLab && MODULE.transferLab.fields) {
    return MODULE.transferLab.fields.map(function (f) {
      return f.label + " " + (state.answers["transfer." + f.key] || "");
    }).join("\n");
  }
  if (stageId === "repair" && state.repairMode === "asm") {
    return state.asm.map(function (i) { return MODULE.repairLab.blocks[i].code; }).join("\n");
  }
  var ed = document.getElementById("editor-" + stageId);
  return ed ? ed.value : (state.answers[stageId] || "");
}

function applyMissionTransferStarter() {
  if (!MODULE.transferLab || !MODULE.transferLab.fields) return;
  var starters = {
    entry_check: "Validate the required config path at the entry point before any database or file work begins.",
    "entry-check": "Validate the required config path at the entry point before any database or file work begins.",
    "test-target": "The command must validate required arguments and input paths before running business logic.",
    failure_mode: "A missing or stale path must not fall back to defaults, keep running, or exit with success.",
    "failure-mode": "A missing or stale path must not fall back to defaults, keep running, or exit with success.",
    error_stream: "Print usage and the specific validation error to stderr so shell automation can separate failures from normal output.",
    "error-stream": "Print usage and the specific validation error to stderr so shell automation can separate failures from normal output.",
    exit_code: "Every validation failure exits non-zero, and the release check verifies the bad-path case returns failure.",
    "exit-code": "Every validation failure exits non-zero, and the release check verifies the bad-path case returns failure.",
    regression_assertion: "Run missing-argument and bad-path cases; assert stderr explains the issue and the exit code is non-zero.",
    "regression-assertion": "Run missing-argument and bad-path cases; assert stderr explains the issue and the exit code is non-zero."
  };
  MODULE.transferLab.fields.forEach(function (f, i) {
    var fallback = [
      "Validate required inputs before any work starts.",
      "Bad input must fail clearly instead of silently continuing.",
      "Check stderr and a non-zero exit code for the failure case."
    ][i] || "Record the release check this tool must pass.";
    state.answers["transfer." + f.key] = starters[f.key] || fallback;
  });
  save(); render();
}

function assemblyUi() {
  var lines = state.asm.map(function (bi, pos) {
    return '<div class="asm-line" data-rm="' + pos + '" title="click to remove"><span>' + esc(MODULE.repairLab.blocks[bi].code) + '</span><span class="rm">remove ✕</span></div>';
  }).join("");
  var pool = MODULE.repairLab.blocks.map(function (b, i) {
    if (state.asm.indexOf(i) !== -1) return "";
    return '<button type="button" class="blk" data-add="' + i + '">' + esc(b.code) + "</button>";
  }).join("");
  return '<div class="code-win"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="fname">' + esc(MODULE.repairLab.filename || "your repair") + ' — assembled</span></div>' +
    (lines || '<div class="asm-empty">Tap parts below to build the repair. Order matters. Some parts are traps.</div>') + "</div>" +
    '<div class="bin-label">Parts bin — choose what belongs, leave what does not</div>' + pool;
}

var FIELD_CHECKS = MODULE.id === "secret-boundary"
  ? { secret: /server|env(?!.*PUBLIC)|vault|never.*(client|browser)/i,
      webhook: /signature|verif|constructEvent|stripe-signature/i,
      validation: /validat|check|amount|schema|idempot|order state/i,
      verify: /test|stripe cli|replay|e2e|verify|duplicate/i }
  : { boundary: /client|component|'use client'|browser side/i,
      checks: /detect|typeof|check|navigator|permission|support/i,
      failures: /denied|unsupported|fallback|show|message|state/i,
      verify: /test|verify|e2e|deny|browser|device|firefox/i };

var STUBS = MODULE.id === "secret-boundary"
  ? { route: "// TODO(route): which file owns this call now? app/api/.../route.ts",
      secret: "// TODO(secret): which env var name keeps the key server-only?",
      validation: "// TODO(validate): what counts as a bad prompt? reject it with a 400",
      "safe-errors": "// TODO(errors): what does the client see when the provider fails?",
      abuse: "// TODO(abuse): what stops a stranger scripting this endpoint all night?" }
  : { boundary: "// TODO(boundary): which runtime owns this file? add the directive if browser",
      guards: "// TODO(guards): feature-check the APIs before constructing them",
      unsupported: "// TODO(unsupported): what renders in a browser without SpeechRecognition?",
      denied: "// TODO(denied): the user blocks the mic — design that state, not a crash",
      verify: "// verify: how do you check the failure states before trusting this?" };

function runLint(stageId) {
  state.answers[stageId] = getSubmission(stageId);
  state.lints[stageId] = offlineHeuristic(stageId, state.answers[stageId]);
  save(); render();
}

function lintTerm(stageId) {
  var l = state.lints[stageId];
  if (!l || state.reviewing === stageId || state.reviews[stageId]) return "";
  var lines = (l.criteria || []).map(function (c) {
    return '<div class="t-line">' + (c.pass
      ? '<span class="t-pass">✓ shape present: ' + esc(c.id) + "</span>"
      : '<span class="t-meta">· missing shape: ' + esc(c.id) + "</span>") + "</div>";
  }).join("");
  var verdictLine = l.overall === "PASS"
    ? '<div class="t-line t-sum">shape looks complete — worth running the rubric check.</div>'
    : '<div class="t-line t-meta">fill the missing shapes first, then run the rubric check.</div>';
  return '<div class="term lint"><div class="t-line t-cmd">replay lint ' + esc(stageId) + "</div>" +
    '<div class="t-line t-meta">instant pattern check — shapes only, NOT a review</div>' + lines + verdictLine + "</div>";
}

function applyStubs() {
  var review = state.reviews.repair;
  if (!review) return;
  var code = getSubmission("repair");
  var added = 0;
  (review.criteria || []).forEach(function (c) {
    if (!c.pass && STUBS[c.id] && code.indexOf("TODO(" + c.id + ")") === -1 && code.indexOf(STUBS[c.id]) === -1) {
      code += "\n" + STUBS[c.id];
      added += 1;
    }
  });
  if (added) { state.answers.repair = code; save(); render(); }
}

function runReview(stageId) {
  var submission = getSubmission(stageId);
  state.answers[stageId] = submission;
  delete state.lints[stageId];
  state.reviewing = stageId; state.reviewStart = Date.now(); save(); render();
  fetch("/api/review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stage: stageId, submission: submission, moduleId: MODULE.id, rubric: MODULE.rubric || null })
  }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    .then(function (result) {
      if (!result) result = offlineHeuristic(stageId, submission);
      if (result.overall === "PASS" && result.reviewer !== "claude" && result.reviewer !== "validator") {
        result = Object.assign({}, result, {
          overall: "FAIL",
          summary: (result.summary ? result.summary + " " : "") + "This advisory check cannot complete the lab without a real reviewer."
        });
      }
      state.reviewing = null;
      state.reviews[stageId] = result;
      state.complete[stageId] = result.overall === "PASS" && (result.reviewer === "claude" || result.reviewer === "validator");
      state.flash = stageId;
      save(); render();
    });
}

function offlineHeuristic(stageId, submission) {
  if (MODULE.id !== "runtime-boundary" && MODULE.id !== "secret-boundary") {
    var rubric = MODULE.rubric && MODULE.rubric[stageId];
    return { criteria: rubric && rubric.criteria ? rubric.criteria.map(function (c) {
        return { id: c.id, pass: false, note: "No offline reviewer is available for this session-specific lab." };
      }) : [],
      overall: "FAIL",
      summary: "No offline reviewer is available for this session-specific lab. Use the served app with the claude CLI available for a real review.",
      misconception: null, reviewer: "unavailable" };
  }
  if (MODULE.id === "secret-boundary") {
    var sChecks = stageId === "repair"
      ? [["Server route owns the call", /app\/api|route\.(ts|js)|NextResponse|export (async )?function (POST|GET)/.test(submission), true],
         ["Secret is server-only", !/NEXT_PUBLIC/.test(submission) && /process\.env\./.test(submission), true],
         ["Input validation", /validat|typeof|\.length|schema|zod|400|invalid/i.test(submission), true],
         ["Safe errors", /try|catch|status\(5|generic/i.test(submission), false],
         ["Abuse limits", /rate|limit|429|max_tokens|cap|size/i.test(submission), false]]
      : [["Secret server-side", /server|env|never.*(client|browser)/i.test(submission), true],
         ["Webhook verified", /signature|constructEvent|stripe-signature|verif/i.test(submission), true],
         ["Validation", /validat|check|amount|schema|before marking/i.test(submission), true],
         ["Idempotency", /idempoten|replay|duplicate/i.test(submission), false],
         ["Verification", /test|verify|stripe cli|e2e/i.test(submission), false]];
    return heuristicResult(sChecks);
  }
  var checks = stageId === "repair"
    ? [["Client boundary", /['"]use client['"]|ssr:\s*false/.test(submission), true],
       ["Capability guards", /typeof window|in window|\?\?|\|\||navigator\./.test(submission), true],
       ["Unsupported state", /unsupported|not supported|fallback/i.test(submission), true],
       ["Permission denial", /denied|permission|catch/i.test(submission), false],
       ["Verification", /test|verify|check\b/i.test(submission), false]]
    : [["Boundary isolation", /client (component|boundary)|['"]use client['"]|isolate/i.test(submission), true],
       ["Capability checks", /detect|capabilit|typeof|in navigator|permissions/i.test(submission), true],
       ["Failure states", /denied|unsupported|fallback|error state/i.test(submission), true],
       ["Ownership reasoning", /runtime|server|render|ownership|boundary/i.test(submission), false],
       ["Verification", /test|verify|device|browser/i.test(submission), false]];
  return heuristicResult(checks);
}

function heuristicResult(checks) {
  var criteria = checks.map(function (c) { return { id: c[0], pass: c[1], note: (c[1] ? "Detected: " : "Missing: ") + c[0] }; });
  var requiredOk = checks.filter(function (c) { return c[2]; }).every(function (c) { return c[1]; });
  var optionalOk = checks.filter(function (c) { return !c[2]; }).some(function (c) { return c[1]; });
  return { criteria: criteria, overall: requiredOk && optionalOk ? "PASS" : "FAIL",
    summary: "Offline pattern-match only. Run 'node ./src/cli.js serve' and reload for Claude checks.",
    misconception: null, reviewer: "offline" };
}

document.getElementById("reset").addEventListener("click", function () {
  localStorage.removeItem(KEY); location.reload();
});
render();
`;



function diffToggles(id, extra = "") {
  return '<span class="code-tools">' +
    '<button type="button" class="view-toggle" aria-pressed="false" data-diff-toggle="' + id + '">Patch</button>' +
    extra +
    "</span>";
}

function diffView(id, html) {
  return '<div class="code-win"><div class="code-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
    '<span class="fname">session excerpt</span>' + diffToggles(id) +
    '</div><pre class="diff diff-readable" data-diff-box="' + id + '">' + html + "</pre></div>";
}

function diffLineHtml(line) {
  if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
    return '<span class="d-prefix"></span><span class="d-code">' + escapeHtml(line) + "</span>";
  }
  if (line.startsWith("+") || line.startsWith("-")) {
    return '<span class="d-prefix">' + escapeHtml(line.slice(0, 1)) + '</span><span class="d-code">' + (escapeHtml(line.slice(1)) || "&nbsp;") + "</span>";
  }
  return '<span class="d-prefix"></span><span class="d-code">' + (escapeHtml(line) || "&nbsp;") + "</span>";
}

function renderDiff(evidence) {
  return String(evidence)
    .split("\n")
    .map((line) => {
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
        return `<span class="d-meta">${diffLineHtml(line)}</span>`;
      }
      if (line.startsWith("+")) return `<span class="d-add">${diffLineHtml(line)}</span>`;
      if (line.startsWith("-")) return `<span class="d-del">${diffLineHtml(line)}</span>`;
      if (line.startsWith("@@")) return `<span class="d-hunk">${diffLineHtml(line)}</span>`;
      return `<span class="d-line">${diffLineHtml(line)}</span>`;
    })
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
