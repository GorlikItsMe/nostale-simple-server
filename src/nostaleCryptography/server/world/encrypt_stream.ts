import { Transform, TransformCallback } from "stream";
import { ENCRYPTION_TABLE, pack } from "../../client/world/utils";

export default class EncryptWorldStream extends Transform {
    constructor() {
        super({ decodeStrings: false, encoding: undefined });
    }

    _transform(packet: Buffer, _: BufferEncoding, callback: TransformCallback): void {
        if (!Buffer.isBuffer(packet)) {
            callback(
                new TypeError("The first argument must be a world plain packet's buffer.")
            );
            return;
        }

        // Pack the packet (reverse of client decrypt which unpacks)
        packet = pack(packet, ENCRYPTION_TABLE);

        callback(null, packet);
    }
}
