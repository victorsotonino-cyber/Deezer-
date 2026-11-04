const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { EPH, isAdmin } = require('../util');
const admin = require('../admin');

module.exports = [
  { data: new SlashCommandBuilder().setName('panel').setDescription('Panel para editar toda la tienda y el bot').setDefaultMemberPermissions(P.ManageGuild),
    execute: (i) => isAdmin(i.member) ? i.reply({ ...admin.home(i.guild), flags: EPH }) : i.reply({ content: '❌ Solo administradores.', flags: EPH }) },

  { data: new SlashCommandBuilder().setName('plantilla').setDescription('Crea la estructura completa de una tienda (roles, canales, paneles)').setDefaultMemberPermissions(P.Administrator),
    execute: (i) => {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const { embed } = require('../util');
      if (!i.memberPermissions.has(P.Administrator)) return i.reply({ content: '❌ Solo administradores.', flags: EPH });
      return i.reply({ flags: EPH, embeds: [embed(i.guild, { title: '🏗️ Plantilla de tienda', desc: [
        'Voy a crear (sin borrar nada existente):',
        '• **Roles:** Owner, Admin, Staff, Miembro y los **rangos de clientes**',
        '• **Categorías:** Información, Tienda, Comunidad, Referencias, Soporte, Tickets abiertos, Estadísticas, Staff',
        '• **Canales:** anuncios, reglas, tienda, métodos, ventas, sorteos, chat, vouches, tickets, logs…',
        '• **Contadores de voz** de ventas y miembros',
        '• **Paneles** de tickets, tienda y métodos ya publicados',
        '', 'Después lo editas todo en `/panel`. ¿Continuar?'].join('\n') })],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tpl:ok').setLabel('Crear plantilla').setEmoji('✅').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tpl:no').setLabel('Cancelar').setStyle(ButtonStyle.Secondary))] });
    } },
];
