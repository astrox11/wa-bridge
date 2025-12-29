import type { GroupMetadata, WASocket } from "baileys";
import { bunql } from "./_sql";
import { log } from "../util";
import { syncGroupParticipantsToContactList } from "./contact";

const Group = bunql.define("groups", {
  session_id: { type: "TEXT", notNull: true },
  id: { type: "TEXT", notNull: true },
  data: { type: "TEXT" },
});

// Create composite index for efficient lookups
try {
  bunql.exec(
    "CREATE INDEX IF NOT EXISTS idx_groups_session ON groups(session_id, id)",
  );
} catch {
  // Index may already exist
}

export const cachedGroupMetadata = async (sessionId: string, id: string) => {
  const row = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", id)
    .first();
  return row?.data ? JSON.parse(row.data) : undefined;
};

export const GetGroupMeta = (sessionId: string, id: string) => {
  const row = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", id)
    .first();
  return row?.data ? JSON.parse(row.data) : undefined;
};

export const GetParticipants = (sessionId: string, id: string) => {
  const row = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", id)
    .first();

  if (!row?.data) return [];

  const metadata = JSON.parse(row.data) as GroupMetadata;
  return [
    ...metadata.participants.map((p) => p.id),
    ...metadata.participants.map((p) => p.phoneNumber),
  ].filter(Boolean);
};

export const isParticipant = (
  sessionId: string,
  chat: string,
  participantId: string,
) => {
  return GetParticipants(sessionId, chat).includes(participantId);
};

export const cacheGroupMetadata = async (
  sessionId: string,
  metadata: GroupMetadata | (Partial<GroupMetadata> & { id: string }),
) => {
  const exists = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", metadata.id)
    .first();

  if (exists) {
    const existingData = JSON.parse(exists.data) as GroupMetadata;

    const mergedData: GroupMetadata = {
      ...existingData,
      ...metadata,
      participants:
        metadata.participants !== undefined
          ? metadata.participants
          : existingData.participants,
    };
    syncGroupParticipantsToContactList(sessionId, metadata.participants);
    return Group.update({ data: JSON.stringify(mergedData) })
      .where("session_id", "=", sessionId)
      .where("id", "=", metadata.id)
      .run();
  } else {
    syncGroupParticipantsToContactList(sessionId, metadata.participants);
    return Group.insert({
      session_id: sessionId,
      id: metadata.id,
      data: JSON.stringify(metadata),
    });
  }
};

export const removeGroupMetadata = async (sessionId: string, id: string) => {
  return Group.delete()
    .where("session_id", "=", sessionId)
    .where("id", "=", id)
    .run();
};

export const isAdmin = function (
  sessionId: string,
  chat: string,
  participantId: string,
) {
  const row = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", chat)
    .first();

  if (!row?.data) return false;

  const metadata = JSON.parse(row.data) as GroupMetadata;
  const participant = metadata?.participants.filter((p) => p.admin !== null);

  return [
    ...participant.map((p) => p.id),
    ...participant.map((p) => p.phoneNumber),
  ].includes(participantId);
};

export const getGroupAdmins = function (sessionId: string, chat: string) {
  const row = Group.query()
    .where("session_id", "=", sessionId)
    .where("id", "=", chat)
    .first();

  if (!row?.data) return [];

  const metadata = JSON.parse(row.data) as GroupMetadata;
  const admins = metadata.participants
    .filter((p) => p.admin !== null)
    .map((p) => p.id);
  return admins;
};

export const syncGroupMetadata = async (
  sessionId: string,
  client: WASocket,
) => {
  try {
    const groups = await client.groupFetchAllParticipating();
    for (const [id, metadata] of Object.entries(groups)) {
      metadata.id = id;
      syncGroupParticipantsToContactList(sessionId, metadata.participants);
      await cacheGroupMetadata(sessionId, metadata);
    }
  } catch (error) {
    log.error("Error syncing group metadata:", error);
  }
  return;
};
