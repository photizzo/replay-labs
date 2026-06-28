// Pattern catalog: Refactoring-Guru-grade entries for AI-session decision patterns.
// Each entry teaches intent, the smell it prevents, three implementation tiers,
// when NOT to use it, and a review checklist the learner can carry forward.

const RUNTIME_ILLO = `<svg viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Server and browser zones separated by the client boundary">
  <rect x="10" y="20" width="240" height="130" rx="12" fill="#191d23" stroke="#303845"/>
  <text x="30" y="48" fill="#67707c" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">SERVER</text>
  <text x="30" y="76" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">renders first ·  no window,</text>
  <text x="30" y="96" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">no mic, no localStorage</text>
  <rect x="310" y="20" width="240" height="130" rx="12" fill="#34d39912" stroke="#34d399"/>
  <text x="330" y="48" fill="#34d399" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">BROWSER</text>
  <rect x="330" y="62" width="64" height="24" rx="6" fill="#0f1216" stroke="#303845"/>
  <text x="362" y="78" fill="#98a1ac" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">window</text>
  <rect x="402" y="62" width="48" height="24" rx="6" fill="#0f1216" stroke="#303845"/>
  <text x="426" y="78" fill="#98a1ac" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">mic</text>
  <rect x="458" y="62" width="76" height="24" rx="6" fill="#0f1216" stroke="#303845"/>
  <text x="496" y="78" fill="#98a1ac" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">storage</text>
  <line x1="280" y1="10" x2="280" y2="160" stroke="#34d399" stroke-dasharray="5 5"/>
  <rect x="228" y="118" width="104" height="24" rx="12" fill="#34d399"/>
  <text x="280" y="134" fill="#052e1e" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" text-anchor="middle">'use client'</text>
  <line x1="120" y1="115" x2="252" y2="74" stroke="#f87171" stroke-width="1.5"/>
  <text x="160" y="84" fill="#f87171" font-family="Inter, sans-serif" font-size="16" font-weight="700">✗</text>
  <text x="74" y="132" fill="#f87171" font-family="Inter, sans-serif" font-size="11.5">server code reaching for browser APIs</text>
</svg>`;

const SECRET_ILLO = `<svg viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Browser, API route, and provider with the secret held server-side">
  <rect x="10" y="30" width="150" height="110" rx="12" fill="#191d23" stroke="#303845"/>
  <text x="30" y="58" fill="#67707c" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">BROWSER</text>
  <text x="30" y="84" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">every visitor</text>
  <text x="30" y="103" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">reads the bundle</text>
  <rect x="205" y="30" width="150" height="110" rx="12" fill="#34d39912" stroke="#34d399"/>
  <text x="225" y="58" fill="#34d399" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">API ROUTE</text>
  <rect x="225" y="72" width="110" height="26" rx="6" fill="#0f1216" stroke="#34d399"/>
  <text x="280" y="89" fill="#34d399" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">REDACTED_KEY</text>
  <text x="225" y="122" fill="#98a1ac" font-family="Inter, sans-serif" font-size="12">the key never leaves</text>
  <rect x="400" y="30" width="150" height="110" rx="12" fill="#191d23" stroke="#303845"/>
  <text x="420" y="58" fill="#67707c" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">PROVIDER</text>
  <text x="420" y="84" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">bills whoever</text>
  <text x="420" y="103" fill="#98a1ac" font-family="Inter, sans-serif" font-size="13">holds the key</text>
  <line x1="160" y1="70" x2="200" y2="70" stroke="#34d399" stroke-width="1.5"/>
  <line x1="355" y1="70" x2="395" y2="70" stroke="#34d399" stroke-width="1.5"/>
  <path d="M 80 145 Q 280 185 480 145" fill="none" stroke="#f87171" stroke-width="1.5" stroke-dasharray="5 5"/>
  <text x="280" y="194" fill="#f87171" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">✗ browser → provider directly: the key ships to everyone</text>
</svg>`;

export const PATTERNS = {
  "runtime-boundary": {
    name: "Runtime Boundary",
    illustration: RUNTIME_ILLO,
    tagline: "Decide which environment owns a behavior before you design the component.",
    intent:
      "Code that depends on browser-only capabilities (speech, microphone, geolocation, camera, localStorage) must live where those capabilities exist. The boundary is a design decision, not a syntax detail.",
    problem:
      "Frameworks like Next.js render components on the server first. Browser globals do not exist there. Code that reaches for them works in quick demos and dies in server rendering, hydration, or another user's browser.",
    smell: {
      name: "Browser API leak",
      copy: "Server-rendered code touches window, navigator, speechSynthesis, or localStorage. The tell: it 'works in dev' and fails on build, deploy, or someone else's machine."
    },
    tiers: [
      {
        label: "Naive",
        verdict: "Crashes during server rendering. No boundary decided at all.",
        code: `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`
      },
      {
        label: "Demo",
        verdict: "Boundary decided. Honest for a single-user demo; still assumes every browser cooperates.",
        code: `'use client';

export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
  // works in Chrome, on my machine, with mic allowed
}`
      },
      {
        label: "Production",
        verdict: "Boundary + capability checks + designed failure states + a way to verify them.",
        code: `'use client';
import { useEffect, useState } from "react";

type VoiceState = "ready" | "listening" | "unsupported" | "denied";

export default function VoiceCheckIn() {
  const [state, setState] = useState<VoiceState>("ready");

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) { setState("unsupported"); return; }
  }, []);

  async function start() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setState("listening");
    } catch {
      setState("denied");   // a designed state, not a surprise
    }
  }

  if (state === "unsupported") return <TypeInsteadFallback />;
  if (state === "denied") return <MicHelp onRetry={start} />;
  return <CheckInUI onStart={start} listening={state === "listening"} />;
}
// verify: e2e run with mic permission denied + a browser without SpeechRecognition`
      }
    ],
    whenNotToUse: [
      "The behavior has no browser dependency — keep it on the server and skip the client bundle cost.",
      "Secrets or provider SDK calls are involved — that is a Secret Boundary problem; 'use client' makes it worse, not better.",
      "Reliability matters more than browser-native speed — consider server-driven capture (e.g. telephony/realtime audio) instead of patching browser gaps."
    ],
    checklist: [
      "Where does this code run first — server or browser?",
      "Every browser global behind a capability check?",
      "Unsupported browser: what does the user see?",
      "Permission denied: what does the user see?",
      "How is each failure state verified before shipping?"
    ],
    related: [
      { slug: "secret-boundary", name: "Secret Boundary", live: true, copy: "Keep provider credentials behind API routes. The opposite pull from Runtime Boundary: this code must NOT reach the browser." },
      { slug: "demo-persistence", name: "Demo Persistence", copy: "A JSON file is honest demo persistence — if the constraint is named and the production step is obvious." },
      { slug: "model-output-protocol", name: "Model Output Protocol", copy: "When LLM text drives app state, define a small protocol instead of parsing prose casually." }
    ]
  },
  "secret-boundary": {
    name: "Secret Boundary",
    illustration: SECRET_ILLO,
    tagline: "A secret's home decides the architecture: anything the browser can read, every visitor owns.",
    intent:
      "Provider credentials (model APIs, telephony, payments) must live in a runtime users cannot inspect. API routes exist so the browser can trigger trusted work without ever holding the key.",
    problem:
      "Client code is published code. Bundlers inline anything client-reachable — including env vars with a public prefix — into JavaScript that every visitor, scraper, and competitor can read. A leaked provider key becomes someone else's free infrastructure, billed to you.",
    smell: {
      name: "Key in the bundle",
      copy: "A credential referenced anywhere client-reachable code can see it. The tell: NEXT_PUBLIC_ on something that is not public, or a provider SDK imported into a client component."
    },
    tiers: [
      {
        label: "Naive",
        verdict: "The key is compiled into the bundle. Every visitor owns your account.",
        code: `"use client";
const KEY = process.env.NEXT_PUBLIC_ANTHROPIC_KEY;

export async function askCoach(prompt: string) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY ?? "" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
  }).then((r) => r.json());
}`
      },
      {
        label: "Demo",
        verdict: "Boundary decided: the route owns the key. Honest for a demo; still trusts every input.",
        code: `// app/api/chat/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { prompt } = await request.json();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY! },
    body: JSON.stringify({ model: "claude-sonnet-4-6",
      max_tokens: 300, messages: [{ role: "user", content: prompt }] })
  });
  return NextResponse.json(await res.json());
}`
      },
      {
        label: "Production",
        verdict: "Boundary + validation + safe errors + abuse limits. Strangers will find this endpoint.",
        code: `// app/api/chat/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { prompt } = await request.json().catch(() => ({}));
  if (typeof prompt !== "string" || prompt.length === 0 || prompt.length > 2000) {
    return NextResponse.json({ error: "invalid prompt" }, { status: 400 });
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY! },
      body: JSON.stringify({ model: "claude-sonnet-4-6",
        max_tokens: 300, messages: [{ role: "user", content: prompt }] })
    });
    if (!res.ok) throw new Error("provider " + res.status);
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("chat route:", error);   // details stay server-side
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 502 });
  }
}
// still missing for scale: rate limiting per IP/user — name it before launch`
      }
    ],
    whenNotToUse: [
      "Truly public config (a maps tile key scoped to your domain) — some keys are designed to be public; check the provider's scoping story first.",
      "Browser-capability work (mic, camera, geolocation) — that is Runtime Boundary; an API route cannot reach the user's hardware.",
      "When a provider offers scoped, short-lived client tokens minted by your server — use that pattern instead of proxying every byte."
    ],
    checklist: [
      "Could any client-reachable file see this credential?",
      "Does the env var name promise publication (NEXT_PUBLIC_)?",
      "Is request input validated before the provider call?",
      "Do error responses leak provider details or status internals?",
      "What happens when a stranger scripts this endpoint all night?"
    ],
    related: [
      { slug: "runtime-boundary", name: "Runtime Boundary", live: true, copy: "Decide which environment owns a behavior. The mirror image: that code MUST reach the browser." },
      { slug: "demo-persistence", name: "Demo Persistence", copy: "A JSON file is honest demo persistence — if the constraint is named." },
      { slug: "model-output-protocol", name: "Model Output Protocol", copy: "When LLM text drives app state, define a small protocol instead of parsing prose casually." }
    ]
  }
};

export function generatePatternHtml(slug) {
  const p = PATTERNS[slug];
  if (!p) throw new Error(`Unknown pattern: ${slug}`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(p.name)} — Replay Patterns</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; --bg:#0c0e11; --ink:#e9e7e2; --muted:#98a1ac; --line:#242a32;
    --paper:#14171c; --soft:#191d23; --green:#34d399; --red:#f87171; --gold:#fbbf24; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif; line-height:1.6;
    -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 36px 24px 80px; }
  .crumb { color:var(--muted); font-size:13px; font-weight:700; }
  .crumb a { color: var(--green); text-decoration: none; }
  h1 { font-size: 40px; margin: 8px 0 4px; }
  .tagline { font-size: 19px; color: var(--muted); margin: 0 0 28px; }
  h2 { font-size: 22px; margin: 34px 0 10px; }
  .card { background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:18px; }
  .smell { border-left: 4px solid var(--red); }
  .smell b { color: var(--red); }
  pre { margin:0; padding:14px; border-radius:8px; background:#24211d; color:#fff4df;
    font-family: ui-monospace, Menlo, Consolas, monospace; font-size:13px; line-height:1.5;
    overflow:auto; white-space:pre; }
  .tier { margin-top: 14px; }
  .tier-head { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .badge { font-size:12px; font-weight:800; padding:3px 10px; border-radius:999px;
    font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing:.06em; }
  .b-naive { background:#f8717122; color:var(--red); }
  .b-demo { background:#fbbf2422; color:var(--gold); }
  .b-prod { background:#34d39922; color:var(--green); }
  .verdict { color:var(--muted); font-size:14px; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li { margin: 6px 0; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:12px; }
  .rel { text-decoration:none; color:inherit; display:block; }
  .rel b { color: var(--green); display:block; margin-bottom:6px; }
  .rel span { color:var(--muted); font-size:14px; }
  .checklist li::marker { content: "☐  "; }
  .cta { display:inline-block; margin-top:26px; background:var(--green); color:#052e1e; font-weight:750;
    padding: 11px 16px; border-radius:8px; text-decoration:none; }
  pre { border: 1px solid var(--line); background:#0f1216; }
  h1 { font-weight: 800; letter-spacing: -0.02em; }
</style>
</head>
<body><div class="wrap">
  <div class="crumb"><a href="../index.html">← session map</a> · <a href="../labs/${slug}.html">this pattern's lab</a> · Replay pattern catalog</div>
  <h1>${esc(p.name)}</h1>
  <p class="tagline">${esc(p.tagline)}</p>
  ${p.illustration ? `<div class="card" style="padding:10px 14px">${p.illustration}</div>` : ""}

  <h2>Intent</h2>
  <div class="card"><p>${esc(p.intent)}</p></div>

  <h2>Problem</h2>
  <div class="card"><p>${esc(p.problem)}</p></div>

  <h2>Smell: ${esc(p.smell.name)}</h2>
  <div class="card smell"><p><b>${esc(p.smell.name)}.</b> ${esc(p.smell.copy)}</p></div>

  <h2>Three tiers of the same decision</h2>
  ${p.tiers.map((t, i) => `
  <div class="tier">
    <div class="tier-head">
      <span class="badge ${i === 0 ? "b-naive" : i === 1 ? "b-demo" : "b-prod"}">${esc(t.label)}</span>
      <span class="verdict">${esc(t.verdict)}</span>
    </div>
    <pre>${esc(t.code)}</pre>
  </div>`).join("")}

  <h2>When not to use it</h2>
  <div class="card"><ul>${p.whenNotToUse.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>

  <h2>Review checklist</h2>
  <div class="card"><ul class="checklist">${p.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>

  <h2>Related patterns</h2>
  <div class="grid">
    ${p.related.map((r) => r.live
      ? `<a class="card rel" href="${esc(r.slug)}.html"><b>${esc(r.name)}</b><span>${esc(r.copy)} <em>Read the entry →</em></span></a>`
      : `<div class="card rel"><b>${esc(r.name)}</b><span>${esc(r.copy)} <em>(lab coming next)</em></span></div>`).join("")}
  </div>

  <a class="cta" href="../labs/${slug}.html">Prove it in the lab →</a>
</div></body></html>`;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
