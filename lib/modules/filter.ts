import type { CommandProperty } from "..";
import {
  addFilter,
  getAllFilters,
  getFilterById,
  deleteFilter,
  updateFilter,
} from "../sql";
import config from "../../config";

/**
 * Replace placeholders in message
 */
function replacePlaceholders(
  message: string,
  sender: string,
  ownerId: string,
  botName: string,
): string {
  return message
    .replace(/@user/g, sender.split("@")[0])
    .replace(/@owner/g, ownerId.split("@")[0])
    .replace(/@botname/g, botName);
}

export default [
  {
    pattern: "filter",
    category: "util",
    async exec(msg, sock, args) {
      if (!args) {
        return await msg.reply("```Usage: filter <trigger>```");
      }

      const filterId = parseInt(args);

      if (isNaN(filterId)) {
        return await msg.reply("```Invalid filter ID```");
      }

      const filter = getFilterById(msg.sessionId, filterId);

      if (!filter) {
        return await msg.reply("```Filter not found```");
      }

      const processedMessage = replacePlaceholders(
        filter.message,
        msg.sender,
        sock.user.id,
        config.BOT_NAME,
      );

      await sock.sendMessage(msg.chat, {
        text: processedMessage,
        mentions: [msg.sender],
      });
    },
  },
  {
    pattern: "setfilter",
    category: "util",
    async exec(msg, _, args) {
      if (!args) {
        return await msg.reply("```Usage: setfilter <status> <message>```");
      }

      const parts = args.split(" ");
      const status = parseInt(parts[0]);
      const message = parts.slice(1).join(" ");

      if (isNaN(status) || !message) {
        return await msg.reply("```Usage: setfilter <status> <message>```");
      }

      addFilter(msg.sessionId, status, message);
      await msg.reply("```Filter added successfully```");
    },
  },
  {
    pattern: "getfilter",
    category: "util",
    async exec(msg, _, args) {
      const filters = getAllFilters(msg.sessionId);

      if (filters.length === 0) {
        return await msg.reply("```No filters found```");
      }

      let reply = "```Filters:\n";
      for (const filter of filters) {
        reply += `ID: ${filter.id}, Status: ${filter.status}\n`;
        reply += `Message: ${filter.message}\n\n`;
      }
      reply += "```";

      await msg.reply(reply);
    },
  },
  {
    pattern: "delfilter",
    category: "util",
    async exec(msg, _, args) {
      if (!args) {
        return await msg.reply("```Usage: delfilter <id>```");
      }

      const filterId = parseInt(args);

      if (isNaN(filterId)) {
        return await msg.reply("```Invalid filter ID```");
      }

      deleteFilter(msg.sessionId, filterId);
      await msg.reply("```Filter deleted successfully```");
    },
  },
] satisfies CommandProperty[];
