import test from "node:test";
import assert from "node:assert/strict";
import { heuristicReview, computeOverall, getRubric, reviewPrompt } from "../src/review.js";

const GOOD_REPAIR = `'use client';
import { useEffect, useState } from "react";

export default function Page() {
  const [state, setState] = useState("ready");
  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) { setState("unsupported"); return; }
  }, []);
  async function start() {
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setState("denied"); }
  }
  if (state === "unsupported") return <p>Type your check-in instead.</p>;
  // verify: e2e with mic denied + a browser without SpeechRecognition
}`;

const NAIVE = `export default function Page() {
  const recognition = new window.SpeechRecognition();
  localStorage.setItem("goals", "[]");
}`;

test("heuristic review passes a production-shaped repair", () => {
  const result = heuristicReview("runtime-boundary", "repair", GOOD_REPAIR);
  assert.equal(result.overall, "PASS");
  assert.equal(result.reviewer, "heuristic");
});

test("heuristic review fails the unmodified naive code", () => {
  const result = heuristicReview("runtime-boundary", "repair", NAIVE);
  assert.equal(result.overall, "FAIL");
  const boundary = result.criteria.find((c) => c.id === "boundary");
  assert.equal(boundary.pass, false);
});

test("secret-boundary heuristic flags NEXT_PUBLIC keys and rewards a routed repair", () => {
  const leaky = `"use client";\nconst KEY = process.env.NEXT_PUBLIC_ANTHROPIC_KEY;`;
  const routed = `// app/api/chat/route.ts
export async function POST(request) {
  const { prompt } = await request.json();
  if (typeof prompt !== "string" || prompt.length > 2000) return new Response(null, { status: 400 });
  try {
    const res = await call(process.env.ANTHROPIC_API_KEY, prompt); // rate limit before launch
    return Response.json(res);
  } catch { return Response.json({ error: "unavailable" }, { status: 502 }); }
}`;
  assert.equal(heuristicReview("secret-boundary", "repair", leaky).overall, "FAIL");
  assert.equal(heuristicReview("secret-boundary", "repair", routed).overall, "PASS");
});

test("overall requires all required criteria plus one optional", () => {
  const rubric = getRubric("runtime-boundary", "repair");
  const allRequiredNoOptional = rubric.criteria.map((c) => ({ id: c.id, pass: c.required }));
  assert.equal(computeOverall(rubric, allRequiredNoOptional), "FAIL");
  const withOneOptional = rubric.criteria.map((c) => ({ id: c.id, pass: c.required || c.id === "denied" }));
  assert.equal(computeOverall(rubric, withOneOptional), "PASS");
});

test("review prompt embeds rubric and submission", () => {
  const prompt = reviewPrompt(getRubric("runtime-boundary", "transfer"), "my plan here");
  assert.match(prompt, /geolocation/);
  assert.match(prompt, /my plan here/);
  assert.match(prompt, /STRICT JSON/);
});

test("ingest reconstructs goal, transcript, and diff from a session jsonl", async () => {
  const { ingestClaudeSession } = await import("../src/ingest.js");
  const jsonl = [
    JSON.stringify({ type: "user", message: { content: "Build me a voice check-in page in Next.js" } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I will keep the voice UI in a client component." }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/Users/x/Projects/demo/app/page.tsx", old_string: "export default function Page() {}", new_string: "'use client';\nexport default function Page() { window.speechSynthesis.speak(u); }" } }] } }),
    JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } })
  ].join("\n");
  const out = ingestClaudeSession(jsonl);
  assert.match(out.goal, /voice check-in/);
  assert.match(out.transcript, /client component/);
  assert.match(out.diff, /\+'use client';/);
  assert.match(out.diff, /a\/app\/page\.tsx/);
  assert.equal(out.stats.edits, 1);
});

test("validateGeneratedModule blocks broken labs and passes good ones", async () => {
  const { assembleGeneratedModule, validateGeneratedModule } = await import("../src/generate.js");
  const decision = { id: "x-pattern", title: "X Pattern", patterns: [/dispatch/i] };
  const evidence = `diff --git a/bridge/main.go b/bridge/main.go
--- a/bridge/main.go
+++ b/bridge/main.go
@@
-func dispatch(x string) error {
-  if strings.Contains(x, "send") { return doSend(x) }
+func dispatch(raw []byte) error {
+  var cmd Command
+  if err := json.Unmarshal(raw, &cmd); err != nil { return err }
+  return doSend(cmd)
 }`;

  const goodGen = {
    name: "X Pattern", naiveCode: "func dispatch(s string) error {\n  if strings.Contains(s, \"a\") { return nil }\n  return nil\n}",
    failureTerminal: "runtime error: index out of range [1]",
    arbitrate: { wrong: { handle: "a", text: "surface fix", verdict: "no" }, right: { handle: "b", text: "real fix", verdict: "yes" } },
    repairBlocks: [
      { code: "func dispatch(b []byte) error {", trap: false },
      { code: "  var c Cmd; json.Unmarshal(b, &c)", trap: false },
      { code: "  switch c.Action { case \"a\": return doA() }", trap: false },
      { code: "  if strings.Contains(s, \"a\") {}", trap: true }
    ],
    repairSolution: "func dispatch(b []byte) error { var c Cmd; return json.Unmarshal(b,&c) }",
    reviewCriteria: { repair: [
      { id: "struct", name: "Defines a typed struct", required: true },
      { id: "unmarshal", name: "Calls Unmarshal", required: true },
      { id: "switch", name: "Switches on action", required: true },
      { id: "err", name: "Handles unmarshal error", required: false }
    ] },
    transferFields: [{ key: "a", label: "Q1" }, { key: "b", label: "Q2" }]
  };
  const good = assembleGeneratedModule(decision, goodGen, evidence);
  const goodCheck = validateGeneratedModule(good, evidence);
  assert.equal(goodCheck.ok, true, "good lab should pass: " + goodCheck.blockers.join(", "));

  // broken: arbitrate with two correct answers, trivial naive code
  const badGen = {
    name: "Bad", naiveCode: "x",
    arbitrate: { wrong: { handle: "a", text: "t", verdict: "v" }, right: { handle: "b", text: "t2", verdict: "v2" } }
  };
  const bad = assembleGeneratedModule(decision, badGen, evidence);
  bad.failureSim.arbitrate.comments[0].correct = true; // now two correct
  const badCheck = validateGeneratedModule(bad, evidence);
  assert.equal(badCheck.ok, false);
  assert.ok(badCheck.blockers.some((b) => /naiveCode|arbitrate/.test(b)));
});
