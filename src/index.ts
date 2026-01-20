import startLoginServer from "./server/login";
import startWorldServer from "./server/world";

type RuntimeConfig = {
    loginPort: number;
    worldPort: number;
    encryptionKey: number;
    logLevel?: string;
};

const DEFAULT_CONFIG: RuntimeConfig = {
    loginPort: 4000,
    worldPort: 1337,
    encryptionKey: 2,
};

function parseArgs(argv: string[]): Record<string, string> {
    const parsed: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith("--")) {
            continue;
        }
        const [key, inlineValue] = arg.split("=", 2);
        if (inlineValue !== undefined) {
            parsed[key] = inlineValue;
            continue;
        }
        const nextValue = argv[i + 1];
        if (nextValue && !nextValue.startsWith("--")) {
            parsed[key] = nextValue;
            i += 1;
        } else {
            parsed[key] = "";
        }
    }
    return parsed;
}

function readNumber(
    value: string | undefined,
    fallback: number,
    label: string
): number {
    if (value === undefined || value === "") {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid ${label}: ${value}`);
    }
    return parsed;
}

function resolveConfig(): RuntimeConfig {
    const args = parseArgs(process.argv.slice(2));
    const loginPort = readNumber(
        args["--login-port"] ?? process.env.LOGIN_PORT,
        DEFAULT_CONFIG.loginPort,
        "login port"
    );
    const worldPort = readNumber(
        args["--world-port"] ?? process.env.WORLD_PORT,
        DEFAULT_CONFIG.worldPort,
        "world port"
    );
    const encryptionKey = readNumber(
        args["--encryption-key"] ?? process.env.ENCRYPTION_KEY,
        DEFAULT_CONFIG.encryptionKey,
        "encryption key"
    );
    const logLevel = args["--log-level"] ?? process.env.LOG_LEVEL;
    return {
        loginPort,
        worldPort,
        encryptionKey,
        logLevel,
    };
}

const config = resolveConfig();
if (config.logLevel) {
    process.env.LOG_LEVEL = config.logLevel;
}

const loginServer = startLoginServer({
    port: config.loginPort,
    encryptionKey: config.encryptionKey,
});

const worldServer = startWorldServer({
    port: config.worldPort,
    encryptionKey: config.encryptionKey,
});

let shuttingDown = false;
const shutdown = () => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    loginServer.stop();
    worldServer.stop();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);