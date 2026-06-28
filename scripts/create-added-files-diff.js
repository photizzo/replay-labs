#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [outputPath, ...files] = process.argv.slice(2);

if (!outputPath || files.length === 0) {
  console.error("Usage: node scripts/create-added-files-diff.js <out.diff> <file...>");
  process.exit(1);
}

const chunks = [];

for (const file of files) {
  const text = await readFile(resolve(file), "utf8");
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
console.log(`Wrote ${destination}`);
