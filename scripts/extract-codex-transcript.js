#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [inputPath, outputPath, ...flags] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/extract-codex-transcript.js <session.jsonl> <out.md> [--after text]");
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
      if (part.type === "input_text" || part.type === "output_text") return part.text || "";
      if (part.type === "input_image") return "[image input]";
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function cleanText(text) {
  return text
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/g, "[environment context omitted]")
    .replace(/<codex_internal_context[\s\S]*?<\/codex_internal_context>/g, "[internal continuation context omitted]")
    .trim();
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

  if (item.type !== "response_item") continue;
  const payload = item.payload;
  if (!payload) continue;

  if (payload.type === "message") {
    if (payload.role !== "user" && payload.role !== "assistant") continue;

    const text = cleanText(contentText(payload.content));
    if (!text || text.startsWith("<permissions instructions>")) continue;

    extracted.push({
      role: payload.role,
      text,
      markdown: `## ${capitalize(payload.role)}\n\n${truncate(text)}`
    });
    continue;
  }

  if (payload.type === "function_call") {
    const args = safeJson(payload.arguments);
    const command = args?.cmd || args?.command || payload.name;
    extracted.push({
      role: "tool",
      text: command,
      markdown: `## Tool Call: ${payload.name}\n\n\`\`\`text\n${truncate(command, 900)}\n\`\`\``
    });
    continue;
  }

  if (payload.type === "function_call_output") {
    extracted.push({
      role: "tool",
      text: payload.output || "",
      markdown: `## Tool Output\n\n\`\`\`text\n${truncate(payload.output || "", 900)}\n\`\`\``
    });
  }
}

const start = findStartIndex(extracted, afterText);
const sections = extracted.slice(start).map((item) => item.markdown);
const filterNote = afterText ? `\nFiltered after first item containing: \`${afterText}\`\n` : "";
const output = `# Extracted Codex Transcript\n\nSource: \`${inputPath}\`${filterNote}\n${sections.join("\n\n")}\n`;
const destination = resolve(outputPath);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, output, "utf8");
console.log(`Wrote ${destination}`);

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function findStartIndex(items, marker) {
  if (!marker) return 0;
  const index = items.findIndex((item) => item.text.includes(marker));
  return index >= 0 ? index : 0;
}
