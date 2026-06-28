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
