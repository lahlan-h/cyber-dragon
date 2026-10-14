// Polls the PLC's variables over Modbus and reports its state whenever it changes, plus a
// heartbeat every few seconds so whoever's listening can tell "nothing changed" from "Pi gone".
import type { PlcState, PlcStatus } from "@cyber-dragon/shared";
import { ModbusRtu } from "./modbus";
import type { PlcProgram, PlcVariable } from "./st-program";

const POLL_MS = 200;
const REOPEN_MS = 5000; // between attempts to open a missing or unplugged adapter
const HEARTBEAT_MS = 5000;
const OFFLINE_AFTER = 3; // failed polls in a row

export class PlcMonitor {
  private program: PlcProgram | null = null; // what's on the PLC, if it was flashed through us
  private flashing = false;
  private online = false;
  private failures = 0;
  private variables: PlcState["variables"] = {};
  private modbus: ModbusRtu | null = null;
  private lastReported = ""; // the last state reported, minus its timestamp
  private lastReportedAt = 0;

  constructor(
    private plc: string,
    private port: string,
    private report: (state: PlcState) => void,
  ) {}

  start() {
    this.poll();
  }

  // The pipeline calls these around a flash
  startFlash() {
    this.flashing = true;
    this.program = null; // it's being replaced
    this.publish();
  }

  finishFlash(program: PlcProgram | null) {
    this.flashing = false;
    this.program = program; // null: the flash failed or was cancelled, so who knows what's on it
    this.online = false; // until the new program answers
    this.failures = 0;
    this.publish();
  }

  private async poll() {
    if (this.program && !this.flashing) {
      try {
        this.variables = await this.readVariables(this.program.variables);
        this.online = true;
        this.failures = 0;
      } catch (err) {
        if (++this.failures >= OFFLINE_AFTER) this.online = false;
        if (this.failures === OFFLINE_AFTER) console.error(`PLC not answering: ${(err as Error).message}`);
        if (this.modbus?.closed) this.modbus = null; // reopen it next time
      }
    }
    this.publish();
    setTimeout(() => this.poll(), this.modbus || !this.program ? POLL_MS : REOPEN_MS);
  }

  // One request per Modbus table, spanning its lowest to highest address
  private async readVariables(variables: PlcVariable[]) {
    if (!this.modbus) {
      const modbus = new ModbusRtu(this.port);
      await modbus.open();
      this.modbus = modbus;
    }

    const values: PlcState["variables"] = {};
    if (variables.length === 0) await this.modbus.read("coils", 0, 1); // nothing to read, but is it there?

    for (const table of new Set(variables.map((v) => v.table))) {
      const group = variables.filter((v) => v.table === table);
      const start = Math.min(...group.map((v) => v.address));
      const count = Math.max(...group.map((v) => v.address)) - start + 1;
      const data = await this.modbus.read(table, start, count);

      for (const { name, address, type } of group) {
        const offset = address - start;
        if (table === "coils" || table === "discreteInputs") {
          values[name] = Boolean((data[offset >> 3] >> (offset & 7)) & 1); // bits come low bit first
        } else {
          values[name] = type === "INT" ? data.readInt16BE(offset * 2) : data.readUInt16BE(offset * 2);
        }
      }
    }
    return values;
  }

  private status(): PlcStatus {
    if (this.flashing) return "flashing";
    if (!this.program) return "unknown_program";
    return this.online ? "online" : "offline";
  }

  private publish() {
    const status = this.status();
    const program = this.program?.name ?? null;
    const variables = status === "online" ? this.variables : {};

    const key = JSON.stringify({ status, program, variables });
    const now = Date.now();
    if (key === this.lastReported && now - this.lastReportedAt < HEARTBEAT_MS) return;
    this.lastReported = key;
    this.lastReportedAt = now;

    this.report({ plc: this.plc, program, status, updatedAt: new Date(now).toISOString(), variables });
  }
}
