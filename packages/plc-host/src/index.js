#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import { parseArgs } from "node:util";
import { SerialPort } from "serialport";

// 1. Settings for the command line: npm run bridge:node -w @cyber-dragon/plc-host -- [serial-port] [tcp-port]
//    e.g. /dev/cu.PL2303G-USBtoUART10 (macOS), /dev/ttyUSB0 (Linux), COM3 (Windows)
//    Leave the serial port out to use the only USB serial adapter plugged in
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { host: { type: "string" } }, // --host 0.0.0.0 lets Docker reach the bridge
});
const [portArg, tcpPort = "5050"] = positionals;

// Check the TCP port is a valid number
const tcpPortNumber = Number(tcpPort);
if (!Number.isInteger(tcpPortNumber) || tcpPortNumber < 1 || tcpPortNumber > 65535) {
  console.error("Usage: npm run bridge:node -w @cyber-dragon/plc-host -- [serial-port] [tcp-port]");
  process.exit(1);
}

const HOST = values.host ?? process.env.BRIDGE_HOST ?? "127.0.0.1"; // 127.0.0.1 = this machine only
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";

// No port given: pick the one USB serial adapter. macOS lists it as /dev/tty.*, which waits for a
// modem carrier signal when opened - the /dev/cu.* twin doesn't
const findPort = async () => {
  const usb = (await SerialPort.list()).filter((port) => port.vendorId);
  if (usb.length === 1) return usb[0].path.replace(/^\/dev\/tty\./, "/dev/cu.");

  console.error(usb.length ? "More than one USB serial adapter - pass one:" : "No USB serial adapter found");
  for (const port of usb) console.error(`  ${port.path}  (${port.manufacturer ?? "unknown"})`);
  process.exit(1);
};
const portPath = portArg ?? (await findPort());

// Timestamps for debugging: ms since the bridge started
const t0 = Date.now();
const ts = () => `+${Date.now() - t0}ms`;

// The one connected TCP client, or null if nobody's connected
let client = null;

// Serial → TCP: whichever reader is used below sends its bytes here
const toClient = (data) => {
  console.log(ts(), "serial → TCP", data); // DEBUG
  client?.write(data); // ?. = only if a client is connected
};

const onSerialError = (err) => {
  console.error("Serial error:", err.message);
  process.exit(1);
};

// 2. Open the real port with the framing the STM32 bootloader needs
const serial = new SerialPort({
  path: portPath,
  baudRate: 57600, // bootloader auto-detects this from the first 0x7F
  dataBits: 8, //     8E1 is fixed by ST (AN3155)
  parity: "even",
  stopBits: 1,
  lock: !isMac, //    macOS: unlocked so the reader below can open it again
});

// Why not serialport's own reader: its native code announces "bytes arrived" from outside Node's
// normal callback machinery, so the promise that would read them only runs when some unrelated
// event (a timer, the next TCP packet) next flushes Node's queue. The board's reply then sits
// unread until stm32flash sends its *next* byte - long after stm32flash gave up waiting
serial.on("open", () => {
  console.log(ts(), `Opened ${portPath} @ 57600 8E1`);

  if (isWindows) {
    // A COM port can't be opened twice, so Windows keeps serialport's reader (its writer has the
    // same delay there too) and a timer flushes the queue - see the TCP client below
    serial.on("data", toClient);
  } else {
    // macOS/Linux: a plain blocking read on a second handle, which reports bytes straight away
    const fd = fs.openSync(portPath, fs.constants.O_RDONLY | fs.constants.O_NOCTTY);
    fs.createReadStream(null, { fd, highWaterMark: 256 })
      .on("data", toClient)
      .on("error", onSerialError)
      .on("end", () => onSerialError(new Error("port closed - was the cable unplugged?")));
  }
});

serial.on("error", onSerialError);

// 3. One TCP client at a time; TCP → serial (serial → TCP is handled above)
const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  if (client) {
    console.log(ts(), "Rejected extra client (one at a time)");
    return socket.destroy(); // one board, one user
  }
  client = socket;
  console.log(ts(), "Client connected");

  // Windows: every timer tick also flushes the queue serialport's reads and writes wait in
  const flush = isWindows ? setInterval(() => {}, 1) : null;

  socket.on("data", (data) => {
    console.log(ts(), "TCP → serial", data); // DEBUG
    serial.write(data);
  });

  // Client finished sending: give the chip 1 s to reply, then close our side too
  socket.on("end", () => setTimeout(() => socket.end(), 1000));

  socket.on("close", () => {
    clearInterval(flush);
    client = null;
    console.log(ts(), "Client disconnected");
  });

  socket.on("error", () => {}); // without this, a socket error crashes the bridge
});

// Begin the server
server.listen(tcpPortNumber, HOST, () =>
  console.log(ts(), `Bridge listening on ${HOST}:${tcpPortNumber}`),
);
