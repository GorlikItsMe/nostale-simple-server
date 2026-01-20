# AI Improvement Plan for Nostale Simple Server

This project requires significant architectural improvements to become a robust server. Below is a list of tasks to address critical issues, code quality, and maintainability.

## Critical Issues 🚨

- [x] **Fix TCP Server Stream Management** (Priority: High)
    - **Issue**: `TcpServer` currently accepts instantiated streams (`EncryptLoginStream`, `DecryptLoginStream`) in its constructor and reuses them for every client connection. This will fail with multiple clients or even sequential connections because streams are stateful and often closed after use.
    - **Fix**: Refactor `TcpServer` to accept a factory function or class constructor for the streams, so new streams are created for each `socket` connection.

## Architecture & Refactoring 🏗️

- [ ] **Implement proper Packet Handling System**
    - **Issue**: `login.ts` contains hardcoded `if (packet.startsWith("NoS0575"))` logic. This is not scalable.
    - **Fix**: Create a `PacketRouter` or `PacketHandler` system. Define packet structures and handlers separate from the networking logic.
- [ ] **Extract Configuration**
    - **Issue**: IP addresses, ports, and encryption keys are hardcoded.
    - **Fix**: Implement a configuration manager using `dotenv` or similar to load settings from environment variables.
- [ ] **Separate Server Logic from Networking**
    - **Issue**: `TcpServer` is a mix of socket handling and some logging logic.
    - **Fix**: Keep `TcpServer` strictly for networking. Move business logic (login flow, world selection) to dedicated Controllers or Services.

## Code Quality & Tooling 🛠️

- [ ] **Setup Linting and Formatting**
    - **Issue**: Inconsistent code style.
    - **Fix**: Add `eslint` and `prettier`. Configure them to enforce a consistent style (e.g., semicolons, indentation).
- [ ] **Improve Type Safety**
    - **Issue**: `packet` is often treated as `any` or raw `string`.
    - **Fix**: Define strict types for Packets. Use Zod or similar if validation is needed, or just strict TS interfaces.
- [ ] **Standardize Logging**
    - **Issue**: Mixed use of `console.log` and `pino`.
    - **Fix**: Enforce using the `pino` logger instance everywhere. Remove `console.log`.

## Testing 🧪

- [ ] **Add Concurrency Tests**
    - **Issue**: Current tests likely check single packet logic.
    - **Fix**: Add an integration test that connects multiple clients simultaneously to ensure the server handles concurrency correctly (verifying the Stream Management fix).

---

## Plan of Action

1.  **Execute "Fix TCP Server Stream Management"**: This is the most critical bug preventing the server from working correctly with more than one connection.
2.  **Execute "Setup Linting and Formatting"**: To ensure future code changes remain clean.
3.  **Refactor "Packet Handling"**: To allow adding more features easily.
