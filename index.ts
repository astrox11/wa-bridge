import { join } from "path";
import { readdir, unlink } from "fs/promises";
import { Boom } from "@hapi/boom";
import MAIN_LOGGER from "pino";
import NodeCache from "@cacheable/node-cache";
import readline from "readline";
import makeWASocket, {
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
} from "baileys";
import { log, parseEnv, store, findEnvFile, Message, Plugins } from "./lib";
import type { AnyMessageContent, CacheStore } from "baileys";

const config = findEnvFile("./");

if (!config) {
  log.warn("Please create a .env file to configure the middleware.");
}

const { getMessage, authstate } = store;
const logger = MAIN_LOGGER({ level: "silent" });
const msgRetryCounterCache = new NodeCache() as CacheStore;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const hasInternet = async () => {
  try {
    const res = await fetch("https://www.google.com/generate_204");
    return res.status === 204;
  } catch {
    return false;
  }
};

const question = (text: string) =>
  new Promise<string>((resolve) => rl.question(text, resolve));

export const startSock = async () => {
  log.info("Starting Client...");
  if (!(await hasInternet()))
    return log.warn("You are not connected to Internet");
  const { state, saveCreds } = await authstate();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  log.info(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage,
  });

  if (!sock.authState.creds.registered) {
    let phoneNumber: string;

    if (config) {
      phoneNumber = parseEnv(config || "").PHONE_NUMBER || null;
      await delay(5000);
      log.debug(`Loaded phone number from config: ${phoneNumber}`);
    }

    if (!phoneNumber) {
      log.warn(
        "No phone number found in configuration. You will be prompted to enter it.",
      );
      phoneNumber = await question("Please enter your phone number:\n");
    }
    if (phoneNumber && phoneNumber.length < 10) {
      log.error(
        "The provided phone number is invalid. It should include the country code and be at least 10 digits long.",
      );
      phoneNumber = await question("Please enter your phone number:\n");
    }

    const code = await sock.requestPairingCode(phoneNumber.replace(/\D+/g, ""));
    log.info(`Pair Code: ${code.slice(0, 4)}-${code.slice(4)}`);
  }

  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
    jid = jidNormalizedUser(jid);

    await sock.presenceSubscribe(jid);
    await delay(500);

    await sock.sendPresenceUpdate("composing", jid);
    await delay(2000);

    await sock.sendPresenceUpdate("paused", jid);

    await sock.sendMessage(jid, msg);
  };

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const update = events["connection.update"];
      const { connection, lastDisconnect } = update;
      const status = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (connection === "close") {
        const restart = [
          DisconnectReason.restartRequired,
          DisconnectReason.connectionLost,
          DisconnectReason.connectionClosed,
          DisconnectReason.connectionReplaced,
        ];

        const reset = [
          DisconnectReason.badSession,
          DisconnectReason.multideviceMismatch,
          DisconnectReason.loggedOut,
        ];

        if (restart.includes(status)) await delay(5000);
        startSock();
        log.info("Restarting Client...");

        if (reset.includes(status)) log.info("Please, Relogin Again.");
        await cleanup();
        startSock();
      }
      const isConnected = connection === "open";

      if (isConnected && sock.user.id) {
        log.info(`Connected to WhatsApp`);
        await sendMessageWTyping({ text: "```Connected```" }, sock.user.id);
      }
    }
    if (events["creds.update"]) {
      await saveCreds();
    }

    if (events["messages.upsert"]) {
      const { messages } = events["messages.upsert"];
      for (const message of messages) {
        const m = new Message(sock, message);

        const p = new Plugins(m, sock);

        await p.load();

        await p.text();
      }
    }
  });

  return sock;
};

const cleanup = async (reset?: boolean) => {
  try {
    const cwd = process.cwd();
    const files = await readdir(cwd);
    const targets = files.filter(
      (f) => f.endsWith(".db-shm") || f.endsWith(".db-wal"),
    );
    await Promise.all(
      targets.map((f) => unlink(join(cwd, f)).catch(() => undefined)),
    );
    if (reset) await unlink(join(cwd, "astrobridge.db")).catch(() => undefined);
    if (targets.length) log.info("Closed Client...");
  } catch (e) {
    log.warn("Failed to remove shm/wal files: " + String(e));
  }
};

export const exit = async (signal?: string) => {
  if (!signal) signal = undefined;
  try {
    try {
      rl.close();
    } catch {
      /** */
    }
    await cleanup();
  } finally {
    setTimeout(() => process.exit(0), 200);
  }
};

process.once("SIGINT", () => exit("SIGINT"));
process.once("SIGTERM", () => exit("SIGTERM"));
process.once("SIGQUIT", () => exit("SIGQUIT"));

startSock();
