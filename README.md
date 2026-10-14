<h1 align="center">cyber-dragon</h1>

<p align="center">Program and upload to PLCs.</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-yellow" alt="status"/>
</p>

## About

**cyber-dragon** lets you program a PLC from your laptop. You pick an IEC 61131-3
Structured Text (`.st`) program in a terminal app, **PiPLC Uploader**, and a
Raspberry Pi wired to the PLC builds it into firmware and flashes it to the board.

It targets STM32-based FX3U-clone PLC boards. The build is planned around
OpenPLC's toolchain (MatIEC's `iec2c`, then PlatformIO), and the flash around
`stm32flash`.

> [!NOTE]
> The server is currently a **mock**. It speaks the real protocol but fakes the
> build and flash with timers, so the whole flow can be developed without a board.
> About 1 in 4 mock flash attempts fail on purpose, to exercise the retries.

## How it works

```
Laptop (TUI)  -- WebSocket over SSH tunnel --▶  Raspberry Pi (server)  -- RS232 --▶  PLC
```

1. **Pick** a `.st` program from your flash folder.
2. **Upload** it to the server on the Pi.
3. **Build:** the server compiles it into firmware and streams the build log back.
4. **Prepare:** a checklist walks you through putting the board into bootloader mode.
5. **Flash:** the server writes the firmware over serial, retrying failed attempts,
   while the TUI shows progress.

Both sides import one typed message protocol from `packages/shared`, so changing a
message is checked on both ends.

## Repository layout

An npm-workspaces monorepo, orchestrated by [Turborepo](https://turborepo.dev).

| Workspace           | What it is                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/tui`      | The terminal UI, built with [Ink](https://github.com/vadimdemedes/ink) and React. Runs on your laptop.        |
| `packages/server`   | The WebSocket server that runs on the Pi and drives the build and flash. Currently a mock.                    |
| `packages/shared`   | The message protocol both sides import, as TypeScript types.                                                  |
| `packages/plc-host` | Runs the server in Docker on whichever machine the PLC is plugged into, with its USB-serial cable bridged in. |
| `packages/api`      | The cloud API students query for PLC state. A Cloudflare Worker; each Pi POSTs its PLC's state to it.         |

## Developers!

### Prerequisites

- **Node.js 26+** and npm 11+, on your laptop and on the Pi
- For real hardware: a **Raspberry Pi** you can SSH into, a USB-to-RS232 cable and
  an FX3U-clone PLC.
- Alternatively! Utilise **packages/plc-host** to run the server stack in Docker, on the Pi or your own computer.

### Setup

```bash
git clone https://github.com/lahlan-h/cyber-dragon.git
cd cyber-dragon
npm install
```

The TUI lists every `.st` file in `~/Documents/cyber-dragon/flash`, so create that
folder and put your programs in it:

```bash
mkdir -p ~/Documents/cyber-dragon/flash
```

### Running

**On your laptop, with the mock server.** No Pi or board needed. Use two terminals:

```bash
npm run dev -w @cyber-dragon/server   # mock server on 127.0.0.1:3000, restarts on save
npm run dev -w @cyber-dragon/tui      # the terminal UI
```

**With the Pi.** The server only listens on the Pi's own loopback address, so
nothing else on the network can reach it. An SSH tunnel gives your laptop a
private, encrypted path to it:

```bash
# on the Pi
npm run start -w @cyber-dragon/server

# on your laptop: forward localhost:3000 to the Pi, and leave it running
ssh -N -L 3000:127.0.0.1:3000 <user>@<pi-address>

# on your laptop, in another terminal
npm run dev -w @cyber-dragon/tui
```

Don't run the local mock server while the tunnel is open: both need port 3000.

### Controls

| Key       | Does                           |
| --------- | ------------------------------ |
| `↑` `↓`   | Move the cursor                |
| `Enter`   | Select, or confirm a flash     |
| `→`       | Open the highlighted screen    |
| `Esc` `←` | Back to the menu               |
| `c`       | Cancel, on the flash checklist |

Settings is where you reconnect to the Pi and change the theme.

## Running the stack in Docker

`packages/plc-host` runs on whichever machine the PLC is plugged into: a Pi, or your own computer.
Works on macOS, Linux and Windows. Plug in the USB-serial cable and start Docker first.

```bash
npm run build -w @cyber-dragon/plc-host   # once, and after pushing server changes

# terminal 1: the serial bridge plus the server container
npm start -w @cyber-dragon/plc-host -- /dev/ttyUSB0               # flashing only
npm start -w @cyber-dragon/plc-host -- /dev/ttyUSB0 /dev/ttyUSB1  # plus PLC state (Linux only)

# terminal 2: with the board in bootloader mode, check it answers
npm run info -w @cyber-dragon/plc-host
```

### Which serial port?

The first port is the USB-serial cable plugged into the PLC's **DB9 (programming) port**:
`/dev/ttyUSB0` or similar on Linux, `/dev/cu.…` on macOS (not `/dev/tty.…`, which waits for a
modem signal and hangs), `COM3` or similar on Windows (Device Manager → Ports).

The optional second port is the USB-RS485 adapter wired to the PLC's **A+/B− terminals**. The
server polls the PLC's state through it and logs every change. It's passed straight into the
container, which only works on Linux: Docker on macOS and Windows can't see USB devices. The
program's variables need an address to be readable, e.g. `State AT %QW2 : INT;`.

Knowing which port is which is up to whoever sets the machine up. The numbers come from the
order the adapters were plugged in, not from the cables, so with two adapters (the DB9 cable and
the RS-485 one for PLC state) `/dev/ttyUSB0` and `/dev/ttyUSB1` can swap after a reboot or
re-plug. To check on Linux, list each adapter by name next to its `ttyUSB` number:

```bash
ls -l /dev/serial/by-id/
```

## PLC state in the cloud

With an RS-485 port given, the server polls the PLC and sends its state to the cloud API
(`packages/api`), where students read it with their own code. It doesn't need the TUI: the Pi
remembers the last program it flashed, so reporting carries on after a restart.

### Keys and settings

Everything secret or machine-specific lives in one `.env` at the repo root, which git ignores.
If you're deploying this yourself, start from the template:

```bash
cp .env.example .env
```

Then fill it in:

- `STUDENT_KEY` and `PI_KEY`: the API's two keys. `openssl rand -hex 16` makes a good one.
  Students get `STUDENT_KEY`, which is read-only; replace it each lesson. The Pis use `PI_KEY`
  to send state.
- `PLC_ID`: this PLC's name in the API, e.g. `PLC001`.
- `API_URL`: printed when you deploy the API.

`plc-host` passes the Pi only `PLC_ID`, `API_URL` and `PI_KEY`. Without `API_URL` and `PI_KEY`
the server still polls the PLC and logs its state, but keeps it on the machine.

### Deploying the API

Cloudflare's local runtime doesn't run on a Raspberry Pi (it needs a 48-bit address space), but
deploying from one works:

```bash
npx wrangler login                      # once, in a browser on this machine
npm run deploy -w @cyber-dragon/api     # needs both keys in .env; prints the API's URL
```

Fill in both keys before deploying - the deploy uploads them, and Cloudflare won't create the
Worker without them. Then put the printed URL in `API_URL`. To change a key later, e.g. a new
`STUDENT_KEY` for a lesson, edit `.env` and run `npm run secrets -w @cyber-dragon/api`.
`npm test -w @cyber-dragon/api` checks the routes with plain Node.

### Getting PLC state into the API

1. Fill in `.env` (see above) and build the image: `npm run build -w @cyber-dragon/plc-host`.
   Do the build again after pulling changes - the image copies the code from GitHub.
2. Wire the USB-RS485 adapter to the PLC's A+/B- terminals and start with both ports (Linux only):
   `npm start -w @cyber-dragon/plc-host -- /dev/ttyUSB0 /dev/ttyUSB1`.
3. Flash a program through the TUI. Its variables need an address to be readable, e.g.
   `State AT %QW2 : INT;`. Flashing starts the program straight away; power-cycle the board
   (BOOT0 still on bootloader) before each flash.

From then on the PLC's state reaches the API within about a second of changing, even with the
TUI closed, and after a restart.

### Querying the API

Base URL: `https://plc-api.cyber-dragon-api.workers.dev` (or your own deployment's `API_URL`).
Every request needs the student key in a header: `Authorization: Bearer <STUDENT_KEY>`.

| Request                        | Returns                                              |
| ------------------------------ | ---------------------------------------------------- |
| `GET /PLC001/state`            | The PLC's whole state (below)                        |
| `GET /PLC001/variables/<name>` | One variable, e.g. `{ "name": "State", "value": 2 }` |

```json
{
  "plc": "PLC001",
  "program": "fx3u_chase",
  "status": "online",
  "updatedAt": "2026-10-14T08:44:38.579Z",
  "variables": { "State": 2, "AnyFault": false, "Conveyor": true }
}
```

- `status` says whether the Pi can reach the PLC: `online`, `offline` (also shown once a Pi has
  been silent for 45 s), `flashing` or `unknown_program`. The program's own states, like
  `fx3u_chase`'s FAULT/READY/RUNNING, are numbers in `variables`.
- `variables` only has values while `online`. Variable names ignore case, like Structured Text.
- Errors come back as `{ "error": "..." }`: `401` wrong or missing key, `404` unknown PLC or
  variable, `429` too many requests (poll at most once a second), `503` variable asked for while
  the PLC isn't online.

**Postman:** a new `GET` request to `https://plc-api.cyber-dragon-api.workers.dev/PLC001/state`.
On the **Authorization** tab pick **Bearer Token** and paste the student key, then **Send**.

**curl:**

```bash
curl -H "Authorization: Bearer <STUDENT_KEY>" https://plc-api.cyber-dragon-api.workers.dev/PLC001/state
```

**Python** (`pip install requests`):

```python
import requests

API = "https://plc-api.cyber-dragon-api.workers.dev"
KEY = "<STUDENT_KEY>"

state = requests.get(f"{API}/PLC001/state", headers={"Authorization": f"Bearer {KEY}"}).json()
if state["status"] == "online" and state["variables"]["State"] == 2:
    print("The conveyor is running")
```

## Roadmap

- Swap the mock build and flash for the real toolchain (`iec2c`, PlatformIO, `stm32flash`)
- **Restore:** put the factory firmware back on the board
- **Home:** show information about the connected PLC
- Drive BOOT0 and reset from the Pi's GPIO, so flashing needs no hands on the board
