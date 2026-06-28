#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [inputPath, outputPath, ...flags] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/extract-claude-transcript.js <session.jsonl> <out.md> [--after text]");
  process.exit(1);
}

const afterIndex = flags.indexOf("--after");
const afterText = afterIndex >= 0 ? flags[afterIndex + 1] : null;

function contentText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text || "";
      if (part.type === "tool_use") return `[tool use: ${part.name}] ${JSON.stringify(part.input || {}).slice(0, 500)}`;
      if (part.type === "tool_result") return `[tool result] ${stringifyToolResult(part.content).slice(0, 700)}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function stringifyToolResult(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => item.text || JSON.stringify(item)).join("\n");
  return JSON.stringify(content || "");
}

function truncate(text, max = 1600) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}\n\n[truncated]`;
}

const raw = await readFile(resolve(inputPath), "utf8");
const extracted = [];

for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  let item;
  try {
    item = JSON.parse(line);
  } catch {
    continue;
  }

  const message = item.message;
  if (!message?.role) continue;
  if (message.role !== "user" && message.role !== "assistant") continue;

  const text = contentText(message.content).trim();
  if (!text || text.includes("<system-reminder>")) continue;
  extracted.push({
    role: message.role,
    text,
    markdown: `## ${capitalize(message.role)}\n\n${truncate(text)}`
  });
}

const start = findStartIndex(extracted, afterText);
const sections = extracted.slice(start).map((item) => item.markdown);
const filterNote = afterText ? `\nFiltered after first item containing: \`${afterText}\`\n` : "";
const output = `# Extracted Claude Transcript\n\nSource: \`${inputPath}\`${filterNote}\n${sections.join("\n\n")}\n`;
const destination = resolve(outputPath);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, output, "utf8");
console.log(`Wrote ${destination}`);

function findStartIndex(items, marker) {
  if (!marker) return 0;
  const index = items.findIndex((item) => item.text.includes(marker));
  return index >= 0 ? index : 0;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
