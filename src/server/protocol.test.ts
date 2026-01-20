import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { once } from "node:events";
import Net, { type AddressInfo } from "node:net";
import { pipeline, type Transform } from "node:stream";
import { decodeStream, encodeStream } from "iconv-lite";
import ClientEncryptLoginStream from "../nostaleCryptography/client/login/encrypt_stream";
import ClientDecryptLoginStream from "../nostaleCryptography/client/login/decrypt_stream";
import ClientEncryptWorldStream from "../nostaleCryptography/client/world/encrypt_stream";
import ClientDecryptWorldStream from "../nostaleCryptography/client/world/decrypt_stream";
import startLoginServer from "./login";
import startWorldServer from "./world";

type ClientConnection = {
    sendPacket: (packet: string) => void;
    waitForPacket: (predicate: (packet: string) => boolean, timeoutMs?: number) => Promise<string>;
    close: () => Promise<void>;
};

async function waitForListening(server: Net.Server): Promise<number> {
    if (!server.listening) {
        await once(server, "listening");
    }
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Server did not provide a TCP address.");
    }
    return (address as AddressInfo).port;
}

async function createClient(
    port: number,
    createEncryptStream: () => Transform,
    createDecryptStream: () => Transform
): Promise<ClientConnection> {
    const socket = Net.createConnection({ port, host: "127.0.0.1" });
    await once(socket, "connect");

    const encoder = encodeStream("win1252") as Transform;
    const decoder = decodeStream("win1252") as Transform;
    const encryptStream = createEncryptStream();
    const decryptStream = createDecryptStream();

    const outgoing = pipeline(encoder, encryptStream, socket, () => undefined);
    const incoming = pipeline(socket, decryptStream, decoder, () => undefined);

    const received: string[] = [];
    decoder.on("data", (data) => {
        received.push(data.toString());
    });

    const sendPacket = (packet: string) => {
        encoder.write(packet);
    };

    const waitForPacket = (
        predicate: (packet: string) => boolean,
        timeoutMs = 3000
    ) =>
        new Promise<string>((resolve, reject) => {
            const existing = received.find(predicate);
            if (existing) {
                resolve(existing);
                return;
            }
            const onData = (data: unknown) => {
                const packet = data?.toString?.() ?? "";
                if (predicate(packet)) {
                    cleanup();
                    resolve(packet);
                }
            };
            const cleanup = () => {
                clearTimeout(timeout);
                decoder.off("data", onData);
            };
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Timed out waiting for packet."));
            }, timeoutMs);
            decoder.on("data", onData);
        });

    const close = async () => {
        decoder.removeAllListeners("data");
        encoder.end();
        socket.end();
        if (!socket.destroyed) {
            await once(socket, "close");
        }
        outgoing.destroy();
        incoming.destroy();
    };

    return { sendPacket, waitForPacket, close };
}

describe("Login server protocol", () => {
    const encryptionKey = 2;
    const loginServer = startLoginServer({ port: 0, encryptionKey });
    let loginPort = 0;

    beforeAll(async () => {
        loginPort = await waitForListening(loginServer.server);
    });

    afterAll(() => {
        loginServer.stop();
    });

    test("responds to NoS0575 handshake with NsTeST", async () => {
        const client = await createClient(
            loginPort,
            () => new ClientEncryptLoginStream(),
            () => new ClientDecryptLoginStream()
        );
        client.sendPacket("NoS0575");
        const response = await client.waitForPacket((packet) => packet.startsWith("NsTeST"));
        expect(response.startsWith("NsTeST")).toBe(true);
        await client.close();
    });
});

describe("World server protocol", () => {
    const encryptionKey = 2;
    const worldServer = startWorldServer({ port: 0, encryptionKey });
    let worldPort = 0;

    beforeAll(async () => {
        worldPort = await waitForListening(worldServer.server);
    });

    afterAll(() => {
        worldServer.stop();
    });

    test("handles $tp command and replies with say", async () => {
        const client = await createClient(
            worldPort,
            () => new ClientEncryptWorldStream(encryptionKey),
            () => new ClientDecryptWorldStream()
        );
        await client.waitForPacket((packet) => packet.startsWith("OK"));
        client.sendPacket("$tp 1 2 3");
        const response = await client.waitForPacket((packet) =>
            packet.includes("teleport to 1 2 3")
        );
        expect(response).toContain("teleport to 1 2 3");
        await client.close();
    });
});
