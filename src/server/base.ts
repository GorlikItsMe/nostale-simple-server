import Net from "node:net";
import { pipeline, type Transform } from "node:stream";
import { encodeStream, decodeStream } from "iconv-lite";
import pino from "pino";

export interface TcpServerConfig {
    onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    onDisconnect?: (socket: Net.Socket) => void;

    createEncryptStream: () => Transform;
    createDecryptStream: () => Transform;

    logger?: pino.Logger | boolean;
}
export class TcpServer {
    public server: Net.Server;
    private logger: pino.Logger | undefined;
    private connections: Set<{
        socket: Net.Socket;
        encodingStream: Transform;
        decodingStream: Transform;
        encryptStream: Transform;
        decryptStream: Transform;
        pipeline: NodeJS.ReadWriteStream;
    }>;

    private onConnect?: (socket: Net.Socket, sendPacket: (packet: string) => void) => void;
    private onPacket?: (sendPacket: (packet: string) => void, packet: string) => void;
    private onDisconnect?: (socket: Net.Socket) => void;
    private createEncryptStream: () => Transform;
    private createDecryptStream: () => Transform;

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
        this.connections = new Set();
        this.onConnect = conf?.onConnect
        this.onPacket = conf?.onPacket
        this.onDisconnect = conf?.onDisconnect
        this.createEncryptStream = conf.createEncryptStream;
        this.createDecryptStream = conf.createDecryptStream;

        this.server = Net.createServer((socket) => {
            this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client connected");

            const encodingStream = encodeStream("win1252") as Transform;
            const decodingStream = decodeStream("win1252") as Transform;
            const encryptStream = this.createEncryptStream();
            const decryptStream = this.createDecryptStream();
            const sendPacket = (text: string) => encodingStream.write(text);

            const connectionPipeline = pipeline(
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
            ) as NodeJS.ReadWriteStream;
            const connection = {
                socket,
                encodingStream,
                decodingStream,
                encryptStream,
                decryptStream,
                pipeline: connectionPipeline,
            };
            this.connections.add(connection);

            decodingStream.on("data", (data) => {
                const packet: string = data.toString();
                if (packet == undefined) return;
                if (packet == "0") return; // uselsess packet like keep-alive or smth
                this.logger?.debug({ packet }, "Received packet");

                if (this.onPacket) this.onPacket(sendPacket, packet);
            })
            encodingStream.on("data", (data) => {
                this.logger?.debug({ packet: data.toString() }, "Sent packet");
            })

            socket.on("close", () => {
                this.connections.delete(connection);
                if (this.onDisconnect) this.onDisconnect(socket);
                this.logger?.info({ address: socket.remoteAddress, port: socket.remotePort }, "Client disconnected");
            })

            if (this.onConnect) this.onConnect(socket, sendPacket);
        })
    }

    public start(port: number) {
        this.logger?.info({ port }, "Starting TCP server");
        this.server.listen(port, "0.0.0.0")
    }
    public stop() {
        this.server.close();
        for (const connection of this.connections) {
            connection.pipeline.destroy();
            connection.encodingStream.destroy();
            connection.decodingStream.destroy();
            connection.encryptStream.destroy();
            connection.decryptStream.destroy();
            connection.socket.destroy();
        }
        this.connections.clear();
    }
}
