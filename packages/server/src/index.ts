import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, PlcState, ServerMessage } from "@cyber-dragon/shared";
import { CloudReporter } from "./plc/cloud";
import { PlcMonitor, stateKey } from "./plc/monitor";
import { parseProgram, type PlcProgram } from "./plc/st-program";

type ServerStage = "idle" | "building" | "awaiting_flash" | "flashing";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const SERIAL_PORT = process.env.SERIAL_PORT ?? "/dev/ttyVIRTUAL"; // used by the real flash next
const SERIAL_MODE = process.env.SERIAL_MODE ?? "8e1";
const PROJECT_DIR = process.env.PROJECT_DIR ?? "/app/firmware/openplc-uploader";
const PIO_BIN = process.env.PIO_BIN ?? "/opt/venv/bin/pio";
const MODBUS_PORT = process.env.MODBUS_PORT; // the RS-485 adapter, passed in by plc-host on Linux
const PLC_ID = process.env.PLC_ID ?? "PLC001";
const STATE_DIR = process.env.STATE_DIR; // plc-host mounts the host's ~/.cyber-dragon here
const API_URL = process.env.API_URL; // the cloud API (packages/api), e.g. https://plc-api.example.workers.dev
const PI_KEY = process.env.PI_KEY; // ...and the Pis' key for writing to it

const PIO_ENV = "fx3u_24_raw";
const PROGRAM_PATH = path.join(PROJECT_DIR, "plc_prog.st"); // script.py runs iec2c on this
const FIRMWARE_PATH = path.join(PROJECT_DIR, ".pio/build", PIO_ENV, "firmware.bin");
// The last program flashed through us, so PLC state reporting picks up again after a restart
// without anyone using the TUI. (Wrong if the PLC is reflashed some other way.)
const FLASHED_PATH = STATE_DIR ? path.join(STATE_DIR, "flashed.st") : null;

const MAX_FLASH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1000;

const FLASH_CHECKLIST = ["Power off board", "BOOT0 switch to bootloader (3.3V)", "Power on"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Firmware {
  name: string;
  bytes: number;
  path: string;
}

interface Tools {
  build(
    program: string,
    onLog: (line: string) => void,
    signal: AbortSignal,
  ): Promise<Firmware | null>;
  flash(
    firmware: Firmware,
    onProgress: (percent: number) => void,
    signal: AbortSignal,
  ): Promise<boolean>;
}

// Runs a command and sends each line of its output to onLine. Resolves with the exit code
// (null if it couldn't start or was aborted). Splits on \r too - stm32flash uses it for progress
const runCommand = (
  cmd: string,
  args: string[],
  cwd: string,
  onLine: (line: string) => void,
  signal: AbortSignal,
) =>
  new Promise<number | null>((resolve) => {
    const proc = spawn(cmd, args, { cwd, signal }); // abort() kills it

    const forwardLines = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/[\r\n]+/)) {
        if (line.trim()) onLine(line);
      }
    };
    proc.stdout.on("data", forwardLines);
    proc.stderr.on("data", forwardLines);

    proc.on("error", () => resolve(null));
    proc.on("close", (code) => resolve(code));
  });

const realTools: Tools = {
  async build(program, onLog, signal) {
    if (!program.trim()) {
      onLog("error: the program is empty");
      return null;
    }

    try {
      await writeFile(PROGRAM_PATH, program, "utf8");
      const code = await runCommand(PIO_BIN, ["run", "-e", PIO_ENV], PROJECT_DIR, onLog, signal);
      if (code !== 0) return null;

      const { size } = await stat(FIRMWARE_PATH);
      return { name: PIO_ENV, bytes: size, path: FIRMWARE_PATH };
    } catch (err) {
      onLog(`error: ${(err as Error).message}`); // e.g. PROJECT_DIR doesn't exist
      return null;
    }
  },

  async flash(firmware, onProgress, signal) {
    let lastPercent = -1;

    // stm32flash prints "Wrote and verified address 0x08000100 (0.29%)" as it goes
    const onLine = (line: string) => {
      const match = line.match(/\((\d+)(?:\.\d+)?%\)/);
      if (!match) return console.log(line); // anything else, e.g. "Failed to init device"

      const percent = Number(match[1]);
      if (percent === lastPercent) return; // it reports every 256 bytes - only send changes
      lastPercent = percent;
      onProgress(percent);
    };

    // -g: jump straight into the new program, so it runs without flipping BOOT0 and power-cycling
    const args = ["-m", SERIAL_MODE, "-w", firmware.path, "-v", "-g", "0x08000000", SERIAL_PORT];
    const code = await runCommand("stm32flash", args, PROJECT_DIR, onLine, signal);
    return code === 0;
  },
};

const rememberFlashed = async (source: string | null) => {
  if (!FLASHED_PATH) return;
  try {
    if (source === null) await rm(FLASHED_PATH, { force: true });
    else await writeFile(FLASHED_PATH, source, "utf8");
  } catch (err) {
    console.error(`Couldn't update ${FLASHED_PATH}: ${(err as Error).message}`);
  }
};

// One board, one pipeline, every connected client shares it
class Pipeline {
  private stage: ServerStage = "idle";
  private run = new AbortController();
  private firmware: Firmware | null = null; // The last good build, waiting to be flashed
  private source = ""; // ...its program
  private program: PlcProgram | null = null; // ...and the variables that program exposes over Modbus

  constructor(
    private tools: Tools,
    private send: (msg: ServerMessage) => void,
    private monitor: PlcMonitor | null,
  ) {}

  upload(filename: string, program: string) {
    const isBusy = this.stage === "building" || this.stage === "flashing";
    if (isBusy) return this.send({ type: "error", stage: "upload", message: "Pipeline busy" });

    this.run = new AbortController();
    this.send({ type: "upload_ack", filename, bytes: Buffer.byteLength(program) });
    this.build(program, this.run.signal);
  }

  flash() {
    if (this.stage === "awaiting_flash" && this.firmware) {
      this.flashWithRetries(this.firmware, this.run.signal);
    }
  }

  cancel() {
    if (this.stage === "idle") return;
    const step = this.stage === "building" ? "build" : "flash";
    this.send({ type: "error", stage: step, message: "Cancelled" });
    this.reset();
  }

  reset() {
    if (this.stage === "flashing") {
      this.monitor?.finishFlash(null); // stopped midway: who knows what's on it
      rememberFlashed(null);
    }
    this.run.abort(); // stops the work that is running right now
    this.stage = "idle"; // stops anything new starting
  }

  private async build(program: string, signal: AbortSignal) {
    this.stage = "building";
    this.send({ type: "build_start" });

    const onLog = (line: string) => this.send({ type: "build_log", line });
    const firmware = await this.tools.build(program, onLog, signal);
    if (signal.aborted) return;

    if (!firmware) {
      this.stage = "idle";
      return this.send({ type: "error", stage: "build", message: "Build failed - check the log" });
    }

    this.firmware = firmware;
    this.source = program;
    this.program = parseProgram(program);
    if (this.monitor) {
      const names = this.program.variables.map((v) => v.name);
      onLog(
        names.length
          ? `PLC state will report: ${names.join(", ")}`
          : "PLC state will report no variables - give them an address (e.g. AT %QX1.2) to make them readable",
      );
    }
    this.send({
      type: "build_result",
      success: true,
      firmware: firmware.name,
      bytes: firmware.bytes,
    });
    this.promptFlash();
  }

  private async flashWithRetries(firmware: Firmware, signal: AbortSignal) {
    this.stage = "flashing";
    this.monitor?.startFlash();
    const onProgress = (percent: number) => this.send({ type: "flash_progress", percent });

    for (let attempt = 1; attempt <= MAX_FLASH_ATTEMPTS; attempt++) {
      if (attempt > 1) await sleep(RETRY_DELAY_MS); // the board stays in bootloader mode
      if (signal.aborted) return;

      this.send({ type: "flash_start", attempt, maxAttempts: MAX_FLASH_ATTEMPTS });
      const flashed = await this.tools.flash(firmware, onProgress, signal);
      if (signal.aborted) return;

      if (flashed) {
        this.stage = "idle";
        this.monitor?.finishFlash(this.program);
        rememberFlashed(this.source);
        return this.send({ type: "flash_result", success: true });
      }
      console.log(`Flash attempt ${attempt}/${MAX_FLASH_ATTEMPTS} failed`);
    }

    this.send({
      type: "error",
      stage: "flash",
      message: `Flash failed after ${MAX_FLASH_ATTEMPTS} attempts`,
    });
    this.monitor?.finishFlash(null);
    rememberFlashed(null);
    this.promptFlash(); // the firmware is still good - no rebuild needed
  }

  private promptFlash() {
    this.stage = "awaiting_flash";
    this.send({ type: "flash_prompt", checklist: FLASH_CHECKLIST });
  }
}

const wss = new WebSocketServer({ host: HOST, port: PORT });

const broadcast = (msg: ServerMessage) => {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
};

const cloud = API_URL && PI_KEY ? new CloudReporter(`${API_URL.replace(/\/+$/, "")}/${PLC_ID}/state`, PI_KEY) : null;
if (MODBUS_PORT && !cloud) console.log("No API_URL/PI_KEY in .env - PLC state stays on this machine");

// Logs the PLC's state when it changes, and sends it to the cloud API
let lastLogged = "";
const reportState = (state: PlcState) => {
  const key = stateKey(state);
  if (key !== lastLogged) console.log("PLC state:", JSON.stringify(state));
  lastLogged = key;
  cloud?.report(state);
};
const flashed = FLASHED_PATH && existsSync(FLASHED_PATH) ? parseProgram(readFileSync(FLASHED_PATH, "utf8")) : null;
const monitor = MODBUS_PORT ? new PlcMonitor(PLC_ID, MODBUS_PORT, reportState, flashed) : null;
if (monitor) monitor.start();
else console.log("No MODBUS_PORT set - PLC state reporting is off");

const pipeline = new Pipeline(realTools, broadcast, monitor);

const handle = (msg: ClientMessage) => {
  if (msg.type === "upload") pipeline.upload(msg.filename, msg.content);
  if (msg.type === "flash" && msg.confirm === true) pipeline.flash(); // types vanish at runtime
  if (msg.type === "cancel") pipeline.cancel();
};

wss.on("connection", (socket) => {
  const id = crypto.randomUUID();
  console.log("TUI connected:", id);

  socket.on("error", console.error);
  socket.on("message", (raw) => {
    try {
      handle(JSON.parse(raw.toString()) as ClientMessage);
    } catch {
      console.error("Ignored malformed message");
    }
  });
  socket.on("close", () => {
    console.log("TUI disconnected:", id);
    if (wss.clients.size === 0) pipeline.reset(); // last one out - the next connection starts fresh
  });
});

wss.on("listening", () => console.log(`Pipeline server listening on ${HOST}:${PORT}`));

wss.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE")
    console.error(`Port ${PORT} is already in use - is another server or an SSH tunnel running?`);
  else console.error(err);
  process.exit(1);
});
