import { createCipher, createDecipher } from "./client";

// Re-export stream classes for direct access
export {
    EncryptLoginStream,
    DecryptLoginStream,
    EncryptWorldStream,
    DecryptWorldStream,
} from "./client";

// Re-export factory functions
export { createCipher, createDecipher };

// Default export for backwards compatibility
export default {
    createCipher,
    createDecipher,
};
