import { Database } from "bun:sqlite";
import { SQL } from "bun";
import { proto, initAuthCreds, BufferJSON, isPnUser } from "baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  GroupMetadata,
  SignalDataTypeMap,
  WAMessageContent,
  WAMessageKey,
} from "baileys";

const isProd = process.env.NODE_ENV === "production";

export const getDb = () => {
  if (isProd) {
    return new SQL(process.env.DATABASE_URL!);
  } else {
    const sqlite = new Database("../dev.sqlite");
    sqlite.run("PRAGMA journal_mode = WAL;");
    sqlite.run("PRAGMA synchronous = NORMAL;");
    sqlite.run(
      `CREATE TABLE IF NOT EXISTS sessions (phone TEXT PRIMARY KEY, status TEXT, updated_at TEXT);`
    );
    sqlite.run(
      `CREATE TABLE IF NOT EXISTS auth_data (id TEXT PRIMARY KEY, data TEXT, updated_at TEXT);`
    );
    sqlite.run(`
      CREATE TABLE IF NOT EXISTS user_messages (
        id TEXT, 
        session_phone TEXT, 
        data TEXT, 
        timestamp TEXT, 
        PRIMARY KEY (id, session_phone)
      );
    `);
    sqlite.run(`
      CREATE TABLE IF NOT EXISTS user_contacts (
        pn TEXT, 
        session_phone TEXT, 
        lid TEXT, 
        PRIMARY KEY (pn, session_phone)
      );
    `);
    sqlite.run(
      `CREATE INDEX IF NOT EXISTS idx_user_contacts_lid ON user_contacts (lid);`
    );
    sqlite.run(
      `CREATE INDEX IF NOT EXISTS idx_user_messages_timestamp ON user_messages (timestamp);`
    );
    sqlite.run(`
  CREATE TABLE IF NOT EXISTS group_metadata (
    id TEXT, 
    session_phone TEXT, 
    metadata TEXT, 
    updated_at TEXT, 
    PRIMARY KEY (id, session_phone)
  );
`);
    return sqlite;
  }
};

const db = getDb();

export const useHybridAuthState = async (client: any, phone: string) => {
  const keyPrefix = `session:${phone}:`;
  const saveToSQL = async (key: string, value: any) => {
    if (!value) return;
    const data = JSON.stringify(value, BufferJSON.replacer);
    const now = new Date().toISOString();
    const id = `${keyPrefix}${key}`;
    if (isProd) {
      await (db as any)`
        INSERT INTO auth_data (id, data, updated_at) 
        VALUES (${id}, ${data}, ${now})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      `;
    } else {
      (db as Database).run(
        "INSERT OR REPLACE INTO auth_data (id, data, updated_at) VALUES (?, ?, ?)",
        [id, data, now]
      );
    }
  };

  const redisAuth = await useRedisAuthState(
    client,
    keyPrefix,
    saveToSQL,
    phone
  );

  return {
    ...redisAuth,
    saveCreds: async () => {
      await redisAuth.saveCreds();
      const now = new Date().toISOString();
      if (isProd) {
        await (db as any)`INSERT INTO sessions (phone, status, updated_at) VALUES (${phone}, 'connected', ${now}) ON CONFLICT (phone) DO UPDATE SET updated_at = EXCLUDED.updated_at`;
      } else {
        (db as Database).run(
          "INSERT OR REPLACE INTO sessions (phone, status, updated_at) VALUES (?, ?, ?)",
          [phone, "connected", now]
        );
      }
      await saveToSQL("creds", redisAuth.state.creds);
    },
  };
};

export const useRedisAuthState = async (
  client: any,
  keyPrefix: string,
  onWrite: (key: string, data: any) => Promise<void>,
  phone: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  const getRedisKey = (key?: string) => {
    const safeKey = key?.replace(/\//g, "__")?.replace(/:/g, "-");
    return `${keyPrefix}${safeKey}`;
  };

  const writeData = async (data: any, key: string) => {
    const redisKey = getRedisKey(key);
    await client.set(redisKey, JSON.stringify(data, BufferJSON.replacer));
    if (key.startsWith("app-state-sync-key")) {
      await onWrite(key, data);
    }
  };

  const readData = async (key: string) => {
    const data = await client.get(getRedisKey(key));
    if (!data) return null;
    return JSON.parse(data, BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    await client.del(getRedisKey(key));
  };

  const creds: AuthenticationCreds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];
              const key = `${category}-${id}`;
              if (key.includes("lid-mapping")) {
                handleLidMapping(key, value as string, phone);
              }
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, "creds");
    },
  };
};

export const saveMessage = async (msg: any, sessionPhone: string) => {
  const data = JSON.stringify(msg);
  const id = msg.key.id;
  const time = new Date().toISOString();
  if (isProd) {
    await (db as any)`INSERT INTO user_messages (id, session_phone, data, timestamp) VALUES (${id}, ${sessionPhone}, ${data}, ${time}) ON CONFLICT (id, session_phone) DO NOTHING`;
  } else {
    (db as Database).run(
      "INSERT OR IGNORE INTO user_messages (id, session_phone, data, timestamp) VALUES (?, ?, ?, ?)",
      [id, sessionPhone, data, time]
    );
  }
};

export const saveContact = async (
  pn: string,
  lid: string,
  sessionPhone: string
) => {
  if (!isPnUser(pn)) return;
  if (isProd) {
    await (db as any)`INSERT INTO user_contacts (pn, session_phone, lid) VALUES (${pn}, ${sessionPhone}, ${lid}) ON CONFLICT (pn, session_phone) DO UPDATE SET lid = EXCLUDED.lid`;
  } else {
    (db as Database).run(
      "INSERT OR REPLACE INTO user_contacts (pn, session_phone, lid) VALUES (?, ?, ?)",
      [pn, sessionPhone, lid]
    );
  }
};

export async function getMessage(
  key: WAMessageKey
): Promise<WAMessageContent | undefined> {
  const id = key.id;
  let rawData: string | undefined;
  if (isProd) {
    const result =
      await (db as any)`SELECT data FROM user_messages WHERE id = ${id} LIMIT 1`;
    rawData = result[0]?.data;
  } else {
    const result = (db as Database)
      .query("SELECT data FROM user_messages WHERE id = ? LIMIT 1")
      .get(id!) as { data: string } | undefined;
    rawData = result?.data;
  }
  if (rawData) {
    const msg = JSON.parse(rawData);
    return msg.message || undefined;
  }
  return undefined;
}

export function handleLidMapping(
  key: string,
  value: string,
  sessionPhone: string
) {
  const isPn = !key.includes("reverse");
  const cleanedValue = value.replace(/^"|"$/g, "");
  if (isPn) {
    const pnKey = key.split("-")[2];
    if (pnKey)
      saveContact(
        `${pnKey}@s.whatsapp.net`,
        `${cleanedValue}@lid`,
        sessionPhone
      );
  } else {
    const keyPart = key.split("-")[2];
    const lidKey = keyPart?.split("_")[0];
    if (lidKey)
      saveContact(
        `${cleanedValue}@lid`,
        `${lidKey}@s.whatsapp.net`,
        sessionPhone
      );
  }
}

export async function cachedGroupMetadata(
  jid: string
): Promise<GroupMetadata | undefined> {
  const id = jid;
  let raw: any;

  if (isProd) {
    raw =
      await (db as any)`SELECT metadata FROM group_metadata WHERE id = ${id} LIMIT 1`;
    raw = raw[0]?.metadata;
  } else {
    raw = (db as Database)
      .query("SELECT metadata FROM group_metadata WHERE id = ?")
      .get(id);
    raw = raw?.metadata;
  }

  return raw ? JSON.parse(raw) : undefined;
}

export const cacheGroupMetadata = async (
  sessionPhone: string,
  metadata: GroupMetadata
) => {
  const data = JSON.stringify(metadata);
  const now = new Date().toISOString();

  if (isProd) {
    await (db as any)`
      INSERT INTO group_metadata (id, session_phone, metadata, updated_at) 
      VALUES (${metadata.id}, ${sessionPhone}, ${data}, ${now}) 
      ON CONFLICT (id, session_phone) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at
    `;
  } else {
    (db as Database).run(
      "INSERT OR REPLACE INTO group_metadata (id, session_phone, metadata, updated_at) VALUES (?, ?, ?, ?)",
      [metadata.id, sessionPhone, data, now]
    );
  }
};

export const syncGroupParticipantsToContactList = async (
  sessionPhone: string,
  metadata: GroupMetadata
) => {
  const tasks: Promise<void>[] = [];

  for (const participant of metadata.participants) {
    tasks.push(
      saveContact(participant.phoneNumber!, participant.id!, sessionPhone)
    );
  }

  await Promise.all(tasks);
};

export const syncGroupMetadata = async (phone: string, sock: any) => {
  try {
    const groups = await sock.groupFetchAllParticipating();
    for (const jid in groups) {
      const metadata = groups[jid];
      await cacheGroupMetadata(phone, metadata);
      await syncGroupParticipantsToContactList(phone, metadata);
    }
  } catch (e) {
    console.error("Failed to sync groups and participants", e);
  }
};

export async function getAlternateId(
  id: string,
  sessionPhone: string
): Promise<string | undefined> {
  const isLid = id?.endsWith("@lid");
  let result: any;

  if (isProd) {
    if (isLid) {
      result = await (db as any)`
        SELECT pn FROM user_contacts 
        WHERE lid = ${id} AND session_phone = ${sessionPhone} 
        LIMIT 1`;
      return result[0]?.pn;
    } else {
      result = await (db as any)`
        SELECT lid FROM user_contacts 
        WHERE pn = ${id} AND session_phone = ${sessionPhone} 
        LIMIT 1`;
      return result[0]?.lid;
    }
  } else {
    if (isLid) {
      result = (db as Database)
        .query(
          "SELECT pn FROM user_contacts WHERE lid = ? AND session_phone = ? LIMIT 1"
        )
        .get(id, sessionPhone) as { pn: string } | undefined;
      return result?.pn;
    } else {
      result = (db as Database)
        .query(
          "SELECT lid FROM user_contacts WHERE pn = ? AND session_phone = ? LIMIT 1"
        )
        .get(id, sessionPhone) as { lid: string } | undefined;
      return result?.lid;
    }
  }
}
