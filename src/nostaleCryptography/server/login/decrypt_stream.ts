import { Transform, type TransformCallback } from "node:stream";

function decrypt(packet: Buffer): Buffer {
    const length = packet.length - 1; // Exclude the end marker (0xd8)
    const decrypted = Buffer.allocUnsafe(length);
    for (let i = 0; i < length; i++) {
        // Reverse of encryption: (byte ^ 0xc3) + 0x0f
        // So decryption: (byte - 0x0f) ^ 0xc3
        decrypted[i] = (packet[i] - 0x0f) ^ 0xc3;
    }
    return decrypted;
}

export default class DecryptLoginStream extends Transform {
    private state: {
        index: number;
        buffer: null | Buffer;
        length: number;
    };

    constructor() {
        super({
            decodeStrings: false,
            encoding: undefined,
        });
        this.state = {
            index: 0,
            buffer: null,
            length: 0,
        };
    }

    _transform(packet: Buffer, _: BufferEncoding, callback: TransformCallback): void {
        if (!Buffer.isBuffer(packet)) {
            callback(
                new TypeError("The first argument must be a login encrypted packet buffer.")
            );
            return;
        }

        // add part of old packet to the beginning of packet
        if (this.state.buffer != null) {
            packet = Buffer.concat(
                [this.state.buffer, packet as Buffer],
                this.state.length + (packet as Buffer).length
            );
            this.state.index = 0;
            this.state.buffer = null;
            this.state.length = 0;
        }

        const len = packet.length;
        let currentEncryptedPacket: number[] = [];
        let index = 0;
        let currentByte = 0;

        while (index < len) {
            currentByte = packet[index++];

            // Client encrypt_stream appends 0xd8 as end marker
            if (currentByte === 0xd8) {
                currentEncryptedPacket.push(currentByte);
                // packet end, send what i have
                this.push(decrypt(Buffer.from(currentEncryptedPacket)));
                currentEncryptedPacket = [];
                this.state.index = index;
                continue;
            }
            currentEncryptedPacket.push(currentByte);
        }

        // save not fully received packet for future
        if (index > this.state.index) {
            const temp = packet.slice(this.state.index);
            this.state.buffer = temp;
            this.state.length = temp.length;
        }
        callback();
    }
}