import type { CommandProperty } from "..";
import { getAfk, setAfk } from "../sql";

export default [
  {
    pattern: "afk",
    category: "util",
    async exec(msg, _, args) {
      if (!args) {
        // Toggle or check AFK status
        const currentAfk = getAfk(msg.sessionId);
        
        if (currentAfk && currentAfk.status === 1) {
          // Turn off AFK
          setAfk(msg.sessionId, false);
          return await msg.reply("```AFK mode disabled```");
        } else {
          // Turn on AFK with default message
          setAfk(msg.sessionId, true, "I'm currently AFK");
          return await msg.reply("```AFK mode enabled```");
        }
      } else {
        const command = args.toLowerCase().split(" ")[0];
        
        if (command === "on") {
          const customMessage = args.substring(3).trim();
          setAfk(msg.sessionId, true, customMessage || "I'm currently AFK");
          return await msg.reply("```AFK mode enabled```");
        } else if (command === "off") {
          setAfk(msg.sessionId, false);
          return await msg.reply("```AFK mode disabled```");
        } else {
          // Treat entire args as custom AFK message
          setAfk(msg.sessionId, true, args);
          return await msg.reply("```AFK mode enabled with custom message```");
        }
      }
    },
  },
  {
    event: true,
    dontAddToCommandList: true,
    async exec(msg, sock) {
      // Check if user is AFK when mentioned or messaged
      const afkStatus = getAfk(msg.sessionId);
      
      if (afkStatus && afkStatus.status === 1) {
        // Check if someone mentioned or replied to the AFK user
        const botJid = sock.user.id;
        if (msg.contextInfo?.mentionedJid?.includes(botJid)) {
          const afkMessage = afkStatus.message || "I'm currently AFK";
          await msg.reply(`\`\`\`${afkMessage}\`\`\``);
        }
      }
    },
  },
] satisfies CommandProperty[];
