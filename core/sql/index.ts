import { SQL } from "bun";
import Database from "bun:sqlite";
import type {
  Devices,
  Sessions,
  AuthTokens as AuthTokensType,
  SessionContacts,
  SessionConfigurations,
  SessionMessages,
  SessionGroups,
  SessionChats,
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

export const ChatManager = {
  async set(data: SessionChats): Promise<void> {
    try {
      await db`
        INSERT INTO session_chats (sessionId, chatId, chatInfo, updatedAt, createdAt)
        VALUES (
          ${data.sessionId}, 
          ${data.chatId}, 
          ${data.chatInfo}, 
          ${data.updatedAt.toISOString()}, 
          ${data.createdAt.toISOString()}
        )
        ON CONFLICT (sessionId, chatId) DO UPDATE SET
          chatInfo = EXCLUDED.chatInfo,
          updatedAt = EXCLUDED.updatedAt
      `;
    } catch (error) {
      console.error("Database Error in ChatManager.set:", error);
      throw error;
    }
  },

  async get(sessionId: string): Promise<SessionChats[] | null> {
    const res = await db<SessionChats[]>`
      SELECT * FROM session_chats WHERE sessionId = ${sessionId}
    `;
    return res.length > 0 ? res : null;
  },

  /**
   * Deletes all chats for a session, or a specific chat if chatId is provided
   */
  async del(sessionId: string, chatId?: string): Promise<void> {
    if (chatId) {
      await db`DELETE FROM session_chats WHERE sessionId = ${sessionId} AND chatId = ${chatId}`;
    } else {
      await db`DELETE FROM session_chats WHERE sessionId = ${sessionId}`;
    }
  },
};

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

export const DevicesManager = {
  async set(data: Devices): Promise<void> {
    await db`
      INSERT INTO devices (sessionId, User, deviceInfo, lastSeenAt, createdAt)
      VALUES (
        ${data.sessionId}, 
        ${data.User}, 
        ${data.deviceInfo}, 
        ${data.lastSeenAt.toISOString()}, 
        ${data.createdAt.toISOString()}
      )
      -- Update ONLY if the same user exists in the same session
      ON CONFLICT (sessionId, User) DO UPDATE SET
        deviceInfo = EXCLUDED.deviceInfo,
        lastSeenAt = EXCLUDED.lastSeenAt
    `;
  },

  async get(sessionId: string): Promise<Devices | null> {
    const res = await db<
      Devices[]
    >`SELECT * FROM devices WHERE sessionId = ${sessionId}`;
    return res[0] || null;
  },

  async del(sessionId: string): Promise<void> {
    await db`DELETE FROM devices WHERE sessionId = ${sessionId}`;
  },
};

export const AuthTokenManager = {
  async set(data: AuthTokensType): Promise<void> {
    await db`
      INSERT INTO auth_tokens (sessionId, token, value)
      VALUES (${data.sessionId}, ${data.token}, ${data.value})
      -- Target both columns in the conflict check
      ON CONFLICT (sessionId, token) DO UPDATE SET
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
      -- Conflict on messageId so that the same message isn't duplicated,
      -- but different messages in the same session are all saved.
      ON CONFLICT (messageId) DO UPDATE SET
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
    try {
      await db`
        INSERT INTO session_contacts (sessionId, contactPn, contactLid, addedAt, createdAt)
        VALUES (
          ${data.sessionId}, 
          ${data.contactPn}, 
          ${data.contactLid}, 
          ${data.addedAt.toISOString()}, 
          ${data.createdAt.toISOString()}
        )
        ON CONFLICT (sessionId, contactPn) DO UPDATE SET
          contactLid = EXCLUDED.contactLid,
          addedAt = EXCLUDED.addedAt
      `;
    } catch (error) {
      console.error("Database Error in ContactManager:", error);
      throw error;
    }
  },

  async get(sessionId: string): Promise<SessionContacts[] | null> {
    const res = await db<SessionContacts[]>`
      SELECT * FROM session_contacts WHERE sessionId = ${sessionId}
    `;
    return res.length > 0 ? res : null;
  },

  async del(sessionId: string, contactPn: string): Promise<void> {
    await db`
      DELETE FROM session_contacts 
      WHERE sessionId = ${sessionId} AND contactPn = ${contactPn}
    `;
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
      INSERT INTO session_groups (sessionId, groupId, groupInfo, updatedAt, createdAt)
      VALUES (
        ${data.sessionId}, 
        ${data.groupId}, 
        ${data.groupInfo}, 
        ${data.updatedAt.toISOString()}, 
        ${data.createdAt.toISOString()}
      )
      ON CONFLICT (groupId) DO UPDATE SET
        groupInfo = EXCLUDED.groupInfo,
        updatedAt = EXCLUDED.updatedAt,
        sessionId = EXCLUDED.sessionId
    `;
  },

  async get(sessionId: string): Promise<SessionGroups[] | null> {
    const res = await db<SessionGroups[]>`
      SELECT * FROM session_groups WHERE sessionId = ${sessionId}
    `;
    return res.length > 0 ? res : null;
  },

  async del(groupId: string): Promise<void> {
    await db`DELETE FROM session_groups WHERE groupId = ${groupId}`;
  },
};
