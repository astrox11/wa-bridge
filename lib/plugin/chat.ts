import type { CommandProperty } from "../src";

export default [
  {
    pattern: "vv",
    alias: ["viewonce"],
    category: "p2p",
    async exec(msg, sock) {
      if (!msg?.quoted?.viewonce) {
        return await msg.reply("_Reply a view once message_");
      }

      msg.quoted.message[msg.quoted.type].viewOnce = false;

      await sock.sendMessage(
        msg.chat,
        {
          forward: msg.quoted,
          contextInfo: { isForwarded: false, forwardingScore: 0 },
        },
        { quoted: msg.quoted },
      );
    },
  },
] satisfies Array<CommandProperty>;
