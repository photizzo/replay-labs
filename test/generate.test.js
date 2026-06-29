import test from "node:test";
import assert from "node:assert/strict";
import { hasUsableDiffEvidence, validateGeneratedModule } from "../src/generate.js";

test("generated labs reject Codex pseudo-diff evidence", () => {
  const pseudo = `@@
+// Codex session touched or inspected this file; use transcript evidence for details.
diff --git a/app/qa_release_gate_report.json b/app/qa_release_gate_report.json
--- a/app/qa_release_gate_report.json
+++ b/app/qa_release_gate_report.json`;

  assert.equal(hasUsableDiffEvidence(pseudo), false);

  const module = {
    naiveCode: "function gate(x) { return x.includes('pass'); }",
    failureSim: {
      terminal: "$ test\nfailure",
      arbitrate: {
        comments: [
          { text: "trim it", correct: false, verdict: "wrong layer" },
          { text: "validate a protocol", correct: true, verdict: "right" }
        ]
      }
    },
    rubric: {
      repair: {
        criteria: [
          { id: "a", required: true },
          { id: "b", required: true },
          { id: "c", required: false }
        ]
      }
    },
    repairLab: {
      blocks: [
        { code: "const schema = {}", trap: false },
        { code: "const parsed = JSON.parse(x)", trap: false },
        { code: "return parsed", trap: false },
        { code: "return x.includes('pass')", trap: true }
      ],
      solution: "const parsed = JSON.parse(x); return parsed.verdict;"
    },
    transferLab: {
      fields: [
        { key: "schema", label: "Schema" },
        { key: "failure", label: "Failure" }
      ]
    }
  };

  const check = validateGeneratedModule(module, pseudo);
  assert.equal(check.ok, false);
  assert.match(check.blockers.join("\n"), /does not include concrete changed lines/);
});

test("generated labs accept concrete changed diff evidence", () => {
  const real = `diff --git a/src/pipeline.js b/src/pipeline.js
--- a/src/pipeline.js
+++ b/src/pipeline.js
@@
-  if (text.includes("pass")) return { status: "pass" };
+  const parsed = JSON.parse(text);
+  if (!["pass", "fail"].includes(parsed.verdict)) throw new Error("bad verdict");`;

  assert.equal(hasUsableDiffEvidence(real), true);
});

test("generated labs reject structurally valid but ungrounded content", () => {
  const pandasEvidence = `diff --git a/article.md b/article.md
--- a/article.md
+++ b/article.md
@@
+stock_df = stock_df.stack(level="Ticker")
+stock_df = stock_df.reset_index()
+stock_df = stock_df.sort_values(by=["Ticker", "Date"])`;

  const module = {
    name: "Token Lifecycle",
    takeaway: "Store password reset tokens hashed and expire them.",
    why: "A reset token is temporary authority.",
    naive: "Keep a reset token forever.",
    naiveCode: "function reset(token) {\n  return db.user.update({ token });\n}",
    breaks: "Tokens can be reused.",
    aiVersion: "The implementation introduced reset tokens.",
    production: "Hash and expire each token.",
    challenge: { pattern: "Token Lifecycle", smell: "Immortal token row", proof: "Transfer" },
    spot: { targetRe: "stock_df", targets: [{ re: "stock_df" }] },
    failureSim: {
      terminal: "$ test\nError: token reused",
      arbitrate: {
        comments: [
          { text: "The form label is unclear.", correct: false, verdict: "Not the security boundary." },
          { text: "The token lifecycle is missing expiry.", correct: true, verdict: "That is the authority boundary." }
        ]
      }
    },
    rubric: {
      repair: {
        criteria: [
          { id: "hash", required: true },
          { id: "expire", required: true },
          { id: "verify", required: false }
        ]
      }
    },
    repairLab: {
      blocks: [
        { code: "const hashed = hash(token)", trap: false },
        { code: "if (expired) throw new Error('expired')", trap: false },
        { code: "await consumeToken(hashed)", trap: false },
        { code: "return token", trap: true }
      ],
      solution: "const hashed = hash(token);\nif (expired) throw new Error('expired');\nawait consumeToken(hashed);"
    },
    transferLab: {
      fields: [
        { key: "authority", label: "Temporary authority" },
        { key: "expiry", label: "Expiry" }
      ]
    },
    transfer: { rule: "Expire temporary authority." }
  };

  const check = validateGeneratedModule(module, pandasEvidence);
  assert.equal(check.ok, false);
  assert.match(check.blockers.join("\n"), /not grounded/);
});
