
interface NsTeSTPacketChannel {
    ip: string;
    port: number;
    color: number;
    channelId: number;
    worldId: number;
    name: string;
}

export function createNsTeSTPacket(props: { name: string, encryptionKey: number, channels: NsTeSTPacketChannel[] }) {
    const _times = 60
    const channels = props.channels.map(channel => `${channel.ip}:${channel.port}:${channel.color}:${channel.worldId}.${channel.channelId}.${channel.name}`).join(" ");

    return `NsTeST  0 ${props.name} ${Array(_times).fill("-99 0").join(" ")} ${props.encryptionKey} ${channels} -1:-1:-1:10000.10000.1`
}