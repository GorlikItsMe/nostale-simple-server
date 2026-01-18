import { Transform, TransformCallback } from "stream";
import { DECRYPTION_TABLE, unpack } from "../../client/world/utils";

export default class DecryptWorldStream extends Transform {
    private notParsedBuffer: Buffer | null = null;
    encryptionKey: number;
    isFirstPacket = true;

    constructor(encryptionKey: number) {
        super({ decodeStrings: false, encoding: undefined });

        if (!Number.isFinite(encryptionKey)) {
            throw new TypeError(
                "The first argument of the constructor must be a valid encryptionKey number."
            );
        }

        this.encryptionKey = encryptionKey;
        this.isFirstPacket = true;
    }

    _transform(packet: Buffer, _: BufferEncoding, callback: TransformCallback): void {
        if (!Buffer.isBuffer(packet)) {
            callback(
                new TypeError("The first argument must be a world encrypted packet's buffer.")
            );
            return;
        }
        if (packet.length === 0) {
            console.log("empty packet? wtf?");
            callback(null);
            return;
        }

        // add part of old packet to the beginning of packet
        if (this.notParsedBuffer != null) {
            const combinedPacket = Buffer.concat([this.notParsedBuffer, packet]);
            this.notParsedBuffer = null;
            packet = combinedPacket;
        }

        // Reverse session-based encryption first (since 0xff marker is also encrypted)
        // Match OpenNos calculation: session_number = (sessionId >> 6) & 0x80000003
        // In practice, & 0x80000003 on a byte is equivalent to & 3 for unsigned values
        const isSessionPacket = this.isFirstPacket;
        let sessionNumber = (this.encryptionKey >> 6) & 3;
        if (isSessionPacket) {
            // First packet uses default encryption (packet[i] + 0x0f)
            sessionNumber = -1;
        }
        const sessionKey = this.encryptionKey & 0xff;

        // Create a copy to reverse encryption on
        let decryptedForParsing = Buffer.from(packet);
        
        // Reverse the encryption operations
        switch (sessionNumber) {
            case 0:
                // Client: packet[i] = (packet[i] + sessionKey + 0x40) & 0xff
                // Reverse: packet[i] = (packet[i] - sessionKey - 0x40) & 0xff
                for (let i = 0, l = decryptedForParsing.length; i < l; i++) {
                    decryptedForParsing[i] = (decryptedForParsing[i] - sessionKey - 0x40) & 0xff;
                }
                break;
            case 1:
                // Client: packet[i] = (packet[i] - sessionKey - 0x40) & 0xff
                // Reverse: packet[i] = (packet[i] + sessionKey + 0x40) & 0xff
                for (let i = 0, l = decryptedForParsing.length; i < l; i++) {
                    decryptedForParsing[i] = (decryptedForParsing[i] + sessionKey + 0x40) & 0xff;
                }
                break;
            case 2:
                // Client: packet[i] = ((packet[i] ^ 0xc3) + sessionKey + 0x40) & 0xff
                // Reverse: packet[i] = ((packet[i] - sessionKey - 0x40) & 0xff) ^ 0xc3
                for (let i = 0, l = decryptedForParsing.length; i < l; i++) {
                    decryptedForParsing[i] = ((decryptedForParsing[i] - sessionKey - 0x40) & 0xff) ^ 0xc3;
                }
                break;
            case 3:
                // Client: packet[i] = ((packet[i] ^ 0xc3) - sessionKey - 0x40) & 0xff
                // Reverse: packet[i] = ((packet[i] + sessionKey + 0x40) & 0xff) ^ 0xc3
                for (let i = 0, l = decryptedForParsing.length; i < l; i++) {
                    decryptedForParsing[i] = ((decryptedForParsing[i] + sessionKey + 0x40) & 0xff) ^ 0xc3;
                }
                break;
            default:
                // Client: packet[i] = (packet[i] + 0x0f) & 0xff
                // Reverse: packet[i] = (packet[i] - 0x0f) & 0xff
                for (let i = 0, l = decryptedForParsing.length; i < l; i++) {
                    decryptedForParsing[i] = (decryptedForParsing[i] - 0x0f) & 0xff;
                }
                break;
        }

        // Now look for 0xff markers in the decrypted buffer
        const len = decryptedForParsing.length;
        let currentEncryptedPacket: number[] = [];
        let index = 0;
        let currentByte = 0;
        const fullyDecryptedPackets: Buffer[] = [];

        while (index < len) {
            currentByte = decryptedForParsing[index];
            // Get the corresponding byte from original encrypted packet
            const originalByte = packet[index];
            index++;
            currentEncryptedPacket.push(originalByte);

            if (currentByte === 0xff) {
                // packet end, decrypt what we have
                // Use the decrypted buffer (after session encryption reversal) for unpacking
                const decryptedForUnpack = decryptedForParsing.slice(index - currentEncryptedPacket.length, index);
                let decryptedPacket = unpack(decryptedForUnpack, DECRYPTION_TABLE);

                // Remove packet ID prefix (reverse of client encrypt which adds `${this.packetId} ${packet}`)
                // The packet ID is at the beginning as digits, followed by a space (0x20), then the actual data
                // Find the first space that comes after digits
                let spaceIndex = -1;
                for (let i = 0; i < decryptedPacket.length; i++) {
                    const byte = decryptedPacket[i];
                    if (byte === 0x20) { // space character
                        // Check if everything before this is digits (0x30-0x39 are '0'-'9')
                        let allDigits = true;
                        for (let j = 0; j < i; j++) {
                            const b = decryptedPacket[j];
                            if (b < 0x30 || b > 0x39) {
                                allDigits = false;
                                break;
                            }
                        }
                        if (allDigits && i > 0) {
                            spaceIndex = i;
                            break;
                        }
                    }
                }
                if (spaceIndex !== -1) {
                    decryptedPacket = decryptedPacket.slice(spaceIndex + 1);
                }

                fullyDecryptedPackets.push(decryptedPacket);
                currentEncryptedPacket = [];
                this.isFirstPacket = false; // Mark that we've processed the first packet
                continue;
            }
        }

        // save not fully received packet for future
        if (currentEncryptedPacket.length > 0) {
            this.notParsedBuffer = Buffer.from(currentEncryptedPacket);
        }

        for (const decryptedPacket of fullyDecryptedPackets) {
            this.push(decryptedPacket); // push decrypted packet to next stream
        }
        callback(null);
    }
}
