import EncryptLoginStream from "./login/encrypt_stream";
import DecryptLoginStream from "./login/decrypt_stream";

import EncryptWorldStream from "./world/encrypt_stream";
import DecryptWorldStream from "./world/decrypt_stream";

// Re-export stream classes for type usage
export { EncryptLoginStream, DecryptLoginStream, EncryptWorldStream, DecryptWorldStream };

/**
 * Creates a cipher stream for encrypting packets to send to the server.
 * @returns Login cipher when called without arguments
 */
export function createCipher(): EncryptLoginStream;
/**
 * Creates a cipher stream for encrypting packets to send to the server.
 * @param session - The session number for world encryption
 * @returns World cipher when called with a session number
 */
export function createCipher(session: number): EncryptWorldStream;
/**
 * Creates a cipher stream for encrypting packets to send to the server.
 * @param session - Optional session number. If provided, returns a world cipher; otherwise returns a login cipher.
 * @returns Either a login or world cipher stream depending on the session parameter
 */
export function createCipher(session?: number): EncryptLoginStream | EncryptWorldStream {
    if (session == null) {
        return new EncryptLoginStream();
    } else if (Number.isFinite(session)) {
        return new EncryptWorldStream(session);
    }

    throw new TypeError(
        "The first argument must be null/undefined in order to get the Login Cipher or a session number in order to get the World Cipher."
    );
}

/**
 * Creates a decipher stream for decrypting packets received from the server.
 * @returns Login decipher when called without arguments
 */
export function createDecipher(): DecryptLoginStream;
/**
 * Creates a decipher stream for decrypting packets received from the server.
 * @param _session - The session number (unused for world decryption, but indicates world context)
 * @returns World decipher when called with a session number
 */
export function createDecipher(_session: number): DecryptWorldStream;
/**
 * Creates a decipher stream for decrypting packets received from the server.
 * @param session - Optional session number. If provided, returns a world decipher; otherwise returns a login decipher.
 * @returns Either a login or world decipher stream depending on the session parameter
 */
export function createDecipher(session?: number): DecryptLoginStream | DecryptWorldStream {
    if (session == null) {
        return new DecryptLoginStream();
    } else if (Number.isFinite(session)) {
        return new DecryptWorldStream();
    }

    throw new TypeError(
        "The first argument must be null/undefined in order to get the Login Decipher or a session number in order to get the World Decipher."
    );
}
