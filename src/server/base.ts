import Net from "node:net";
import { pipeline } from "node:stream";
import { encodeStream, decodeStream } from "iconv-lite";
import pino from "pino";
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

    logger?: pino.Logger | boolean;
}
export class TcpServer {
    public _pipeline: NodeJS.ReadWriteStream | undefined;
    public encryptStream: EncryptLoginStream | EncryptWorldStream;
    public decryptStream: DecryptLoginStream | DecryptWorldStream;
    public encodingStream: NodeJS.ReadWriteStream;
    public decodingStream: NodeJS.ReadWriteStream;
    public server: Net.Server;
    private logger: pino.Logger | undefined;

    private onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    private onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    private onDisconnect?: (socket: Net.Socket) => void;

    constructor(conf: TcpServerConfig) {
        if (conf.logger === true) {
            this.logger = pino({
                level: process.env.LOG_LEVEL || "info",
                transport: process.env.NODE_ENV === "production" ? undefined : {
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                        translateTime: "HH:MM:ss.l",
                        ignore: "pid,hostname"
                    }
                }
            });
        } else if (conf.logger) {
            this.logger = conf.logger;
        } else {
            this.logger = undefined;
        }
        this.onConnect = conf?.onConnect
        this.onPacket = conf?.onPacket
        this.onDisconnect = conf?.onDisconnect
        this.encryptStream = conf.encryptStream;
        this.decryptStream = conf.decryptStream;
        this.encodingStream = encodeStream("win1252");
        this.decodingStream = decodeStream("win1252");

        this.server = Net.createServer((socket) => {
            this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client connected");

            this._pipeline = pipeline(
                this.encodingStream,
                this.encryptStream,
                socket,
                this.decryptStream,
                this.decodingStream,
                (err) => {
                    this.logger?.error({ err }, "Pipeline error");
                    socket.destroy();
                }
            )

            this.decodingStream.on("data", (data) => {
                const packet: string = data.toString();
                if (packet == undefined) return;
                if (packet == "0") return; // uselsess packet like keep-alive or smth
                this.logger?.debug({ packet }, "Received packet");

                if (this.onPacket) this.onPacket((text) => this.encodingStream.write(text), packet);
            })
            this.encodingStream.on("data", (data) => {
                this.logger?.debug({ packet: data.toString() }, "Sent packet");
            })

            socket.on("close", () => {
                if (this.onDisconnect) this.onDisconnect(socket);
                this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client disconnected");
            })

            if (this.onConnect) this.onConnect(socket, (text) => this.encodingStream.write(text));
        })
    }

    public start(port: number) {
        this.logger?.info({ port }, "Starting TCP server");
        this.server.listen(port, "0.0.0.0")
    }
    public stop() {
        this.server.close();
        this._pipeline?.end();
    }
}
