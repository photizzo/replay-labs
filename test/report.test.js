import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSession, generateLearningReport } from "../src/report.js";
import { generateDecisionReplayHtml } from "../src/interaction.js";

test("generates a structured learning report from diff and transcript", () => {
  const report = generateLearningReport({
    goal: "Add password reset flow",
    diff: `diff --git a/src/auth.js b/src/auth.js
index 111..222 100644
--- a/src/auth.js
+++ b/src/auth.js
@@
+export function createResetToken(user) {
+  return { token: "abc", expiresAt: Date.now() + 1000 };
+}
diff --git a/src/auth.test.js b/src/auth.test.js
--- a/src/auth.test.js
+++ b/src/auth.test.js
@@
+test("expires reset token", () => {
+  expect(true).toBe(true);
+});`,
    transcript: `User: Add password reset.
Assistant: I will add token expiry and tests.
Command: npm test`,
    diffPath: "fixture.diff",
    transcriptPath: "fixture.md"
  });

  assert.match(report, /# Session Understanding Report/);
  assert.match(report, /Decision Cards/);
  assert.match(report, /Treat tokens as lifecycle-bound state/);
  assert.match(report, /Understanding Checklist/);
  assert.match(report, /Quiz/);
});

test("pandas reset_index does not trigger token lifecycle", () => {
  const analysis = analyzeSession({
    goal: "Explain a pandas stock article",
    diff: `diff --git a/article.md b/article.md
--- a/article.md
+++ b/article.md
@@
+stock_df = stock_df.stack(level="Ticker")
+stock_df = stock_df.reset_index()
+stock_df = stock_df.sort_values(by=["Ticker", "Date"])`,
    transcript: "The work reshaped yfinance output from wide to long.",
    diffPath: "article.diff",
    transcriptPath: "article.md"
  });

  assert.equal(analysis.decisions.some((decision) => decision.id === "token-lifecycle"), false);
});

test("generates an interactive practice lab from session evidence", () => {
  const html = generateDecisionReplayHtml({
    goal: "Build a voice accountability demo",
    diff: `diff --git a/app/page.tsx b/app/page.tsx
--- a/app/page.tsx
+++ b/app/page.tsx
@@
+'use client';
+window.speechSynthesis.speak(new SpeechSynthesisUtterance("Good morning"));
+localStorage.setItem("goals", JSON.stringify([]));`,
    transcript: `User: Build the check-in loop.
Assistant: I will keep the voice UI in a client component.`,
    diffPath: "voice.diff",
    transcriptPath: "voice.md"
  });

  assert.match(html, /Replay Labs/);
  assert.match(html, /diagnose, break, repair, transfer/);
  assert.match(html, /Diagnose the decision/);
  assert.match(html, /Predict what breaks/);
  assert.match(html, /Repair the design/);
  assert.match(html, /Transfer to a new situation/);
  assert.match(html, /Session Evidence/);
  assert.match(html, /Pattern/);
  assert.match(html, /Smell/);
  assert.match(html, /Check/);
  assert.match(html, /Pass condition/);
  assert.match(html, /replay check/);
  assert.match(html, /Look for the decision type/);
  assert.match(html, /Reuse Notes/);
  assert.match(html, /Failure signature/);
  assert.match(html, /Completion standard/);
  assert.match(html, /This lab focuses on one decision from the session/);
  assert.match(html, /Patch/);
});
