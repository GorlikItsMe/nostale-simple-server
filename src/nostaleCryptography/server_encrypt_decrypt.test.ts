import { describe, test, expect } from "bun:test";
import ClientEncryptWorldStream from "./client/world/encrypt_stream";
import ClientDecryptWorldStream from "./client/world/decrypt_stream";
import ServerEncryptWorldStream from "./server/world/encrypt_stream";
import ServerDecryptWorldStream from "./server/world/decrypt_stream";
import { encryptThroughStream, decryptThroughStream } from "./test-helpers";

describe("Client World Encrypt/Decrypt Compatibility Test", () => {
    test("client -> server", async () => {
        const originalData = Buffer.from("Hello, World!");
        const session = 123; // Test session value

        // Step 1: Encrypt the data
        const encrypted = await encryptThroughStream(new ClientEncryptWorldStream(session), originalData);
        
        // Step 2: Decrypt the data
        const encryptedForDecrypt = Buffer.from(encrypted);

        const decryptedChunks = await decryptThroughStream(new ServerDecryptWorldStream(session), encryptedForDecrypt);
        const decrypted = Buffer.concat(decryptedChunks);

        expect(originalData.equals(decrypted)).toBe(true);
    });

    test("server -> client", async () => {
        const originalData = Buffer.from("Hello, World!");
        
        const encrypted = await encryptThroughStream(new ServerEncryptWorldStream(), originalData);
        const decryptedChunks = await decryptThroughStream(new ClientDecryptWorldStream(), encrypted);
        const decrypted = Buffer.concat(decryptedChunks);

        expect(originalData.equals(decrypted)).toBe(true);
    });
});
