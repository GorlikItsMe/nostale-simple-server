import { TcpServer } from "./base";
import EncryptWorldStream from "../nostaleCryptography/server/world/encrypt_stream";
import DecryptWorldStream from "../nostaleCryptography/server/world/decrypt_stream";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const characterId = 10000;
export const characterName = "TestUser";

type ParsedCommand = {
  name: string;
  args: string[];
  raw: string;
};

function parseCommand(packet: string): ParsedCommand | null {
  const trimmed = packet.trim();
  if (!trimmed.startsWith("$")) {
    return null;
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) {
    return null;
  }
  const name = parts[0].slice(1).toLowerCase();
  return { name, args: parts.slice(1), raw: trimmed };
}

function parseTeleportArgs(args: string[]): { mapId: number; x: number; y: number } | null {
  if (args.length !== 3) {
    return null;
  }
  const mapId = Number.parseInt(args[0], 10);
  const x = Number.parseInt(args[1], 10);
  const y = Number.parseInt(args[2], 10);
  if (!Number.isFinite(mapId) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { mapId, x, y };
}

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

export default function startWorldServer(conf?: { port?: number, encryptionKey?: number }) {
  const server = new TcpServer({
    createEncryptStream: () => new EncryptWorldStream(),
    createDecryptStream: () => new DecryptWorldStream(conf?.encryptionKey || 1),
    onPacket: (context, packet) => {
      if (context.state.ready !== true) {
        context.logger?.debug("Ignoring packet before ready");
        return;
      }
      const sendMessage = (message: string) => context.sendPacket(`say 1 ${characterId} 0 ${message}`);
      const command = parseCommand(packet);
      if (!command) {
        return;
      }

      switch (command.name) {
        case "tp": {
          const args = parseTeleportArgs(command.args);
          if (!args) {
            sendMessage("Invalid syntax. Usage: $tp <mapId> <x> <y>");
            context.logger?.warn({ packet: command.raw }, "Invalid $tp syntax");
            return;
          }
          sendMessage(`teleport to ${args.mapId} ${args.x} ${args.y}`);
          context.logger?.info(args, "Teleport command");
          const packetsList = getSimpleSetupPackets(args);
          for (const packet of packetsList) {
            context.sendPacket(packet);
          }
          return;
        }
        default:
          sendMessage(`Unknown command: $${command.name}`);
          context.logger?.info({ command: command.name }, "Unknown command");
      }
    },

    onConnect: async (context) => {
      context.state.ready = false;
      await wait(1000)
      context.sendPacket("OK");
      const simpleSetupPackets = getSimpleSetupPackets({
        mapId: 9998,
        x: 58,
        y: 37,
      });
      for (const packet of simpleSetupPackets) {
        context.sendPacket(packet);
      }
      context.state.ready = true;
    },

    onDisconnect: () => {
      // Kill server when client disconnects because we dont need keep login server running
      server.stop();
    },

    logger: true,
  });
  server.start(conf?.port || 1337);
  return server;
}
