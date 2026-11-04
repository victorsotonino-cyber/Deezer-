// /plantilla: crea roles, categorías, canales y paneles de una tienda completa. NO borra nada existente.
const { ChannelType, PermissionFlagsBits: P } = require('discord.js');
const db = require('./db');
const { embed, isAdmin } = require('./util');
const { ensureRankRole } = require('./ranks');
const pub = require('./publish');

const RULES = [
  '1️⃣ Respeta a todos los miembros y al staff.', '2️⃣ Prohibido el spam, flood y publicidad.', '3️⃣ Las compras se hacen **solo por ticket**.',
  '4️⃣ Nunca pagues fuera de los métodos oficiales.', '5️⃣ El staff nunca te pedirá tu contraseña.', '6️⃣ Intentar estafar = ban permanente.',
  '7️⃣ Sigue los Términos de Servicio de Discord.',
].join('\n');

const LAYOUT = [
  { cat: '📌・INFORMACIÓN', ch: [{ n: '📢┃anuncios', ro: 1, key: 'announce' }, { n: '📜┃reglas', ro: 1, rules: 1 }, { n: '📚┃terminos', ro: 1 }, { n: '🔄┃actualizaciones', ro: 1 }] },
  { cat: '🛒・TIENDA', ch: [{ n: '🛍️┃tienda', ro: 1, key: 'shop' }, { n: '🏦┃metodos', ro: 1, key: 'methods' }, { n: '💸┃ventas', ro: 1, key: 'ventas' }, { n: '🎉┃sorteos', ro: 1, key: 'giveaways' }] },
  { cat: '💬・COMUNIDAD', ch: [{ n: '👋┃bienvenida', ro: 1, key: 'welcome' }, { n: '💬┃chat' }, { n: '🤖┃comandos' }, { n: '💡┃sugerencias', key: 'suggestions' }, { n: '📩┃invitaciones' }] },
  { cat: '⭐・REFERENCIAS', ch: [{ n: '📍┃vouches', ro: 1, key: 'vouches' }, { n: '✨┃reviews', ro: 1 }, { n: '✅┃legit-check', ro: 1 }] },
  { cat: '🎫・SOPORTE', ch: [{ n: '🎫┃tickets', ro: 1, key: 'tickets' }] },
  { cat: '🎟️・TICKETS ABIERTOS', hidden: 1, key: 'ticketCategory', ch: [] },
  { cat: '📊・ESTADÍSTICAS', voice: [{ n: '🛒 Ventas: 0', key: 'statsVentas' }, { n: '👥 Miembros: 0', key: 'statsMiembros' }] },
  { cat: '🔒・STAFF', staff: 1, ch: [{ n: '🛡️┃staff-chat' }, { n: '📋┃logs', key: 'logs' }, { n: '⚙️┃comandos-staff' }, { n: '🫐┃pentagono', owner: 1 }] },
];

async function updateStats(guild) {
  const g = db.get(guild.id);
  const set = async (key, name) => { const c = g.channels[key] && guild.channels.cache.get(g.channels[key]); if (c && c.name !== name) await c.setName(name).catch(() => {}); };
  await set('statsVentas', `🛒 Ventas: ${g.sales}`);
  await set('statsMiembros', `👥 Miembros: ${guild.memberCount}`);
}

async function build(guild, client) {
  const g = db.get(guild.id);
  await guild.channels.fetch(); await guild.roles.fetch();
  const role = async (name, color, perms, hoist = true) =>
    guild.roles.cache.find((r) => r.name === name) || guild.roles.create({ name, color, permissions: perms, hoist, reason: 'Plantilla de tienda' });

  const owner = await role('👑 Owner', 0xf5c518, [P.Administrator]);
  const admin = await role('⚡ Admin', 0xe11d48, [P.Administrator]);
  const staff = await role('🛡️ Staff', 0x3b82f6, [P.ManageMessages, P.ModerateMembers, P.KickMembers, P.MuteMembers, P.ManageNicknames, P.ViewAuditLog]);
  const member = await role('✅ Miembro', 0x9ca3af, [], false);
  g.roles.owner = owner.id; g.roles.admin = admin.id; g.roles.staff = staff.id; g.roles.member = member.id;
  for (const r of g.ranks) await ensureRankRole(guild, r);

  const me = guild.members.me.id, ev = guild.roles.everyone.id;
  const botAllow = [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory, P.ManageChannels];
  const ow = {
    ro: [{ id: ev, deny: [P.SendMessages, P.CreatePublicThreads] }, { id: staff.id, allow: [P.SendMessages] }, { id: me, allow: botAllow }],
    staff: [{ id: ev, deny: [P.ViewChannel] }, { id: staff.id, allow: [P.ViewChannel, P.SendMessages] }, { id: me, allow: botAllow }],
    owner: [{ id: ev, deny: [P.ViewChannel] }, { id: owner.id, allow: [P.ViewChannel, P.SendMessages] }, { id: me, allow: botAllow }],
    voice: [{ id: ev, deny: [P.Connect] }],
  };
  const ensure = async (name, type, parent, overwrites) =>
    guild.channels.cache.find((c) => c.name === name && c.type === type && c.parentId === (parent ? parent.id : null))
    || guild.channels.create({ name, type, parent: parent?.id, permissionOverwrites: overwrites });

  const created = {};
  for (const sec of LAYOUT) {
    const cat = await ensure(sec.cat, ChannelType.GuildCategory, null, sec.staff || sec.hidden ? ow.staff : []);
    if (sec.key) g.channels[sec.key] = cat.id;
    for (const c of sec.ch || []) {
      const o = c.owner ? ow.owner : sec.staff ? ow.staff : c.ro ? ow.ro : [];
      const ch = await ensure(c.n, ChannelType.GuildText, cat, o);
      if (c.key) g.channels[c.key] = ch.id;
      created[c.key || c.n] = ch; if (c.rules) created.__rules = ch;
    }
    for (const v of sec.voice || []) {
      let ch = g.channels[v.key] && guild.channels.cache.get(g.channels[v.key]);
      if (!ch) ch = await guild.channels.create({ name: v.n, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: ow.voice });
      g.channels[v.key] = ch.id;
    }
  }
  db.save();

  const postOnce = async (ch, payload) => {
    if (!ch) return;
    const last = await ch.messages.fetch({ limit: 10 }).catch(() => null);
    if (last && last.some((m) => m.author.id === client.user.id)) return;
    await ch.send(payload).catch(() => {});
  };
  await postOnce(created.tickets, pub.ticketPanel(guild));
  await postOnce(created.shop, pub.shopPanel(guild));
  await postOnce(created.methods, pub.methodsPanel(guild));
  await postOnce(created.__rules, { embeds: [embed(guild, { title: '📜 Reglas', desc: RULES })] });
  await updateStats(guild);
}

async function handle(i) {
  if (!isAdmin(i.member) || !i.memberPermissions.has(P.Administrator)) return i.reply({ content: '❌ Solo administradores.', flags: 64 });
  if (i.customId === 'tpl:no') return i.update({ content: 'Cancelado.', embeds: [], components: [] });
  await i.update({ content: '⏳ Creando la plantilla, esto tarda unos segundos...', embeds: [], components: [] });
  try {
    await build(i.guild, i.client);
    await i.editReply('✅ **Plantilla lista.** Revisa los canales nuevos y edita todo en `/panel`. Pon el rol del bot **por encima** de los rangos para que pueda asignarlos.');
  } catch (e) {
    console.error(e);
    await i.editReply(`❌ Error: ${e.message}\nEl bot necesita permisos de **Administrador** (o Gestionar canales + Gestionar roles).`).catch(() => {});
  }
}
module.exports = { build, handle, updateStats, LAYOUT };
