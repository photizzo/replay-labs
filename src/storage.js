import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function appDataDir({ platform = process.platform, env = process.env, homeDir = homedir() } = {}) {
  if (env.REPLAY_HOME) return env.REPLAY_HOME;
  if (platform === "darwin") return join(homeDir, "Library", "Application Support", "Replay Labs");
  if (platform === "win32") return join(env.APPDATA || join(homeDir, "AppData", "Roaming"), "Replay Labs");
  return join(env.XDG_DATA_HOME || join(homeDir, ".local", "share"), "replay-labs");
}

export function appPaths(options = {}) {
  const root = appDataDir(options);
  return {
    root,
    indexDir: join(root, "index"),
    labsDir: join(root, "labs"),
    cacheDir: join(root, "cache"),
    generatedModulesDir: join(root, "cache", "generated-modules"),
    logsDir: join(root, "logs")
  };
}

export async function ensureAppDataDirs(options = {}) {
  const paths = appPaths(options);
  await Promise.all([
    mkdir(paths.indexDir, { recursive: true }),
    mkdir(paths.labsDir, { recursive: true }),
    mkdir(paths.generatedModulesDir, { recursive: true }),
    mkdir(paths.logsDir, { recursive: true })
  ]);
  return paths;
}

