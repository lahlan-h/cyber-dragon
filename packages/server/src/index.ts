import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@cyber-dragon/shared";

type ServerStage = "idle" | "building" | "awaiting_flash" | "flashing";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const TEST_FIRMWARE = process.env.TEST_FIRMWARE ?? "/flash-files/test.bin";
const SERIAL_PORT = process.env.SERIAL_PORT ?? "/dev/ttyVIRTUAL"; // used by the real flash in Step 4

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

const realTools: Tools = {
  // TEMPORARY: skip building and hand over a known-good file, so flashing can be done first
  async build(_program, onLog, _signal) {
    onLog(`Skipping build - using ${TEST_FIRMWARE}`);
    return { name: "test", bytes: 0, path: TEST_FIRMWARE };
  },

  // TEMPORARY: pretend to flash - the real stm32flash call replaces this in Step 4
  async flash(firmware, onProgress, _signal) {
    console.log("Would flash:", firmware.path);
    onProgress(100);
    return true;
  },
};

// One board, one pipeline, every connected client shares it
class Pipeline {
  private stage: ServerStage = "idle";
  private run = new AbortController();
  private firmware: Firmware | null = null; // The last good build, waiting to be flashed

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
    const onProgress = (percent: number) => this.send({ type: "flash_progress", percent });

    for (let attempt = 1; attempt <= MAX_FLASH_ATTEMPTS; attempt++) {
      if (attempt > 1) await sleep(RETRY_DELAY_MS); // the board stays in bootloader mode
      if (signal.aborted) return;

      this.send({ type: "flash_start", attempt, maxAttempts: MAX_FLASH_ATTEMPTS });
      const flashed = await this.tools.flash(firmware, onProgress, signal);
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

const pipeline = new Pipeline(realTools, broadcast);

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
