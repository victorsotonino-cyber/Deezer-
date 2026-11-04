const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const { embed, isStaff, EPH, money } = require('../util');
const help = require('../help');

const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = [
  { data: new SlashCommandBuilder().setName('ping').setDescription('Latencia del bot'),
    execute: (i) => i.reply({ content: `🏓 ${i.client.ws.ping}ms`, flags: EPH }) },

  { data: new SlashCommandBuilder().setName('ayuda').setDescription('Lista de comandos'),
    execute: (i) => i.reply({ ...help.payload(i.guild), flags: EPH }) },

  { data: new SlashCommandBuilder().setName('avatar').setDescription('Muestra el avatar de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    execute: (i) => { const u = i.options.getUser('usuario') || i.user; return i.reply({ embeds: [embed(i.guild, { title: `Avatar de ${u.username}`, image: u.displayAvatarURL({ size: 1024 }) })] }); } },

  { data: new SlashCommandBuilder().setName('userinfo').setDescription('Información de un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    execute: (i) => {
      const m = i.options.getMember('usuario') || i.member, g = db.get(i.guild.id), c = g.customers[m.id];
      return i.reply({ embeds: [embed(i.guild, { title: m.user.tag, thumb: m.user.displayAvatarURL(), fields: [
        { name: 'ID', value: m.id, inline: true }, { name: 'Cuenta creada', value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Se unió', value: `<t:${Math.floor(m.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Compras', value: c ? `${c.orders} pedidos · ${money(g, c.spent)}` : 'Sin compras', inline: false }] })] });
    } },

  { data: new SlashCommandBuilder().setName('serverinfo').setDescription('Información del servidor'),
    execute: (i) => { const g = db.get(i.guild.id); return i.reply({ embeds: [embed(i.guild, { title: i.guild.name, thumb: i.guild.iconURL(), fields: [
      { name: 'Miembros', value: `${i.guild.memberCount}`, inline: true }, { name: 'Canales', value: `${i.guild.channels.cache.size}`, inline: true },
      { name: 'Roles', value: `${i.guild.roles.cache.size}`, inline: true }, { name: 'Ventas', value: `${g.sales}`, inline: true },
      { name: 'Creado', value: `<t:${Math.floor(i.guild.createdTimestamp / 1000)}:D>`, inline: true }] })] }); } },

  { data: new SlashCommandBuilder().setName('sugerencia').setDescription('Envía una sugerencia').addStringOption((o) => o.setName('texto').setDescription('Tu sugerencia').setRequired(true).setMaxLength(1500)),
    execute: async (i) => {
      const g = db.get(i.guild.id), ch = (g.channels.suggestions && i.guild.channels.cache.get(g.channels.suggestions)) || i.channel;
      const msg = await ch.send({ embeds: [embed(i.guild, { title: '💡 Nueva sugerencia', desc: i.options.getString('texto'), fields: [{ name: 'Por', value: `${i.user}` }] })] }).catch(() => null);
      if (!msg) return i.reply({ content: '❌ No pude enviar la sugerencia.', flags: EPH });
      await msg.react('👍').catch(() => {}); await msg.react('👎').catch(() => {});
      return i.reply({ content: `✅ Enviada en ${ch}`, flags: EPH });
    } },

  { data: new SlashCommandBuilder().setName('encuesta').setDescription('Crea una encuesta (hasta 5 opciones)')
      .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta').setRequired(true))
      .addStringOption((o) => o.setName('opciones').setDescription('Opciones separadas por |  (ej: Sí | No)').setRequired(true)),
    execute: async (i) => {
      const opts = i.options.getString('opciones').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5);
      if (opts.length < 2) return i.reply({ content: '❌ Pon al menos 2 opciones separadas por |', flags: EPH });
      await i.reply({ embeds: [embed(i.guild, { title: `📊 ${i.options.getString('pregunta')}`, desc: opts.map((o, n) => `${NUM[n]} ${o}`).join('\n') })] });
      const m = await i.fetchReply();
      for (let n = 0; n < opts.length; n++) await m.react(NUM[n]).catch(() => {});
    } },

  { data: new SlashCommandBuilder().setName('anuncio').setDescription('Publica un anuncio (staff)').setDefaultMemberPermissions(P.ManageMessages)
      .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true))
      .addStringOption((o) => o.setName('mensaje').setDescription('Mensaje (usa \\n para salto de línea)').setRequired(true))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal (por defecto el de anuncios)'))
      .addStringOption((o) => o.setName('mencion').setDescription('Mencionar').addChoices({ name: 'Nadie', value: 'none' }, { name: '@everyone', value: '@everyone' }, { name: '@here', value: '@here' })),
    execute: async (i) => {
      if (!isStaff(i.member)) return i.reply({ content: '❌ Solo staff.', flags: EPH });
      const g = db.get(i.guild.id), ch = i.options.getChannel('canal') || (g.channels.announce && i.guild.channels.cache.get(g.channels.announce)) || i.channel;
      const men = i.options.getString('mencion');
      await ch.send({ content: men && men !== 'none' ? men : undefined, embeds: [embed(i.guild, { title: `📢 ${i.options.getString('titulo')}`, desc: i.options.getString('mensaje').replace(/\\n/g, '\n') })] });
      return i.reply({ content: `✅ Anuncio enviado en ${ch}`, flags: EPH });
    } },
];
