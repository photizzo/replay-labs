import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function buildSessionBundle({
  goal,
  diff,
  transcript,
  diffPath,
  transcriptPath,
  outDir,
  generate = false,
  maxGenerated = 1
}) {
  const { generateSessionLabs } = await import("./interaction.js");
  const { generateOverviewHtml } = await import("./overview.js");
  const { generatePatternHtml } = await import("./patterns.js");
  const destination = resolve(outDir);
  const { labs } = await generateSessionLabs({
    goal,
    diff,
    transcript,
    diffPath,
    transcriptPath,
    generate,
    cacheDir: resolve(destination, "generated"),
    maxGenerated
  });

  await mkdir(resolve(destination, "labs"), { recursive: true });
  await mkdir(resolve(destination, "patterns"), { recursive: true });

  const files = [];
  const expectedLabFiles = new Set(labs.filter((l) => l.rich).map((lab) => `${lab.module.id}.html`));
  const expectedPatternFiles = new Set(labs
    .filter((lab) => lab.rich && lab.module.patternHref)
    .map((lab) => `${lab.module.id}.html`));
  for (const entry of await readdir(resolve(destination, "labs")).catch(() => [])) {
    if (entry.endsWith(".html") && !expectedLabFiles.has(entry)) {
      await rm(resolve(destination, "labs", entry), { force: true });
    }
  }
  for (const entry of await readdir(resolve(destination, "patterns")).catch(() => [])) {
    if (entry.endsWith(".html") && !expectedPatternFiles.has(entry)) {
      await rm(resolve(destination, "patterns", entry), { force: true });
    }
  }

  for (const lab of labs.filter((l) => l.rich)) {
    const labPath = resolve(destination, "labs", `${lab.module.id}.html`);
    await writeFile(labPath, lab.html, "utf8");
    files.push(labPath);
  }
  for (const slug of [...expectedPatternFiles].map((file) => file.replace(/\.html$/, ""))) {
    const patternPath = resolve(destination, "patterns", `${slug}.html`);
    await writeFile(patternPath, generatePatternHtml(slug), "utf8");
    files.push(patternPath);
  }
  const indexPath = resolve(destination, "index.html");
  await writeFile(indexPath, generateOverviewHtml({ goal, labs }), "utf8");
  files.push(indexPath);

  return {
    outDir: destination,
    indexPath,
    labs,
    files
  };
}

export function bundleSlug(value) {
  return String(value || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "session";
}
