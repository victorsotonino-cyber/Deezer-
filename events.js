const { Events, REST, Routes } = require('discord.js');
const db = require('./db');
const { embed, isStaff, EPH, parseDuration } = require('./util');
const tickets = require('./tickets');
const giveaways = require('./giveaways');
const admin = require('./admin');
const template = require('./template');
const help = require('./help');

module.exports = (client) => {
  const handlers = { tk: tickets.handle, shop: tickets.handleShop, gw: giveaways.handle, pn: admin.handle, tpl: template.handle, help: help.handle };

  async function register(guild) {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id), { body: [...client.commands.values()].map((c) => c.data.toJSON()) })
      .catch((e) => console.error('Registro de comandos falló en', guild.name, e.message));
  }

  client.once(Events.ClientReady, async () => {
    console.log(`✅ Conectado como ${client.user.tag}`);
    for (const g of client.guilds.cache.values()) await register(g);
    giveaways.startLoop(client);
    setInterval(() => client.guilds.cache.forEach((g) => template.updateStats(g).catch(() => {})), 10 * 60 * 1000);
    client.user.setActivity('🛒 tu tienda');
  });
  client.on(Events.GuildCreate, register);

  client.on(Events.GuildMemberAdd, async (m) => {
    const g = db.get(m.guild.id);
    if (g.roles.member) m.roles.add(g.roles.member).catch(() => {});
    const ch = g.welcome.enabled && g.channels.welcome && m.guild.channels.cache.get(g.channels.welcome);
    if (ch) {
      const txt = g.welcome.msg.replace(/\{user\}/g, `${m}`).replace(/\{server\}/g, m.guild.name).replace(/\{count\}/g, m.guild.memberCount);
      ch.send({ content: `${m}`, embeds: [embed(m.guild, { title: g.welcome.title, desc: txt, thumb: m.user.displayAvatarURL() })] }).catch(() => {});
    }
    template.updateStats(m.guild).catch(() => {});
  });

  const spam = new Map();
  client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot || !m.guild || !m.member) return;
    const g = db.get(m.guild.id);
    if (m.mentions.users.has(client.user.id) && m.content.replace(/<@!?\d+>/g, '').trim() === '') {
      return m.reply({ embeds: [embed(m.guild, { title: `👋 Hola, soy ${client.user.username}`, desc: 'Usa `/ayuda` para ver los comandos o `/tienda` para ver los productos.' })] }).catch(() => {});
    }
    if (isStaff(m.member) || g.tickets[m.channel.id]) return;
    if (g.automod.links && /(https?:\/\/|discord\.gg\/|discord\.com\/invite\/)\S+/i.test(m.content)) {
      await m.delete().catch(() => {});
      const w = await m.channel.send(`${m.author}, no se permiten links aquí.`).catch(() => null);
      return void setTimeout(() => w?.delete().catch(() => {}), 5000);
    }
    const low = m.content.toLowerCase();
    if (g.automod.badwords.some((w) => w && low.includes(w))) {
      await m.delete().catch(() => {});
      const w = await m.channel.send(`${m.author}, cuida tu lenguaje.`).catch(() => null);
      return void setTimeout(() => w?.delete().catch(() => {}), 5000);
    }
    if (g.automod.spam) {
      const k = `${m.guild.id}:${m.author.id}`, now = Date.now();
      const arr = (spam.get(k) || []).filter((t) => now - t < 5000); arr.push(now); spam.set(k, arr);
      if (arr.length >= 6) {
        spam.delete(k);
        await m.member.timeout(5 * 60 * 1000, 'AutoMod: spam').catch(() => {});
        m.channel.send(`🔇 ${m.author} fue silenciado 5 minutos por spam.`).catch(() => {});
      }
    }
  });

  client.on(Events.InteractionCreate, async (i) => {
    try {
      if (!i.inGuild()) return i.isRepliable() && i.reply({ content: 'Solo funciona en servidores.', flags: EPH });
      if (i.isChatInputCommand()) return await client.commands.get(i.commandName)?.execute(i);
      if (i.isAutocomplete()) return await client.commands.get(i.commandName)?.autocomplete?.(i);
      if (i.isMessageComponent() || i.isModalSubmit()) return await handlers[i.customId.split(':')[0]]?.(i);
    } catch (err) {
      console.error(err);
      const msg = { content: '❌ Ocurrió un error. Inténtalo otra vez.', flags: EPH };
      if (i.replied || i.deferred) i.followUp(msg).catch(() => {});
      else if (i.isRepliable()) i.reply(msg).catch(() => {});
    }
  });
};
