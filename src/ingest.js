// Ingest a real Claude Code session transcript (.jsonl) into the inputs the
// lab pipeline needs: goal, transcript text, and a reconstructed diff.
//
// Ground truth from auditing real transcripts (2026-06):
// - thinking blocks are persisted empty -> mine visible text only
// - most "user" records are tool_results, not humans -> filter hard
// - the diff is reconstructable from Edit/Write tool_use inputs
// - sessions can end on rate-limit corpses and API errors -> tolerate junk lines

const MAX_TRANSCRIPT_CHARS = 60000;
const MAX_TURN_CHARS = 700;
const MAX_WRITE_LINES = 120;

export function ingestClaudeSession(jsonlText) {
  const records = [];
  for (const line of jsonlText.split("\n")) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); } catch { /* tolerate junk lines */ }
  }

  let goal = null;
  const turns = [];
  const diffParts = [];
  const filesTouched = new Set();

  for (const record of records) {
    const content = record?.message?.content;
    if (record.type === "user") {
      const text = humanText(content);
      if (!text) continue;
      if (!goal && text.length > 20) goal = text.slice(0, 200).replace(/\s+/g, " ").trim();
      turns.push("User: " + clip(text));
    } else if (record.type === "assistant" && Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "text" && block.text?.trim()) {
          turns.push("Assistant: " + clip(block.text));
        } else if (block?.type === "tool_use") {
          const part = diffFromToolUse(block);
          if (part) {
            diffParts.push(part.text);
            filesTouched.add(part.file);
          }
        }
      }
    }
  }

  let transcript = turns.join("\n");
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    // Keep the opening (goal context) and the most recent work.
    transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS / 2) +
      "\n[...session truncated...]\n" +
      transcript.slice(-MAX_TRANSCRIPT_CHARS / 2);
  }

  return {
    goal: goal || "Untitled session",
    transcript,
    diff: diffParts.join("\n"),
    stats: {
      records: records.length,
      turns: turns.length,
      edits: diffParts.length,
      files: [...filesTouched]
    }
  };
}

function clip(text) {
  const cleaned = String(text).trim();
  return cleaned.length > MAX_TURN_CHARS ? cleaned.slice(0, MAX_TURN_CHARS) + " […]" : cleaned;
}

function humanText(content) {
  // Real human turns are strings or text blocks; tool_results also arrive as
  // type:"user" records and must be dropped.
  if (typeof content === "string") return isMachine(content) ? null : content;
  if (!Array.isArray(content)) return null;
  const texts = content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text);
  if (!texts.length) return null;
  const joined = texts.join("\n");
  return isMachine(joined) ? null : joined;
}

function isMachine(text) {
  const t = text.trim();
  return /^<(command-|local-command|task-notification|system-reminder|ide_)/.test(t) ||
    /^\[Request interrupted/.test(t) ||
    /^Caveat: The messages below/.test(t) ||
    /^<analysis>|^<summary>/.test(t) ||
    /Base directory for this skill:/.test(t); // skill payloads arrive as user records
}

function diffFromToolUse(block) {
  const input = block.input || {};
  const file = relPath(input.file_path || input.notebook_path || "");
  if (!file) return null;

  if (block.name === "Edit" && (input.old_string || input.new_string)) {
    const oldLines = String(input.old_string || "").split("\n").map((l) => "-" + l);
    const newLines = String(input.new_string || "").split("\n").map((l) => "+" + l);
    return {
      file,
      text: `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@\n${oldLines.join("\n")}\n${newLines.join("\n")}`
    };
  }
  if (block.name === "Write" && input.content) {
    const lines = String(input.content).split("\n").slice(0, MAX_WRITE_LINES).map((l) => "+" + l);
    return {
      file,
      text: `diff --git a/${file} b/${file}\nnew file\n--- /dev/null\n+++ b/${file}\n@@\n${lines.join("\n")}`
    };
  }
  return null;
}

function relPath(absPath) {
  if (!absPath) return null;
  // Strip everything up to and including the project directory.
  const match = String(absPath).match(/(?:Projects|repos|src|code)\/[^/]+\/(.+)$/);
  return match ? match[1] : String(absPath).split("/").slice(-3).join("/");
}
