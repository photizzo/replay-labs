import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appDataDir, ensureAppDataDirs } from "../src/storage.js";

test("app data directory follows platform conventions and REPLAY_HOME override", () => {
  assert.equal(
    appDataDir({ platform: "darwin", homeDir: "/Users/test", env: {} }),
    "/Users/test/Library/Application Support/Replay Labs"
  );
  assert.equal(
    appDataDir({ platform: "linux", homeDir: "/home/test", env: {} }),
    "/home/test/.local/share/replay-labs"
  );
  assert.equal(
    appDataDir({ platform: "linux", homeDir: "/home/test", env: { XDG_DATA_HOME: "/data" } }),
    "/data/replay-labs"
  );
  assert.equal(
    appDataDir({ platform: "win32", homeDir: "C:\\Users\\test", env: { APPDATA: "C:\\Users\\test\\AppData\\Roaming" } }),
    "C:\\Users\\test\\AppData\\Roaming/Replay Labs"
  );
  assert.equal(
    appDataDir({ platform: "linux", homeDir: "/home/test", env: { REPLAY_HOME: "/tmp/replay-home" } }),
    "/tmp/replay-home"
  );
});

test("ensureAppDataDirs creates index, labs, cache, and logs directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "replay-data-"));
  const paths = await ensureAppDataDirs({ env: { REPLAY_HOME: root } });

  for (const path of [paths.indexDir, paths.labsDir, paths.generatedModulesDir, paths.logsDir]) {
    assert.equal((await stat(path)).isDirectory(), true);
  }
});

