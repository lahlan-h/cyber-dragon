#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import { SerialPort } from "serialport";

// 1. Settings for the command line: npm run bridge:node -w @cyber-dragon/pi-sim -- <serial-port> [tcp-port]
//    e.g. /dev/cu.PL2303G-USBtoUART10 (macOS), /dev/ttyUSB0 (Linux), COM3 (Windows)
const [portPath = "/dev/cu.PL2303G-USBtoUART110", tcpPort = "5050"] = process.argv.slice(2);

// Check the TCP port is a valid number
const tcpPortNumber = Number(tcpPort);
if (!Number.isInteger(tcpPortNumber) || tcpPortNumber < 1 || tcpPortNumber > 65535) {
  console.error("Usage: npm run bridge:node -w @cyber-dragon/pi-sim -- <serial-port> [tcp-port]");
  process.exit(1);
}

const HOST = process.env.BRIDGE_HOST ?? "127.0.0.1"; // 127.0.0.1 = this machine only
const isMac = process.platform === "darwin";

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

// 2. Open the real port with the framing the STM32 bootloader needs
const serial = new SerialPort({
  path: portPath,
  baudRate: 57600, // bootloader auto-detects this from the first 0x7F
  dataBits: 8, //     8E1 is fixed by ST (AN3155)
  parity: "even",
  stopBits: 1,
  lock: !isMac, //    macOS: unlocked so the reader below can open it again
});

serial.on("open", () => {
  console.log(ts(), `Opened ${portPath} @ 57600 8E1`);

  if (isMac) {
    // macOS: blocking file read, so incoming bytes are noticed straight away
    const fd = fs.openSync(portPath, fs.constants.O_RDONLY | fs.constants.O_NOCTTY);
    fs.createReadStream(null, { fd, highWaterMark: 256 }).on("data", toClient);
  } else {
    // Windows/Linux: serialport's normal reader
    serial.on("data", toClient);
  }
});

serial.on("error", (err) => {
  console.error("Serial error:", err.message);
  process.exit(1);
});

// 3. One TCP client at a time; TCP → serial (serial → TCP is handled above)
const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  if (client) {
    console.log(ts(), "Rejected extra client (one at a time)");
    return socket.destroy(); // one board, one user
  }
  client = socket;
  console.log(ts(), "Client connected");

  socket.on("data", (data) => {
    console.log(ts(), "TCP → serial", data); // DEBUG
    serial.write(data);
  });

  // Client finished sending: give the chip 1 s to reply, then close our side too
  socket.on("end", () => setTimeout(() => socket.end(), 1000));

  socket.on("close", () => {
    client = null;
    console.log(ts(), "Client disconnected");
  });

  socket.on("error", () => {}); // without this, a socket error crashes the bridge
});

// Begin the server
server.listen(tcpPortNumber, HOST, () =>
  console.log(ts(), `Bridge listening on ${HOST}:${tcpPortNumber}`),
);
