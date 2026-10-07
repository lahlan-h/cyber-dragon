import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@cyber-dragon/shared";
import { FAKE_BUILD_LOG } from "./fakeBuildLog";

type ServerStage = "idle" | "building" | "awaiting_flash" | "flashing";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const SERIAL_PORT = process.env.SERIAL_PORT ?? "/dev/ttyVIRTUAL";

const MAX_FLASH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1000;
const MOCK_FLASH_FAIL_RATE = 0.25;

const FLASH_CHECKLIST = ["Power off board", "BOOT0 switch to bootloader (3.3V)", "Power on"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Firmware {
  name: string;
  bytes: number;
}

interface Tools {
  build(
    program: string,
    onLog: (line: string) => void,
    signal: AbortSignal,
  ): Promise<Firmware | null>;
  flash(onProgress: (percent: number) => void, signal: AbortSignal): Promise<boolean>;
}

const mockTools: Tools = {
  async build(program, onLog, signal) {
    if (!program.trim()) {
      onLog("error: the program is empty");
      return null;
    }

    for (const line of FAKE_BUILD_LOG) {
      await sleep(10);
      if (signal.aborted) return null;
      onLog(line);
    }
    return { name: "fx3u_24_raw", bytes: 86804 };
  },

  async flash(onProgress, signal) {
    await sleep(500);
    if (Math.random() < MOCK_FLASH_FAIL_RATE) return false;

    for (let percent = 10; percent <= 100; percent += 10) {
      await sleep(300);
      if (signal.aborted) return false;
      onProgress(percent);
    }
    return true;
  },
};

// One board, one pipeline, every connected client shares it
class Pipeline {
  private stage: ServerStage = "idle";
  private run = new AbortController();

  constructor(
    private tools: Tools,
    private send: (msg: ServerMessage) => void,
  ) {}

  upload(filename: string, program: string) {
    const isBusy = this.stage === "building" || this.stage === "flashing";
    if (isBusy) return this.send({ type: "error", stage: "upload", message: "Pipeline busy" });

    this.run = new AbortController();
    this.send({ type: "upload_ack", filename, bytes: Buffer.byteLength(program) });
    this.build(program, this.run.signal);
  }

  flash() {
    if (this.stage === "awaiting_flash") this.flashWithRetries(this.run.signal);
  }

  cancel() {
    if (this.stage === "idle") return;
    const step = this.stage === "building" ? "build" : "flash";
    this.send({ type: "error", stage: step, message: "Cancelled" });
    this.reset();
  }

  reset() {
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

    this.send({
      type: "build_result",
      success: true,
      firmware: firmware.name,
      bytes: firmware.bytes,
    });
    this.promptFlash();
  }

  private async flashWithRetries(signal: AbortSignal) {
    this.stage = "flashing";
    const onProgress = (percent: number) => this.send({ type: "flash_progress", percent });

    for (let attempt = 1; attempt <= MAX_FLASH_ATTEMPTS; attempt++) {
      if (attempt > 1) await sleep(RETRY_DELAY_MS); // the board stays in bootloader mode
      if (signal.aborted) return;

      this.send({ type: "flash_start", attempt, maxAttempts: MAX_FLASH_ATTEMPTS });
      const flashed = await this.tools.flash(onProgress, signal);
      if (signal.aborted) return;

      if (flashed) {
        this.stage = "idle";
        return this.send({ type: "flash_result", success: true });
      }
      console.log(`Flash attempt ${attempt}/${MAX_FLASH_ATTEMPTS} failed`);
    }

    this.send({
      type: "error",
      stage: "flash",
      message: `Flash failed after ${MAX_FLASH_ATTEMPTS} attempts`,
    });
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

// Swap for realTools (iec2c/pio + stm32flash) later
const pipeline = new Pipeline(mockTools, broadcast);

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
