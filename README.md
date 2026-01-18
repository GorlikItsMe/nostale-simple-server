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

### In-Game Commands

- `$tp <mapId> <x> <y>` - Teleport to specified map coordinates
  - Example: `$tp 1 77 119`


## Technical Details

### Encoding

- Uses Windows-1252 encoding for packet communication (via `iconv-lite`)

### Encryption

- Custom encryption/decryption streams for both login and world servers (see `src/nostaleCryptography` folder)

### Character Setup

- Default character ID: `10000`
- Default character name: `TestUser`
- Default spawn location: Map `9998` at coordinates `(58, 37)`

### Other

- The login server automatically stops when a client disconnects
- The world server automatically stops when a client disconnects
- Packet logging is enabled by default (shows `[RECV]` and `[SEND]` messages)
