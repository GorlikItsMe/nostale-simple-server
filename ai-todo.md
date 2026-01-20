# Project Improvement Plan

This document outlines improvements needed to transform this "duct-taped" NosTale simple server into a cleaner, more maintainable codebase.

## High Priority

### 1. Fix Type Safety Issues in Cryptography Factory Functions
**File:** `src/nostaleCryptography/client/index.ts`

**Problem:** The `createCipher` function declares return type `EncryptLoginStream` but can actually return `EncryptWorldStream`. This is a type lie that breaks TypeScript's guarantees.

```typescript
// Current (wrong):
export function createCipher(session?: number): EncryptLoginStream {
    if (session == null) {
        return new EncryptLoginStream();
    } else if (Number.isFinite(session)) {
        return new EncryptWorldStream(session); // TypeScript says this is EncryptLoginStream!
    }
```

**Solution:** Create proper union types or use function overloads to correctly represent what the function returns.

---

### 2. Remove Debug Statements and Inconsistent Logging
**Files:** Multiple files throughout `src/`

**Problem:** The codebase mixes `console.log` statements (some with unprofessional messages like `"empty packet? wtf?"`) with the proper `pino` logger. This is inconsistent and unprofessional.

**Examples:**
- `src/nostaleCryptography/client/world/decrypt_stream.ts:20` - `console.log("empty packet? wtf?")`
- `src/server/login.ts:39` - `console.log("sent response")`
- `src/server/world.ts:41,50,51,57,58` - Various `console.log` calls

**Solution:** Replace all `console.log` calls with proper structured logging using pino, or remove debug statements entirely.

---

### 3. Document Magic Numbers and Encryption Constants
**Files:** All cryptography stream files

**Problem:** The code is full of unexplained magic numbers that make the encryption logic incomprehensible:
- `0xc3`, `0x0f`, `0x19`, `0xd8`, `0x40`, `0xff`, `0x7e`, `0x80`, etc.

**Solution:** Create a constants file with named constants and documentation explaining what each value represents in the NosTale protocol.

---

### 4. Eliminate Code Duplication in Stream Classes
**Files:** `src/nostaleCryptography/client/` and `src/nostaleCryptography/server/`

**Problem:** The login decrypt streams (client and server) have nearly identical structure for buffering incomplete packets. The same pattern is repeated in world decrypt streams.

**Solution:** Extract common buffering logic into a base class or utility function.

---

### 5. Improve Error Handling
**Files:** `src/server/base.ts`, `src/server/world.ts`

**Problem:** Errors are either silently ignored, logged without context, or cause uncaught exceptions:
- Pipeline errors just destroy the socket without proper cleanup
- Packet parsing errors are caught but not properly handled
- No reconnection or recovery strategy

**Solution:** Implement proper error handling with typed errors and meaningful error messages.

---

## Medium Priority

### 6. Add Proper Configuration Management
**Files:** `src/index.ts`, `src/server/login.ts`, `src/server/world.ts`

**Problem:** Configuration values are hardcoded throughout the codebase:
- Ports: 4000, 1337
- Character ID: 10000
- Character name: "TestUser"
- Spawn locations: map 9998 at (58, 37)

**Solution:** Create a proper configuration system using environment variables or a config file.

---

### 7. Inconsistent Parameter Naming
**Files:** `src/server/world.ts`, `src/nostaleCryptography/server/world/decrypt_stream.ts`

**Problem:** The encryption key/session concept uses different names in different places:
- `encryptionKey` in world server config and server decrypt stream
- `session` in client encrypt stream
- Comments reference "session number" but parameter is called "encryptionKey"

**Solution:** Standardize terminology across the codebase.

---

### 8. Add Test Coverage for Server Components
**Files:** Need new test files

**Problem:** Current tests only cover the basic encrypt/decrypt round-trip. No tests for:
- TcpServer class
- Login server logic
- World server logic  
- Packet creation (nstest.ts)
- Multiple packet handling
- Edge cases (empty packets, malformed packets)

**Solution:** Add comprehensive unit and integration tests.

---

### 9. Create Packet Type Definitions
**Files:** `src/packets/`

**Problem:** Packets are handled as raw strings with manual parsing using `split(" ")`. This is error-prone and not type-safe.

**Example from world.ts:**
```typescript
const [_, _mapId, _x, _y] = packet.split(" ");
const mapId = parseInt(_mapId);
```

**Solution:** Create TypeScript interfaces for packet structures and proper parser functions.

---

### 10. Support Multiple Client Connections
**Files:** `src/server/base.ts`

**Problem:** The server can only handle one client at a time. The streams (encrypt/decrypt/encode/decode) are shared across all connections, which would cause issues if multiple clients connected.

**Solution:** Create new stream instances per connection instead of sharing them.

---

## Low Priority

### 11. Add CI/CD Pipeline
**Problem:** No automated testing, linting, or deployment.

**Solution:** Add GitHub Actions workflow for:
- Running tests on PR
- Linting with ESLint
- Type checking with TypeScript

---

### 12. Add ESLint Configuration
**Problem:** No linting rules enforced, leading to inconsistent code style.

**Solution:** Add ESLint with TypeScript rules and run it in CI.

---

### 13. Improve README Documentation
**Problem:** README lacks technical details about:
- How the encryption works
- Packet format documentation
- Architecture overview
- Contributing guidelines

**Solution:** Expand README with proper technical documentation.

---

### 14. Add Graceful Shutdown Handling
**Files:** `src/server/base.ts`

**Problem:** Server just stops without properly cleaning up resources when `stop()` is called.

**Solution:** Implement proper shutdown sequence that:
- Stops accepting new connections
- Waits for existing connections to close
- Cleans up streams and buffers

---

### 15. Remove/Clean Up Dead Code
**Files:** `src/server/world.ts`

**Problem:** There's commented-out code that should either be removed or documented:
```typescript
// `cl ${characterId} 1 1`, // invisible
// `char_sc 1 ${characterId} 1`, // smallest possible size
// `c_mode 1 ${characterId} 999 0 3 0 10 0`, // invisible morph
```

**Solution:** Either remove or document why this code exists.

---

## Task Priority Order

If working through these improvements, recommended order:
1. **#1** - Fix type safety (breaking type bugs)
2. **#2** - Remove debug statements (professionalism)
3. **#3** - Document magic numbers (maintainability)
4. **#5** - Error handling (reliability)
5. **#7** - Consistent naming (clarity)
6. Everything else based on need

---

*Generated by AI analysis of the codebase*
