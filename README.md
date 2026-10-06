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
Laptop (TUI)  ──WebSocket over SSH tunnel──▶  Raspberry Pi (server)  ──RS232──▶  PLC
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

| Workspace | What it is |
| --- | --- |
| `packages/tui` | The terminal UI, built with [Ink](https://github.com/vadimdemedes/ink) and React. Runs on your laptop. |
| `packages/server` | The WebSocket server that runs on the Pi and drives the build and flash. Currently a mock. |
| `packages/shared` | The message protocol both sides import, as TypeScript types. |

## Getting started

### Prerequisites

- **Node.js 26+** and npm 11+, on your laptop and on the Pi
- For real hardware: a **Raspberry Pi** you can SSH into, a USB-to-RS232 cable and
  an FX3U-clone PLC. None of this is needed while the server is a mock.

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

| Key | Does |
| --- | --- |
| `↑` `↓` | Move the cursor |
| `Enter` | Select, or confirm a flash |
| `→` | Open the highlighted screen |
| `Esc` `←` | Back to the menu |
| `c` | Cancel, on the flash checklist |

Settings is where you reconnect to the Pi and change the theme.

### Type-checking

```bash
npm run typecheck   # type-checks every package
```

`tsx` runs the code without checking types, so run this before you commit. There
are no automated tests yet.

## Roadmap

- Swap the mock build and flash for the real toolchain (`iec2c`, PlatformIO, `stm32flash`)
- **Restore:** put the factory firmware back on the board
- **Home:** show information about the connected PLC
- Drive BOOT0 and reset from the Pi's GPIO, so flashing needs no hands on the board

## Contributing

Work on the `development` branch. Changes reach `main` through pull requests.
