import Net from "node:net";
import { pipeline } from "node:stream";
import { encodeStream, decodeStream } from "iconv-lite";
import pino from "pino";
import type EncryptLoginStream from "../nostaleCryptography/server/login/encrypt_stream";
import type DecryptLoginStream from "../nostaleCryptography/server/login/decrypt_stream";
import type EncryptWorldStream from "../nostaleCryptography/server/world/encrypt_stream";
import type DecryptWorldStream from "../nostaleCryptography/server/world/decrypt_stream";

type EncryptStream = EncryptLoginStream | EncryptWorldStream;
type DecryptStream = DecryptLoginStream | DecryptWorldStream;

export interface TcpServerConfig {
    onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    onDisconnect?: (socket: Net.Socket) => void;

    encryptStreamFactory: () => EncryptStream;
    decryptStreamFactory: () => DecryptStream;

    logger?: pino.Logger | boolean;
}

export class TcpServer {
    private encryptStreamFactory: () => EncryptStream;
    private decryptStreamFactory: () => DecryptStream;
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
        this.encryptStreamFactory = conf.encryptStreamFactory;
        this.decryptStreamFactory = conf.decryptStreamFactory;

        this.server = Net.createServer((socket) => {
            this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client connected");

            const encryptStream = this.encryptStreamFactory();
            const decryptStream = this.decryptStreamFactory();
            const encodingStream = encodeStream("win1252");
            const decodingStream = decodeStream("win1252");

            pipeline(
                encodingStream,
                encryptStream,
                socket,
                decryptStream,
                decodingStream,
                (err) => {
                    if (err) {
                        this.logger?.error({ err }, "Pipeline error");
                    }
                    socket.destroy();
                }
            )

            decodingStream.on("data", (data) => {
                const packet: string = data.toString();
                if (packet == undefined) return;
                if (packet == "0") return; // uselsess packet like keep-alive or smth
                this.logger?.debug({ packet }, "Received packet");

                if (this.onPacket) this.onPacket((text) => encodingStream.write(text), packet);
            })
            encodingStream.on("data", (data) => {
                this.logger?.debug({ packet: data.toString() }, "Sent packet");
            })

            socket.on("close", () => {
                if (this.onDisconnect) this.onDisconnect(socket);
                this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client disconnected");
            })

            if (this.onConnect) this.onConnect(socket, (text) => encodingStream.write(text));
        })
    }

    public start(port: number) {
        this.logger?.info({ port }, "Starting TCP server");
        this.server.listen(port, "0.0.0.0")
    }
    public stop() {
        this.server.close();
    }
}
