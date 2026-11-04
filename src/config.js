const dotenv = require('dotenv');
dotenv.config();

const parsedColor = Number.parseInt(String(process.env.EMBED_COLOR || '7C3AED').replace('#', ''), 16);

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  botName: process.env.BOT_NAME || 'DATASHOP',
  prefix: process.env.PREFIX || '!',
  color: Number.isFinite(parsedColor) ? parsedColor : 0x7C3AED,
  dbPath: process.env.DB_PATH || './data/datashop.sqlite',
  ownerIds: (process.env.OWNER_IDS || '').split(',').map(value => value.trim()).filter(Boolean),
  memberRoleId: process.env.MEMBER_ROLE_ID || null
};

if (!config.token) throw new Error('Falta DISCORD_TOKEN. Configura el archivo .env.');
module.exports = config;
