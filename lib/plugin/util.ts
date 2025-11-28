import { delay } from "baileys";
import { Plugins, type CommandProperty } from "../";
import { exit, startSock } from "../..";

export default [
  {
    pattern: "ping",
    alias: ["speed"],
    category: "util",
    async exec(msg) {
      const start = Date.now();
      const m = await msg.reply("```pong```");
      const end = Date.now();      await m.edit(`\`\`\`Pong ${start - end}\`\`\``);
    },
  },
  {
    pattern: "menu",
    alias: ["help"],
    category: "util",
    async exec(msg, sock) {
      const p = new Plugins(msg, sock);
      const commands = p.findAll();
      const categories: Record<string, Set<string>> = {};

      for (const cmd of commands) {
        const cat = cmd.category;
        if (!categories[cat]) categories[cat] = new Set();
        categories[cat].add(cmd.pattern);
      }

      let reply = `ᗰIᗪᗪᒪᗴᗯᗩᖇᗴ ᗰᗴᑎᑌ\n\n`;

      for (const category in categories) {
        reply += `${category.toUpperCase()}\n`;

        for (const pattern of categories[category]) {
          reply += `. ${pattern}\n`;
        }

        reply += `\n`;
      }

      await msg.reply(`\`\`\`${reply.trim()}\`\`\``);
    },
  },
  {
    pattern: "restart",
    alias: ["reboot"],
    category: "util",
    async exec(msg) {
      await msg.reply("_Restarting_");
      await delay(300);
      startSock();
    },
  },
  {
    pattern: "shutdown",
    alias: ["off"],
    category: "util",
    async exec(msg) {
      await msg.reply("_Shutting down_");
      await delay(300);
      exit();
    },
  },
] satisfies CommandProperty[];
