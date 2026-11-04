const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const ROLE_DEFS = [
  { name: '👑・Owner', color: 0xF1C40F, hoist: true },
  { name: '💠・Dirección', color: 0x9B59B6, hoist: true },
  { name: '🛡️・Administrador', color: 0xE74C3C, hoist: true },
  { name: '📋・Manager', color: 0xE67E22, hoist: true },
  { name: '💻・Desarrollador', color: 0x3498DB, hoist: true },
  { name: '🎨・Diseñador', color: 0xE84393, hoist: false },
  { name: '🔨・Moderador', color: 0x2ECC71, hoist: true },
  { name: '🎧・Soporte', color: 0x1ABC9C, hoist: false },
  { name: '🧪・Trial Staff', color: 0x95A5A6, hoist: false },
  { name: '💎・Cliente VIP', color: 0xAF7AC5, hoist: true },
  { name: '🛍️・Cliente', color: 0x5865F2, hoist: false },
  { name: '👤・Miembro', color: 0x99AAB5, hoist: false }
];
const CATEGORIES = [
  { name: '📌・INFORMACIÓN', channels: [
    { name: '👋・bienvenida', topic: 'Bienvenido a la tienda. Lee la información antes de comprar.' },
    { name: '📜・reglas', topic: 'Normas y condiciones de la comunidad.' },
    { name: '📢・anuncios', topic: 'Anuncios oficiales de la tienda.' },
    { name: '💳・métodos-de-pago', topic: 'Métodos de pago aceptados; consulta al staff.' }
  ]},
  { name: '🛒・TIENDA', channels: [
    { name: '🛍️・catálogo', topic: 'Catálogo de productos y servicios disponibles.' },
    { name: '💰・precios', topic: 'Precios y paquetes disponibles.' },
    { name: '🎟️・abrir-ticket', topic: 'Abre un ticket para comprar o consultar.' },
    { name: '⭐・reseñas', topic: 'Opiniones y valoraciones de clientes.' },
    { name: '✅・compras-confirmadas', topic: 'Registro de compras confirmadas por el equipo.' }
  ]},
  { name: '💬・COMUNIDAD', channels: [
    { name: '💬・chat-general', topic: 'Conversación general de la comunidad.' },
    { name: '💡・sugerencias', topic: 'Ideas para mejorar la tienda.' },
    { name: '🤝・alianzas', topic: 'Consultas sobre colaboraciones y alianzas.' }
  ]},
  { name: '🔒・STAFF', staffOnly: true, channels: [
    { name: '🔐・staff-chat', topic: 'Coordinación interna del equipo.' },
    { name: '📦・gestión-pedidos', topic: 'Seguimiento interno de pedidos y entregas.' },
    { name: '🧾・registro-moderación', topic: 'Registro de acciones del equipo.' }
  ]}
];
module.exports = {
  data: new SlashCommandBuilder().setName('plantilla')
    .setDescription('Crea una plantilla profesional para un servidor de tienda.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('nombre').setDescription('Nombre de la tienda para personalizar el panel').setMaxLength(80).setRequired(false)),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Este comando solo funciona dentro de un servidor.', ephemeral: true });
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Necesitas permiso de Administrador para crear la plantilla.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const shopName = interaction.options.getString('nombre') || guild.name;
    const created = { roles: 0, categories: 0, channels: 0, existing: 0 };
    try {
      const roleCache = new Map();
      for (const def of ROLE_DEFS) {
        let role = guild.roles.cache.find(item => item.name === def.name);
        if (!role) {
          role = await guild.roles.create({ name: def.name, color: def.color, hoist: def.hoist, mentionable: false, reason: 'Plantilla de tienda DATASHOP' });
          created.roles++;
        } else created.existing++;
        roleCache.set(def.name, role);
      }
      const staffIds = ['🛡️・Administrador', '📋・Manager', '🎧・Soporte'].map(name => roleCache.get(name).id);
      for (const categoryDef of CATEGORIES) {
        let category = guild.channels.cache.find(ch => ch.type === ChannelType.GuildCategory && ch.name === categoryDef.name);
        if (!category) {
          const overwrites = categoryDef.staffOnly ? [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...staffIds.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
          ] : [];
          category = await guild.channels.create({ name: categoryDef.name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites, reason: 'Plantilla de tienda DATASHOP' });
          created.categories++;
        } else created.existing++;
        for (const channelDef of categoryDef.channels) {
          const exists = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.name === channelDef.name && ch.parentId === category.id);
          if (exists) { created.existing++; continue; }
          await guild.channels.create({ name: channelDef.name, type: ChannelType.GuildText, parent: category.id, topic: channelDef.topic, reason: 'Plantilla de tienda DATASHOP' });
          created.channels++;
        }
      }
      const embed = new EmbedBuilder().setColor(0x8B5CF6).setTitle('🛍️ Plantilla de tienda configurada')
        .setDescription(`Se procesó la estructura inicial de **${shopName}**. Los elementos existentes se conservaron.`)
        .addFields(
          { name: 'Rangos creados', value: String(created.roles), inline: true },
          { name: 'Categorías creadas', value: String(created.categories), inline: true },
          { name: 'Canales creados', value: String(created.channels), inline: true },
          { name: 'Elementos existentes', value: String(created.existing), inline: true },
          { name: 'Siguiente paso', value: 'Revisa la jerarquía de roles y configura permisos para tickets y pedidos.' }
        ).setFooter({ text: 'DATASHOP · No borra canales ni roles existentes.' }).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[PLANTILLA] Error al configurar servidor:', error);
      await interaction.editReply({ content: 'No se pudo completar toda la plantilla. Comprueba que el rol del bot esté por encima de los rangos y que tenga Administrar roles y Administrar canales. Los elementos ya creados se conservaron.' });
    }
  }
};
