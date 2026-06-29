import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("replay-labs --help prints usage instead of starting the app", async () => {
  const result = await runNode(["src/cli.js", "--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /replay-labs scan/);
  assert.doesNotMatch(result.stdout, /Replay Labs: http:\/\//);
  assert.equal(result.stderr, "");
});

function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
