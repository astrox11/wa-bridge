import type { Contact, GroupMetadata, WASocket } from "baileys";

export class Group {
  metadata: GroupMetadata;
  client: WASocket;
  constructor(metadata: GroupMetadata, client: WASocket) {
    this.metadata = metadata;
    this.client = client;
  }
  async kick(participant: Contact["id"]) {
    const exists = this.metadata.participants.map((id) => id.lid);
    if (exists.includes(participant)) {
      return await this.client.groupParticipantsUpdate(
        this.metadata.id,
        [participant],
        "remove",
      );
    }
    return null;
  }
}
