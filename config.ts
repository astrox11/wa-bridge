export default {
  VERSION: (await import("./package.json")).version,
  BOT_NAME: process.env.BOT_NAME || "Whatsaly",
  SERVER: process.env.SERVER || "http://127.0.0.1:8000",
  DEBUG: process.env.DEBUG === "true" || false,
};
