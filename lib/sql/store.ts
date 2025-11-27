import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type KeyPair,
  type LTHashState,
  type SignalDataSet,
  type SignalDataTypeMap,
  type WAMessage,
  type WAMessageKey,
} from "baileys";
import sqlite from "./main";

type WriteAbleAuthStore =
  | string
  | Uint8Array<ArrayBufferLike>
  | string[]
  | KeyPair
  | {
      [jid: string]: boolean;
    }
  | proto.Message.IAppStateSyncKeyData
  | LTHashState
  | AuthenticationCreds
  | {
      token: Buffer;
      timestamp?: string;
    };

sqlite.run(`
  CREATE TABLE IF NOT EXISTS user_session (
    name TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`);
sqlite.run(`
  CREATE TABLE IF NOT EXISTS user_messages (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL
  );
`);
sqlite.run(`
  CREATE TABLE IF NOT EXISTS user_contacts (
    pn TEXT PRIMARY KEY,
    lid TEXT NOT NULL
  );
`);

const stmtSessionGet = sqlite.prepare(
  "SELECT data FROM user_session WHERE name = ?",
);
const stmtSessionSet = sqlite.prepare(`
  INSERT INTO user_session (name, data) VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET data = excluded.data
`);
const stmtSessionDelete = sqlite.prepare(
  "DELETE FROM user_session WHERE name = ?",
);
const stmtMessagesGet = sqlite.prepare(
  "SELECT message FROM user_messages WHERE id = ?",
);
const stmtMessagesSet = sqlite.prepare(`
  INSERT INTO user_messages (id, message) VALUES (?, ?)
  ON CONFLICT(id) DO UPDATE SET message = excluded.message
`);
const stmtContactsGet = sqlite.prepare(
  "SELECT lid FROM user_contacts WHERE pn = ?",
);
const stmtContactsSet = sqlite.prepare(`
  INSERT INTO user_contacts (pn, lid) VALUES (?, ?)
  ON CONFLICT(pn) DO UPDATE SET lid = excluded.lid
`);

export const store = {
  authstate: async () => {
    const fixFileName = (name?: string) =>
      name?.replace(/\//g, "__")?.replace(/:/g, "-");

    const readData = async (file: string) => {
      try {
        const name = fixFileName(file)!;
        const row = stmtSessionGet.get(name) as { data: string } | null;
        if (!row) return null;
        return JSON.parse(row.data, BufferJSON.reviver);
      } catch {
        return null;
      }
    };

    const writeData = async (data: WriteAbleAuthStore, file: string) => {
      const name = fixFileName(file)!;
      const json = JSON.stringify(data, BufferJSON.replacer);
      await Promise.resolve(stmtSessionSet.run(name, json));
    };

    const removeData = async (file: string) => {
      const name = fixFileName(file)!;
      await Promise.resolve(stmtSessionDelete.run(name));
    };

    const creds: AuthenticationCreds =
      (await readData("creds")) || initAuthCreds();

    return {
      state: {
        creds,
        keys: {
          get: async <T extends keyof SignalDataTypeMap>(
            type: T,
            ids: string[],
          ): Promise<{ [_: string]: SignalDataTypeMap[T] }> => {
            const data: { [_: string]: SignalDataTypeMap[T] } = {};
            await Promise.all(
              ids.map(async (id) => {
                let value = await readData(`${type}-${id}`);
                if (type === "app-state-sync-key" && value) {
                  value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }
                data[id] = value as SignalDataTypeMap[T];
              }),
            );
            return data;
          },
          set: async (data: SignalDataSet) => {
            const tasks: Promise<void>[] = [];
            for (const category in data) {
              for (const id in data[category as keyof SignalDataTypeMap]) {
                const value = data[category as keyof SignalDataTypeMap]![id];
                const file = `${category}-${id}`;
                if (file.startsWith("lid-mapping")) {
                  let pn: string;

                  const map = file.split("-");

                  if (map.length == 2) {
                    pn = map[2];

                    await Promise.resolve(
                      stmtContactsSet.run(
                        pn,
                        JSON.stringify(value, BufferJSON.replacer),
                      ),
                    );
                  } else {
                    await Promise.resolve(
                      stmtContactsSet.run(
                        JSON.stringify(value, BufferJSON.replacer).replace(
                          /\D/g,
                          "",
                        ),
                        map[2].split("_")[0],
                      ),
                    );
                  }
                }
                tasks.push(value ? writeData(value, file) : removeData(file));
              }
            }
            await Promise.all(tasks);
          },
        },
      },
      saveCreds: async () => {
        return writeData(creds, "creds");
      },
    };
  },
  save_wa_messages: function (msg: WAMessage) {
    console.log('Message',msg.key.id)
    const id = msg?.key?.id;
    if (typeof id != "string") return;
    const json = JSON.stringify(msg, null, 2);
    console.log("Json:", json)
    stmtMessagesSet.run(id, json);
  },
  getMessage: async (key: WAMessageKey) => {
    const id = key?.id;
    if (typeof id !== "string") return undefined;

    const row = stmtMessagesGet.get(id) as { message: string } | undefined;
    if (!row) return undefined;

    let parsed;
    try {
      parsed = JSON.parse(row.message, BufferJSON.reviver);
    } catch {
      return undefined;
    }

    // normalize to the inner proto message object if wrapped
    const protoObj = parsed?.message ?? parsed;

    // if there's a `rec` field stored as a JSON string, try to parse it
    if (protoObj && typeof protoObj.rec === "string") {
      try {
        protoObj.rec = JSON.parse(protoObj.rec, BufferJSON.reviver);
      } catch {
        // ignore parse errors and keep original string
      }
    }

    try {
      return proto.Message.create(protoObj);
    } catch {
      return proto.Message.create({ conversation: "test" });
    }
  },
  get_contact: async (id: string) => {
    const row = stmtContactsGet.get(id) as { lid: string } | null;
    if (!row) return null;
    return row.lid;
  },
};
