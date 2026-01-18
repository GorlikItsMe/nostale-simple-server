import startLoginServer from "./server/login";
import startWorldServer from "./server/world";

startLoginServer({
    port: 4000,
    encryptionKey: 2,
});

startWorldServer({
    port: 1337,
    encryptionKey: 2,
});