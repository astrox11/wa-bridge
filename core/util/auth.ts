import { proto, initAuthCreds, BufferJSON, isPnUser } from "baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  GroupMetadata,
  SignalDataTypeMap,
  WAMessage,
  WAMessageContent,
  WAMessageKey,
  WASocket,
} from "baileys";
import {
  AuthTokenManager,
  ContactManager,
  GroupManager,
  MessageManager,
  SessionManager,
} from "../sql";
import { SessionStatus } from "../sql/types";

export const useHybridAuthState = async (client: any, phone: string) => {
  const keyPrefix = `session:${phone}:`;
  const saveToSQL = async (key: string, value: any) => {
    await AuthTokenManager.set({
      sessionId: phone,
      token: key,
      value: JSON.stringify(value, BufferJSON.replacer),
      createdAt: new Date(),
    });
  };

  const redisAuth = await useRedisAuthState(
    client,
    keyPrefix,
    saveToSQL,
    phone,
  );

  return {
    ...redisAuth,
    saveCreds: async () => {
      await redisAuth.saveCreds();
      await SessionManager.set({
        id: phone,
        status: SessionStatus.ACTIVE,
        isBusinessAccount: false,
        createdAt: new Date(),
      });
      await saveToSQL("creds", redisAuth.state.creds);
    },
  };
};

export const useRedisAuthState = async (
  client: any,
  keyPrefix: string,
  onWrite: (key: string, data: any) => Promise<void>,
  phone: string,
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
            }),
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

export const saveMessage = async (msg: WAMessage, sessionPhone: string) => {
  const m = JSON.stringify(msg);

  await MessageManager.set({
    sessionId: sessionPhone,
    messageId: msg.key.id as string,
    messageContent: m,
    createdAt: new Date(),
  });
};

export const saveContact = async (pn: string, lid: string, session: string) => {
  if (!isPnUser(pn)) return;
  await ContactManager.set({
    sessionId: session,
    contactInfo: JSON.stringify({ pn, lid }),
    addedAt: new Date(),
    createdAt: new Date(),
  });
};

export async function getMessage(
  session: string,
  key: WAMessageKey,
): Promise<WAMessageContent | undefined> {
  const id = key.id as string;

  const m = await MessageManager.get(session);
  if (m != null) {
    for (const msg of m) {
      if (msg.messageId === id) {
        const content: WAMessage = JSON.parse(msg.messageContent || "{}");
        return content.message || undefined;
      }
    }
  }
}

export function handleLidMapping(
  key: string,
  value: string,
  sessionPhone: string,
) {
  const isPn = !key.includes("reverse");
  const cleanedValue = value.replace(/^"|"$/g, "");
  if (isPn) {
    const pnKey = key.split("-")[2];
    if (pnKey)
      saveContact(
        `${pnKey}@s.whatsapp.net`,
        `${cleanedValue}@lid`,
        sessionPhone,
      );
  } else {
    const keyPart = key.split("-")[2];
    const lidKey = keyPart?.split("_")[0];
    if (lidKey)
      saveContact(
        `${cleanedValue}@lid`,
        `${lidKey}@s.whatsapp.net`,
        sessionPhone,
      );
  }
}

export async function cachedGroupMetadata(
  session: string,
  jid: string,
): Promise<GroupMetadata | undefined> {
  const res = await GroupManager.get(session);

  if (res != null) {
    for (const group of res) {
      const metadata: GroupMetadata = JSON.parse(group.groupInfo);
      if (metadata.id === jid) {
        return metadata;
      }
    }
  }
}

export const cacheGroupMetadata = async (
  session: string,
  metadata: GroupMetadata,
) => {
  await GroupManager.set({
    sessionId: session,
    groupInfo: JSON.stringify(metadata),
    createdAt: new Date(),
  });
};

export const isAdmin = async (
  session: string,
  chat: string,
  participantId: string,
): Promise<boolean> => {
  const metadata = await cachedGroupMetadata(session, chat);
  if (!metadata) return false;
  return metadata.participants.some(
    (participant) =>
      participant.id === participantId && participant.admin !== null,
  );
};

export const syncGroupParticipantsToContactList = async (
  sessionPhone: string,
  metadata: GroupMetadata,
) => {
  const tasks: Promise<void>[] = [];

  for (const participant of metadata.participants) {
    tasks.push(
      saveContact(participant.phoneNumber!, participant.id!, sessionPhone),
    );
  }

  await Promise.all(tasks);
};

export const syncGroupMetadata = async (phone: string, sock: WASocket) => {
  try {
    const groups = await sock.groupFetchAllParticipating();
    for (const metadata of Object.values(groups)) {
      await cacheGroupMetadata(phone, metadata);
      await syncGroupParticipantsToContactList(phone, metadata);
    }
  } catch (e) {
    console.error("Failed to sync groups and participants", e);
  }
};

export async function getAlternateId(
  session: string,
  id: string,
): Promise<string | undefined> {
  id = id.replace(/\D/g, "");

  const jid = `${id}@s.whatsapp.net`;
  const lid = `${id}@lid`;

  const contactByPn = await ContactManager.get(session);

  if (contactByPn != null) {
    for (const contact of contactByPn) {
      const info = contact.contactInfo ? JSON.parse(contact.contactInfo) : null;
      if (info && info.pn === jid) return info.lid;
    }
  }

  const contactByLid = await ContactManager.get(session);

  if (contactByLid != null) {
    for (const contact of contactByLid) {
      const info = contact.contactInfo ? JSON.parse(contact.contactInfo) : null;
      if (info && info.lid === lid) return info.pn;
    }
  }
}
