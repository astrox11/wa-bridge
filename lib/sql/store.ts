import { BufferJSON, initAuthCreds, jidEncode, proto, type AuthenticationCreds, type SignalDataTypeMap, type WAMessage, type WAMessageKey } from "baileys";
import sqlite from "./main";

export const bridge_store = {
    authstate: async () => {
        sqlite.run(`
  CREATE TABLE IF NOT EXISTS user_session (
    name TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`)

        const stmtGet = sqlite.prepare('SELECT data FROM user_session WHERE name = ?')
        const stmtSet = sqlite.prepare(`
  INSERT INTO user_session (name, data) VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET data = excluded.data
`)
        const stmtDelete = sqlite.prepare('DELETE FROM user_session WHERE name = ?')


        const fixFileName = (file?: string) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

        const readData = async (file: string) => {
            try {
                const name = fixFileName(file)!
                const row = stmtGet.get(name) as { data: string } | null
                if (!row) return null
                return JSON.parse(row.data, BufferJSON.reviver)
            } catch (err) {
                return null
            }
        }


        const writeData = async (data: any, file: string) => {
            const name = fixFileName(file)!
            const json = JSON.stringify(data, BufferJSON.replacer)
            await Promise.resolve(stmtSet.run(name, json))
        }

        const removeData = async (file: string) => {
            const name = fixFileName(file)!
            await Promise.resolve(stmtDelete.run(name))
        }

        const creds: AuthenticationCreds = (await readData('creds.json')) || initAuthCreds()

        return {
            state: {
                creds,
                keys: {
                    get: async (type: any, ids: any[]) => {
                        //@ts-ignore
                        const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
                        await Promise.all(
                            ids.map(async id => {
                                let value = await readData(`${type}-${id}.json`)
                                if (type === 'app-state-sync-key' && value) {
                                    value = proto.Message.AppStateSyncKeyData.fromObject(value)
                                }
                                data[id] = value
                            })
                        )
                        return data
                    },
                    set: async (data: any) => {
                        const tasks: Promise<void>[] = []
                        for (const category in data) {
                            for (const id in data[category as keyof SignalDataTypeMap]) {
                                const value = data[category as keyof SignalDataTypeMap]![id]
                                const file = `${category}-${id}.json`
                                tasks.push(value ? writeData(value, file) : removeData(file))
                            }
                        }
                        await Promise.all(tasks)
                    }
                }
            },
            saveCreds: async () => {
                return writeData(creds, 'creds.json')
            }
        }
    },
    save_wa_messages: async (msg: WAMessage) => {
        //
    },
    getMessage: async (key: WAMessageKey) => {
        return proto.Message.create({ conversation: 'test' })
    },
    save_contact: async (msg: WAMessage) => {
        //
    },
    get_contact: async (id: string) => {
        return {
            jid: jidEncode(null, 's.whatsapp.net',),
            lid: jidEncode(null, 'lid')
        }
    }
}