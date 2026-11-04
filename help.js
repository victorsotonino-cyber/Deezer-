const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { embed } = require('./util');

const CATS = {
  tienda: ['🛒 Tienda', '`/tienda` ver productos y comprar\n`/metodos` métodos de pago\n`/producto agregar|stock|quitar` gestionar productos (staff)\n`/venta` registrar una venta (staff)\n`/vouch` dejar una referencia\n`/rango` tu rango de cliente\n`/top` mejores clientes'],
  tickets: ['🎫 Tickets', '`/ticketpanel` publicar el panel de tickets (staff)\n`/ticket add|remove|rename` gestionar el ticket actual (staff)\nBotones del ticket: reclamar, transcripción, cerrar'],
  sorteos: ['🎉 Sorteos', '`/sorteo crear` crear un sorteo\n`/sorteo terminar` terminarlo ya\n`/sorteo reroll` elegir otros ganadores'],
  mod: ['🔨 Moderación', '`/ban` `/unban` `/kick` `/timeout` `/untimeout`\n`/warn` `/warns` `/clearwarns`\n`/clear` `/lock` `/unlock` `/slowmode`\nAutoMod: links, spam y palabras prohibidas (configurable en `/panel`)'],
  util: ['🧰 Utilidad', '`/ping` `/avatar` `/userinfo` `/serverinfo`\n`/sugerencia` `/encuesta` `/anuncio` (staff)'],
  admin: ['⚙️ Administración', '`/panel` panel para editar todo (tienda, canales, roles, tickets, productos, métodos, rangos, bienvenida, automod)\n`/plantilla` crea la estructura completa de una tienda (roles, canales, paneles)'],
};
function payload(guild, cat = 'tienda') {
  const sel = new StringSelectMenuBuilder().setCustomId('help:cat').setPlaceholder('Categoría')
    .addOptions(Object.entries(CATS).map(([k, [l]]) => ({ label: l, value: k, default: k === cat })));
  return { embeds: [embed(guild, { title: `📖 Ayuda · ${CATS[cat][0]}`, desc: CATS[cat][1] })], components: [new ActionRowBuilder().addComponents(sel)] };
}
module.exports = { payload, handle: (i) => i.update(payload(i.guild, i.values[0])) };
