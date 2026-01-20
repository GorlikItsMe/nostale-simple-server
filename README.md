# Nostale Simple Server

A simple server implementation for Nostale (an MMORPG) written in TypeScript using Bun runtime. This project provides both a login server and a world server with packet encryption/decryption support.

> [!WARNING]
> This is **NOT an alternative to OpenNos** or any other NosTale server emulator.
> This is simple dummy server that only know how to send and receive packets. There is no session management, database or any state management.
> I use it to prototype some stuff without spinning up whole server.


## Prerequisites

- [Bun](https://bun.sh/) runtime (latest version recommended)
- Node.js compatible environment

## Installation

```bash
git clone https://github.com/GorlikItsMe/nostale-simple-server.git
cd nostale-simple-server
bun install
```

## Usage

```bash
bun start
```

This will start both login server on port 4000 and world server on port 1337.

## Configuration

Configuration can be provided via environment variables or CLI flags. CLI flags
override environment variables.

Environment variables:
- `LOGIN_PORT` (default: `4000`)
- `WORLD_PORT` (default: `1337`)
- `ENCRYPTION_KEY` (default: `2`)
- `LOG_LEVEL` (default: `info`)

CLI flags:
- `--login-port`
- `--world-port`
- `--encryption-key`
- `--log-level`

Examples:
```bash
LOGIN_PORT=4001 WORLD_PORT=1338 ENCRYPTION_KEY=2 LOG_LEVEL=debug bun start
```

```bash
bun start -- --login-port 4001 --world-port 1338 --encryption-key 2 --log-level debug
```

### In-Game Commands

- `$tp <mapId> <x> <y>` - Teleport to specified map coordinates
  - Example: `$tp 1 77 119`


## Technical Details

### Encoding

- Uses Windows-1252 encoding for packet communication (via `iconv-lite`)

### Encryption

- Custom encryption/decryption streams for both login and world servers (see `src/nostaleCryptography` folder)

### Architecture

- Each TCP connection uses its own encode/decode/encrypt/decrypt streams to avoid
  cross-connection state leaks.
- The login server responds to `NoS0575` with an `NsTeST` handshake packet.
- The world server sends `OK` and a minimal character setup on connect.
- The world server accepts simple `$` commands (currently `$tp`).

### Packet Examples

- Login handshake:
  - Client: `NoS0575`
  - Server: `NsTeST ...`
- World teleport:
  - Client: `$tp 1 77 119`
  - Server: `say 1 10000 0 teleport to 1 77 119`

### Tests

```bash
bun test
```

### Character Setup

- Default character ID: `10000`
- Default character name: `TestUser`
- Default spawn location: Map `9998` at coordinates `(58, 37)`

### Other

- The login server automatically stops when a client disconnects
- The world server automatically stops when a client disconnects
- Packet logging is enabled by default (shows `[RECV]` and `[SEND]` messages)
