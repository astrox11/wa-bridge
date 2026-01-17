import { jidNormalizedUser, normalizeMessageContent } from "baileys";
import type { WAMessage, WAContextInfo, WASocket } from "baileys";
import {
  isAdmin as is_admin,
  parse_content,
  getAlternateId,
  get_content_type,
  extract_text_from_message,
} from "../util";

const serialize = async (
  msg: WAMessage & { session: string },
  client: WASocket,
) => {
  const { key, message, messageTimestamp } = msg;

  normalizeMessageContent(message);
  const type = get_content_type(message);
  const quoted = (msg.message?.[type as keyof typeof msg.message] as any)
    ?.contextInfo as any as WAContextInfo | undefined;

  const quotedMessage = quoted?.quotedMessage;
  const quotedType = quotedMessage ? get_content_type(quotedMessage) : null;

  const isGroup = key.remoteJid!.endsWith("@g.us");
  const sender = !isGroup
    ? !key.fromMe
      ? key.remoteJid
      : jidNormalizedUser(client.user?.id)
    : key.participant;

  const senderAlt = await getAlternateId(msg.session, sender!);
  const session = msg.session;
  const isAdmin = isGroup
    ? await is_admin(session, key.remoteJid!, sender!)
    : null;
  const text = extract_text_from_message(message);

  return {
    chat: key.remoteJid,
    key,
    message,
    type,
    sender,
    senderAlt,
    session,
    isGroup,
    isAdmin,
    messageTimestamp,
    text,
    image: Boolean(message?.imageMessage),
    video: Boolean(message?.videoMessage),
    audio: Boolean(message?.audioMessage),
    document: Boolean(message?.documentMessage),
    sticker: Boolean(message?.stickerMessage),
    media: Boolean(
      message?.imageMessage ||
      message?.videoMessage ||
      message?.audioMessage ||
      message?.documentMessage ||
      message?.stickerMessage,
    ),
    quoted:
      quoted && quotedMessage && quotedType
        ? {
            key: {
              remoteJid: key.remoteJid,
              remoteJidAlt: key.remoteJidAlt,
              id: quoted.stanzaId,
              fromMe: [
                quoted.participant,
                await getAlternateId(quoted.participant!, msg.session),
              ].includes(jidNormalizedUser(client.user!.id)),
            },
            sender: quoted.participant,
            senderAlt: await getAlternateId(quoted.participant!, msg.session),
            message: quotedMessage,
            type: quotedType,
            text: extract_text_from_message(quotedMessage),
            broadcast: Boolean(quoted?.remoteJid),
            viewonce: (
              quotedMessage[quotedType as keyof typeof quotedMessage] as {
                viewOnce?: boolean;
              }
            )?.viewOnce,
          }
        : undefined,
    reply: async function (text: string) {
      return await client.sendMessage(
        this.chat!,
        { text },
        { quoted: this?.quoted || msg },
      );
    },
    send: async function (i: any) {
      const content = await parse_content(i);

      if (content?.mimeType == "text/plain") {
        const m = (await client.sendMessage(this.chat!, {
          text: content.content,
        })) as WAMessage;
        return await serialize({ ...m, session: this.session }, client);
      }

      if (content?.mimeType.startsWith("image/")) {
        const m = (await client.sendMessage(this.chat!, {
          image: { url: content.content },
        })) as WAMessage;
        return await serialize({ ...m, session: this.session }, client);
      }

      if (content?.mimeType.startsWith("video/")) {
        const m = (await client.sendMessage(this.chat!, {
          video: { url: content.content },
        })) as WAMessage;
        return await serialize({ ...m, session: this.session }, client);
      }

      if (content?.mimeType.startsWith("audio/")) {
        const m = (await client.sendMessage(this.chat!, {
          audio: { url: content.content },
        })) as WAMessage;
        return await serialize({ ...m, session: this.session }, client);
      }
    },
    edit: async function (text: string) {
      if (this.image) {
        return await this.client.sendMessage(this.chat!, {
          edit: this.key,
          image: { url: "" },
          text,
        });
      } else if (this.video) {
        return await this.client.sendMessage(this.chat!, {
          edit: this.key,
          video: { url: "" },
          text,
        });
      } else {
        return await this.client.sendMessage(this.chat!, {
          edit: this.key,
          text,
        });
      }
    },
    forward: async function (
      jid: string,
      msg: WAMessage,
      opts?: { forceForward?: boolean; forwardScore?: number },
    ) {
      await this.client.sendMessage(
        jid,
        {
          forward: msg,
          contextInfo: {
            forwardingScore: opts?.forwardScore,
            isForwarded: opts?.forceForward,
          },
        },
        { quoted: this },
      );
    },
    delete: async function () {
      const key = this?.quoted?.key || this.key;

      if (!key.fromMe) {
        return await this.client.chatModify(
          {
            deleteForMe: {
              key: this?.quoted?.key || this.key,
              timestamp: Number(this.messageTimestamp),
              deleteMedia: this.media,
            },
          },
          this.chat!,
        );
      }

      return await this.client.sendMessage(this.chat!, {
        delete: this?.quoted?.key || this.key,
      });
    },
    client,
  };
};

export type SerializedMessage = Awaited<ReturnType<typeof serialize>>;
export default serialize;
