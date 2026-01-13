export default {
  pattern: "uptime",
  alias: ["runtime"],
  category: "system",
  function: async(message) => {
    return await message.send(process.uptime().toString())
  }
}
