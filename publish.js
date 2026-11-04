// Mensajes publicables (paneles) reutilizados por comandos, plantilla y /panel.
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('./db');
const { embed, banner, okEmoji, money } = require('./util');

function ticketPanel(guild) {
  const g = db.get(guild.id);
  const e = banner(embed(guild, { title: g.ticket.panelTitle, desc: g.ticket.panelDesc }), guild);
  if (!g.ticket.types.length) return { embeds: [e.setDescription('No hay tipos de ticket configurados. Usa `/panel`.')] };
  const sel = new StringSelectMenuBuilder().setCustomId('tk:new').setPlaceholder('📩 Selecciona el tipo de ticket')
    .addOptions(g.ticket.types.slice(0, 25).map((t) => {
      const o = { label: String(t.label).slice(0, 100), value: t.id };
      if (t.desc) o.description = String(t.desc).slice(0, 100);
      if (okEmoji(t.emoji)) o.emoji = t.emoji.trim();
      return o;
    }));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(sel)] };
}

function shopPanel(guild) {
  const g = db.get(guild.id);
  const lines = g.products.map((p) => {
    const st = p.stock < 0 ? '∞' : p.stock;
    return `${okEmoji(p.emoji) ? p.emoji : '📦'} **${p.name}** — ${money(g, p.price)} · ${p.stock === 0 ? '❌ Agotado' : `Stock: ${st}`}${p.desc ? `\n> ${p.desc}` : ''}`;
  });
  const e = banner(embed(guild, { title: `🛍️ ${g.store.name}`, desc: lines.length ? lines.join('\n\n').slice(0, 4000) : 'Aún no hay productos. Un admin puede añadirlos en `/panel`.' }), guild);
  const avail = g.products.filter((p) => p.stock !== 0).slice(0, 25);
  if (!avail.length) return { embeds: [e] };
  const sel = new StringSelectMenuBuilder().setCustomId('shop:buy').setPlaceholder('🛒 Elige un producto para comprar')
    .addOptions(avail.map((p) => {
      const o = { label: p.name.slice(0, 100), value: p.id, description: `${money(g, p.price)} · ${p.stock < 0 ? 'stock ilimitado' : `stock ${p.stock}`}` };
      if (okEmoji(p.emoji)) o.emoji = p.emoji.trim();
      return o;
    }));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(sel)] };
}

function methodsPanel(guild) {
  const g = db.get(guild.id);
  const e = embed(guild, { title: '🏦 Métodos de pago', desc: g.methods.length ? undefined : 'Aún no hay métodos configurados. Un admin puede añadirlos en `/panel`.', fields: g.methods.slice(0, 25).map((m) => ({ name: m.name, value: String(m.detail || '-').slice(0, 1000) })) });
  return { embeds: [e] };
}
module.exports = { ticketPanel, shopPanel, methodsPanel };
