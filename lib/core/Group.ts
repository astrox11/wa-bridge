import { jidNormalizedUser, type GroupMetadata, type WASocket } from "baileys";
import { GetGroupMeta, isParticipant } from "../sql";

export class Group {
  client: WASocket;
  metadata: GroupMetadata;
  constructor(id: string, client: WASocket) {
    this.metadata = GetGroupMeta(id);
    this.client = client;
  }

  async Promote(participant: string) {
    if (isParticipant(this.metadata.id, participant)) {
      return await this.client.groupParticipantsUpdate(
        this.metadata.id,
        [participant],
        "promote",
      );
    }
    return null;
  }

  async Demote(participant: string) {
    if (isParticipant(this.metadata.id, participant)) {
      return await this.client.groupParticipantsUpdate(
        this.metadata.id,
        [participant],
        "demote",
      );
    }
    return null;
  }

  async Remove(participant: string) {
    if (isParticipant(this.metadata.id, participant)) {
      return await this.client.groupParticipantsUpdate(
        this.metadata.id,
        [participant],
        "remove",
      );
    }
    return null;
  }

  async Add(participant: string) {
    return await this.client.groupParticipantsUpdate(
      this.metadata.id,
      [participant],
      "add",
    );
  }

  async Leave() {
    return await this.client.groupLeave(this.metadata.id);
  }

  async Name(name: string) {
    return await this.client.groupUpdateSubject(this.metadata.id, name);
  }

  async Description(description: string) {
    return await this.client.groupUpdateDescription(
      this.metadata.id,
      description,
    );
  }

  async MemberJoinMode(mode: "admin_add" | "all_member_add") {
    return await this.client.groupMemberAddMode(this.metadata.id, mode);
  }

  async EphermalSetting(duration: number) {
    return await this.client.groupToggleEphemeral(this.metadata.id, duration);
  }

  async KickAll() {
    const participants = this.metadata.participants
      .filter(
        (p) =>
          p.admin == null &&
          p.id !== jidNormalizedUser(this.client.user?.id) &&
          p.id !== this.metadata.owner,
      )
      .map((p) => p.id);

    return await this.client.groupParticipantsUpdate(
      this.metadata.id,
      participants,
      "remove",
    );
  }

  async InviteCode() {
    const invite = await this.client.groupInviteCode(this.metadata.id);
    return `https://chat.whatsapp.com/${invite}`;
  }

  async RevokeInvite() {
    const invite = await this.client.groupRevokeInvite(this.metadata.id);
    return `https://chat.whatsapp.com/${invite}`;
  }

  async GroupJoinMode(mode: "on" | "off") {
    return await this.client.groupJoinApprovalMode(this.metadata.id, mode);
  }

  async SetAnnouncementMode(mode: "announcement" | "not_announcement") {
    return await this.client.groupSettingUpdate(this.metadata.id, mode);
  }

  async SetRestrictedMode(mode: "locked" | "unlocked") {
    return await this.client.groupSettingUpdate(this.metadata.id, mode);
  }
}
