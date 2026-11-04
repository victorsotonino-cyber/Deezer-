require('dotenv').config();
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes, Events } = require('discord.js');

const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Falta la variable obligatoria: ${key}`);
    process.exit(1);
  }
}
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(name => name.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (!command.data || typeof command.execute !== 'function') {
    console.warn(`[COMMAND] Se omite ${file}: exportación inválida.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const body = [...client.commands.values()].map(command => command.data.toJSON());
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);
  await rest.put(route, { body });
  console.log(`[COMMANDS] ${body.length} comandos registrados.`);
}
client.once(Events.ClientReady, readyClient => {
  console.log(`[ONLINE] ${readyClient.user.tag} está conectado.`);
  readyClient.user.setActivity('tu tienda | /help');
});
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`[COMMAND ERROR] /${interaction.commandName}`, error);
    const payload = { content: '❌ Ocurrió un error al ejecutar el comando. Revisa los logs del bot.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});
const app = express();
app.get('/', (_req, res) => res.status(200).send('DATASHOP bot service is running.'));
app.get('/health', (_req, res) => res.status(client.isReady() ? 200 : 503).json({
  status: client.isReady() ? 'ok' : 'starting',
  bot: client.user?.tag ?? null,
  uptimeSeconds: Math.floor(process.uptime())
}));
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`[HTTP] Health server en puerto ${port}.`));
(async () => {
  try {
    await registerCommands();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('[STARTUP] No se pudo iniciar el bot:', error);
    process.exit(1);
  }
})();
