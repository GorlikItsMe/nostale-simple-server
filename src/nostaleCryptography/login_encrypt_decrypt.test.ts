import { describe, test, expect } from "bun:test";
import ClientEncryptLoginStream from "./client/login/encrypt_stream";
import ClientDecryptLoginStream from "./client/login/decrypt_stream";
import ServerEncryptLoginStream from "./server/login/encrypt_stream";
import ServerDecryptLoginStream from "./server/login/decrypt_stream";
import { encryptThroughStream, decryptThroughStream } from "./test-helpers";

describe("Client Login Encrypt/Decrypt Compatibility Test", () => {
    test("client -> server", async () => {
        const originalData = Buffer.from("Hello, World!");

        // Step 1: Encrypt the data
        const encrypted = await encryptThroughStream(new ClientEncryptLoginStream(), originalData);
        
        // Step 2: Decrypt the data
        // Note: Decrypt expects 0x19 as end marker, but encrypt adds 0xd8
        // We need to replace the end marker or the decrypt won't work
        const encryptedForDecrypt = Buffer.from(encrypted);
        // encryptedForDecrypt[encryptedForDecrypt.length - 1] = 0x19; // Replace 0xd8 with 0x19

        const decryptedChunks = await decryptThroughStream(new ServerDecryptLoginStream(), encryptedForDecrypt);
        const decrypted = Buffer.concat(decryptedChunks);

        expect(originalData.equals(decrypted)).toBe(true);
    });

    test("server -> client", async () => {
        const originalData = Buffer.from("Hello, World!");
        
        const encrypted = await encryptThroughStream(new ServerEncryptLoginStream(), originalData);
        const decryptedChunks = await decryptThroughStream(new ClientDecryptLoginStream(), encrypted);
        const decrypted = Buffer.concat(decryptedChunks);

        expect(originalData.equals(decrypted)).toBe(true);
    });
});
