const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Events,
  ActivityType,
  REST,
  Routes
} = require('discord.js');

const config = require('./config');
const db = require('./database');
const commandModule = require('./commands.js');
const log = require('./logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const body = commandModule.commands.map(command => command.toJSON());

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    log.info(body.length + ' comandos registrados en el servidor ' + config.guildId + '.');
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    log.info(body.length + ' comandos globales registrados.');
  }
}

client.once(Events.ClientReady, readyClient => {
  log.info(readyClient.user.tag + ' está conectado.');
  readyClient.user.setPresence({
    activities: [{ name: 'administrando tiendas', type: ActivityType.Watching }],
    status: 'online'
  });
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      await commandModule.execute(interaction);
      return;
    }
    if (interaction.isButton()) {
      await commandModule.handleButton(interaction);
    }
  } catch (error) {
    log.error('Error en interacción:', error);
    const payload = {
      content: 'Ocurrió un error al ejecutar esta acción. Revisa los permisos del bot.',
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  const roleId = db.getSetting(member.guild.id, 'member_role_id', config.memberRoleId);
  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.add(role, 'Autorol de nuevo miembro')
        .catch(error => log.warn('No se pudo asignar el autorol:', error.message));
    }
  }

  const channelId = db.getSetting(member.guild.id, 'welcome_channel_id');
  const channel = channelId ? member.guild.channels.cache.get(channelId) : null;
  if (channel) {
    await channel.send({
      embeds: [{
        color: config.color,
        title: '👋 ¡Bienvenido/a!',
        description: 'Te damos la bienvenida a **' +
          db.getSetting(member.guild.id, 'store_name', config.botName) +
          '**, ' + member.toString() + '.\nRevisa las normas y los métodos de atención.',
        thumbnail: { url: member.user.displayAvatarURL({ size: 256 }) },
        footer: { text: 'Ahora somos ' + member.guild.memberCount + ' miembros' },
        timestamp: new Date().toISOString()
      }]
    }).catch(error => log.warn('No se pudo enviar la bienvenida:', error.message));
  }
});

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot || !message.content.startsWith(config.prefix)) return;
  const [name] = message.content.slice(config.prefix.length).trim().split(/\s+/);

  if (name === 'ping') {
    return message.reply('Pong: ' + client.ws.ping + ' ms.');
  }

  if (name === 'help' || name === 'ayuda') {
    return message.reply(
      'Comandos slash: /ayuda, /plantilla, /producto, /pedido, /ticket, ' +
      '/rango, /moderacion y /stats.'
    );
  }
});

client.on(Events.Warn, warning => log.warn(warning));
client.on(Events.Error, error => log.error('Discord client:', error));

process.on('unhandledRejection', error => log.error('Promesa no controlada:', error));
process.on('uncaughtException', error => {
  log.error('Excepción no controlada:', error);
  process.exit(1);
});

const app = express();
app.get('/', (_req, res) => res.status(200).send('DATASHOP service is running.'));
app.get('/health', (_req, res) => {
  const online = client.isReady();
  res.status(online ? 200 : 503).json({
    status: online ? 'ok' : 'starting',
    bot: client.user?.tag || null,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => log.info('Health server escuchando en puerto ' + port + '.'));

(async () => {
  try {
    await registerCommands();
    await client.login(config.token);
  } catch (error) {
    log.error('No se pudo iniciar DATASHOP:', error);
    process.exit(1);
  }
})();
