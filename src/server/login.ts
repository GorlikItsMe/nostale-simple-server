import { TcpServer } from "./base";
import EncryptLoginStream from "../nostaleCryptography/server/login/encrypt_stream";
import DecryptLoginStream from "../nostaleCryptography/server/login/decrypt_stream";
import { createNsTeSTPacket } from "../packets/nstest";


export default function startLoginServer(conf?: { port?: number, encryptionKey?: number }) {
  const nstestPacket = createNsTeSTPacket({
    name: "test",
    encryptionKey: conf?.encryptionKey || 1,
    // Fill whole screen with the same channel
    channels: Array(7).fill(null).flatMap((_, i) => {
      const worldId = i + 1;
      return Array(7).fill(null).map((_, j) => {
        const channelId = j + 1;
        return {
          ip: "127.0.0.1",
          port: 1337,
          color: 0,
          worldId: worldId,
          channelId: channelId,
          name: `localhost`
        }
      })
    })
  })


  const server = new TcpServer({
    createEncryptStream: () => new EncryptLoginStream(),
    createDecryptStream: () => new DecryptLoginStream(),
    onConnect: (context) => {
      context.state.handshakeSent = false;
    },
    onPacket: (context, packet) => {
      if (packet == undefined) return;

      if (packet.startsWith("NoS0575") && context.state.handshakeSent !== true) {
        context.sendPacket(nstestPacket);
        context.state.handshakeSent = true;
        context.logger?.info("Sent NsTeST handshake");
      }
    },

    onDisconnect: () => {
      // Kill server when client disconnects because we dont need keep login server running
      server.stop();
    },

    logger: true,
  });
  server.start(conf?.port || 4000);
  return server;
}
