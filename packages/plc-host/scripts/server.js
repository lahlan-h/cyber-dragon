#!/usr/bin/env node
// Starts the server container. Given an RS-485 adapter's port (Linux only), it passes that adapter
// into the container so the server can poll the PLC's state: npm run server -- /dev/ttyUSB1
import { spawn, spawnSync } from "node:child_process";

const CONTAINER = "cyber-dragon-pi";
const [rs485] = process.argv.slice(2).filter(Boolean);

const args = ["run", "--rm", "--init", "--name", CONTAINER, "-p", "3000:3000"];
args.push("--add-host=host.docker.internal:host-gateway");

if (rs485) {
  if (process.platform !== "linux") {
    console.error("The RS-485 port needs Linux - Docker on macOS and Windows can't see USB devices");
    process.exit(1);
  }
  args.push("--device", `${rs485}:/dev/ttyRS485`, "-e", "MODBUS_PORT=/dev/ttyRS485");
}

spawnSync("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" }); // a leftover one would hold port 3000
const docker = spawn("docker", [...args, CONTAINER], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => docker.kill(signal));
docker.on("exit", (code) => process.exit(code ?? 1));
