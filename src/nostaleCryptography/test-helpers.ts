import { Readable, Transform } from "stream";

/**
 * Encrypts data through an encrypt stream
 * @param encryptStream The encryption stream to use
 * @param data The plain data to encrypt
 * @returns Promise that resolves to the encrypted buffer
 */
export async function encryptThroughStream(
    encryptStream: Transform,
    data: Buffer
): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        encryptStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });

        encryptStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        encryptStream.on("error", reject);

        const readable = new Readable({
            read() {
                this.push(data);
                this.push(null);
            },
        });

        readable.pipe(encryptStream);
    });
}

/**
 * Decrypts data through a decrypt stream
 * @param decryptStream The decryption stream to use
 * @param encryptedData The encrypted data to decrypt (can be a single buffer or multiple chunks)
 * @returns Promise that resolves to an array of decrypted buffers (one per packet)
 */
export async function decryptThroughStream(
    decryptStream: Transform,
    ...encryptedData: Buffer[]
): Promise<Buffer[]> {
    const chunks: Buffer[] = [];

    return new Promise<Buffer[]>((resolve, reject) => {
        decryptStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });

        decryptStream.on("end", () => {
            resolve(chunks);
        });

        decryptStream.on("error", reject);

        // Write all encrypted data chunks
        for (const chunk of encryptedData) {
            decryptStream.write(chunk);
        }
        decryptStream.end();
    });
}

/**
 * Encrypts and decrypts data in one go (for round-trip testing)
 * @param encryptStream The encryption stream
 * @param decryptStream The decryption stream
 * @param data The plain data to encrypt and decrypt
 * @returns Promise that resolves to the decrypted buffer
 */
export async function encryptAndDecrypt(
    encryptStream: Transform,
    decryptStream: Transform,
    data: Buffer
): Promise<Buffer> {
    const encrypted = await encryptThroughStream(encryptStream, data);
    const decrypted = await decryptThroughStream(decryptStream, encrypted);
    return Buffer.concat(decrypted);
}
