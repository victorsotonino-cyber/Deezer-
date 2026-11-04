const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const { embed, EPH } = require('./util');

const joinRow = (n, disabled = false) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('gw:join').setLabel(`Participar (${n})`).setEmoji('🎉').setStyle(ButtonStyle.Success).setDisabled(disabled));

async function create(i, { prize, ms, winners, channel }) {
  const g = db.get(i.guild.id);
  const end = Date.now() + ms;
  const e = embed(i.guild, { title: `🎉 ${prize}`, desc: `Pulsa el botón para participar.\n\n⏰ Termina: <t:${Math.floor(end / 1000)}:R>\n👑 Ganadores: **${winners}**\n🎙️ Organiza: ${i.user}` });
  const msg = await channel.send({ embeds: [e], components: [joinRow(0)] });
  g.giveaways[msg.id] = { channel: channel.id, prize, end, winners, entries: [], host: i.user.id, ended: false };
  db.save();
  return msg;
}

async function finish(guild, id, reroll = false) {
  const g = db.get(guild.id), gw = g.giveaways[id];
  if (!gw) return null;
  gw.ended = true;
  const pool = [...gw.entries], w = [];
  while (w.length < gw.winners && pool.length) w.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  db.save();
  const txt = w.length ? w.map((x) => `<@${x}>`).join(', ') : 'Nadie participó 😢';
  const ch = guild.channels.cache.get(gw.channel);
  if (ch) {
    if (!reroll) {
      const msg = await ch.messages.fetch(id).catch(() => null);
      if (msg) await msg.edit({ embeds: [embed(guild, { title: `🎉 ${gw.prize}`, desc: `**Sorteo finalizado**\n👑 Ganador(es): ${txt}` })], components: [joinRow(gw.entries.length, true)] }).catch(() => {});
    }
    await ch.send(w.length ? `🎉 ¡Felicidades ${txt}! Ganaste **${gw.prize}**. Abre un ticket para reclamarlo.` : `Nadie participó en **${gw.prize}**.`).catch(() => {});
  }
  return w;
}

async function handle(i) {
  if (i.customId !== 'gw:join') return;
  const gw = db.get(i.guild.id).giveaways[i.message.id];
  if (!gw || gw.ended) return i.reply({ content: 'Este sorteo ya terminó.', flags: EPH });
  const idx = gw.entries.indexOf(i.user.id);
  if (idx >= 0) gw.entries.splice(idx, 1); else gw.entries.push(i.user.id);
  db.save();
  return i.update({ components: [joinRow(gw.entries.length)] });
}

function startLoop(client) {
  setInterval(() => {
    for (const guild of client.guilds.cache.values()) {
      const g = db.get(guild.id);
      for (const [id, gw] of Object.entries(g.giveaways)) if (!gw.ended && gw.end <= Date.now()) finish(guild, id).catch(console.error);
    }
  }, 15000);
}
module.exports = { create, finish, handle, startLoop };
