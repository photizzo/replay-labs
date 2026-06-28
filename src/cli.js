#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { generateLearningReport } from "./report.js";
import { generateDecisionReplayHtml } from "./interaction.js";
import { buildSessionBundle } from "./pipeline.js";
import { ensureAppDataDirs } from "./storage.js";

function printUsage() {
  console.log(`Usage:
  replay-labs [app] [--port 4177] [--root .] [--no-open]
  replay-labs serve [--port 4177] [--root .] [--no-open]
  replay-labs scan [--out-dir ./replay-inbox] [--limit 80]
  replay-labs choose [--out-dir ./reports-recommended] [--generate]
  replay-labs lab --session /path/to/session.jsonl [--out-dir ./reports-session] [--generate]
  replay-labs session --goal "..." --diff ./session.diff --transcript ./session.md [--out-dir ./reports]
  replay-labs learn --goal "Add password reset" --diff ./session.diff --transcript ./session.md --out ./report.md
  replay-labs interact --goal "Add password reset" --diff ./session.diff --transcript ./session.md --out ./replay.html
  replay-labs patterns --out ./reports/patterns

replay-labs session analyzes the session, ranks its decisions,
generates one lab per known pattern plus the session map (index.html).

replay-labs scan is the Session Inbox: it discovers local Claude/Codex sessions
without upload or paste. replay-labs choose lets Replay Labs pick the suggested
lab session. replay-labs lab builds from one selected local session.

Options:
  --goal          Human-readable goal for the session
  --diff          Path to git diff or patch text
  --transcript    Path to transcript, JSONL, or markdown log
  --out           Output path (report file, lab html, or patterns directory)
  --out-dir       Output directory for session maps, inboxes, and labs
  --session       Path to a local Claude/Codex .jsonl session
  --limit         Max sessions to show in replay scan (default 80)
  --port          Port for replay-labs serve (default 4177)
  --root          Directory replay-labs serve exposes (default cwd)
  --no-open       Start the local app without opening a browser

Running replay-labs with no command starts the local app and opens the inbox.
replay-labs serve hosts the lab AND the review endpoint (POST /api/review).
Repair and transfer stages get real LLM review when served; opened as a
plain file they fall back to labeled heuristics.

The shorter replay command is also installed as an alias.
`);
}

function parseArgs(argv) {
  let [command, ...rest] = argv;
  if (command && command.startsWith("--")) {
    rest = argv;
    command = "app";
  }
  const args = { command };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true; // bare boolean flag, e.g. --generate
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

async function findOpenPort(preferredPort, host = "127.0.0.1") {
  const preferred = Number(preferredPort || 4177);
  if (preferred === 0) return 0;
  for (let port = preferred; port < preferred + 25; port += 1) {
    if (await portIsAvailable(port, host)) return port;
  }
  return 0;
}

async function portIsAvailable(port, host) {
  const server = createNetServer();
  server.unref();
  return new Promise((resolvePort) => {
    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

function openBrowser(url) {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

async function startLocalApp(args) {
  const { startServer } = await import("./server.js");
  const paths = await ensureAppDataDirs();
  const host = args.host || "127.0.0.1";
  const port = await findOpenPort(args.port || 4177, host);
  const server = startServer({
    root: args.root || process.cwd(),
    port,
    host,
    artifactRoot: paths.labsDir
  });
  await once(server, "listening");
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const inboxUrl = `http://${host}:${actualPort}/inbox`;
  console.log(`privacy: Replay Labs reads local AI session files and writes generated labs to ${paths.root}`);
  if (args.open !== false && args["no-open"] !== true) {
    openBrowser(inboxUrl);
  }
}

async function readTextFile(path, label) {
  try {
    return await readFile(resolve(path), "utf8");
  } catch (error) {
    throw new Error(`Could not read ${label} at ${path}: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help" || args.command === "--help") {
    printUsage();
    return;
  }

  if (!args.command || args.command === "app" || args.command === "serve") {
    await startLocalApp(args);
    return;
  }

  async function runSessionPipeline({ goal, diff, transcript, diffPath, transcriptPath, outDir, generate = false, maxGenerated = 1 }) {
    if (generate) console.log("Generating labs for unseen decisions (this calls the model)…");
    const { labs, files, indexPath } = await buildSessionBundle({
      goal, diff, transcript, diffPath, transcriptPath,
      outDir,
      generate,
      maxGenerated
    });
    for (const file of files) console.log(`Wrote ${file}`);
    console.log(`Session map: ${labs.length} decisions, ${labs.filter((l) => l.rich).length} labs available.`);
    console.log(`Open: ${indexPath}`);
    return labs;
  }

  if (args.command === "session") {
    for (const key of ["goal", "diff", "transcript"]) {
      if (!args[key]) throw new Error(`Missing required option --${key}`);
    }
    const diff = await readTextFile(args.diff, "diff");
    const transcript = await readTextFile(args.transcript, "transcript");
    await runSessionPipeline({
      goal: args.goal, diff, transcript,
      diffPath: args.diff, transcriptPath: args.transcript,
      outDir: resolve(args["out-dir"] || "./reports"),
      generate: args.generate === true || args.generate === "true",
      maxGenerated: parseInt(args["max-generated"] || "1", 10)
    });
    return;
  }

  if (args.command === "scan") {
    const { bestSessionFrom, discoverSessions, writeSessionInbox } = await import("./discovery.js");
    const sessions = await discoverSessions({ limit: parseInt(args.limit || "80", 10) });
    const outDir = resolve(args["out-dir"] || "./replay-inbox");
    await writeSessionInbox({ sessions, outDir });
    console.log(`Replay Labs found ${sessions.length} local AI sessions.`);
    const ready = sessions.filter((s) => s.richLabs > 0).length;
    const canGenerate = sessions.filter((s) => s.richLabs === 0 && s.hasConcreteEvidence).length;
    const mapOnly = sessions.filter((s) => s.richLabs === 0 && !s.hasConcreteEvidence).length;
    const strong = sessions.filter((s) => s.labPotential === "strong").length;
    const medium = sessions.filter((s) => s.labPotential === "medium").length;
    console.log(`${ready} ready labs, ${canGenerate} sessions with diff evidence, ${mapOnly} decision-map-only sessions.`);
    console.log(`${strong} sessions with enough evidence, ${medium} medium signal sessions.`);
    console.log(`Inbox: ${resolve(outDir, "index.html")}`);
    const best = bestSessionFrom(sessions);
    if (best) {
      console.log(`Try: ${best.command}`);
      console.log(`Or:  node ./src/cli.js choose --out-dir ./reports-recommended`);
    }
    return;
  }

  if (args.command === "choose") {
    const { chooseBestSession, loadDiscoveredSession } = await import("./discovery.js");
    const selected = await chooseBestSession({ limit: parseInt(args.limit || "80", 10) });
    if (!selected) throw new Error("No local Claude/Codex sessions found.");
    console.log(`Replay chose: ${selected.title}`);
    console.log(`Reason: ${selected.reason}`);
    const loaded = await loadDiscoveredSession(selected.path);
    console.log(`Loaded ${loaded.tool} session: ${loaded.stats.turns} turns, ${loaded.stats.edits} file signals`);
    await runSessionPipeline({
      goal: args.goal || loaded.goal,
      diff: loaded.diff,
      transcript: loaded.transcript,
      diffPath: selected.path,
      transcriptPath: selected.path,
      outDir: resolve(args["out-dir"] || "./reports-recommended"),
      generate: args.generate === true || args.generate === "true",
      maxGenerated: parseInt(args["max-generated"] || "1", 10)
    });
    return;
  }

  if (args.command === "lab") {
    if (!args.session) throw new Error("Missing required option --session (path to a local Claude/Codex .jsonl session)");
    const { loadDiscoveredSession } = await import("./discovery.js");
    const loaded = await loadDiscoveredSession(args.session);
    console.log(`Loaded ${loaded.tool} session: ${loaded.stats.turns} turns, ${loaded.stats.edits} file signals`);
    await runSessionPipeline({
      goal: args.goal || loaded.goal,
      diff: loaded.diff,
      transcript: loaded.transcript,
      diffPath: args.session,
      transcriptPath: args.session,
      outDir: resolve(args["out-dir"] || "./reports-selected"),
      generate: args.generate === true || args.generate === "true",
      maxGenerated: parseInt(args["max-generated"] || "1", 10)
    });
    return;
  }

  if (args.command === "ingest") {
    if (!args.session) throw new Error("Missing required option --session (path to a Claude Code .jsonl transcript)");
    const { ingestClaudeSession } = await import("./ingest.js");
    const { readdir, stat } = await import("node:fs/promises");
    let sessionPath = resolve(args.session);
    if ((await stat(sessionPath)).isDirectory()) {
      const files = (await readdir(sessionPath)).filter((f) => f.endsWith(".jsonl"));
      const stats = await Promise.all(files.map(async (f) => ({ f, m: (await stat(resolve(sessionPath, f))).mtimeMs })));
      stats.sort((a, b) => b.m - a.m);
      if (!stats.length) throw new Error(`No .jsonl transcripts in ${sessionPath}`);
      sessionPath = resolve(sessionPath, stats[0].f);
      console.log(`Latest session: ${sessionPath}`);
    }
    const raw = await readTextFile(sessionPath, "session transcript");
    const { goal, transcript, diff, stats } = ingestClaudeSession(raw);
    console.log(`Ingested: ${stats.records} records -> ${stats.turns} turns, ${stats.edits} edits across ${stats.files.length} files`);
    await runSessionPipeline({
      goal: args.goal || goal, diff, transcript,
      diffPath: sessionPath, transcriptPath: sessionPath,
      outDir: resolve(args["out-dir"] || "./reports-session"),
      generate: args.generate === true || args.generate === "true",
      maxGenerated: parseInt(args["max-generated"] || "1", 10)
    });
    return;
  }

  if (args.command === "patterns") {
    const { PATTERNS, generatePatternHtml } = await import("./patterns.js");
    const outDir = resolve(args.out || "./reports/patterns");
    await mkdir(outDir, { recursive: true });
    for (const slug of Object.keys(PATTERNS)) {
      const outPath = resolve(outDir, `${slug}.html`);
      await writeFile(outPath, generatePatternHtml(slug), "utf8");
      console.log(`Wrote ${outPath}`);
    }
    return;
  }

  if (args.command !== "learn" && args.command !== "interact") {
    throw new Error(`Unknown command: ${args.command}`);
  }

  for (const key of ["goal", "diff", "transcript", "out"]) {
    if (!args[key]) {
      throw new Error(`Missing required option --${key}`);
    }
  }

  const diff = await readTextFile(args.diff, "diff");
  const transcript = await readTextFile(args.transcript, "transcript");
  const input = {
    goal: args.goal,
    diff,
    transcript,
    diffPath: args.diff,
    transcriptPath: args.transcript
  };
  const report = args.command === "interact"
    ? generateDecisionReplayHtml(input)
    : generateLearningReport(input);

  const outPath = resolve(args.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, report, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(`replay: ${error.message}`);
  process.exitCode = 1;
});
