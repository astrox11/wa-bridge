import MAIN_LOGGER from 'pino'
import NodeCache from '@cacheable/node-cache'
import readline from 'readline'
import makeWASocket, { delay, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, makeCacheableSignalKeyStore, } from 'baileys'
import type { AnyMessageContent, CacheStore } from 'baileys'
import { log, bridge_store, defaultWelcomeMessage, findEnvFile, parseEnv, version } from './lib'

log.info(`Activating Client ::: ${version}`)

const { getMessage, authstate } = bridge_store

const config = findEnvFile('./')

if (!config) {
    log.warn("No configuration file found in the current directory. Please create a .env file to configure the middleware.");
}

const logger = MAIN_LOGGER({ level: "silent" })
const msgRetryCounterCache = new NodeCache() as CacheStore
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

const startSock = async () => {
    const { state, saveCreds } = await authstate()
    const { version, isLatest } = await fetchLatestBaileysVersion()
    log.info(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        getMessage
    })

    if (!sock.authState.creds.registered) {
        let phoneNumber
        if (config) {
            phoneNumber = parseEnv(config || '').PHONE_NUMBER || null
        }

        if (!phoneNumber) {
            log.warn("No phone number found in configuration. You will be prompted to enter it.");
            phoneNumber = await question('Please enter your phone number:\n')
        }
        if (phoneNumber && phoneNumber.length < 10) {
            log.error("The provided phone number is invalid. It should include the country code and be at least 10 digits long.");
            phoneNumber = await question('Please enter your phone number:\n')
        }

        const code = await sock.requestPairingCode(phoneNumber.replace(/\D+/g, ''))
        log.info(`Pair Code: ${code.slice(0, 4)}-${code.slice(4)}`)
    }

    const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
        jid = jidNormalizedUser(jid)

        await sock.presenceSubscribe(jid)
        await delay(500)

        await sock.sendPresenceUpdate('composing', jid)
        await delay(2000)

        await sock.sendPresenceUpdate('paused', jid)

        await sock.sendMessage(jid, msg)
    }

    sock.ev.process(
        async (events) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect } = update
                if (connection === 'close') {
                    if ((lastDisconnect?.error as { output: { statusCode: number } })?.output?.statusCode !== DisconnectReason.loggedOut) {
                        startSock()
                    } else {
                        log.error('Connection closed. You are logged out.')
                    }
                }
                const isConnected = connection === 'open'
                isConnected
                    ? log.info(`Bridge Connected to WhatsApp`) : undefined;

                isConnected ? await sendMessageWTyping({ text: defaultWelcomeMessage }, sock.user?.id!) : undefined;
            }
            if (events['creds.update']) {
                await saveCreds()
            }


            // if (events['messaging-history.set']) {
            //     const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set']
            //     if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
            //         console.log('received on-demand history sync, messages=', messages)
            //     }
            //     console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`)
            // }

            // received a new message
            if (events['messages.upsert']) {
                const upsert = events['messages.upsert']
                log.info('recv messages ', JSON.stringify(upsert, undefined, 2))
            }
        }
    )

    return sock
}

startSock()
