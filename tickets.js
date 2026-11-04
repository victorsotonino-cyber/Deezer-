const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const { isStaff, EPH } = require('../util');
const pub = require('../publish');

module.exports = [
  { data: new SlashCommandBuilder().setName('ticketpanel').setDescription('Publica el panel de tickets (staff)').setDefaultMemberPermissions(P.ManageChannels)
      .addChannelOption((o) => o.setName('canal').setDescription('Canal donde publicar')),
    execute: async (i) => {
      const ch = i.options.getChannel('canal') || i.channel;
      const ok = await ch.send(pub.ticketPanel(i.guild)).catch(() => null);
      return i.reply({ content: ok ? `✅ Panel publicado en ${ch}` : '❌ No pude enviar el panel ahí.', flags: EPH });
    } },

  { data: new SlashCommandBuilder().setName('ticket').setDescription('Gestiona el ticket actual (staff)').setDefaultMemberPermissions(P.ManageChannels)
      .addSubcommand((s) => s.setName('add').setDescription('Añade a un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
      .addSubcommand((s) => s.setName('remove').setDescription('Quita a un usuario').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
      .addSubcommand((s) => s.setName('rename').setDescription('Renombra el ticket').addStringOption((o) => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true))),
    execute: async (i) => {
      const g = db.get(i.guild.id);
      if (!g.tickets[i.channel.id]) return i.reply({ content: '❌ Esto no es un ticket.', flags: EPH });
      if (!isStaff(i.member)) return i.reply({ content: '❌ Solo staff.', flags: EPH });
      const sub = i.options.getSubcommand();
      if (sub === 'rename') { await i.channel.setName(i.options.getString('nombre').slice(0, 90)); return i.reply({ content: '✅ Renombrado.', flags: EPH }); }
      const u = i.options.getUser('usuario');
      if (sub === 'add') await i.channel.permissionOverwrites.edit(u, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
      else await i.channel.permissionOverwrites.delete(u);
      return i.reply({ content: sub === 'add' ? `✅ ${u} añadido.` : `✅ ${u} quitado.` });
    } },
];
