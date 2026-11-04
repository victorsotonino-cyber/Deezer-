const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const { isStaff, EPH, parseDuration } = require('../util');
const gw = require('../giveaways');

module.exports = {
  data: new SlashCommandBuilder().setName('sorteo').setDescription('Sorteos (staff)').setDefaultMemberPermissions(P.ManageMessages)
    .addSubcommand((s) => s.setName('crear').setDescription('Crea un sorteo')
      .addStringOption((o) => o.setName('premio').setDescription('Premio').setRequired(true))
      .addStringOption((o) => o.setName('duracion').setDescription('Ej: 30m, 2h, 1d').setRequired(true))
      .addIntegerOption((o) => o.setName('ganadores').setDescription('Cantidad de ganadores').setMinValue(1).setMaxValue(20))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal del sorteo')))
    .addSubcommand((s) => s.setName('terminar').setDescription('Termina un sorteo ahora').addStringOption((o) => o.setName('id').setDescription('ID del mensaje del sorteo').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Elige nuevos ganadores').addStringOption((o) => o.setName('id').setDescription('ID del mensaje del sorteo').setRequired(true))),
  execute: async (i) => {
    if (!isStaff(i.member)) return i.reply({ content: '❌ Solo staff.', flags: EPH });
    const g = db.get(i.guild.id), sub = i.options.getSubcommand();
    if (sub === 'crear') {
      const ms = parseDuration(i.options.getString('duracion'));
      if (!ms) return i.reply({ content: '❌ Duración inválida. Ej: 30m, 2h, 1d', flags: EPH });
      const channel = i.options.getChannel('canal') || (g.channels.giveaways && i.guild.channels.cache.get(g.channels.giveaways)) || i.channel;
      const msg = await gw.create(i, { prize: i.options.getString('premio'), ms, winners: i.options.getInteger('ganadores') || 1, channel }).catch(() => null);
      return i.reply({ content: msg ? `✅ Sorteo creado en ${channel} (ID: \`${msg.id}\`)` : '❌ No pude crear el sorteo ahí.', flags: EPH });
    }
    const id = i.options.getString('id').trim();
    if (!g.giveaways[id]) return i.reply({ content: '❌ No encontré ese sorteo.', flags: EPH });
    if (sub === 'terminar' && g.giveaways[id].ended) return i.reply({ content: 'Ya terminó. Usa `/sorteo reroll`.', flags: EPH });
    if (sub === 'reroll' && !g.giveaways[id].ended) return i.reply({ content: 'Aún no termina. Usa `/sorteo terminar`.', flags: EPH });
    await gw.finish(i.guild, id, sub === 'reroll');
    return i.reply({ content: '✅ Hecho.', flags: EPH });
  },
};
