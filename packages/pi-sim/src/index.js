#!/usr/bin/env node
import net from "node:net";
import { SerialPort } from "serialport";

// 1. Settings for the command line: npm run dev -w @cyber-dragon/pi-sim -- /dev/cu.PL2303G-USBtoUART210 5050
const [portPath = "/dev/cu.PL2303G-USBtoUART210", tcpPort = "5050"] = process.argv.slice(2);

// Check the TCP port is a valid number
const tcpPortNumber = Number(tcpPort);
if (!Number.isInteger(tcpPortNumber) || tcpPortNumber < 1 || tcpPortNumber > 65535) {
  console.error("Usage: npm run dev -w @cyber-dragon/bridge -- <serial-port> [tcp-port]");
  process.exit(1);
}

const HOST = process.env.BRIDGE_HOST ?? "127.0.0.1"; // 127.0.0.1 = this machine only

// Timestamps for debugging: ms since the bridge started
const t0 = Date.now();
const ts = () => `+${Date.now() - t0}ms`;

// 2. Open the real port with the framing the STM32 bootloader needs
const serial = new SerialPort({
  path: portPath,
  baudRate: 57600, // bootloader auto-detects this from the first 0x7F
  dataBits: 8, //     8E1 is fixed by ST (AN3155)
  parity: "even",
  stopBits: 1,
});

serial.on("open", () => console.log(ts(), `Opened ${portPath} @ 57600 8E1`));

serial.on("error", (err) => {
  console.error("Serial error:", err.message);
  process.exit(1);
});

// 3. One TCP client at a time; shuttle bytes both ways
let client = null;

const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  if (client) {
    console.log(ts(), "Rejected extra client (one at a time)");
    return socket.destroy(); // one board, one user
  }

  client = socket;

  // Core idea of the program: the bridge
  const toSocket = (data) => socket.write(data);
  serial.on("data", (data) => socket.write(data));
  socket.on("data", (data) => serial.write(data));

  // Client finished sending: give the chip 1 s to reply, then close our side too
  socket.on("end", () => setTimeout(() => socket.end(), 1000));

  socket.on("close", () => {
    serial.off("data", toSocket); // stop posting to a dead socket
    client = null;
  });

  socket.on("error", () => {}); // catch an error and do nothing (to keep the bridge running)
});

// Begin the server
server.listen(tcpPortNumber, HOST, () =>
  console.log(ts(), `Bridge listening on ${HOST}:${tcpPortNumber}`),
);
