// The Cloudflare side of the PLC state API: a Durable Object per PLC holding its latest state, and
// the Worker that hands each request to the routes in api.ts.
import { DurableObject } from "cloudflare:workers";
import type { PlcState } from "@cyber-dragon/shared";
import { current, handle, type Stored } from "./api";

export class PlcStore extends DurableObject<Env> {
  async save(state: PlcState) {
    await this.ctx.storage.put<Stored>("latest", { state, receivedAt: Date.now() });
  }

  async latest() {
    return current(await this.ctx.storage.get<Stored>("latest"), Date.now());
  }
}

export default {
  fetch: (request, env) =>
    handle(request, {
      STUDENT_KEY: env.STUDENT_KEY,
      PI_KEY: env.PI_KEY,
      store: (plc) => env.PLC.getByName(plc),
      overLimit: async (ip) => !(await env.LIMITER.limit({ key: ip })).success,
    }),
} satisfies ExportedHandler<Env>;
