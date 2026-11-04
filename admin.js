// /panel: edita TODO desde Discord y se guarda en la base de datos.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const db = require('./db');
const { embed, EPH, slug, getPath, setPath, money, isAdmin } = require('./util');
const { ensureRankRole } = require('./ranks');
const pub = require('./publish');

const row = (...c) => new ActionRowBuilder().addComponents(...c);
const btn = (id, label, style = ButtonStyle.Secondary, emoji) => { const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style); if (emoji) b.setEmoji(emoji); return b; };
const back = () => btn('pn:home', 'Volver', ButtonStyle.Secondary, '◀️');

const SECS = [
  ['general', '🏪 Tienda (nombre, color, banner)'], ['canales', '📺 Canales y categorías'], ['roles', '🎭 Roles'],
  ['tickets', '🎫 Tickets (textos y límite)'], ['tipos', '🧩 Tipos de ticket'], ['productos', '📦 Productos y stock'],
  ['metodos', '🏦 Métodos de pago'], ['rangos', '🏅 Rangos de clientes'], ['bienvenida', '👋 Bienvenida'], ['automod', '🛡️ AutoMod'],
];

const CH = {
  welcome: ['👋 Bienvenida', 'text'], logs: ['📋 Logs', 'text'], tickets: ['🎫 Canal del panel de tickets', 'text'], vouches: ['📍 Vouches', 'text'],
  ventas: ['💸 Ventas', 'text'], giveaways: ['🎉 Sorteos', 'text'], announce: ['📢 Anuncios', 'text'], suggestions: ['💡 Sugerencias', 'text'],
  shop: ['🛍️ Tienda', 'text'], methods: ['🏦 Métodos de pago', 'text'], ticketCategory: ['🎟️ Categoría de tickets abiertos', 'cat'],
  statsVentas: ['🛒 Contador de ventas (voz)', 'voice'], statsMiembros: ['👥 Contador de miembros (voz)', 'voice'],
};
const RL = { owner: ['👑 Owner'], admin: ['⚡ Admin'], staff: ['🛡️ Staff'], member: ['✅ Miembro (se da al entrar)'] };
const KINDS = { canales: { map: CH, store: 'channels', title: '📺 Canales' }, roles: { map: RL, store: 'roles', title: '🎭 Roles' } };

const FORMS = {
  general: { title: '🏪 Tienda', f: [
    { p: 'store.name', l: 'Nombre de la tienda', t: 'short' }, { p: 'store.color', l: 'Color HEX (ej: #e11d48)', t: 'color' },
    { p: 'store.currency', l: 'Símbolo de moneda (ej: $)', t: 'short' }, { p: 'store.banner', l: 'URL del banner (imagen)', t: 'short' },
    { p: 'store.footer', l: 'Texto del pie de los embeds', t: 'short' }] },
  tickets: { title: '🎫 Tickets', f: [
    { p: 'ticket.max', l: 'Máx. tickets abiertos por usuario', t: 'num' }, { p: 'ticket.panelTitle', l: 'Título del panel', t: 'short' },
    { p: 'ticket.panelDesc', l: 'Descripción del panel', t: 'para' }, { p: 'ticket.welcome', l: 'Mensaje dentro del ticket ({user})', t: 'para' }] },
  bienvenida: { title: '👋 Bienvenida', f: [
    { p: 'welcome.enabled', l: 'Activada (si/no)', t: 'bool' }, { p: 'welcome.title', l: 'Título', t: 'short' },
    { p: 'welcome.msg', l: 'Mensaje ({user} {server} {count})', t: 'para' }] },
  automod: { title: '🛡️ AutoMod', f: [
    { p: 'automod.links', l: 'Bloquear links (si/no)', t: 'bool' }, { p: 'automod.spam', l: 'Anti-spam (si/no)', t: 'bool' },
    { p: 'automod.badwords', l: 'Palabras prohibidas (separadas por coma)', t: 'list' }] },
};

const LISTS = {
  tipos: { path: 'ticket.types', title: '🧩 Tipos de ticket', one: 'tipo de ticket', name: 'label',
    f: [{ k: 'label', l: 'Nombre', t: 'short', req: 1 }, { k: 'emoji', l: 'Emoji', t: 'short' }, { k: 'desc', l: 'Descripción corta', t: 'short' }],
    line: (x) => `${x.emoji || '🎫'} **${x.label}** — ${x.desc || '-'}` },
  productos: { path: 'products', title: '📦 Productos', one: 'producto', name: 'name',
    f: [{ k: 'name', l: 'Nombre', t: 'short', req: 1 }, { k: 'price', l: 'Precio', t: 'num', req: 1 }, { k: 'stock', l: 'Stock (vacío = ilimitado)', t: 'num', empty: -1 },
      { k: 'emoji', l: 'Emoji', t: 'short' }, { k: 'desc', l: 'Descripción', t: 'short' }],
    line: (x, g) => `${x.emoji || '📦'} **${x.name}** — ${money(g, x.price)} · stock ${x.stock < 0 ? '∞' : x.stock}` },
  metodos: { path: 'methods', title: '🏦 Métodos de pago', one: 'método', name: 'name',
    f: [{ k: 'name', l: 'Nombre (ej: PayPal)', t: 'short', req: 1 }, { k: 'detail', l: 'Datos / instrucciones de pago', t: 'para', req: 1 }],
    line: (x) => `**${x.name}** — ${String(x.detail).replace(/\n/g, ' ').slice(0, 70)}` },
  rangos: { path: 'ranks', title: '🏅 Rangos de clientes', one: 'rango', name: 'name',
    f: [{ k: 'name', l: 'Nombre del rango', t: 'short', req: 1 }, { k: 'min', l: 'Gasto mínimo para tenerlo', t: 'num', req: 1 }, { k: 'color', l: 'Color HEX (ej: #3b82f6)', t: 'color' }],
    line: (x, g) => `**${x.name}** — desde ${money(g, x.min)} ${x.roleId ? `<@&${x.roleId}>` : ''}` },
};

const fmt = (v, t) => (t === 'list' ? (v || []).join(', ') : t === 'bool' ? (v ? '✅ sí' : '❌ no') : v ?? '');

function home(guild) {
  const g = db.get(guild.id);
  const e = embed(guild, {
    title: '⚙️ Panel de control',
    desc: 'Elige qué quieres editar. **Todo se guarda automáticamente.**',
    fields: [
      { name: 'Tienda', value: `${g.store.name}`, inline: true }, { name: 'Productos', value: `${g.products.length}`, inline: true },
      { name: 'Rangos', value: `${g.ranks.length}`, inline: true }, { name: 'Tipos de ticket', value: `${g.ticket.types.length}`, inline: true },
      { name: 'Ventas', value: `${g.sales}`, inline: true }, { name: 'Clientes', value: `${Object.keys(g.customers).length}`, inline: true },
    ],
  });
  const sel = new StringSelectMenuBuilder().setCustomId('pn:sec').setPlaceholder('Selecciona una sección').addOptions(SECS.map(([v, l]) => ({ label: l, value: v })));
  return { embeds: [e], components: [row(sel), row(btn('pn:pub:tickets', 'Publicar tickets aquí', ButtonStyle.Primary, '🎫'), btn('pn:pub:shop', 'Publicar tienda aquí', ButtonStyle.Primary, '🛍️'), btn('pn:pub:methods', 'Publicar métodos aquí', ButtonStyle.Primary, '🏦'))] };
}

function view(guild, sec) {
  const g = db.get(guild.id);
  if (KINDS[sec]) {
    const K = KINDS[sec], cur = g[K.store];
    const desc = Object.entries(K.map).map(([k, [l]]) => `${l}: ${cur[k] ? (sec === 'roles' ? `<@&${cur[k]}>` : `<#${cur[k]}>`) : '*sin configurar*'}`).join('\n');
    const sel = new StringSelectMenuBuilder().setCustomId('pn:pick:' + sec).setPlaceholder('Elige qué configurar').addOptions(Object.entries(K.map).map(([k, [l]]) => ({ label: l.slice(0, 100), value: k })));
    return { embeds: [embed(guild, { title: K.title, desc })], components: [row(sel), row(back())] };
  }
  if (FORMS[sec]) {
    const F = FORMS[sec];
    return { embeds: [embed(guild, { title: F.title, fields: F.f.map((f) => ({ name: f.l, value: String(fmt(getPath(g, f.p), f.t) || '*vacío*').slice(0, 300) })) })], components: [row(btn('pn:edit:' + sec, 'Editar', ButtonStyle.Primary, '✏️'), back())] };
  }
  if (LISTS[sec]) {
    const L = LISTS[sec], arr = getPath(g, L.path);
    const desc = arr.length ? arr.map((x) => '• ' + L.line(x, g)).join('\n').slice(0, 3900) : '*Vacío. Pulsa Añadir.*';
    return { embeds: [embed(guild, { title: L.title, desc })], components: [row(btn('pn:add:' + sec, 'Añadir / editar', ButtonStyle.Success, '➕'), btn('pn:del:' + sec, 'Eliminar', ButtonStyle.Danger, '🗑️'), back())] };
  }
  return home(guild);
}

function formModal(g, sec) {
  const F = FORMS[sec];
  const m = new ModalBuilder().setCustomId('pn:form:' + sec).setTitle(F.title.slice(0, 45));
  F.f.forEach((f, idx) => {
    const ti = new TextInputBuilder().setCustomId(String(idx)).setLabel(f.l.slice(0, 45)).setRequired(false)
      .setStyle(f.t === 'para' || f.t === 'list' ? TextInputStyle.Paragraph : TextInputStyle.Short);
    const v = String(fmt0(getPath(g, f.p), f.t));
    if (v) ti.setValue(v.slice(0, 4000));
    m.addComponents(row(ti));
  });
  return m;
}
const fmt0 = (v, t) => (t === 'list' ? (v || []).join(', ') : t === 'bool' ? (v ? 'si' : 'no') : v ?? '');

function addModal(sec) {
  const L = LISTS[sec];
  const m = new ModalBuilder().setCustomId('pn:addform:' + sec).setTitle(('Añadir / editar ' + L.one).slice(0, 45));
  for (const f of L.f) m.addComponents(row(new TextInputBuilder().setCustomId(f.k).setLabel(f.l.slice(0, 45)).setRequired(!!f.req).setStyle(f.t === 'para' ? TextInputStyle.Paragraph : TextInputStyle.Short)));
  return m;
}

function conv(f, raw, errs) {
  const v = String(raw ?? '').trim();
  switch (f.t) {
    case 'num': { if (v === '') return f.empty; const n = Number(v.replace(',', '.')); if (Number.isNaN(n)) { errs.push(`${f.l}: no es un número`); return undefined; } return n; }
    case 'bool': return /^(s|si|sí|true|1|on|yes|y)/i.test(v);
    case 'list': return v.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    case 'color': if (v === '') return undefined; if (!/^#?[0-9a-f]{6}$/i.test(v)) { errs.push(`${f.l}: usa formato #RRGGBB`); return undefined; } return '#' + v.replace('#', '').toLowerCase();
    default: return v;
  }
}

async function handle(i) {
  if (!isAdmin(i.member)) return i.reply({ content: '❌ Solo administradores.', flags: EPH });
  const [, act, a, b] = i.customId.split(':');
  const guild = i.guild, g = db.get(guild.id);

  switch (act) {
    case 'home': return i.update(home(guild));
    case 'sec': return i.update(view(guild, i.values[0]));
    case 'go': return i.update(view(guild, a));

    case 'pick': { // elegir qué canal/rol configurar
      const key = i.values[0], [label, type] = (a === 'canales' ? CH : RL)[key];
      let sel;
      if (a === 'canales') sel = new ChannelSelectMenuBuilder().setChannelTypes(type === 'cat' ? [ChannelType.GuildCategory] : type === 'voice' ? [ChannelType.GuildVoice] : [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
      else sel = new RoleSelectMenuBuilder();
      sel.setCustomId(`pn:set:${a}:${key}`).setPlaceholder('Elige...');
      return i.update({ embeds: [embed(guild, { title: label, desc: 'Selecciona en el menú de abajo.' })], components: [row(sel), row(btn(`pn:clr:${a}:${key}`, 'Quitar', ButtonStyle.Danger, '🗑️'), btn('pn:go:' + a, 'Volver', ButtonStyle.Secondary, '◀️'))] });
    }
    case 'set': g[KINDS[a].store][b] = i.values[0]; db.save(); return i.update(view(guild, a));
    case 'clr': g[KINDS[a].store][b] = null; db.save(); return i.update(view(guild, a));

    case 'edit': return i.showModal(formModal(g, a));
    case 'form': {
      const F = FORMS[a], errs = [], vals = [];
      F.f.forEach((f, idx) => { vals.push(conv(f, i.fields.getTextInputValue(String(idx)), errs)); });
      if (errs.length) return i.reply({ content: '❌ ' + errs.join('\n'), flags: EPH });
      F.f.forEach((f, idx) => {
        let v = vals[idx]; if (v === undefined) return;
        if (f.p === 'ticket.max') v = Math.min(10, Math.max(1, Math.round(v)));
        setPath(g, f.p, v);
      });
      db.save();
      return i.update(view(guild, a));
    }

    case 'add': return i.showModal(addModal(a));
    case 'addform': {
      const L = LISTS[a], arr = getPath(g, L.path), errs = [], obj = {};
      for (const f of L.f) {
        const raw = i.fields.getTextInputValue(f.k);
        if (f.req && !String(raw).trim()) errs.push(`${f.l} es obligatorio`);
        obj[f.k] = conv(f, raw, errs);
      }
      if (errs.length) return i.reply({ content: '❌ ' + errs.join('\n'), flags: EPH });
      const id = slug(obj[L.name]);
      let it = arr.find((x) => x.id === id);
      if (!it) {
        if (arr.length >= 25) return i.reply({ content: '❌ Máximo 25 elementos en esta lista.', flags: EPH });
        it = { id }; arr.push(it);
        if (a === 'productos') it.stock = -1;
        if (a === 'rangos') { it.color = '#9ca3af'; it.roleId = null; }
      }
      for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== '') it[k] = v;
      if (a === 'rangos') { await i.deferUpdate(); await ensureRankRole(guild, it); arr.sort((x, y) => x.min - y.min); db.save(); return i.editReply(view(guild, a)); }
      db.save();
      return i.update(view(guild, a));
    }
    case 'del': {
      const L = LISTS[a], arr = getPath(g, L.path);
      if (!arr.length) return i.reply({ content: 'No hay nada que eliminar.', flags: EPH });
      const sel = new StringSelectMenuBuilder().setCustomId('pn:delset:' + a).setPlaceholder('¿Cuál eliminar?').addOptions(arr.slice(0, 25).map((x) => ({ label: String(x[L.name]).slice(0, 100), value: x.id })));
      return i.update({ embeds: [embed(guild, { title: '🗑️ Eliminar', desc: `Elige el ${L.one} a eliminar.` })], components: [row(sel), row(btn('pn:go:' + a, 'Cancelar', ButtonStyle.Secondary, '◀️'))] });
    }
    case 'delset': {
      const L = LISTS[a], arr = getPath(g, L.path), idx = arr.findIndex((x) => x.id === i.values[0]);
      if (idx >= 0) arr.splice(idx, 1);
      db.save();
      return i.update(view(guild, a));
    }
    case 'pub': {
      const payload = a === 'tickets' ? pub.ticketPanel(guild) : a === 'shop' ? pub.shopPanel(guild) : pub.methodsPanel(guild);
      const sent = await i.channel.send(payload).catch(() => null);
      return i.reply({ content: sent ? '✅ Publicado en este canal.' : '❌ No pude enviar mensajes aquí (revisa mis permisos).', flags: EPH });
    }
  }
}
module.exports = { home, handle };
