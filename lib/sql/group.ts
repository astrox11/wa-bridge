import type { GroupMetadata, WASocket } from "baileys";
import { bunql } from "./_sql";
import { log } from "../util";
import { syncGroupParticipantsToContactList } from "./contact";

const Group = bunql.define("groups", {
  id: { type: "TEXT", primary: true },
  data: { type: "TEXT" },
});

export const cachedGroupMetadata = async (id: string) => {
  const metadata = Group.select().where("id", "=", id).get() as unknown as
    | GroupMetadata
    | undefined;
  return metadata ? metadata : undefined;
};

export const GetGroupMeta = (id: string) => {
  const metadata = Group.select().where("id", "=", id).get()[0]
    ?.data as unknown as GroupMetadata | undefined;
  return metadata ? JSON.parse(metadata as any as string) : undefined;
};

export const GetParticipants = (id: string) => {
  const metadata = Group.select().where("id", "=", id).get()[0]
    ?.data as unknown as GroupMetadata | undefined;

  return metadata
    ? [
        ...metadata.participants.map((p) => p.id),
        ...metadata.participants.map((p) => p.phoneNumber),
      ].filter(Boolean)
    : [];
};

export const isParticipant = (chat: string, participantId: string) => {
  return GetParticipants(chat).includes(participantId);
};

export const cacheGroupMetadata = async (
  metadata: GroupMetadata | (Partial<GroupMetadata> & { id: string }),
) => {
  const exists = Group.select().where("id", "=", metadata.id).get()[0];

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
    syncGroupParticipantsToContactList(metadata.participants);
    return Group.update({ data: JSON.stringify(mergedData) })
      .where("id", "=", metadata.id)
      .run();
  } else {
    syncGroupParticipantsToContactList(metadata.participants);
    return Group.insert({
      id: metadata.id,
      data: JSON.stringify(metadata),
    });
  }
};

export const removeGroupMetadata = async (id: string) => {
  return Group.delete().where("id", "=", id).run();
};

export const isAdmin = function (chat: string, participantId: string) {
  let metadata = Group.select().where("id", "=", chat).get()[0]
    ?.data as unknown as GroupMetadata | undefined;

  if (metadata) {
    metadata = JSON.parse(metadata as any as string);
  }

  const participant = metadata?.participants.filter((p) => p.admin !== null);

  return [
    ...participant.map((p) => p.id),
    ...participant.map((p) => p.phoneNumber),
  ].includes(participantId);
};

export const getGroupAdmins = function (chat: string) {
  const metadata = Group.select().where("id", "=", chat).get() as unknown as
    | GroupMetadata
    | undefined;
  if (!metadata) return [];
  const admins = metadata.participants
    .filter((p) => p.admin !== null)
    .map((p) => p.id);
  return admins;
};

export const syncGroupMetadata = async (client: WASocket) => {
  try {
    const groups = await client.groupFetchAllParticipating();
    for (const [id, metadata] of Object.entries(groups)) {
      metadata.id = id;
      syncGroupParticipantsToContactList(metadata.participants);
      await cacheGroupMetadata(metadata);
    }
  } catch (error) {
    log.error("Error syncing group metadata:", error);
  }
  return;
};
