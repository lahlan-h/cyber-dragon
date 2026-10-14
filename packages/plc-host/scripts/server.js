#!/usr/bin/env node
// Starts the server container. Given an RS-485 adapter's port (Linux only), it passes that adapter
// into the container so the server can poll the PLC's state: npm run server -- /dev/ttyUSB1
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const CONTAINER = "cyber-dragon-pi";
const [rs485] = process.argv.slice(2).filter(Boolean);

const args = ["run", "--rm", "--init", "--name", CONTAINER, "-p", "3000:3000"];
args.push("--add-host=host.docker.internal:host-gateway");

// The server remembers the last program it flashed here, so PLC state reporting survives restarts
const stateDir = path.join(os.homedir(), ".cyber-dragon");
fs.mkdirSync(stateDir, { recursive: true });
args.push("-v", `${stateDir}:/data`, "-e", "STATE_DIR=/data");

// From the repo's .env: which PLC this is, and where and how to send its state. Only these go in
// (not STUDENT_KEY), and through docker's environment, so the key isn't on its command line
const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));
const settings = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, "utf8")) : {};
const env = { ...process.env };
for (const name of ["PLC_ID", "API_URL", "PI_KEY"]) {
  if (!settings[name]) continue;
  env[name] = settings[name];
  args.push("-e", name);
}

if (rs485) {
  if (process.platform !== "linux") {
    console.error("The RS-485 port needs Linux - Docker on macOS and Windows can't see USB devices");
    process.exit(1);
  }
  args.push("--device", `${rs485}:/dev/ttyRS485`, "-e", "MODBUS_PORT=/dev/ttyRS485");
}

spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" }); // a leftover one would hold port 3000
const docker = spawn("docker", [...args, CONTAINER], { stdio: "inherit", env });

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => docker.kill(signal));
docker.on("exit", (code) => process.exit(code ?? 1));
