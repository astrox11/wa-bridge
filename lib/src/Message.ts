import {
  downloadMediaMessage,
  getContentType,
  isJidGroup,
  normalizeMessageContent,
} from "baileys";
import type { WASocket, WAMessage, proto, WAMessageContent } from "baileys";
import { store } from "../sql";

export class Message {
  client;
  chat;
  key;
  message;
  isGroup;
  sender;
  sender_alt;
  type;
  image;
  video;
  audio;
  sticker;
  contextInfo;
  quoted;
  text;

  constructor(client: WASocket, message: WAMessage) {
    this.client = client;
    this.chat = message.key.remoteJid!;
    this.key = message.key;
    this.message = normalizeMessageContent(message.message!);
    this.isGroup = isJidGroup(message.key.remoteJid!);
    this.sender = !this.isGroup ? this.key.remoteJid : this.key.participant;
    this.sender_alt = !this.isGroup
      ? this.key.remoteJidAlt
      : this.key.participantAlt;
    this.type = getContentType(this.message);
    this.image = this.type === "imageMessage";
    this.video = this.type === "videoMessage";
    this.audio = this.type === "audioMessage";
    this.sticker =
      this.type === "stickerMessage" || this.type === "lottieStickerMessage";

    const content = this.message?.[this.type!];
    this.contextInfo =
      typeof content === "object" && content !== null
        ? (content as any).contextInfo
        : undefined;

    this.quoted =
      this.contextInfo?.stanzaId && this.contextInfo?.quotedMessage
        ? new Quoted(this.contextInfo, client)
        : undefined;

    this.text = this.message ? extract_text(this.message) : undefined;

    Object.defineProperties(this, {
      contextInfo: {
        value: this.contextInfo,
        enumerable: false,
        writable: true,
        configurable: true,
      },
      client: {
        value: client,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    });
    store.save_wa_message(message);
  }

  async reply(text: string) {
    const msg = await this.client.sendMessage(
      this.chat,
      { text },
      { quoted: this },
    );
    return new Message(this.client, msg!);
  }

  // async send(content: any, opts: {}) {}

  async edit(text: string) {
    if (this.image) {
      return await this.client.sendMessage(this.chat, {
        edit: this.key,
        image: { url: "" },
        text,
      });
    } else if (this.video) {
      return await this.client.sendMessage(this.chat, {
        edit: this.key,
        video: { url: "" },
        text,
      });
    } else {
      return await this.client.sendMessage(this.chat, { edit: this.key, text });
    }
  }
}

class Quoted {
  key;
  message;
  type;
  image;
  video;
  audio;
  sticker;
  client;
  media;

  constructor(quoted: proto.IContextInfo, client: WASocket) {
    this.key = {
      remoteJid: quoted.remoteJid,
      id: quoted.stanzaId,
      participant: quoted.participant,
      participantAlt: undefined,
    };
    this.message = normalizeMessageContent(quoted.quotedMessage!);
    this.type = getContentType(this.message);
    this.image = this.type === "imageMessage";
    this.video = this.type === "videoMessage";
    this.audio = this.type === "audioMessage";
    this.sticker =
      this.type === "stickerMessage" || this.type === "lottieStickerMessage";

    this.client = client;
    this.media = [this.image, this.video, this.audio, this.sticker].includes(
      true,
    );

    Object.defineProperty(this, "client", { value: client, enumerable: false });
  }
  async download() {
    return await downloadMediaMessage(this, "buffer", {});
  }
}

function extract_text(message: WAMessageContent): string | undefined {
  if (message?.extendedTextMessage?.text)
    return message.extendedTextMessage.text;
  if (message?.conversation) return message.conversation;
  if (message?.imageMessage?.caption) return message.imageMessage.caption;
  if (message?.videoMessage?.caption) return message.videoMessage.caption;
  if (message?.documentMessage?.caption) return message.documentMessage.caption;
  if (message?.buttonsMessage?.contentText)
    return message.buttonsMessage.contentText;
  if (message?.templateMessage?.hydratedTemplate?.hydratedContentText)
    return message.templateMessage.hydratedTemplate.hydratedContentText;
  if (message?.listMessage?.description) return message.listMessage.description;
  if (message?.protocolMessage?.editedMessage) {
    const text = extract_text(message.protocolMessage.editedMessage);
    if (text) return text;
  }
  return undefined;
}
