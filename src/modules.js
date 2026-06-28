// Lab module catalog. Each rich module turns one session decision into a full
// four-stage lab: diagnose -> break (+ failure simulation) -> repair (editor +
// real review) -> transfer (plan + real review).

export const MODULES = {
  "next-client-boundary": buildRuntimeBoundary,
  "api-secret-boundary": buildSecretBoundary
};

export function buildLabModule(decision) {
  const builder = MODULES[decision.id];
  return builder ? builder(decision) : buildGenericModule(decision);
}

function buildRuntimeBoundary() {
  return {
    id: "runtime-boundary",
    name: "Runtime Boundary",
    minutes: 8,
    why:
      "The session used browser-only APIs such as speech synthesis, microphone input, and localStorage inside a Next.js app. That makes the client/server boundary the central decision.",
    takeaway:
      "When code depends on browser APIs, decide the runtime boundary before you design the component.",
    naive:
      "Use browser APIs directly in a component without deciding whether the component runs on the server or in the browser.",
    naiveFile: "app/page.tsx",
    naiveCode: `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`,
    breaks:
      "`window`, microphone APIs, speech synthesis, and localStorage do not exist during server rendering. Even in the browser, unsupported APIs and denied permissions need a designed fallback.",
    aiVersion:
      "The AI put the main voice experience behind a client boundary with `'use client'` and kept browser behavior in `app/page.tsx`.",
    production:
      "Keep the client boundary, add capability checks, show unsupported-browser and permission-denied states, and consider server-driven voice if reliability matters more than browser-native speed.",
    exercise:
      "Create a scratch version without the client boundary, predict the failure, then add a browser-support fallback before restoring the working design.",
    patternHref: "patterns/runtime-boundary.html",
    challenge: {
      pattern: "Runtime Boundary",
      patternCopy: "A professional decision about which environment owns a behavior.",
      smell: "Browser API leak",
      smellCopy: "Server-rendered code reaches for window, localStorage, microphone, or speech APIs.",
      proof: "Transfer, not recall",
      proofCopy: "You pass only when you can apply the same rule to a different browser-capability feature."
    },
    criteria: {
      diagnose: "Find the decision inside the real diff before any explanation appears.",
      break: "Trace the naive version and click the line where execution dies.",
      repair: "Real review. Required: client boundary, capability guards, designed unsupported state. Seal it with permission-denied handling or named verification.",
      transfer: "Real review. Required: boundary isolation, capability checks, failure states. Seal it with ownership reasoning or verification beyond dev."
    },
    reviewCriteria: {
      repair: ["Client boundary", "Capability guards", "Unsupported state", "Permission denial", "Verification"],
      transfer: ["Boundary isolation", "Capability checks", "Failure states", "Ownership reasoning", "Verification"]
    },
    artifact: {
      failure: "Server-rendered code touches browser globals such as window, speechSynthesis, microphone APIs, or localStorage.",
      standard: "Keep browser behavior inside a client boundary, add capability and permission fallbacks, and verify those states."
    },
    nextPatterns: [
      { name: "Secret Boundary", copy: "Keep credentials behind API routes.", href: "secret-boundary.html" },
      { name: "Demo Persistence", copy: "When a JSON file is the honest choice.", href: null }
    ],
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
    failureSim: {
      terminal: `$ next build

   Creating an optimized production build ...
 ✓ Compiled successfully

   Generating static pages (0/3) ...
ReferenceError: window is not defined
    at Page (app/page.tsx:2:28)
    at renderToHTML (node_modules/next/dist/server/render.js:387:14)

> Export encountered an error on /page: /, exiting the build.`,
      narration:
        "Nothing about the code changed — the runtime executing it did. All afternoon this file ran in your browser. The build ran it in Node, where `window` has never existed. That is the whole pattern.",
      arbitrate: {
        intro: "Two engineers read the same stack trace. Click the review you would approve.",
        comments: [
          {
            handle: "iyke.dev",
            text: "Next.js must have broken `window` in this release. Pin the previous version, ship, and file an issue upstream.",
            correct: false,
            verdict: "Rejecting this one matters: `window` is fine — in the browser. The stack trace names where this actually ran: `renderToHTML`, on the server. Pinning versions would chase a ghost while every build keeps failing."
          },
          {
            handle: "ada.builds",
            text: "Nothing broke. The build prerenders this file in Node, where `window` has never existed. The fix is deciding the runtime boundary, not the framework version.",
            correct: true,
            verdict: "Approved — and that is the whole pattern. The code never changed; the runtime executing it did. Boundary first, then the component design."
          }
        ]
      },
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
    spot: {
      prompt: "Find the line in this diff that shows where the code is allowed to run.",
      targetRe: "use client",
      targets: [
        { re: "['\"]use client['\"]", note: "the directive itself — it grants every line below it a browser to run in. That is the decision: runtime ownership." },
        { re: "window\\.|SpeechRecognition|speechSynthesis|localStorage|navigator\\.", note: "a line inside the blast radius — it only works *because* of that directive. Move it server-side and it throws." }
      ],
      hit: "You traced the whole decision: the `'use client'` directive AND the browser-only lines that depend on it. That dependency is the pattern — the directive is a promise the lines below rely on.",
      misses: [
        { re: "SpeechRecognition|speechSynthesis|localStorage|window\\.", note: "That is a browser API — the consequence. The decision is the directive that grants this file a browser to run in." },
        { re: "useState|useEffect|import", note: "Framework plumbing. It works the same on either side of the boundary. Look for the line that chooses the side." }
      ],
      missDefault: "That line rides on the decision. Look for the directive that changes WHERE this file runs."
    },
    investigate: {
      prompt: "Now the boundary is gone. Trace it yourself: click the first line that throws during server rendering.",
      targetLine: 2,
      hit: "Line 2 — execution dies at `new window.SpeechRecognition()` before localStorage is ever reached. And notice what is missing above it: no `'use client'` directive, so the server owns this whole file.",
      misses: {
        "3": "`localStorage` would also throw — but execution never gets there. Which line dies first?",
        "1": "The function signature is harmless on a server. The crash comes from the first touch of a browser global."
      },
      missDefault: "That line survives on a server. Look for the first touch of a browser-only global."
    },
    repairLab: {
      filename: "app/page.tsx — your repair",
      instructions:
        "Edit until you would ship it. Comments and pseudo-code count for the design states (`// denied -> mic-help with retry`) — only the boundary and the guards must be real code. This is judgment, not typing practice.",
      starter: `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`,
      blocks: [
        { code: "const recognition = new window.SpeechRecognition();\n// module scope — runs wherever the file loads, including the server", trap: true },
        { code: "'use client';\nimport { useEffect, useState } from \"react\";" },
        { code: "type VoiceState = \"ready\" | \"listening\" | \"unsupported\" | \"denied\";\n\nexport default function Page() {\n  const [state, setState] = useState<VoiceState>(\"ready\");" },
        { code: "  useEffect(() => {\n    const R = window.SpeechRecognition ?? window.webkitSpeechRecognition;\n    if (!R) setState(\"unsupported\");\n  }, []);" },
        { code: "export const dynamic = \"force-static\";", trap: true },
        { code: "  async function start() {\n    try {\n      await navigator.mediaDevices.getUserMedia({ audio: true });\n      setState(\"listening\");\n    } catch {\n      setState(\"denied\");\n    }\n  }" },
        { code: "  // denied is rare — skip the UI for it, a console.warn is enough", trap: true },
        { code: "  if (state === \"unsupported\") return <TypedCheckin />;\n  if (state === \"denied\") return <MicHelp onRetry={start} />;\n  return <VoiceCheckin onStart={start} listening={state === \"listening\"} />;\n}" },
        { code: "// verify: e2e with mic denied + one run in Firefox (no SpeechRecognition)" }
      ],
      solution: `'use client';
import { useEffect, useState } from "react";

type VoiceState = "ready" | "listening" | "unsupported" | "denied";

export default function Page() {
  const [state, setState] = useState<VoiceState>("ready");

  useEffect(() => {
    const R = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!R) setState("unsupported");
  }, []);

  async function start() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setState("listening");
    } catch {
      setState("denied");
    }
  }

  if (state === "unsupported") return <TypedCheckin />;
  if (state === "denied") return <MicHelp onRetry={start} />;
  return <VoiceCheckin onStart={start} listening={state === "listening"} />;
}
// verify: e2e with mic denied + one run in Firefox (no SpeechRecognition)`
    },
    repair: { prompt: "Repair it so you would ship it beyond a demo.", choices: [] },
    transferLab: {
      instructions:
        "Capture the handoff rule — four quick answers, a sentence each is enough.",
      placeholder: "",
      fields: [
        { key: "boundary", label: "Where does the browser-only work live?", ph: "a client component that…",
          chips: ["A client component isolates the geolocation/camera work; the dashboard page stays server-rendered.",
                  "An API route handles the camera and location work.",
                  "Keep it in the page — it already works in dev."] },
        { key: "checks", label: "What do you check before using the APIs?", ph: "feature-detect geolocation/camera, then…",
          chips: ["Feature-detect geolocation and getUserMedia before use; query permissions where available.",
                  "Wrap everything in a try/catch and move on.",
                  "Nothing — modern browsers all support these."] },
        { key: "failures", label: "Denied or unsupported — what does the user see?", ph: "a designed state that…",
          chips: ["Designed states: denied shows manual entry with a retry; unsupported shows the no-camera path.",
                  "An alert() explaining the error.",
                  "It will rarely happen, so a blank widget is fine."] },
        { key: "verify", label: "How do you verify before calling it shipped?", ph: "an e2e run with…",
          chips: ["An e2e run with location and camera denied, plus one browser without the APIs.",
                  "Click through it once locally before merging.",
                  "The AI tested it while building."] }
      ]
    },
    transfer: {
      prompt: "Apply the same judgment to a new feature.",
      scenario:
        "A future AI session adds geolocation, camera capture, and localStorage to a Next.js dashboard. The feature works in the browser during development.",
      rule:
        "If the feature depends on browser-only capabilities, isolate that behavior behind a client boundary, design fallback states, and keep server code free of browser globals.",
      choices: []
    }
  };
}

function buildSecretBoundary() {
  return {
    id: "secret-boundary",
    name: "Secret Boundary",
    minutes: 7,
    why:
      "The session needed Anthropic and Twilio calls. Both require credentials a browser must never hold, so the work went behind Next.js API routes — the boundary between demo UI and trusted server work.",
    takeaway:
      "A secret's home decides the architecture: anything the browser can read, every visitor owns.",
    naive:
      "Call the model provider directly from client code with the key in a NEXT_PUBLIC env var, because it feels simpler than adding a route.",
    naiveFile: "app/lib/ask.ts",
    naiveCode: `"use client";
const KEY = process.env.NEXT_PUBLIC_ANTHROPIC_KEY;

export async function askCoach(prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY ?? "" },
    body: JSON.stringify({ model: "claude-sonnet-4-6",
      max_tokens: 300, messages: [{ role: "user", content: prompt }] })
  });
  return res.json();
}`,
    breaks:
      "`NEXT_PUBLIC_` env vars are inlined into the client bundle at build time. The key ships to every visitor, and anyone with DevTools can spend your account.",
    aiVersion:
      "The AI wrapped provider calls in `app/api` routes so the browser calls your server, and only your server holds `ANTHROPIC_API_KEY`.",
    production:
      "Server-only env, validated request bodies, structured errors that never echo provider details, and a cap on request size and rate before strangers find the endpoint.",
    exercise:
      "Grep your own bundles: `npm run build && grep -r \"sk-\" .next/static` — then move anything you find behind a route.",
    patternHref: "patterns/secret-boundary.html",
    challenge: {
      pattern: "Secret Boundary",
      patternCopy: "A trust decision about which runtime is allowed to hold a credential.",
      smell: "Key in the bundle",
      smellCopy: "Provider credentials referenced anywhere client-reachable code can see them.",
      proof: "Transfer, not recall",
      proofCopy: "You pass only when you can apply the same rule to a different credentialed integration."
    },
    criteria: {
      diagnose: "Find the decision inside the real diff before any explanation appears.",
      break: "Trace the naive version and click the line where the key becomes public.",
      repair: "Real review. Required: server route owns the call, secret is server-only, input validated. Seal it with safe errors or abuse limits.",
      transfer: "Real review. Required: secret server-side, webhook verified, input validated. Seal it with idempotency thinking or verification."
    },
    reviewCriteria: {
      repair: ["Server route owns the call", "Secret is server-only", "Input validation", "Safe errors", "Abuse limits"],
      transfer: ["Secret server-side", "Webhook verified", "Validation", "Idempotency", "Verification"]
    },
    artifact: {
      failure: "A provider key referenced anywhere client-reachable ends up in the shipped JS bundle.",
      standard: "Secrets live in server-only env behind validated API routes with errors that never leak provider details."
    },
    nextPatterns: [
      { name: "Runtime Boundary", copy: "Decide which environment owns a behavior.", href: "runtime-boundary.html" },
      { name: "Model Output Protocol", copy: "A small protocol between LLM text and app state.", href: null }
    ],
    lenses: {
      diagnose: {
        title: "Look for the decision type",
        items: ["app/api routes in the diff", "ANTHROPIC_API_KEY handling", "Evidence this is about trust, not speed"]
      },
      break: {
        title: "Look for the exposure",
        items: ["Where the key string lives", "What the bundler inlines", "Who can read shipped JavaScript"]
      },
      repair: {
        title: "Look for the shipping gap",
        items: ["Which runtime makes the provider call", "What happens to bad input", "What an error response reveals"]
      },
      transfer: {
        title: "Look for the reusable pattern",
        items: ["New credentialed integrations", "Webhook trust", "Validation before money moves"]
      }
    },
    diagnose: {
      prompt: "The session put the Anthropic call behind `app/api/chat` instead of calling it from the page. What kind of decision is that?",
      choices: [
        {
          label: "A trust boundary",
          description: "It decided which runtime is allowed to hold the credential and perform trusted work.",
          feedback: "Correct. The route exists so the browser can trigger the work without ever holding the key.",
          correct: true
        },
        {
          label: "A performance optimization",
          description: "Server-side calls are faster than browser calls.",
          feedback: "Not the driver. A round trip through your server is usually slower — the route exists for trust, not speed.",
          correct: false
        },
        {
          label: "A code-organization preference",
          description: "Routes keep the codebase tidy.",
          feedback: "Tidiness is incidental. The evidence is a credential that must never reach the client bundle.",
          correct: false
        }
      ]
    },
    break: {
      prompt: "If this naive version ships, what is the most important failure?",
      choices: [
        {
          label: "The API key ships to every visitor",
          description: "The key is compiled into the JS bundle; anyone with DevTools or curl can spend your account.",
          feedback: "Correct. The moment a secret is client-reachable, every visitor owns it. Billing and abuse follow.",
          correct: true
        },
        {
          label: "CORS will block the request",
          description: "Browsers stop cross-origin calls, so this fails safely.",
          feedback: "Some providers do block browser calls — but that is incidental protection. The key exposure is already done at build time.",
          correct: false
        },
        {
          label: "The fetch is too slow from the client",
          description: "Latency makes this unusable.",
          feedback: "Latency is fine. The failure is that your credential is now public infrastructure.",
          correct: false
        }
      ]
    },
    failureSim: {
      terminal: `$ npm run build && grep -ro "REDACTED_PROVIDER_KEY" .next/static/ | head -2
.next/static/chunks/app/page-3f2a1c.js:REDACTED_PROVIDER_KEY
.next/static/chunks/app/page-3f2a1c.js:REDACTED_PROVIDER_KEY

$ # three weeks later, provider dashboard:
usage alert: 4,213,907 tokens today (daily avg: 41,000)
source: 1,882 distinct IPs`,
      narration:
        "`NEXT_PUBLIC_` is not a naming convention — it is an instruction to publish. The key was public the moment the bundle was built; every request after that just used what visitors already had. The billing followed.",
      arbitrate: {
        intro: "Two engineers read the same grep output. Click the review you would approve.",
        comments: [
          {
            handle: "ada.builds",
            text: "`NEXT_PUBLIC_` is an instruction to publish — the bundler inlined the key at build time, exactly as asked. Rotate the key AND move the call behind a route; the prefix can never hold a secret.",
            correct: true,
            verdict: "Approved. Env var does not mean secret — the prefix decides which side of the boundary the value lives on. Rotation without the boundary just publishes the next key."
          },
          {
            handle: "iyke.dev",
            text: "Looks like a bundler leak. Upgrade Next, rotate the key, and we can keep the env var where it is — it worked fine for weeks.",
            correct: false,
            verdict: "Rejecting this one matters: there is no bug. The prefix asked for exactly this. Upgrade plus rotation keeps the architecture that publishes the key — the next build leaks the new one."
          }
        ]
      },
      prompt:
        "The key was in an environment variable, not in the source code. Why did it end up in every visitor's bundle anyway?",
      choices: [
        {
          label: "NEXT_PUBLIC_ vars are inlined at build time",
          description: "That prefix is a promise to the bundler: this value is safe to compile into client JavaScript.",
          feedback: "Correct. NEXT_PUBLIC_ is not a naming convention — it is an instruction to publish. Env var does not mean secret.",
          correct: true
        },
        {
          label: "The bundler leaked it by accident",
          description: "A Next.js bug shipped the env var; upgrading fixes it.",
          feedback: "No bug. The prefix asked for exactly this. The fix is a boundary, not a version bump.",
          correct: false
        },
        {
          label: "HTTPS was misconfigured",
          description: "With proper TLS the key would have been protected.",
          feedback: "TLS protects the wire, not the bundle. The key was public before any request was made.",
          correct: false
        }
      ]
    },
    spot: {
      prompt: "Find the line in this diff that shows who is allowed to hold a credential.",
      targetRe: "app/api|ANTHROPIC_API_KEY",
      targets: [
        { re: "app/api|route\\.(ts|js)", note: "the route — the decision to make the *server* own the provider call, not the browser." },
        { re: "ANTHROPIC_API_KEY|process\\.env", note: "the credential that the route keeps server-side — the other half of the boundary. The browser triggers the work but never holds this." }
      ],
      hit: "You traced both halves: the route that owns the call AND the secret it keeps server-side. The decision is the relationship between them — trigger from anywhere, hold the key in exactly one place.",
      misses: [
        { re: "fetch|anthropic\\.com|messages", note: "That is the call itself. The decision is WHERE the call is allowed to happen — and who holds the credential when it does." },
        { re: "NextResponse|NextRequest|import", note: "Framework plumbing. Look for the line that decides which runtime owns the secret." }
      ],
      missDefault: "That line rides on the decision. Look for where the credential lives — and which runtime gets to read it."
    },
    investigate: {
      prompt: "Now the boundary is gone. Trace it yourself: click the line where the key becomes public.",
      targetLine: 2,
      hit: "Line 2 — `NEXT_PUBLIC_ANTHROPIC_KEY` is inlined into the bundle at build time. The leak is already done before any request is made; the fetch below just uses what every visitor now has.",
      misses: {
        "1": "Half-right — `'use client'` puts this file in the bundle, but the leak lands where the bundler inlines a value.",
        "5": "The fetch sends the key at runtime — but it was already public at build time. Trace the credential, not the call."
      },
      missDefault: "Trace the credential, not the call. Where does the secret's value get baked in?"
    },
    repairLab: {
      filename: "app/api/chat/route.ts — your repair",
      instructions:
        "Rewrite it so the server owns the secret. Comments count for error and abuse handling (`// 429 after 20 req/min`) — the route, the server-only env, and validation must be real. Sketch, don't polish.",
      starter: `"use client";
const KEY = process.env.NEXT_PUBLIC_ANTHROPIC_KEY;

export async function askCoach(prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY ?? "" },
    body: JSON.stringify({ model: "claude-sonnet-4-6",
      max_tokens: 300, messages: [{ role: "user", content: prompt }] })
  });
  return res.json();
}`,
      blocks: [
        { code: "\"use client\";", trap: true },
        { code: "// app/api/chat/route.ts\nimport { NextResponse } from \"next/server\";\n\nexport async function POST(request: Request) {" },
        { code: "const KEY = process.env.NEXT_PUBLIC_ANTHROPIC_KEY;", trap: true },
        { code: "  const { prompt } = await request.json().catch(() => ({}));\n  if (typeof prompt !== \"string\" || prompt.length === 0 || prompt.length > 2000) {\n    return NextResponse.json({ error: \"invalid prompt\" }, { status: 400 });\n  }" },
        { code: "  try {\n    const res = await callProvider(process.env.ANTHROPIC_API_KEY!, prompt);\n    return NextResponse.json(res);" },
        { code: "  } catch (error) {\n    return NextResponse.json({ error: String(error.stack) }, { status: 500 });\n  }\n}", trap: true },
        { code: "  } catch (error) {\n    console.error(\"chat route:\", error); // details stay server-side\n    return NextResponse.json({ error: \"temporarily unavailable\" }, { status: 502 });\n  }\n}" },
        { code: "// 429 after 20 req/min per IP — add limiter before launch" },
        { code: "// client now calls fetch(\"/api/chat\", { method: \"POST\", body: JSON.stringify({ prompt }) })" }
      ],
      solution: `// app/api/chat/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { prompt } = await request.json().catch(() => ({}));
  if (typeof prompt !== "string" || prompt.length === 0 || prompt.length > 2000) {
    return NextResponse.json({ error: "invalid prompt" }, { status: 400 });
  }
  try {
    const res = await callProvider(process.env.ANTHROPIC_API_KEY!, prompt);
    return NextResponse.json(res);
  } catch (error) {
    console.error("chat route:", error); // details stay server-side
    return NextResponse.json({ error: "temporarily unavailable" }, { status: 502 });
  }
}
// still missing for scale: rate limiting per IP — name it before launch
// client now calls fetch("/api/chat", { method: "POST", body: JSON.stringify({ prompt }) })`
    },
    repair: { prompt: "Move the trusted work to the runtime that should own it.", choices: [] },
    transferLab: {
      instructions:
        "Capture the handoff rule — four quick answers, a sentence each is enough.",
      placeholder: "",
      fields: [
        { key: "secret", label: "Where does the Stripe secret key live?", ph: "server-only env, used in…",
          chips: ["Server-only env; only the checkout route and webhook handler read it.",
                  "NEXT_PUBLIC_STRIPE_KEY so both sides can use it.",
                  "In the repo .env, committed so the team has it."] },
        { key: "webhook", label: "Why do you trust the webhook?", ph: "signature verification via…",
          chips: ["constructEvent verifies the stripe-signature header against the webhook secret.",
                  "The URL is long and random — nobody will find it.",
                  "It comes from Stripe's IPs."] },
        { key: "validation", label: "What do you validate before marking an order paid?", ph: "event data, amount, order state…",
          chips: ["Event type, amount matches the order, order not already paid (idempotent on event id).",
                  "That the request body parses as JSON.",
                  "Nothing — Stripe already validated it."] },
        { key: "verify", label: "How do you verify before calling it shipped?", ph: "stripe cli replay, a duplicate-event test…",
          chips: ["stripe cli triggers the webhook locally, plus a replayed duplicate event test.",
                  "A real purchase with my own card in production.",
                  "Test keys worked in dev, so it ships."] }
      ]
    },
    transfer: {
      prompt: "Apply the same judgment to a new integration.",
      scenario:
        "A future AI session adds Stripe checkout plus a webhook that marks orders as paid. It works end-to-end with test keys during development.",
      rule:
        "Credentials and trusted state changes live server-side: secret keys in server-only env, webhooks verified by signature, inputs validated before anything irreversible happens.",
      choices: []
    }
  };
}

function buildGenericModule(decision) {
  return {
    id: "decision-ownership",
    name: decision.title,
    why: decision.why,
    takeaway: decision.seniorCheck,
    naive: decision.beginnerMiss,
    naiveFile: "session.diff",
    naiveCode: "// Naive version: accept the first working implementation without naming the decision.",
    breaks: "The human can ship the code but cannot evaluate, adapt, or debug the same decision later.",
    aiVersion: "The AI produced a working implementation in the session.",
    production: "Name the decision, compare alternatives, identify failure modes, and verify the code with evidence.",
    exercise: "Name one alternative, one failure mode, and one line of evidence from the diff.",
    patternHref: null,
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
    reviewCriteria: { repair: [], transfer: [] },
    artifact: {
      failure: "The learner can repeat the code but cannot adapt the decision when context changes.",
      standard: "Name the decision, compare alternatives, identify a failure mode, and verify the behavior."
    },
    nextPatterns: [],
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
        { label: "Name the decision, evidence, alternative, failure mode, and verification", description: "This standard shows the learner can reuse the decision.", feedback: "Correct.", correct: true },
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
