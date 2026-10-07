// MOCK pipeline server: speaks the real protocol, but fakes the build and flash with timers.
// Swap the fake steps for iec2c/pio (build) and the system stm32flash (flash) once the TUI side is working.
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@cyber-dragon/shared";
import { FAKE_BUILD_LOG } from "./fakeBuildLog";

type ServerStage = "idle" | "building" | "awaiting_flash" | "flashing";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT) ?? 3000;

const MAX_FLASH_ATTEMPTS = 4;
const MOCK_FLASH_FAIL_RATE = 0.25; // the real stm32flash fails about 1 in 4 - mimic it
const RETRY_DELAY_MS = 1000;

const FLASH_CHECKLIST = ["Power off board", "BOOT0 switch to bootloader (3.3V)", "Power on"];

// One board, one pipeline: this state is shared by every connected client
let stage: ServerStage = "idle";

let run = 0; // bumped on every new upload or cancel - older runs notice and stop

const wss = new WebSocketServer({ host: HOST, port: PORT });

// Typed send: every outgoing message is checked against the shared protocol
const broadcast = (msg: ServerMessage) => {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fakeBuild = async (myRun: number) => {
  stage = "building";
  broadcast({ type: "build_start" });

  for (const line of FAKE_BUILD_LOG) {
    // Utilise a logarithimic func to determine random time
    await sleep(10);
    if (myRun !== run) return; // a newer run (or a cancel) replaced this one
    broadcast({ type: "build_log", line });
  }

  broadcast({ type: "build_result", success: true, firmware: "fx3u_24_raw", bytes: 86804 });
  stage = "awaiting_flash";
  broadcast({ type: "flash_prompt", checklist: FLASH_CHECKLIST });
};

// One simulated stm32flash run: sometimes fails straight away, like "Failed to init device"
const fakeFlashOnce = async (myRun: number) => {
  await sleep(500);
  if (Math.random() < MOCK_FLASH_FAIL_RATE) return false;

  for (let percent = 10; percent <= 100; percent += 10) {
    await sleep(300);
    if (myRun !== run) return false; // cancelled - fakeFlash logs it
    broadcast({ type: "flash_progress", percent });
  }
  return true;
};

const fakeFlash = async (myRun: number) => {
  stage = "flashing";

  for (let attempt = 1; attempt <= MAX_FLASH_ATTEMPTS; attempt++) {
    broadcast({ type: "flash_start", attempt, maxAttempts: MAX_FLASH_ATTEMPTS });

    const ok = await fakeFlashOnce(myRun);
    if (myRun !== run) {
      console.log("Flash cancelled");
      return;
    }

    if (ok) {
      console.log(`Flash succeeded on attempt ${attempt}/${MAX_FLASH_ATTEMPTS}`);
      broadcast({ type: "flash_result", success: true });
      stage = "idle";
      return;
    }

    console.log(`Flash attempt ${attempt}/${MAX_FLASH_ATTEMPTS} failed: Failed to init device`);

    if (attempt < MAX_FLASH_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS); // brief pause - the board stays in bootloader mode
      if (myRun !== run) {
        console.log("Flash cancelled");
        return;
      }
    }
  }

  console.log(`Flash failed after ${MAX_FLASH_ATTEMPTS} attempts`);
  broadcast({
    type: "error",
    stage: "flash",
    message: `Failed to init device after ${MAX_FLASH_ATTEMPTS} attempts`,
  });
  stage = "awaiting_flash"; // firmware is still built - check the board and confirm again, no rebuild needed
};

const handle = (msg: ClientMessage) => {
  switch (msg.type) {
    case "upload": {
      if (stage === "building" || stage === "flashing") {
        broadcast({ type: "error", stage: "upload", message: "Pipeline busy" });
        return;
      }
      run++;
      broadcast({
        type: "upload_ack",
        filename: msg.filename,
        bytes: Buffer.byteLength(msg.content),
      });
      fakeBuild(run);
      return;
    }

    case "flash": {
      // The gate: types vanish at runtime, so check confirm at the door too
      if (stage !== "awaiting_flash" || msg.confirm !== true) return;
      fakeFlash(run);
      return;
    }

    case "cancel": {
      if (stage === "idle") return;
      run++;
      broadcast({
        type: "error",
        stage: stage === "building" ? "build" : "flash",
        message: "Cancelled",
      });
      stage = "idle";
      return;
    }
  }
};

wss.on("connection", (socket) => {
  const id = crypto.randomUUID();
  console.log("TUI connected: ", id);
  socket.on("error", console.error);
  socket.on("close", () => {
    console.log("TUI disconnected: ", id);

    // Last client gone: forget the pipeline so the next connection starts fresh
    if (wss.clients.size === 0) {
      run++; // retire any work in progress - it stops at its next check
      stage = "idle";
    }
  });
  socket.on("message", (raw) => {
    // A malformed message must not take the server down
    try {
      handle(JSON.parse(raw.toString()) as ClientMessage);
    } catch {
      console.error("Ignored malformed message");
    }
  });
});

console.log(`Mock pipeline server listening on 127.0.0.1:${PORT}`);

wss.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE")
    console.error(`Port ${PORT} is already in use - is another server or an SSH tunnel running?`);
  else console.error(err);
  process.exit(1);
});
