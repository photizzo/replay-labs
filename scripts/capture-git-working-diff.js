#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const [repoPath, outputPath, ...paths] = process.argv.slice(2);

if (!repoPath || !outputPath) {
  console.error("Usage: node scripts/capture-git-working-diff.js <repo> <out.diff> [path...]");
  process.exit(1);
}

const repo = resolve(repoPath);
const selectedPaths = paths.length > 0 ? paths : ["."];
const chunks = [];

try {
  const trackedDiff = execFileSync("git", ["diff", "--", ...selectedPaths], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  if (trackedDiff.trim()) chunks.push(trackedDiff.trimEnd());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", ...selectedPaths], {
  cwd: repo,
  encoding: "utf8"
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.includes(".env") && !file.includes("node_modules"));

for (const file of untracked) {
  const text = await readFile(resolve(repo, file), "utf8").catch(() => null);
  if (text == null) continue;
  const lines = text.split("\n");
  chunks.push(`diff --git a/${file} b/${file}`);
  chunks.push("new file mode 100644");
  chunks.push("index 0000000..0000000");
  chunks.push("--- /dev/null");
  chunks.push(`+++ b/${file}`);
  chunks.push(`@@ -0,0 +1,${lines.length} @@`);
  for (const line of lines) {
    chunks.push(`+${line}`);
  }
}

const destination = resolve(outputPath);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${chunks.join("\n")}\n`, "utf8");
console.log(`Wrote ${destination} from ${relative(process.cwd(), repo) || repo}`);
