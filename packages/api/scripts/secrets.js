#!/usr/bin/env node
// Hands the API's two secrets from the repo's .env to wrangler - only STUDENT_KEY and PI_KEY, the
// rest of .env is for the Pis:
//   npm run deploy -w @cyber-dragon/api    deploys the Worker with them (it can't exist without them)
//   npm run secrets -w @cyber-dragon/api   just updates them, e.g. a new STUDENT_KEY for a lesson
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const apiDir = fileURLToPath(new URL("..", import.meta.url));
const envFile = path.join(apiDir, "../../.env");
if (!fs.existsSync(envFile)) {
  console.error("No .env at the repo root - cp .env.example .env and fill in the keys first");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envFile, "utf8"));
const secrets = { STUDENT_KEY: env.STUDENT_KEY, PI_KEY: env.PI_KEY };
const missing = Object.keys(secrets).filter((name) => !secrets[name]);
if (missing.length) {
  console.error(`Fill in ${missing.join(" and ")} in .env first (openssl rand -hex 16 makes a good key)`);
  process.exit(1);
}

const wrangler = path.join(path.dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin/wrangler.js");

if (process.argv.includes("--deploy")) {
  // wrangler only takes a new Worker's secrets as a file: a private one, deleted straight after
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plc-api-"));
  const file = path.join(dir, "secrets.json");
  try {
    fs.writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
    const { status } = spawnSync(process.execPath, [wrangler, "deploy", "--secrets-file", file], {
      cwd: apiDir,
      stdio: "inherit",
    });
    process.exitCode = status ?? 1;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
} else {
  // Piped, so the keys never touch the disk or a command line
  const upload = spawn(process.execPath, [wrangler, "secret", "bulk"], { cwd: apiDir, stdio: ["pipe", "inherit", "inherit"] });
  upload.stdin.end(JSON.stringify(secrets));
  upload.on("exit", (code) => process.exit(code ?? 1));
}
