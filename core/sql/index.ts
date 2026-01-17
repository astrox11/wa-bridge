import { SQL } from "bun";
import Database from "bun:sqlite";
import type {
  Sessions,
  AuthTokens as AuthTokensType,
  SessionContacts,
  SessionConfigurations,
  SessionMessages,
  SessionGroups,
} from "./types";
import { readFileSync } from "fs";
import { join } from "path";

const dbUrl = process.env.DATABASE_URL || "sqlite://../dev.sqlite";

const db = new SQL({
  url: dbUrl,
});

export async function initSql(fileName: string) {
  try {
    const folderPath = join(process.cwd(), "..", "store");
    const sqlPath = join(folderPath, fileName);
    const sqlContent = readFileSync(sqlPath, "utf8");

    const isSQLite = dbUrl.startsWith("sqlite://") || !dbUrl.includes("://");

    if (isSQLite) {
      const filePath = dbUrl.replace("sqlite://", "");
      const nativeDb = new Database(filePath);

      nativeDb.run(sqlContent);
      nativeDb.close();
    } else {
      await db`${sqlContent}`.simple();
    }
  } catch (error) {
    console.error(`Initialization Error:`, error);
    throw error;
  }
}

export const SessionManager = {
  async set(data: Sessions): Promise<void> {
    await db`
      INSERT INTO sessions (id, status, name, profileUrl, isBusinessAccount)
      VALUES (${data.id}, ${data.status}, ${data.name}, ${data.profileUrl}, ${data.isBusinessAccount})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        name = EXCLUDED.name,
        profileUrl = EXCLUDED.profileUrl,
        isBusinessAccount = EXCLUDED.isBusinessAccount
    `;
  },
  async get(id: string): Promise<Sessions | null> {
    const res = await db<Sessions[]>`SELECT * FROM sessions WHERE id = ${id}`;
    return res[0] || null;
  },
  async del(id: string): Promise<void> {
    await db`DELETE FROM sessions WHERE id = ${id}`;
  },
};

export const AuthTokenManager = {
  async set(data: AuthTokensType): Promise<void> {
    await db`
      INSERT INTO auth_tokens (sessionId, token, value)
      VALUES (${data.sessionId}, ${data.token}, ${data.value})
      ON CONFLICT (sessionId) DO UPDATE SET
        token = EXCLUDED.token,
        value = EXCLUDED.value
    `;
  },
  async get(sessionId: string): Promise<AuthTokensType | null> {
    const res = await db<
      AuthTokensType[]
    >`SELECT * FROM auth_tokens WHERE sessionId = ${sessionId}`;
    return res[0] || null;
  },
  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM auth_tokens WHERE sessionId = ${sessionId}`;
  },
};

export const MessageManager = {
  async set(data: SessionMessages): Promise<void> {
    await db`
      INSERT INTO session_messages (sessionId, messageId, messageContent)
      VALUES (${data.sessionId}, ${data.messageId}, ${data.messageContent})
      ON CONFLICT (sessionId) DO UPDATE SET
        messageId = EXCLUDED.messageId,
        messageContent = EXCLUDED.messageContent
    `;
  },
  async get(sessionId: string): Promise<SessionMessages[] | null> {
    const res = await db<
      SessionMessages[]
    >`SELECT * FROM session_messages WHERE sessionId = ${sessionId}`;
    return res || null;
  },
  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM session_messages WHERE sessionId = ${sessionId}`;
  },
};

export const ContactManager = {
  async set(data: SessionContacts): Promise<void> {
    await db`
      INSERT INTO session_contacts (sessionId, contactInfo, addedAt, createdAt)
      VALUES (
        ${data.sessionId}, 
        ${data.contactInfo}, 
        ${data.addedAt.toISOString()}, 
        ${data.createdAt.toISOString()}
      )
      ON CONFLICT (sessionId) DO UPDATE SET
        contactInfo = EXCLUDED.contactInfo,
        addedAt = EXCLUDED.addedAt
    `;
  },
  async get(sessionId: string): Promise<SessionContacts[] | null> {
    const res = await db<
      SessionContacts[]
    >`SELECT * FROM session_contacts WHERE sessionId = ${sessionId}`;
    return res || null;
  },
  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM session_contacts WHERE sessionId = ${sessionId}`;
  },
};

export const ConfigManager = {
  async set(data: SessionConfigurations): Promise<void> {
    await db`
      INSERT INTO session_configurations (sessionId, configKey, configValue, createdAt)
      VALUES (${data.sessionId}, ${data.configKey}, ${data.configValue}, ${data.createdAt.toISOString()})
      ON CONFLICT (sessionId) DO UPDATE SET
        configKey = EXCLUDED.configKey,
        configValue = EXCLUDED.configValue
    `;
  },
  async get(sessionId: string): Promise<SessionConfigurations | null> {
    const res = await db<
      SessionConfigurations[]
    >`SELECT * FROM session_configurations WHERE sessionId = ${sessionId}`;
    return res[0] || null;
  },
  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM session_configurations WHERE sessionId = ${sessionId}`;
  },
};

export const GroupManager = {
  async set(data: SessionGroups): Promise<void> {
    await db`
      INSERT INTO session_groups (sessionId, groupInfo, createdAt)
      VALUES (${data.sessionId}, ${data.groupInfo}, ${data.createdAt.toISOString()})`;
  },
  async get(sessionId: string): Promise<SessionGroups[] | null> {
    const res = await db<
      SessionGroups[]
    >`SELECT * FROM session_groups WHERE sessionId = ${sessionId}`;
    return res || null;
  },
  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM session_groups WHERE sessionId = ${sessionId}`;
  },
};
