require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Falta DISCORD_TOKEN o CLIENT_ID en el archivo .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
const dir = path.join(__dirname, 'src', 'commands');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  for (const c of [].concat(require(path.join(dir, f)))) client.commands.set(c.data.name, c);
}

require('./src/events')(client);
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
client.login(process.env.DISCORD_TOKEN);
