require("dotenv").config();

const { Client, MessageEmbed } = require("discord.js");
const { Database } = require("quickmongo");
const {
  sendTo,
  sendFromText,
  sendFromEmbed,
  prefix,
  activity,
  roles,
} = require("./storage/config");

const fetch = require("node-fetch");
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const db = new Database(process.env.mongoDB, "arabmediator");

db.on("ready", () => console.log("Database connected!"));
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity(activity);
});

// Set Title
client.on("messageCreate", async (message) => {
  if (
    !message.content.startsWith(prefix) ||
    message.author.bot ||
    !message.guild
  )
    return;

  const args = message.content.slice(prefix.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  if (command == "title") {
    let userRoles = [];
    message.member.roles.cache.map((role) => userRoles.push(role.id));
    let check = roles.some((r) => userRoles.includes(r));
	
    if (!message.member.permissions.has("ADMINISTRATOR") && !check) return;
    if (!args[0])
      return message.channel.send({
        content: `الرجاء إدخال العنوان الجديد الخاص بالفعالية`,
      });

    let title = args.join(" ");
    await db.set(`title-${message.guildId}`, title);

    message.channel.send({
      content: `تم تغيير عنوان الايمبد إلى: \`${title}\``,
    });
  }
});

// Send Messages
client.on("messageCreate", async (message) => {
  if (message.bot || !message.guild) return;

  if (message.channelId == sendFromEmbed) {
    let channel = message.guild.channels.cache.get(sendTo);
    let title = await db.get(`title-${message.guildId}`);
    let arr = [];

    let embed = new MessageEmbed()
      .setTitle(title || "Event")
      .setColor("#F13A4B")
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 512 }))
      .setFooter({
        text: "ArabMediator's Event",
        iconURL: message.guild.iconURL({ format: "png", size: 512 }),
      });

    if (!channel) return;
    if (message.attachments.size > 0)
      message.attachments.forEach(async (file) => {
        if (!(await checkImage(file.url))) return;
        arr.push(file.url);
      });
    if (arr.length > 0) {
      if (message.content.length > 0)
        return channel.send({
          embeds: [
            embed.setImage(arr[0]).setDescription(`**${message.content}**`),
          ],
        });
      channel.send({ embeds: [embed.setImage(arr[0])] });
    }
    if (message.content.length > 0)
      return channel.send({
        embeds: [embed.setDescription(`**${message.content}**`)],
      });
    channel.send({ embeds: [embed.setImage(arr[0])] });
  } else if (message.channelId == sendFromText) {
    let channel = message.guild.channels.cache.get(sendTo);
    let arr = [];

    if (!channel) return;
    if (message.attachments.size > 0)
      message.attachments.forEach(async (file) => {
        if (!(await checkImage(file.url))) return;
        arr.push(file.url);
      });
    if (message.content.length > 0)
      return channel.send({ content: message.content, files: arr });
    if (arr.length > 0) return channel.send({ files: arr });
  }
});


require("./storage/server");
async function checkImage(url) {
  const res = await fetch(url);
  const buff = await res.blob();

  return buff.type.startsWith("image/");
    }
