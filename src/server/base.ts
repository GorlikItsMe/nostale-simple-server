import Net from "node:net";
import { pipeline, type Transform } from "node:stream";
import { encodeStream, decodeStream } from "iconv-lite";
import pino from "pino";

export interface ConnectionContext {
    id: number;
    socket: Net.Socket;
    sendPacket: (packet: string) => void;
    logger?: pino.Logger;
    state: Record<string, unknown>;
}

interface ConnectionRecord extends ConnectionContext {
    encodingStream: Transform;
    decodingStream: Transform;
    encryptStream: Transform;
    decryptStream: Transform;
    pipeline: NodeJS.ReadWriteStream;
}

export interface TcpServerConfig {
    onConnect?: (context: ConnectionContext) => void;
    onPacket?: (context: ConnectionContext, packet: string) => void;
    onDisconnect?: (context: ConnectionContext) => void;

    createEncryptStream: () => Transform;
    createDecryptStream: () => Transform;

    logger?: pino.Logger | boolean;
}
export class TcpServer {
    public server: Net.Server;
    private logger: pino.Logger | undefined;
    private connections: Set<ConnectionRecord>;
    private connectionCounter: number;

    private onConnect?: (context: ConnectionContext) => void;
    private onPacket?: (context: ConnectionContext, packet: string) => void;
    private onDisconnect?: (context: ConnectionContext) => void;
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
        this.connectionCounter = 0;
        this.onConnect = conf?.onConnect
        this.onPacket = conf?.onPacket
        this.onDisconnect = conf?.onDisconnect
        this.createEncryptStream = conf.createEncryptStream;
        this.createDecryptStream = conf.createDecryptStream;

        this.server = Net.createServer((socket) => {
            const connectionId = ++this.connectionCounter;
            const connectionLogger = this.logger?.child({
                connectionId,
                address: socket.remoteAddress,
                port: socket.remotePort,
            });
            connectionLogger?.info("Client connected");

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
                        connectionLogger?.error({ err }, "Pipeline error");
                    }
                    socket.destroy();
                }
            ) as NodeJS.ReadWriteStream;
            const context: ConnectionContext = {
                id: connectionId,
                socket,
                sendPacket,
                logger: connectionLogger,
                state: {
                    connectedAt: Date.now(),
                },
            };
            const connection: ConnectionRecord = {
                ...context,
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
                connectionLogger?.debug({ packet }, "Received packet");

                if (this.onPacket) this.onPacket(context, packet);
            })
            encodingStream.on("data", (data) => {
                connectionLogger?.debug({ packet: data.toString() }, "Sent packet");
            })

            socket.on("close", () => {
                this.connections.delete(connection);
                if (this.onDisconnect) this.onDisconnect(context);
                connectionLogger?.info("Client disconnected");
            })

            if (this.onConnect) this.onConnect(context);
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
