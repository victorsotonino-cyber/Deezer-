const { EmbedBuilder, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const db = require('./db');

const EPH = MessageFlags.Ephemeral;
const hex = (s) => { const n = parseInt(String(s || '').replace('#', ''), 16); return Number.isNaN(n) ? 0xe11d48 : n; };

function embed(guild, o = {}) {
  const g = db.get(guild.id);
  const e = new EmbedBuilder().setColor(hex(g.store.color)).setTimestamp();
  if (o.title) e.setTitle(o.title);
  if (o.desc) e.setDescription(o.desc);
  if (o.fields?.length) e.addFields(o.fields);
  if (o.thumb) e.setThumbnail(o.thumb);
  if (o.image) e.setImage(o.image);
  if (g.store.footer) e.setFooter({ text: g.store.footer.slice(0, 2000) });
  return e;
}
function banner(e, guild) {
  const g = db.get(guild.id);
  if (/^https?:\/\//i.test(g.store.banner || '')) e.setImage(g.store.banner);
  return e;
}
function isStaff(m) {
  const g = db.get(m.guild.id);
  return m.permissions.has(P.ManageGuild) || [g.roles.staff, g.roles.admin].some((r) => r && m.roles.cache.has(r));
}
function isAdmin(m) {
  const g = db.get(m.guild.id);
  return m.permissions.has(P.ManageGuild) || (g.roles.admin && m.roles.cache.has(g.roles.admin));
}
function sendLog(guild, e) {
  const g = db.get(guild.id);
  const ch = g.channels.logs && guild.channels.cache.get(g.channels.logs);
  if (ch) ch.send({ embeds: [e] }).catch(() => {});
}
function parseDuration(s) {
  let ms = 0;
  String(s).replace(/(\d+)\s*(s|m|h|d|w)/gi, (_, n, u) => { ms += Number(n) * { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[u.toLowerCase()]; });
  return ms;
}
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item';
const okEmoji = (s) => !!s && /^(<a?:\w+:\d+>|[\p{Extended_Pictographic}\p{Emoji_Presentation}][\uFE0F\u200D\p{Extended_Pictographic}\p{Emoji_Modifier}]*)$/u.test(s.trim());
const money = (g, n) => `${g.store.currency}${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const bar = (p, n = 10) => '█'.repeat(Math.round(Math.min(1, Math.max(0, p)) * n)) + '░'.repeat(n - Math.round(Math.min(1, Math.max(0, p)) * n));
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };

module.exports = { EPH, hex, embed, banner, isStaff, isAdmin, sendLog, parseDuration, slug, okEmoji, money, bar, getPath, setPath };
