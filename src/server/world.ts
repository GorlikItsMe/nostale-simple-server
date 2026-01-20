import { TcpServer } from "./base";
import EncryptWorldStream from "../nostaleCryptography/server/world/encrypt_stream";
import DecryptWorldStream from "../nostaleCryptography/server/world/decrypt_stream";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const characterId = 10000;
export const characterName = "TestUser";

function getSimpleSetupPackets(props: { mapId: number, x: number, y: number } = { mapId: 1, x: 77, y: 119 }) {
  const { mapId, x, y } = props;
  const simpleSetupPackets = [
    // cleanup
    `cancel 2 ${characterId} -1`,
    `mapout`,

    // setup
    `tit 35 ${characterName}`,
    `c_info ${characterName} - -1 -1 - ${characterId} 0 1 0 9 0 1 0 0 0 0 0 0 0 -1`,
    `c_info_reset`,
    `at ${characterId} ${mapId} ${x} ${y} 2 0 0 1 -1`,
    `stat 100 100 200 200 0 1472`, // stats (hp, mp, ??)
    // `cl ${characterId} 1 1`, // invisible
    // `char_sc 1 ${characterId} 1`, // smallest possible size
    // `c_mode 1 ${characterId} 999 0 3 0 10 0`, // invisible morph
  ]
  return simpleSetupPackets;
}

export default function startWorldServer(conf?: { port?: number, encryptionKey: number }) {
  const server = new TcpServer({
    createEncryptStream: () => new EncryptWorldStream(),
    createDecryptStream: () => new DecryptWorldStream(conf?.encryptionKey || 1),
    onPacket: (sendPacket, packet) => {
      const sendMessage = (message: string) => sendPacket(`say 1 ${characterId} 0 ${message}`);

      if (packet.startsWith("$tp ")) {
        try {
          if (packet.split(" ").length !== 4) {
            console.log("Invalid syntax. Usage: $tp <mapId> <x> <y>");
            sendMessage("Invalid syntax. Usage: $tp <mapId> <x> <y>");
            return;
          }
          const [_, _mapId, _x, _y] = packet.split(" ");
          const mapId = parseInt(_mapId);
          const x = parseInt(_x);
          const y = parseInt(_y);

          console.log(`teleport to ${mapId} ${x} ${y}`);
          sendMessage(`teleport to ${mapId} ${x} ${y}`);
          const packetsList = getSimpleSetupPackets({ mapId, x, y });
          for (const packet of packetsList) {
            sendPacket(packet);
          }
        } catch (error) {
          console.error(error);
          console.log("Invalid syntax. Usage: $tp <mapId> <x> <y>");
          sendMessage("Invalid syntax. Usage: $tp <mapId> <x> <y>");
        }
      }
    },

    onConnect: async (socket, sendPacket) => {
      await wait(1000)
      sendPacket("OK");
      const simpleSetupPackets = getSimpleSetupPackets({
        mapId: 9998,
        x: 58,
        y: 37,
      });
      for (const packet of simpleSetupPackets) {
        sendPacket(packet);
      }
    },

    onDisconnect: (socket) => {
      // Kill server when client disconnects because we dont need keep login server running
      server.stop();
    },

    logger: true,
  });
  server.start(conf?.port || 1337);
  return server;
}
