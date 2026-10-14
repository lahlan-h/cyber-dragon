// A minimal Modbus RTU master that reads the PLC through the RS-485 adapter (Linux only: plc-host
// passes the adapter into the container with `docker run --device`).
//
// Bytes come in through plain file reads rather than the serialport package: serialport's native
// callbacks don't flush Node's promise queue, so replies would sit unread until some other event
// came along - by which time the request has timed out. Each read gives up after 100 ms of silence
// (`min 0 time 1`) so no thread is ever stuck in one: Node waits for those threads before exiting.
import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import type { ModbusTable } from "./st-program";

const FUNCTION_CODE: Record<ModbusTable, number> = {
  coils: 1,
  discreteInputs: 2,
  holdingRegisters: 3,
  inputRegisters: 4,
};

const read = promisify(fs.read);
const write = promisify(fs.write);

const crc16 = (frame: Buffer) => {
  let crc = 0xffff;
  for (const byte of frame) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
  }
  return Buffer.from([crc & 0xff, crc >> 8]); // low byte first
};

export class ModbusRtu {
  private fd: number | null = null;
  private received = Buffer.alloc(0);
  private onReceive: (() => void) | null = null;
  closed: Error | null = null; // set if the port goes away, e.g. the adapter is unplugged

  constructor(
    private path: string,
    private slave = 1,
    private timeoutMs = 300,
  ) {}

  async open() {
    const fd = fs.openSync(this.path, fs.constants.O_RDWR | fs.constants.O_NOCTTY);
    // 57600 8N1, raw bytes (the firmware's Modbus slave settings); reads wait at most 100 ms
    const tty = ["57600", "cs8", "-parenb", "-cstopb", "raw", "-echo", "min", "0", "time", "1"];
    await promisify(execFile)("stty", ["-F", this.path, ...tty]);
    this.fd = fd;
    this.readLoop(fd);
  }

  private async readLoop(fd: number) {
    const chunk = Buffer.alloc(256);
    while (!this.closed) {
      try {
        const started = Date.now();
        const { bytesRead } = await read(fd, chunk, 0, chunk.length, null);
        if (bytesRead > 0) {
          this.received = Buffer.concat([this.received, chunk.subarray(0, bytesRead)]);
        } else if (Date.now() - started < 50) {
          // a quiet line waits the full 100 ms; one that comes back empty at once has gone away
          throw new Error(`${this.path} stopped responding - was the adapter unplugged?`);
        }
      } catch (err) {
        this.closed = err as Error;
      }
      this.onReceive?.();
    }
  }

  // Reads `count` coils/inputs/registers from `start`, returning the reply's data bytes
  async read(table: ModbusTable, start: number, count: number) {
    if (this.fd === null) throw new Error("Modbus port isn't open");
    if (this.closed) throw this.closed;

    const request = Buffer.from([this.slave, FUNCTION_CODE[table], start >> 8, start & 0xff, count >> 8, count & 0xff]);
    const frame = Buffer.concat([request, crc16(request)]);

    this.received = Buffer.alloc(0); // drop anything left over from an earlier request
    await write(this.fd, frame);
    const reply = await this.replyTo(frame);

    if (!crc16(reply.subarray(0, -2)).equals(reply.subarray(-2))) {
      throw new Error(`bad CRC in reply ${reply.toString("hex")}`);
    }
    if (reply[1] & 0x80) throw new Error(`PLC refused the request: exception code ${reply[2]}`);
    return reply.subarray(3, 3 + reply[2]);
  }

  // Waits for one whole reply frame - its header says how long it is
  private replyTo(frame: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      const finish = (err: Error | null, reply?: Buffer) => {
        clearTimeout(timer);
        this.onReceive = null;
        if (err) reject(err);
        else resolve(reply!);
      };
      const timer = setTimeout(() => finish(new Error(`no reply within ${this.timeoutMs} ms`)), this.timeoutMs);

      this.onReceive = () => {
        if (this.closed) return finish(this.closed);

        let reply = this.received;
        if (reply.subarray(0, frame.length).equals(frame)) reply = reply.subarray(frame.length); // some adapters echo what they send
        if (reply.length < frame.length && frame.subarray(0, reply.length).equals(reply)) return; // could still be the echo

        if (reply.length < 3) return;
        const length = reply[1] & 0x80 ? 5 : 5 + reply[2]; // exception, or address + function + count + data + CRC
        if (reply.length >= length) finish(null, reply.subarray(0, length));
      };
      this.onReceive(); // the reply may already be here
    });
  }
}
