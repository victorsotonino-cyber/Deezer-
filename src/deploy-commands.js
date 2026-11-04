require('dotenv').config();
const { REST, Routes } = require('discord.js');
const config = require('./config');
const { commands } = require('./commands.js');

if (!config.clientId) {
  throw new Error('Falta CLIENT_ID en el archivo .env.');
}

const rest = new REST({ version: '10' }).setToken(config.token);
const body = commands.map(command => command.toJSON());

(async () => {
  try {
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
      console.log('Comandos registrados en el servidor ' + config.guildId + '.');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log('Comandos globales registrados; pueden tardar en aparecer.');
    }
  } catch (error) {
    console.error('Error al registrar comandos:', error);
    process.exitCode = 1;
  }
})();
