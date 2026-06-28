import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { review } from "./review.js";
import { bestSessionFrom, discoverSessions, generateInboxHtml, loadDiscoveredSession } from "./discovery.js";
import { buildSessionBundle, bundleSlug } from "./pipeline.js";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

export function startServer({ root = process.cwd(), port = 4177, host = "127.0.0.1", homeDir = undefined, artifactRoot = undefined } = {}) {
  const base = resolve(root);
  const labsBase = resolve(artifactRoot || resolve(base, "replay-built"));

  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/review") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; if (body.length > 200000) req.destroy(); });
      req.on("end", async () => {
        try {
          const { stage, submission, moduleId, rubric } = JSON.parse(body);
          const inlineRubric = rubric && rubric[stage] ? rubric[stage] : null;
          const result = await review(stage, submission, moduleId, inlineRubric);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    if (req.method === "GET" && (req.url === "/" || req.url === "" || req.url?.startsWith("/inbox"))) {
      try {
        const sessions = await discoverSessions({ limit: 80, homeDir });
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(generateInboxHtml(sessions, { interactive: true }));
      } catch (error) {
        json(res, 500, { error: error.message });
      }
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/api/sessions")) {
      try {
        const sessions = await discoverSessions({ limit: 80, homeDir });
        json(res, 200, { sessions });
      } catch (error) {
        json(res, 500, { error: error.message });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/choose-lab") {
      readJson(req, async (error, body) => {
        if (error) { json(res, 400, { error: error.message }); return; }
        try {
          const sessions = await discoverSessions({ limit: 300, homeDir });
          const selected = bestSessionFrom(sessions);
          if (!selected) throw new Error("No local Claude/Codex sessions found.");
          const result = await buildFromSession({
            base,
            artifactRoot: labsBase,
            sessionPath: selected.path,
            generate: body?.generate === true || (selected.richLabs === 0 && selected.hasConcreteEvidence),
            title: selected.title
          });
          json(res, 200, { ...result, title: selected.title, reason: selected.reason, sessionPath: selected.path });
        } catch (buildError) {
          json(res, 500, { error: buildError.message });
        }
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/build-lab") {
      readJson(req, async (error, body) => {
        if (error) { json(res, 400, { error: error.message }); return; }
        try {
          if (!body?.sessionPath) throw new Error("Missing sessionPath.");
          const result = await buildFromSession({
            base,
            artifactRoot: labsBase,
            sessionPath: body.sessionPath,
            generate: body.generate === true
          });
          json(res, 200, result);
        } catch (buildError) {
          json(res, 500, { error: buildError.message });
        }
      });
      return;
    }

    if (req.method === "GET" && req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(base, safePath);
    if (safePath === "/replay-built" || safePath.startsWith("/replay-built/")) {
      filePath = join(labsBase, safePath.replace(/^\/replay-built\/?/, ""));
    }
    if (!filePath.startsWith(base)) {
      if (!filePath.startsWith(labsBase)) {
        res.writeHead(403); res.end("forbidden"); return;
      }
    }
    const candidates = [filePath];
    for (const candidate of candidates) {
      try {
        const content = await readFile(candidate);
        res.writeHead(200, { "content-type": TYPES[extname(candidate)] || "application/octet-stream" });
        res.end(content);
        return;
      } catch { /* try next candidate */ }
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end(`not found: ${urlPath}`);
  });

  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`Replay Labs: http://${host}:${actualPort}/ (root: ${base})`);
    console.log(`session inbox: http://${host}:${actualPort}/inbox`);
    console.log(`local app data: ${labsBase}`);
    console.log("review endpoint: POST /api/review — uses the claude CLI when available, heuristic fallback otherwise");
  });
  return server;
}

async function buildFromSession({ base, artifactRoot, sessionPath, generate, title }) {
  const loaded = await loadDiscoveredSession(sessionPath);
  const slug = bundleSlug(title || loaded.goal || sessionPath);
  const outDir = resolve(artifactRoot, slug);
  const bundle = await buildSessionBundle({
    goal: loaded.goal,
    diff: loaded.diff,
    transcript: loaded.transcript,
    diffPath: sessionPath,
    transcriptPath: sessionPath,
    outDir,
    generate,
    maxGenerated: 1
  });
  const richCount = bundle.labs.filter((lab) => lab.rich).length;
  const primaryLab = bundle.labs.find((lab) => lab.rich);
  const hasDecisionSignals = bundle.labs.length > 0;
  const href = "/replay-built/" + normalize(bundle.indexPath.slice(artifactRoot.length)).replace(/^[/\\]/, "").replaceAll("\\", "/");
  const baseHref = href.replace(/\/index\.html$/, "");
  return {
    outDir,
    indexPath: bundle.indexPath,
    href,
    primaryLabHref: primaryLab ? `${baseHref}/labs/${primaryLab.module.id}.html` : null,
    labs: bundle.labs.length,
    richLabs: richCount,
    generated: Boolean(generate),
    noReadyLabs: richCount === 0,
    noDecisionSignals: !hasDecisionSignals,
    message: richCount > 0
      ? "Lab ready."
      : hasDecisionSignals
        ? "Replay Labs found decision signals, but not enough concrete code evidence to build a practice lab."
        : "Replay could not find enough decision evidence in this session."
  };
}

function readJson(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 500000) req.destroy();
  });
  req.on("end", () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (error) {
      callback(error);
    }
  });
}

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}
