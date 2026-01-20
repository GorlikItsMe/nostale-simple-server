# AI Improvement Plan

This project is small and useful, but a few core issues make it fragile.
Below is a prioritized list of improvements with **why** each matters.

## P0 (most important)
1. **Fix TCP stream lifecycle (per-connection streams)**
   - **Why:** The current `TcpServer` reuses the same encrypt/decrypt and
     encoding/decoding streams across connections. That can leak data,
     corrupt packets, and break multi-connection support. It is a correctness
     and stability issue.

## P1
2. **Move runtime config to env/CLI (ports, keys, log level)**
   - **Why:** Hardcoded ports and encryption keys force code edits for every
     run and make mistakes easy. Config also enables running multiple servers
     reliably.
3. **Introduce basic connection/session state**
   - **Why:** Even a minimal state object (connected, authenticated, session
     key) prevents sending packets at the wrong time and makes behavior
     predictable.
4. **Unify logging and remove `console.log`**
   - **Why:** Mixed logging makes debugging noisy and inconsistent. Using a
     single logger with levels enables real troubleshooting.

## P2
5. **Add protocol-level tests (login handshake + world commands)**
   - **Why:** Crypto tests exist, but the server behavior is untested. Tests
     catch regressions when adjusting packet flow or commands.
6. **Command parsing/validation layer for world chat commands**
   - **Why:** `$tp` parsing is brittle. A small command parser makes it easier
     to extend safely and reduces runtime errors.
7. **Graceful shutdown and cleanup**
   - **Why:** Ensure sockets and streams close cleanly on SIGINT/SIGTERM and
     avoid resource leaks.

## P3
8. **Add lint/format tooling and CI**
   - **Why:** Consistent style and quick CI checks prevent accidental quality
     regressions.
9. **Expand README with architecture and packet examples**
   - **Why:** New contributors can understand packet flow and cryptography
     expectations quickly.
