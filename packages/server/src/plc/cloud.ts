// Sends the PLC's state to the cloud API (packages/api): when it changes, at most once a second,
// and at least every 15 s so the API can tell a quiet PLC from a Pi that's gone. While the API is
// unreachable nothing queues up - the next attempt just sends the newest state.
import type { PlcState } from "@cyber-dragon/shared";
import { stateKey } from "./monitor";

const MIN_GAP_MS = 1000;
const HEARTBEAT_MS = 15_000; // the API marks a PLC offline after 45 s without a report
const TIMEOUT_MS = 10_000;

export class CloudReporter {
  private latest: PlcState | null = null;
  private lastSent = ""; // stateKey of the last state the API accepted
  private lastSentAt = 0;
  private pending: NodeJS.Timeout | null = null;
  private sending = false;
  private failing = false;

  constructor(
    private url: string, // e.g. https://plc-api.example.workers.dev/PLC001/state
    private key: string,
  ) {}

  // The monitor calls this on every change and every few seconds besides
  report(state: PlcState) {
    this.latest = state;
    if (this.pending || this.sending) return; // that send will pick up this state

    const sinceLast = Date.now() - this.lastSentAt;
    if (stateKey(state) === this.lastSent && sinceLast < HEARTBEAT_MS) return;
    this.pending = setTimeout(() => this.send(), Math.max(0, MIN_GAP_MS - sinceLast));
  }

  private async send() {
    this.pending = null;
    this.sending = true;
    this.lastSentAt = Date.now();
    const state = this.latest!;

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(state),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

      this.lastSent = stateKey(state);
      if (this.failing) console.log("PLC state is reaching the cloud API again");
      this.failing = false;
    } catch (err) {
      // log once per outage; lastSent is unchanged, so the next report() tries again
      if (!this.failing) console.error(`Couldn't send PLC state to ${this.url}: ${(err as Error).message}`);
      this.failing = true;
    }

    this.sending = false;
    if (this.latest !== state) this.report(this.latest!); // it changed while we were sending
  }
}
