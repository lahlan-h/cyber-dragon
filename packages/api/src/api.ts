// The API's routes, kept apart from the Cloudflare-specific bits in index.ts so they can be tested
// with plain Node (Cloudflare's local runtime doesn't run on a Raspberry Pi's 39-bit kernel).
//
//   GET  /PLC001/state             the PLC's latest state            student or Pi key
//   GET  /PLC001/variables/State   one of its program's variables    student or Pi key
//   POST /PLC001/state             a Pi reporting its PLC's state    Pi key
//
// Keys go in an `Authorization: Bearer <key>` header: STUDENT_KEY (read only, handed out each
// lesson) and PI_KEY (the Pis' write key).
import { PLC_STATUSES, type PlcState, type PlcStatus } from "@cyber-dragon/shared";

export const STALE_MS = 45_000; // a Pi reports at least every 15 s: any longer quiet and it's gone
const PLC_ID = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_VARIABLES = 64;

const HELP = `PLC state API

GET /<plc>/state             e.g. /PLC001/state
GET /<plc>/variables/<name>  e.g. /PLC001/variables/State

Send your API key in a header:  Authorization: Bearer <key>
Please poll at most once a second.
`;

export interface Stored {
  state: PlcState;
  receivedAt: number;
}

// What GETs see: the last report, or "offline" once its Pi has gone quiet
export const current = (stored: Stored | undefined, now: number): PlcState | null => {
  if (!stored) return null;
  if (now - stored.receivedAt <= STALE_MS) return stored.state;
  return { ...stored.state, status: "offline", variables: {} };
};

export interface Store {
  save(state: PlcState): Promise<void>;
  latest(): Promise<PlcState | null>;
}

export interface Api {
  STUDENT_KEY?: string;
  PI_KEY?: string;
  store(plc: string): Store;
  overLimit(ip: string): Promise<boolean>; // true once that IP has made too many requests
}

const error = (status: number, message: string, headers?: HeadersInit) =>
  Response.json({ error: message }, { status, headers });

// Compares hashes byte by byte, so it takes the same time however much of a guess was right
const sha256 = async (text: string) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

const hasKey = async (request: Request, ...keys: (string | undefined)[]) => {
  const given = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!given) return false;
  const givenHash = await sha256(given);
  for (const key of keys) {
    if (!key) continue;
    const keyHash = await sha256(key);
    if (givenHash.reduce((diff, byte, i) => diff | (byte ^ keyHash[i]), 0) === 0) return true;
  }
  return false;
};

// Only the expected shape gets in front of students. The PLC's id comes from the URL
const parseState = (body: unknown, plc: string): PlcState | string => {
  if (typeof body !== "object" || body === null) return "Body must be a JSON PlcState";
  const { program, status, updatedAt, variables } = body as Record<string, unknown>;

  if (!PLC_STATUSES.includes(status as PlcStatus)) return `status must be one of: ${PLC_STATUSES.join(", ")}`;
  if (program !== null && typeof program !== "string") return "program must be a string or null";
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) return "updatedAt must be a date";
  if (typeof variables !== "object" || variables === null || Array.isArray(variables)) {
    return "variables must be an object";
  }
  const entries = Object.entries(variables);
  const isValue = (value: unknown) => typeof value === "boolean" || typeof value === "number";
  if (entries.length > MAX_VARIABLES || entries.some(([name, value]) => name.length > 64 || !isValue(value))) {
    return `variables must map at most ${MAX_VARIABLES} names to booleans or numbers`;
  }

  return { plc, program, status: status as PlcStatus, updatedAt, variables: variables as PlcState["variables"] };
};

export const handle = async (request: Request, api: Api): Promise<Response> => {
  const [plcPart, resource, name, ...extra] = new URL(request.url).pathname.split("/").filter(Boolean);
  if (!plcPart) return new Response(HELP);
  if (!PLC_ID.test(plcPart) || extra.length) return error(404, "Not found - see / for the routes");

  const plc = plcPart.toUpperCase();
  const store = api.store(plc);

  // Anything not from a Pi counts towards its IP's rate limit
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const slowDown = () => error(429, "Too many requests - poll at most once a second", { "Retry-After": "10" });

  if (request.method === "POST" && resource === "state" && !name) {
    if (!(await hasKey(request, api.PI_KEY))) {
      return (await api.overLimit(ip)) ? slowDown() : error(401, "Missing or wrong Pi key");
    }
    const state = parseState(await request.json().catch(() => null), plc);
    if (typeof state === "string") return error(400, state);
    await store.save(state);
    return new Response(null, { status: 204 });
  }

  if (request.method !== "GET") return error(405, "Only GET is allowed here", { Allow: "GET" });
  if (await api.overLimit(ip)) return slowDown();
  if (!(await hasKey(request, api.STUDENT_KEY, api.PI_KEY))) return error(401, "Missing or wrong API key");

  const state = await store.latest();
  if (!state) return error(404, `${plc} hasn't reported any state yet`);
  if (resource === "state" && !name) return Response.json(state);

  if (resource === "variables" && name) {
    if (state.status !== "online") return error(503, `${plc} is ${state.status.replace("_", " ")}`);
    // Structured Text names are case-insensitive, so these are too
    const match = Object.keys(state.variables).find((key) => key.toLowerCase() === name.toLowerCase());
    if (!match) return error(404, `${state.program ?? "The program"} has no readable variable "${name}"`);
    return Response.json({ name: match, value: state.variables[match] });
  }

  return error(404, "Not found - see / for the routes");
};
