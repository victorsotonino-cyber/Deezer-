const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const { embed, isStaff, EPH, money, slug, bar, okEmoji } = require('../util');
const { rankFor, nextRank, syncRank } = require('../ranks');
const pub = require('../publish');
const { updateStats } = require('../template');

const staffOnly = (i) => !isStaff(i.member) && i.reply({ content: '❌ Solo staff.', flags: EPH }).then(() => true);
const findProduct = (g, q) => g.products.find((p) => p.id === q) || g.products.find((p) => p.name.toLowerCase() === String(q).toLowerCase());
const autoProducts = (i) => {
  const g = db.get(i.guild.id), q = i.options.getFocused().toLowerCase();
  return i.respond(g.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 25).map((p) => ({ name: p.name.slice(0, 100), value: p.id })));
};

module.exports = [
  { data: new SlashCommandBuilder().setName('tienda').setDescription('Mira los productos y compra'),
    execute: (i) => i.reply(pub.shopPanel(i.guild)) },

  { data: new SlashCommandBuilder().setName('metodos').setDescription('Métodos de pago'),
    execute: (i) => i.reply(pub.methodsPanel(i.guild)) },

  { data: new SlashCommandBuilder().setName('producto').setDescription('Gestiona productos (staff)').setDefaultMemberPermissions(P.ManageMessages)
      .addSubcommand((s) => s.setName('agregar').setDescription('Añade o edita un producto')
        .addStringOption((o) => o.setName('nombre').setDescription('Nombre').setRequired(true)).addNumberOption((o) => o.setName('precio').setDescription('Precio').setRequired(true))
        .addIntegerOption((o) => o.setName('stock').setDescription('Stock (vacío = ilimitado)')).addStringOption((o) => o.setName('emoji').setDescription('Emoji')).addStringOption((o) => o.setName('descripcion').setDescription('Descripción')))
      .addSubcommand((s) => s.setName('stock').setDescription('Cambia el stock').addStringOption((o) => o.setName('producto').setDescription('Producto').setRequired(true).setAutocomplete(true)).addIntegerOption((o) => o.setName('cantidad').setDescription('Nuevo stock (-1 = ilimitado)').setRequired(true).setMinValue(-1)))
      .addSubcommand((s) => s.setName('quitar').setDescription('Elimina un producto').addStringOption((o) => o.setName('producto').setDescription('Producto').setRequired(true).setAutocomplete(true))),
    autocomplete: autoProducts,
    execute: async (i) => {
      if (await staffOnly(i)) return;
      const g = db.get(i.guild.id), sub = i.options.getSubcommand();
      if (sub === 'agregar') {
        const name = i.options.getString('nombre'), id = slug(name);
        let p = g.products.find((x) => x.id === id);
        if (!p) { if (g.products.length >= 25) return i.reply({ content: '❌ Máximo 25 productos.', flags: EPH }); p = { id, name, price: 0, stock: -1, emoji: '', desc: '' }; g.products.push(p); }
        p.name = name; p.price = i.options.getNumber('precio');
        const st = i.options.getInteger('stock'); if (st !== null) p.stock = st;
        const em = i.options.getString('emoji'); if (em) p.emoji = okEmoji(em) ? em.trim() : '';
        const de = i.options.getString('descripcion'); if (de) p.desc = de.slice(0, 200);
        db.save(); return i.reply({ content: `✅ Producto **${p.name}** guardado (${money(g, p.price)}).`, flags: EPH });
      }
      const p = findProduct(g, i.options.getString('producto'));
      if (!p) return i.reply({ content: '❌ Producto no encontrado.', flags: EPH });
      if (sub === 'stock') { p.stock = i.options.getInteger('cantidad'); db.save(); return i.reply({ content: `✅ Stock de **${p.name}**: ${p.stock < 0 ? '∞' : p.stock}`, flags: EPH }); }
      g.products.splice(g.products.indexOf(p), 1); db.save(); return i.reply({ content: `🗑️ **${p.name}** eliminado.`, flags: EPH });
    } },

  { data: new SlashCommandBuilder().setName('venta').setDescription('Registra una venta (staff): suma al cliente, baja stock y sube su rango').setDefaultMemberPermissions(P.ManageMessages)
      .addUserOption((o) => o.setName('usuario').setDescription('Cliente').setRequired(true))
      .addNumberOption((o) => o.setName('monto').setDescription('Monto pagado').setRequired(true).setMinValue(0.01))
      .addStringOption((o) => o.setName('producto').setDescription('Producto vendido').setAutocomplete(true))
      .addStringOption((o) => o.setName('nota').setDescription('Nota')),
    autocomplete: autoProducts,
    execute: async (i) => {
      if (await staffOnly(i)) return;
      await i.deferReply({ flags: EPH });
      const g = db.get(i.guild.id), u = i.options.getUser('usuario'), monto = i.options.getNumber('monto');
      const pq = i.options.getString('producto'), prod = pq ? findProduct(g, pq) : null;
      const before = rankFor(g, g.customers[u.id]?.spent || 0);
      const c = (g.customers[u.id] ||= { spent: 0, orders: 0 });
      c.spent = Math.round((c.spent + monto) * 100) / 100; c.orders++; g.sales++;
      if (prod && prod.stock > 0) prod.stock--;
      db.save();
      const member = await i.guild.members.fetch(u.id).catch(() => null);
      const after = member ? await syncRank(member) : rankFor(g, c.spent);
      const ch = g.channels.ventas && i.guild.channels.cache.get(g.channels.ventas);
      if (ch) ch.send({ embeds: [embed(i.guild, { title: '💸 Nueva venta', fields: [
        { name: 'Cliente', value: `${u}`, inline: true }, { name: 'Monto', value: money(g, monto), inline: true },
        { name: 'Producto', value: prod ? prod.name : 'Otro', inline: true }, { name: 'Atendió', value: `${i.user}`, inline: true },
        ...(i.options.getString('nota') ? [{ name: 'Nota', value: i.options.getString('nota') }] : [])], thumb: u.displayAvatarURL() })] }).catch(() => {});
      updateStats(i.guild).catch(() => {});
      const up = after && after.id !== before?.id ? `\n🏅 ¡Subió a **${after.name}**!` : '';
      if (up && ch) ch.send(`🎊 ${u} ahora es **${after.name}**`).catch(() => {});
      return i.editReply(`✅ Venta registrada: ${u} · ${money(g, monto)} · total ${money(g, c.spent)} (${c.orders} pedidos).${up}`);
    } },

  { data: new SlashCommandBuilder().setName('rango').setDescription('Mira tu rango de cliente').addUserOption((o) => o.setName('usuario').setDescription('Usuario')),
    execute: (i) => {
      const g = db.get(i.guild.id), u = i.options.getUser('usuario') || i.user, c = g.customers[u.id] || { spent: 0, orders: 0 };
      const cur = rankFor(g, c.spent), nxt = nextRank(g, c.spent);
      const prog = nxt ? `${bar((c.spent - (cur?.min || 0)) / (nxt.min - (cur?.min || 0)))} ${money(g, c.spent)} / ${money(g, nxt.min)}\nSiguiente: **${nxt.name}**` : '🏆 ¡Rango máximo!';
      return i.reply({ embeds: [embed(i.guild, { title: `🏅 ${u.username}`, thumb: u.displayAvatarURL(), fields: [
        { name: 'Rango', value: cur ? (cur.roleId ? `<@&${cur.roleId}>` : cur.name) : 'Sin rango', inline: true },
        { name: 'Gastado', value: money(g, c.spent), inline: true }, { name: 'Pedidos', value: `${c.orders}`, inline: true }, { name: 'Progreso', value: prog }] })] });
    } },

  { data: new SlashCommandBuilder().setName('top').setDescription('Mejores clientes de la tienda'),
    execute: (i) => {
      const g = db.get(i.guild.id), top = Object.entries(g.customers).sort((a, b) => b[1].spent - a[1].spent).slice(0, 10);
      const medal = ['🥇', '🥈', '🥉'];
      return i.reply({ embeds: [embed(i.guild, { title: '🏆 Top clientes', desc: top.length ? top.map(([id, c], n) => `${medal[n] || `**${n + 1}.**`} <@${id}> — ${money(g, c.spent)} (${c.orders} pedidos)`).join('\n') : 'Aún no hay ventas.' })], allowedMentions: { parse: [] } });
    } },

  { data: new SlashCommandBuilder().setName('vouch').setDescription('Deja una referencia sobre tu compra')
      .addIntegerOption((o) => o.setName('estrellas').setDescription('1 a 5').setMinValue(1).setMaxValue(5).setRequired(true))
      .addStringOption((o) => o.setName('comentario').setDescription('Tu comentario').setRequired(true).setMaxLength(800))
      .addUserOption((o) => o.setName('staff').setDescription('Staff que te atendió')),
    execute: async (i) => {
      const g = db.get(i.guild.id), n = i.options.getInteger('estrellas'), st = i.options.getUser('staff');
      const ch = (g.channels.vouches && i.guild.channels.cache.get(g.channels.vouches)) || i.channel;
      const ok = await ch.send({ embeds: [embed(i.guild, { title: `${'⭐'.repeat(n)}${'☆'.repeat(5 - n)}`, desc: i.options.getString('comentario'), thumb: i.user.displayAvatarURL(), fields: [{ name: 'Cliente', value: `${i.user}`, inline: true }, ...(st ? [{ name: 'Atendido por', value: `${st}`, inline: true }] : [])] })] }).catch(() => null);
      return i.reply({ content: ok ? `✅ ¡Gracias por tu referencia! ${ch}` : '❌ No pude publicar tu vouch.', flags: EPH });
    } },
];
