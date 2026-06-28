import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import {
  chooseBestSession,
  discoverSessions,
  loadDiscoveredSession,
  writeSessionInbox
} from "../src/discovery.js";
import { startServer } from "../src/server.js";

test("discovers local Claude and Codex sessions without upload/paste", async () => {
  const home = await mkdtemp(join(tmpdir(), "replay-discovery-"));
  const claudeDir = join(home, ".claude", "projects", "-Users-test-Projects-billing");
  const codexDir = join(home, ".codex", "sessions", "2026", "06", "20");
  await mkdir(claudeDir, { recursive: true });
  await mkdir(codexDir, { recursive: true });

  const claudePath = join(claudeDir, "claude-session.jsonl");
  await writeFile(claudePath, [
    JSON.stringify({ type: "user", message: { content: "Add a voice check-in page with browser speech support" } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I will keep the browser APIs behind a client boundary." }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/Users/test/Projects/billing/app/page.tsx", old_string: "export default function Page() {}", new_string: "'use client';\nexport default function Page() { window.speechSynthesis.speak(u); }" } }] } })
  ].join("\n"), "utf8");

  const codexPath = join(codexDir, "codex-session.jsonl");
  await writeFile(codexPath, [
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Review the product analytics dashboard PRD and tighten the success metric." }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "I will inspect the PRD and focus the metric on activation quality." }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "function_call", name: "exec_command", arguments: JSON.stringify({ cmd: "sed -n '1,120p' docs/prd.md" }) } })
  ].join("\n"), "utf8");

  const sessions = await discoverSessions({ homeDir: home, limit: 10 });
  assert.equal(sessions.length, 2);
  const claude = sessions.find((s) => s.tool === "claude");
  const codex = sessions.find((s) => s.tool === "codex");
  assert.ok(claude);
  assert.ok(codex);
  assert.equal(claude.labPotential, "strong");
  assert.equal(claude.hasConcreteEvidence, true);
  assert.equal(codex.labPotential, "weak");
  assert.equal(codex.hasConcreteEvidence, false);
  assert.match(claude.title, /voice check-in/);
  assert.ok(claude.decisions.some((d) => /browser-only voice/.test(d.title)));

  const selected = await chooseBestSession({ homeDir: home, limit: 10 });
  assert.equal(selected.path, claudePath);

  const loaded = await loadDiscoveredSession(claudePath);
  assert.match(loaded.diff, /'use client'/);
  assert.match(loaded.transcript, /client boundary/);

  const inboxDir = join(home, "inbox");
  await writeSessionInbox({ sessions, outDir: inboxDir });
  const inboxSessions = await import("node:fs/promises").then((fs) =>
    fs.readFile(join(inboxDir, "sessions.json"), "utf8")
  );
  assert.match(inboxSessions, /claude-session/);
});

test("served inbox can build a lab from a discovered local session", async () => {
  const home = await mkdtemp(join(tmpdir(), "replay-server-home-"));
  const root = await mkdtemp(join(tmpdir(), "replay-server-root-"));
  const claudeDir = join(home, ".claude", "projects", "-Users-test-Projects-voice-demo");
  const codexDir = join(home, ".codex", "sessions", "2026", "06", "20");
  await mkdir(claudeDir, { recursive: true });
  await mkdir(codexDir, { recursive: true });

  const sessionPath = join(claudeDir, "voice.jsonl");
  await writeFile(sessionPath, [
    JSON.stringify({ type: "user", message: { content: "Build a voice check-in page with localStorage and speech synthesis" } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I will keep browser-only APIs in a client component." }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/Users/test/Projects/voice-demo/app/page.tsx", old_string: "export default function Page() {}", new_string: "'use client';\nexport default function Page() { localStorage.setItem(\"x\", \"1\"); window.speechSynthesis.cancel(); }" } }] } })
  ].join("\n"), "utf8");

  const codexPath = join(codexDir, "pseudo-evidence.jsonl");
  await writeFile(codexPath, [
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Define a small protocol between the model and app logic. Make failure behavior explicit." }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "The model output should have a predictable protocol and failure behavior should be explicit." }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "function_call", name: "exec_command", arguments: JSON.stringify({ cmd: "sed -n '1,120p' app/qa_release_gate_report.json" }) } })
  ].join("\n"), "utf8");

  const server = startServer({ root, port: 0, homeDir: home });
  await once(server, "listening");
  const port = server.address().port;

  try {
    const inbox = await fetch(`http://127.0.0.1:${port}/inbox`);
    assert.equal(inbox.status, 200);
    const inboxHtml = await inbox.text();
    assert.match(inboxHtml, /Start suggested ready lab/);
    assert.match(inboxHtml, /Mission approach/);
    assert.match(inboxHtml, /data-filter="ready"/);
    assert.match(inboxHtml, /voice-demo/);
    assert.match(inboxHtml, /Claude/);
    assert.match(inboxHtml, /Codex/);
    assert.match(inboxHtml, /decision signals · needs changed lines/);
    assert.match(inboxHtml, /file references/);
    assert.match(inboxHtml, /data-build/);
    assert.match(inboxHtml, /No upload required/);
    assert.doesNotMatch(inboxHtml, /type=["']file["']/);

    const rootPage = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(rootPage.status, 200);
    assert.match(await rootPage.text(), /Replay Labs found/);

    const choose = await fetch(`http://127.0.0.1:${port}/api/choose-lab`, {
      method: "POST"
    });
    assert.equal(choose.status, 200);
    const chosen = await choose.json();
    assert.equal(chosen.richLabs > 0, true);
    assert.equal(chosen.generated, false);
    assert.equal(chosen.sessionPath, sessionPath);
    assert.match(chosen.href, /replay-built/);

    const build = await fetch(`http://127.0.0.1:${port}/api/build-lab`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionPath })
    });
    assert.equal(build.status, 200);
    const payload = await build.json();
    assert.equal(payload.richLabs > 0, true);
    assert.match(payload.href, /replay-built/);
    assert.match(payload.primaryLabHref, /labs\/runtime-boundary\.html/);

    const map = await fetch(`http://127.0.0.1:${port}${payload.href}`);
    assert.equal(map.status, 200);
    assert.match(await map.text(), /Session map/);

    const weakBuild = await fetch(`http://127.0.0.1:${port}/api/build-lab`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionPath: codexPath, generate: true })
    });
    assert.equal(weakBuild.status, 200);
    const weakPayload = await weakBuild.json();
    assert.equal(weakPayload.richLabs, 0);
    assert.equal(weakPayload.noReadyLabs, true);
    assert.match(weakPayload.href, /replay-built/);

    const weakMap = await fetch(`http://127.0.0.1:${port}${weakPayload.href}`);
    assert.equal(weakMap.status, 200);
    const weakMapHtml = await weakMap.text();
    assert.match(weakMapHtml, /no practice lab is ready yet/i);
    assert.match(weakMapHtml, /Choose another session/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("inbox keeps Codex sessions visible when Claude sessions dominate", async () => {
  const home = await mkdtemp(join(tmpdir(), "replay-balanced-home-"));
  const claudeDir = join(home, ".claude", "projects", "-Users-test-Projects-many-claude");
  const codexDir = join(home, ".codex", "sessions", "2026", "06", "28");
  await mkdir(claudeDir, { recursive: true });
  await mkdir(codexDir, { recursive: true });

  for (let i = 0; i < 20; i += 1) {
    await writeFile(join(claudeDir, `voice-${i}.jsonl`), [
      JSON.stringify({ type: "user", message: { content: `Build voice check-in ${i} with browser speech support` } }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I will keep browser APIs behind a client boundary." }] } }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: `/Users/test/Projects/many-claude/app/page-${i}.tsx`, old_string: "export default function Page() {}", new_string: "'use client';\nexport default function Page() { window.speechSynthesis.cancel(); }" } }] } })
    ].join("\n"), "utf8");
  }

  await writeFile(join(codexDir, "codex-visible.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { cwd: "/Users/test/Projects/replay" } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Review this product decision and make failure behavior explicit." }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "We should clarify the failure behavior and verification path." }] } })
  ].join("\n"), "utf8");

  const sessions = await discoverSessions({ homeDir: home, limit: 10 });
  assert.ok(sessions.some((session) => session.tool === "codex"));
  assert.ok(sessions.some((session) => session.project.endsWith("Projects/replay")));

  const html = await import("node:fs/promises").then(async () => {
    const { generateInboxHtml } = await import("../src/discovery.js");
    return generateInboxHtml(sessions, { interactive: true });
  });
  assert.match(html, /Projects\/replay/);
  assert.match(html, /1 Codex/);
  assert.match(html, /Mission mode is the target experience/);
});
