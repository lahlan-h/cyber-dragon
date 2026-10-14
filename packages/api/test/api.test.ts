// The API's routes against an in-memory store: npm test -w @cyber-dragon/api
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { PlcState } from "@cyber-dragon/shared";
import { current, handle, STALE_MS, type Api, type Stored } from "../src/api";

const STUDENT = "student-key";
const PI = "pi-key";

let saved: Map<string, PlcState>;
let limited: boolean;
const api: Api = {
  STUDENT_KEY: STUDENT,
  PI_KEY: PI,
  store: (plc) => ({
    save: async (state) => void saved.set(plc, state),
    latest: async () => saved.get(plc) ?? null,
  }),
  overLimit: async () => limited,
};

beforeEach(() => {
  saved = new Map();
  limited = false;
});

const call = (path: string, { key, method = "GET", body }: { key?: string; method?: string; body?: unknown } = {}) =>
  handle(
    new Request(`https://api.test${path}`, {
      method,
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    api,
  );

const report = (overrides: Partial<PlcState> = {}): PlcState => ({
  plc: "PLC001",
  program: "fx3u_chase",
  status: "online",
  updatedAt: "2026-10-14T05:12:03Z",
  variables: { State: 2, AnyFault: false },
  ...overrides,
});

test("/ explains the routes, without a key", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /GET \/<plc>\/state/);
});

test("GETs need the student or Pi key", async () => {
  saved.set("PLC001", report());
  assert.equal((await call("/PLC001/state")).status, 401);
  assert.equal((await call("/PLC001/state", { key: "wrong" })).status, 401);
  assert.equal((await call("/PLC001/state", { key: STUDENT })).status, 200);
  assert.equal((await call("/PLC001/state", { key: PI })).status, 200);
});

test("only the Pi key can POST, and the state then reads back", async () => {
  assert.equal((await call("/PLC001/state", { method: "POST", key: STUDENT, body: report() })).status, 401);
  assert.equal((await call("/PLC001/state", { method: "POST", key: PI, body: report() })).status, 204);

  const res = await call("/plc001/state", { key: STUDENT }); // ids aren't case-sensitive
  assert.deepEqual(await res.json(), report());
});

test("the PLC's id comes from the URL, not the body", async () => {
  await call("/PLC002/state", { method: "POST", key: PI, body: report({ plc: "PLC001" }) });
  assert.equal(saved.get("PLC002")?.plc, "PLC002");
  assert.equal(saved.has("PLC001"), false);
});

test("badly shaped reports are rejected", async () => {
  const bad = [
    null,
    "nope",
    report({ status: "running" as PlcState["status"] }),
    { ...report(), updatedAt: "yesterday" },
    { ...report(), variables: [1, 2] },
    { ...report(), variables: { State: "two" } },
    { ...report(), program: 42 },
    { ...report(), variables: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`v${i}`, i])) },
  ];
  for (const body of bad) {
    assert.equal((await call("/PLC001/state", { method: "POST", key: PI, body })).status, 400, JSON.stringify(body));
  }
  assert.equal(saved.size, 0);
});

test("a variable reads by name, ignoring case like Structured Text", async () => {
  saved.set("PLC001", report());
  const res = await call("/PLC001/variables/state", { key: STUDENT });
  assert.deepEqual(await res.json(), { name: "State", value: 2 });

  assert.equal((await call("/PLC001/variables/Nope", { key: STUDENT })).status, 404);
});

test("variables aren't readable while the PLC isn't online", async () => {
  saved.set("PLC001", report({ status: "flashing", variables: {} }));
  const res = await call("/PLC001/variables/State", { key: STUDENT });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /flashing/);
});

test("a PLC that never reported is a 404", async () => {
  assert.equal((await call("/PLC009/state", { key: STUDENT })).status, 404);
});

test("unknown routes, methods and ids are refused", async () => {
  assert.equal((await call("/PLC001/nothing", { key: STUDENT })).status, 404);
  assert.equal((await call("/PLC001/state/extra", { key: STUDENT })).status, 404);
  assert.equal((await call("/PLC%20001/state", { key: STUDENT })).status, 404);
  assert.equal((await call(`/${"P".repeat(33)}/state`, { key: STUDENT })).status, 404);
  assert.equal((await call("/PLC001/state", { method: "DELETE", key: STUDENT })).status, 405);
});

test("over the rate limit, students get a 429 but the Pi still gets through", async () => {
  limited = true;
  const res = await call("/PLC001/state", { key: STUDENT });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "10");

  assert.equal((await call("/PLC001/state", { method: "POST", key: PI, body: report() })).status, 204);
  assert.equal((await call("/PLC001/state", { method: "POST", key: "guess", body: report() })).status, 429);
});

test("a Pi that's gone quiet reads as offline", () => {
  const stored: Stored = { state: report(), receivedAt: 1_000_000 };
  assert.equal(current(stored, 1_000_000 + STALE_MS)?.status, "online");

  const stale = current(stored, 1_000_001 + STALE_MS);
  assert.equal(stale?.status, "offline");
  assert.deepEqual(stale?.variables, {});
  assert.equal(stale?.updatedAt, report().updatedAt); // still says when it last heard
  assert.equal(current(undefined, 0), null);
});
