#!/usr/bin/env node
// Builds the "Pi" image. CACHEBUST changes every run, so the image always clones the branch's
// latest push. A Node script, not an npm one-liner, so it runs on Windows too
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const args = ["build", "-t", "cyber-dragon-pi", "--build-arg", `CACHEBUST=${Date.now()}`];

const { status } = spawnSync("docker", [...args, ...process.argv.slice(2), repoRoot], {
  stdio: "inherit",
});
process.exit(status ?? 1);
