import { Transform, type TransformCallback } from "node:stream";

export default class EncryptLoginStream extends Transform {
    constructor() {
        super({
            decodeStrings: false,
            encoding: undefined,
        });
    }

    _transform(packet: unknown, _: BufferEncoding, callback: TransformCallback): void {
        if (!Buffer.isBuffer(packet)) {
            callback(new TypeError("The first argument must be a login plain packet buffer."));
            return;
        }

        const { length } = packet;
        const encrypted = Buffer.allocUnsafe(length + 1);

        // Client decrypt_stream does: byte - 0x0f
        // So server encrypt should do: byte + 0x0f
        // (This is the reverse of client encrypt which does: (byte ^ 0xc3) + 0x0f)
        for (let i = 0; i < length; i++) {
            encrypted[i] = packet[i] + 0x0f;
        }
        // Client decrypt_stream expects 0x19 as end marker
        encrypted[length] = 0x19;

        callback(null, encrypted);
    }
}