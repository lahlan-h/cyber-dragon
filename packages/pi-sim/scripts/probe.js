#!/usr/bin/env node
import { SerialPort } from "serialport";

const port = new SerialPort({
  path: "/dev/cu.PL2303G-USBtoUART210",
  baudRate: 57600,
  dataBits: 8,
  parity: "even",
  stopBits: 1,
});

const t0 = Date.now(); // start the clock
const log = (...args) => console.log(`+${Date.now() - t0}ms`, ...args);

port.on("data", (data) => log("got", data));
port.on("open", () => {
  log("opened");
  port.write(Buffer.from([0x7f])); // hello: replies 79 (fresh) or 1f (already synced)
  port.drain(() => log("0x7F actually sent"));
});
setTimeout(() => process.exit(), 15000); // wait 15 s so we catch a slow reply
