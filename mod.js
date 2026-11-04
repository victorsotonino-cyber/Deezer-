const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const { embed, EPH, parseDuration, sendLog } = require('../util');

const user = (b) => b.addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true));
const reason = (b) => b.addStringOption((o) => o.setName('razon').setDescription('Razón'));
const log = (i, title, target, r) => sendLog(i.guild, embed(i.guild, { title, fields: [{ name: 'Usuario', value: `${target}`, inline: true }, { name: 'Staff', value: `${i.user}`, inline: true }, { name: 'Razón', value: r || 'Sin razón' }] }));
const dm = (u, txt) => u.send(txt).catch(() => {});

module.exports = [
  { data: reason(user(new SlashCommandBuilder().setName('ban').setDescription('Banea a un usuario').setDefaultMemberPermissions(P.BanMembers))),
    execute: async (i) => {
      const u = i.options.getUser('usuario'), r = i.options.getString('razon'), m = i.options.getMember('usuario');
      if (m && !m.bannable) return i.reply({ content: '❌ No puedo banear a ese usuario.', flags: EPH });
      await dm(u, `Fuiste baneado de **${i.guild.name}**. Razón: ${r || 'Sin razón'}`);
      await i.guild.members.ban(u, { reason: r || undefined });
      log(i, '🔨 Ban', u, r); return i.reply({ content: `✅ ${u.tag} baneado.`, flags: EPH });
    } },
  { data: new SlashCommandBuilder().setName('unban').setDescription('Desbanea por ID').setDefaultMemberPermissions(P.BanMembers).addStringOption((o) => o.setName('id').setDescription('ID del usuario').setRequired(true)),
    execute: async (i) => { const id = i.options.getString('id').trim(); await i.guild.members.unban(id).then(() => i.reply({ content: '✅ Desbaneado.', flags: EPH })).catch(() => i.reply({ content: '❌ No encontré ese ban.', flags: EPH })); log(i, '♻️ Unban', id); } },
  { data: reason(user(new SlashCommandBuilder().setName('kick').setDescription('Expulsa a un usuario').setDefaultMemberPermissions(P.KickMembers))),
    execute: async (i) => {
      const m = i.options.getMember('usuario'), r = i.options.getString('razon');
      if (!m || !m.kickable) return i.reply({ content: '❌ No puedo expulsar a ese usuario.', flags: EPH });
      await dm(m.user, `Fuiste expulsado de **${i.guild.name}**. Razón: ${r || 'Sin razón'}`);
      await m.kick(r || undefined); log(i, '👢 Kick', m.user, r); return i.reply({ content: `✅ ${m.user.tag} expulsado.`, flags: EPH });
    } },
  { data: reason(user(new SlashCommandBuilder().setName('timeout').setDescription('Silencia a un usuario').setDefaultMemberPermissions(P.ModerateMembers))
      .addStringOption((o) => o.setName('duracion').setDescription('Ej: 10m, 2h, 1d').setRequired(true))),
    execute: async (i) => {
      const m = i.options.getMember('usuario'), ms = parseDuration(i.options.getString('duracion')), r = i.options.getString('razon');
      if (!m || !m.moderatable) return i.reply({ content: '❌ No puedo silenciar a ese usuario.', flags: EPH });
      if (!ms || ms > 28 * 864e5) return i.reply({ content: '❌ Duración inválida (máx 28d). Ej: 10m, 2h, 1d', flags: EPH });
      await m.timeout(ms, r || undefined); log(i, '🔇 Timeout', m.user, `${i.options.getString('duracion')} · ${r || 'Sin razón'}`);
      return i.reply({ content: `✅ ${m.user.tag} silenciado.`, flags: EPH });
    } },
  { data: user(new SlashCommandBuilder().setName('untimeout').setDescription('Quita el silencio').setDefaultMemberPermissions(P.ModerateMembers)),
    execute: async (i) => { const m = i.options.getMember('usuario'); if (!m) return i.reply({ content: '❌ Usuario no encontrado.', flags: EPH }); await m.timeout(null).catch(() => {}); log(i, '🔊 Untimeout', m.user); return i.reply({ content: '✅ Listo.', flags: EPH }); } },

  { data: reason(user(new SlashCommandBuilder().setName('warn').setDescription('Advierte a un usuario').setDefaultMemberPermissions(P.ModerateMembers))),
    execute: async (i) => {
      const g = db.get(i.guild.id), u = i.options.getUser('usuario'), r = i.options.getString('razon') || 'Sin razón';
      (g.warns[u.id] ||= []).push({ by: i.user.id, reason: r, at: Date.now() }); db.save();
      const n = g.warns[u.id].length;
      await dm(u, `⚠️ Advertencia en **${i.guild.name}**: ${r} (${n} en total)`);
      log(i, '⚠️ Warn', u, `${r} (#${n})`);
      let extra = '';
      if (n >= 3) { const m = i.options.getMember('usuario'); if (m?.moderatable) { await m.timeout(36e5, 'Acumuló 3 warns').catch(() => {}); extra = ' — silenciado 1h por acumular 3 warns.'; } }
      return i.reply({ content: `✅ ${u.tag} advertido (#${n}).${extra}`, flags: EPH });
    } },
  { data: user(new SlashCommandBuilder().setName('warns').setDescription('Ver advertencias').setDefaultMemberPermissions(P.ModerateMembers)),
    execute: (i) => {
      const u = i.options.getUser('usuario'), w = db.get(i.guild.id).warns[u.id] || [];
      return i.reply({ embeds: [embed(i.guild, { title: `⚠️ Warns de ${u.tag}`, desc: w.length ? w.map((x, n) => `**${n + 1}.** ${x.reason} — <@${x.by}> <t:${Math.floor(x.at / 1000)}:R>`).join('\n').slice(0, 4000) : 'Sin advertencias.' })], flags: EPH });
    } },
  { data: user(new SlashCommandBuilder().setName('clearwarns').setDescription('Borra advertencias').setDefaultMemberPermissions(P.ModerateMembers)),
    execute: (i) => { const g = db.get(i.guild.id), u = i.options.getUser('usuario'); delete g.warns[u.id]; db.save(); return i.reply({ content: `✅ Warns de ${u.tag} borrados.`, flags: EPH }); } },

  { data: new SlashCommandBuilder().setName('clear').setDescription('Borra mensajes').setDefaultMemberPermissions(P.ManageMessages).addIntegerOption((o) => o.setName('cantidad').setDescription('1-100').setMinValue(1).setMaxValue(100).setRequired(true)),
    execute: async (i) => { const d = await i.channel.bulkDelete(i.options.getInteger('cantidad'), true).catch(() => null); return i.reply({ content: d ? `🧹 ${d.size} mensajes borrados.` : '❌ No pude borrar (mensajes de +14 días o sin permisos).', flags: EPH }); } },
  { data: new SlashCommandBuilder().setName('lock').setDescription('Bloquea el canal').setDefaultMemberPermissions(P.ManageChannels),
    execute: async (i) => { await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false }); return i.reply('🔒 Canal bloqueado.'); } },
  { data: new SlashCommandBuilder().setName('unlock').setDescription('Desbloquea el canal').setDefaultMemberPermissions(P.ManageChannels),
    execute: async (i) => { await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null }); return i.reply('🔓 Canal desbloqueado.'); } },
  { data: new SlashCommandBuilder().setName('slowmode').setDescription('Modo lento').setDefaultMemberPermissions(P.ManageChannels).addIntegerOption((o) => o.setName('segundos').setDescription('0 para quitar').setMinValue(0).setMaxValue(21600).setRequired(true)),
    execute: async (i) => { await i.channel.setRateLimitPerUser(i.options.getInteger('segundos')); return i.reply({ content: '✅ Hecho.', flags: EPH }); } },
];
