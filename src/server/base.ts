import Net from "node:net";
import { pipeline } from "node:stream";
import { encodeStream, decodeStream } from "iconv-lite";
import type EncryptLoginStream from "../nostaleCryptography/server/login/encrypt_stream";
import type DecryptLoginStream from "../nostaleCryptography/server/login/decrypt_stream";
import type EncryptWorldStream from "../nostaleCryptography/server/world/encrypt_stream";
import type DecryptWorldStream from "../nostaleCryptography/server/world/decrypt_stream";

export interface TcpServerConfig {
    onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    onDisconnect?: (socket: Net.Socket) => void;

    encryptStream: EncryptLoginStream | EncryptWorldStream;
    decryptStream: DecryptLoginStream | DecryptWorldStream;
}
export class TcpServer {
    private _pipeline: NodeJS.ReadWriteStream | undefined;
    private encryptStream: EncryptLoginStream | EncryptWorldStream;
    private decryptStream: DecryptLoginStream | DecryptWorldStream;
    private encodingStream: NodeJS.ReadWriteStream;
    private decodingStream: NodeJS.ReadWriteStream;
    private server: Net.Server;
    private onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    private onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    private onDisconnect?: (socket: Net.Socket) => void;

    constructor(conf: TcpServerConfig) {
        this.onConnect = conf?.onConnect
        this.onPacket = conf?.onPacket
        this.onDisconnect = conf?.onDisconnect
        this.encryptStream = conf.encryptStream;
        this.decryptStream = conf.decryptStream;
        this.encodingStream = encodeStream("win1252");
        this.decodingStream = decodeStream("win1252");

        this.server = Net.createServer((socket) => {
            console.log(`Client connected from ${socket.remoteAddress}:${socket.remotePort}`);

            this._pipeline = pipeline(
                this.encodingStream,
                this.encryptStream,
                socket,
                this.decryptStream,
                this.decodingStream,
                (err) => {
                    console.error("Pipeline error:", err);
                    socket.destroy();
                }
            )

            this.decodingStream.on("data", (data) => {
                const packet: string = data.toString();
                if (packet == undefined) return;
                if (packet == "0") return; // uselsess packet like keep-alive or smth
                console.log(`[RECV]: ${packet}`);
                if (this.onPacket) this.onPacket((text) => this.encodingStream.write(text), packet);
            })
            this.encodingStream.on("data", (data) => {
                console.log(`[SEND]: ${data.toString()}`);
            })

            socket.on("close", () => {
                if (this.onDisconnect) this.onDisconnect(socket);
                console.log("Client disconnected");
            })

            if (this.onConnect) this.onConnect(socket, (text) => this.encodingStream.write(text));
        })
    }

    public start(port: number) {
        console.log(`Starting TCP server on port ${port}`);
        this.server.listen(port, "0.0.0.0")
    }
    public stop() {
        this.server.close();
        this._pipeline?.end();
    }
}
