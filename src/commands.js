const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('./config');
const db = require('./database');

const commands = [
  new SlashCommandBuilder().setName('plantilla').setDescription('Crea la estructura profesional de tu tienda.')
    .addStringOption(o => o.setName('tipo').setDescription('Diseño del servidor').setRequired(true)
      .addChoices({ name: 'Tienda completa', value: 'tienda' }, { name: 'Market', value: 'market' }, { name: 'Minimalista', value: 'minimal' }))
    .addStringOption(o => o.setName('nombre').setDescription('Nombre que aparecerá en los paneles').setMaxLength(50))
    .addBooleanOption(o => o.setName('rangos').setDescription('Crear rangos Básico, Premium y VIP')),
  new SlashCommandBuilder().setName('rango').setDescription('Administra los rangos de tu tienda.')
    .addSubcommand(s => s.setName('crear').setDescription('Crea un rango personalizado')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del rango').setRequired(true).setMaxLength(32))
      .addIntegerOption(o => o.setName('nivel').setDescription('Nivel del rango').setRequired(true).setMinValue(1).setMaxValue(100))
      .addStringOption(o => o.setName('color').setDescription('Color hexadecimal #RRGGBB').setMaxLength(7)))
    .addSubcommand(s => s.setName('listar').setDescription('Lista todos los rangos'))
    .addSubcommand(s => s.setName('asignar').setDescription('Asigna un rango a un miembro')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))
      .addStringOption(o => o.setName('nombre').setDescription('Rango').setRequired(true)))
    .addSubcommand(s => s.setName('quitar').setDescription('Quita un rango a un miembro')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))
      .addStringOption(o => o.setName('nombre').setDescription('Rango').setRequired(true))),
  new SlashCommandBuilder().setName('producto').setDescription('Gestiona catálogo, precios y stock.')
    .addSubcommand(s => s.setName('agregar').setDescription('Añade un producto')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre').setRequired(true).setMaxLength(80))
      .addNumberOption(o => o.setName('precio').setDescription('Precio').setRequired(true).setMinValue(0.01))
      .addIntegerOption(o => o.setName('stock').setDescription('Unidades; -1 ilimitado').setRequired(true).setMinValue(-1))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setMaxLength(500))
      .addStringOption(o => o.setName('moneda').setDescription('Moneda, por ejemplo USD').setMaxLength(5)))
    .addSubcommand(s => s.setName('listar').setDescription('Muestra el catálogo'))
    .addSubcommand(s => s.setName('stock').setDescription('Actualiza el inventario')
      .addIntegerOption(o => o.setName('id').setDescription('ID del producto').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Nuevo stock; -1 ilimitado').setRequired(true).setMinValue(-1)))
    .addSubcommand(s => s.setName('eliminar').setDescription('Desactiva un producto')
      .addIntegerOption(o => o.setName('id').setDescription('ID del producto').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('pedido').setDescription('Registra y controla los pedidos.')
    .addSubcommand(s => s.setName('crear').setDescription('Registra un pedido')
      .addIntegerOption(o => o.setName('producto').setDescription('ID mostrado en el catálogo').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand(s => s.setName('estado').setDescription('Actualiza un pedido (staff)')
      .addIntegerOption(o => o.setName('id').setDescription('ID del pedido').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('estado').setDescription('Nuevo estado').setRequired(true)
        .addChoices({ name: 'Pendiente', value: 'pendiente' }, { name: 'Pagado', value: 'pagado' }, { name: 'Completado', value: 'completado' }, { name: 'Cancelado', value: 'cancelado' })))
    .addSubcommand(s => s.setName('listar').setDescription('Lista los últimos pedidos (staff)'))
    .addSubcommand(s => s.setName('miscompras').setDescription('Consulta tu historial de pedidos')),
  new SlashCommandBuilder().setName('ticket').setDescription('Centro de soporte y tickets privados.')
    .addSubcommand(s => s.setName('panel').setDescription('Publica el panel para abrir tickets'))
    .addSubcommand(s => s.setName('cerrar').setDescription('Cierra el ticket actual'))
    .addSubcommand(s => s.setName('reabrir').setDescription('Reabre un ticket cerrado'))
    .addSubcommand(s => s.setName('reclamar').setDescription('Reclama el ticket actual (staff)'))
    .addSubcommand(s => s.setName('liberar').setDescription('Libera el ticket reclamado (staff)'))
    .addSubcommand(s => s.setName('agregar').setDescription('Da acceso a un miembro')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))),
  new SlashCommandBuilder().setName('metodo').setDescription('Configura y consulta métodos de pago de la tienda.')
    .addSubcommand(s => s.setName('agregar').setDescription('Añade un método de pago')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del método').setRequired(true).setMaxLength(50))
      .addStringOption(o => o.setName('instrucciones').setDescription('Instrucciones de pago').setRequired(true).setMaxLength(500)))
    .addSubcommand(s => s.setName('listar').setDescription('Muestra los métodos de pago disponibles'))
    .addSubcommand(s => s.setName('eliminar').setDescription('Desactiva un método de pago')
      .addIntegerOption(o => o.setName('id').setDescription('ID del método').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('vouch').setDescription('Registra una valoración de compra.')
    .addUserOption(o => o.setName('miembro').setDescription('Persona valorada').setRequired(true))
    .addIntegerOption(o => o.setName('estrellas').setDescription('Puntuación de 1 a 5').setRequired(true).setMinValue(1).setMaxValue(5))
    .addStringOption(o => o.setName('comentario').setDescription('Experiencia de compra').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('stats').setDescription('Estadísticas internas de la tienda.'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Consulta información de un miembro.')
    .addUserOption(o => o.setName('miembro').setDescription('Miembro que quieres consultar')),
  new SlashCommandBuilder().setName('sugerencia').setDescription('Envía una sugerencia.')
    .addStringOption(o => o.setName('texto').setDescription('Tu sugerencia').setRequired(true).setMaxLength(800)),
  new SlashCommandBuilder().setName('encuesta').setDescription('Crea una encuesta de hasta cuatro opciones.')
    .addStringOption(o => o.setName('pregunta').setDescription('Pregunta').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('opciones').setDescription('Opciones separadas por |').setRequired(true).setMaxLength(300)),
  new SlashCommandBuilder().setName('anuncio').setDescription('Publica un anuncio profesional.')
    .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('mensaje').setDescription('Contenido').setRequired(true).setMaxLength(1800)),
  new SlashCommandBuilder().setName('say').setDescription('Envía un mensaje como el bot (staff).')
    .addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true).setMaxLength(1800)),
  new SlashCommandBuilder().setName('configuracion').setDescription('Configura bienvenida y autorol.')
    .addSubcommand(s => s.setName('bienvenida').setDescription('Configura el canal de bienvenida')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('autorol').setDescription('Configura el rol automático')
      .addRoleOption(o => o.setName('rol').setDescription('Rol para nuevos miembros').setRequired(true))),
  new SlashCommandBuilder().setName('moderacion').setDescription('Herramientas de moderación.')
    .addSubcommand(s => s.setName('ban').setDescription('Banea a un miembro')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))
      .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(300)))
    .addSubcommand(s => s.setName('kick').setDescription('Expulsa a un miembro')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))
      .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(300)))
    .addSubcommand(s => s.setName('timeout').setDescription('Aplica una pausa temporal')
      .addUserOption(o => o.setName('miembro').setDescription('Miembro').setRequired(true))
      .addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(300)))
    .addSubcommand(s => s.setName('limpiar').setDescription('Elimina mensajes recientes')
      .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de 1 a 100').setRequired(true).setMinValue(1).setMaxValue(100))),
  new SlashCommandBuilder().setName('ayuda').setDescription('Muestra todos los módulos y comandos.')
];

const STAFF_ROLES = ['owner', 'administrador', 'staff', 'soporte'];

function isStaff(i) {
  if (config.ownerIds.includes(i.user.id) || i.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  return Boolean(i.member?.roles?.cache?.some(role => STAFF_ROLES.includes(role.name.toLowerCase())));
}

function isAdmin(i) {
  return config.ownerIds.includes(i.user.id) || Boolean(i.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

function makeEmbed(title, description) {
  return new EmbedBuilder().setColor(config.color).setTitle(title).setDescription(description).setTimestamp();
}

async function ensureRole(guild, name, color, permissions = []) {
  const found = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
  if (found) return { role: found, created: false };
  const role = await guild.roles.create({ name, color, permissions, reason: 'Plantilla profesional de tienda' });
  return { role, created: true };
}

async function ensureCategory(guild, name, isPrivate = false, allowedRoles = []) {
  const found = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === name.toLowerCase());
  if (found) return { channel: found, created: false };
  const overwrites = [];
  if (isPrivate) {
    overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    for (const role of allowedRoles) overwrites.push({
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }
  const channel = await guild.channels.create({
    name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites,
    reason: 'Plantilla profesional de tienda'
  });
  return { channel, created: true };
}

async function ensureText(guild, category, name, topic) {
  const found = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText &&
    channel.parentId === category.id && channel.name.toLowerCase() === name.toLowerCase());
  if (found) return { channel: found, created: false };
  const channel = await guild.channels.create({
    name, type: ChannelType.GuildText, parent: category.id, topic,
    reason: 'Plantilla profesional de tienda'
  });
  return { channel, created: true };
}

async function applyTemplate(i) {
  if (!isAdmin(i)) return i.reply({ content: 'Solo un administrador puede aplicar una plantilla.', ephemeral: true });
  const botMember = await i.guild.members.fetchMe();
  if (!botMember.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
    return i.reply({ content: 'Me faltan los permisos Administrar canales y Administrar roles.', ephemeral: true });
  }
  await i.deferReply({ ephemeral: true });

  const type = i.options.getString('tipo');
  const storeName = i.options.getString('nombre') || config.botName;
  const createRanks = i.options.getBoolean('rangos') ?? true;
  const counts = { roles: 0, categories: 0, channels: 0 };
  const roleRefs = {};

  const roles = [
    { key: 'owner', name: 'Owner', color: '#D9465F', permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ViewAuditLog] },
    { key: 'admin', name: 'Administrador', color: '#E879F9', permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageRoles] },
    { key: 'staff', name: 'Staff', color: '#8B5CF6', permissions: [PermissionFlagsBits.ManageMessages] },
    { key: 'support', name: 'Soporte', color: '#38BDF8', permissions: [PermissionFlagsBits.ManageMessages] },
    { key: 'customer', name: 'Cliente', color: '#94A3B8', permissions: [] }
  ];

  for (const definition of roles) {
    const result = await ensureRole(i.guild, definition.name, definition.color, definition.permissions);
    roleRefs[definition.key] = result.role;
    if (result.created) counts.roles++;
  }

  if (createRanks) {
    const defaults = [
      { name: 'Básico', level: 1, color: '#94A3B8' },
      { name: 'Premium', level: 2, color: '#A855F7' },
      { name: 'VIP', level: 3, color: '#F59E0B' }
    ];
    for (const rank of defaults) {
      if (!db.getRank(i.guildId, rank.name)) {
        const result = await ensureRole(i.guild, rank.name, rank.color);
        db.addRank(i.guildId, rank.name, result.role.id, rank.level, rank.color);
        if (result.created) counts.roles++;
      }
    }
  }

  const layouts = type === 'minimal' ? [
    { name: '[INICIO]', channels: [['👋・bienvenida', 'Bienvenida de la comunidad'], ['📜・reglas', 'Normas y términos'], ['📢・anuncios', 'Anuncios oficiales']] },
    { name: '[TIENDA]', channels: [['🛒・catalogo', 'Catálogo de productos'], ['💳・metodos', 'Métodos de pago'], ['💚・ventas', 'Registro de ventas']] },
    { name: '[COMUNIDAD]', channels: [['💬・chat', 'Conversación general'], ['🎟️・tickets', 'Panel de soporte']] }
  ] : type === 'market' ? [
    { name: '[START]', channels: [['👋・welcome', 'Bienvenida'], ['📜・terms', 'Términos y condiciones'], ['📣・news', 'Noticias del mercado']] },
    { name: '[MARKET]', channels: [['🛍️・catalog', 'Catálogo de productos'], ['💳・payments', 'Métodos de pago'], ['📦・orders', 'Información de pedidos'], ['✅・sales', 'Ventas confirmadas']] },
    { name: '[COMMUNITY]', channels: [['💬・chat', 'Chat de clientes'], ['🎁・giveaways', 'Sorteos'], ['⭐・reviews', 'Reseñas de clientes']] },
    { name: '[SUPPORT]', channels: [['🎟️・tickets', 'Centro de soporte'], ['🛡️・legit-check', 'Verificaciones']] },
    { name: '[TEAM]', private: true, channels: [['🔐・team-panel', 'Panel privado del equipo'], ['📋・staff-logs', 'Registro del equipo']] }
  ] : [
    { name: '[WLC]', channels: [['⚡・wlc', 'Bienvenida y novedades'], ['📚・terminos', 'Términos y condiciones'], ['💚・ventas', 'Registro público de ventas'], ['👥・miembros', 'Información de la comunidad']] },
    { name: '[OWNER]', private: true, channels: [['🔐・panel-owner', 'Panel privado de administración'], ['📋・logs', 'Registro administrativo']] },
    { name: '[SERVER]', channels: [['📢・announcements', 'Anuncios oficiales'], ['🏦・metodos', 'Métodos de pago'], ['🛒・tienda', 'Catálogo de productos'], ['⚖️・updates', 'Actualizaciones'], ['🎉・giveaways', 'Sorteos y eventos'], ['🤡・estafadores', 'Alertas y reportes']] },
    { name: '[SOCIAL]', channels: [['💬・chat', 'Conversación general'], ['🤖・cmd', 'Comandos del bot'], ['✉️・invites', 'Invitaciones']] },
    { name: '[REFERENCES]', channels: [['📍・vouches', 'Valoraciones'], ['✨・reviews', 'Reseñas'], ['✅・legit-check', 'Verificaciones']] },
    { name: '[TICKETS]', channels: [['🎟️・tickets', 'Panel para abrir tickets']] }
  ];

  for (const layout of layouts) {
    const allowed = layout.private ? [roleRefs.owner, roleRefs.admin, roleRefs.staff] : [];
    const category = await ensureCategory(i.guild, layout.name, Boolean(layout.private), allowed);
    if (category.created) counts.categories++;
    for (const [channelName, topic] of layout.channels) {
      const result = await ensureText(i.guild, category.channel, channelName, topic);
      if (result.created) counts.channels++;
      const lower = channelName.toLowerCase();
      if (lower.includes('wlc') || lower.includes('bienvenida') || lower.includes('welcome')) db.setSetting(i.guildId, 'welcome_channel_id', result.channel.id);
      if (lower.includes('tickets')) db.setSetting(i.guildId, 'ticket_panel_channel_id', result.channel.id);
      if (lower.includes('vouches') || lower.includes('reviews')) db.setSetting(i.guildId, 'vouch_channel_id', result.channel.id);
      if (lower.includes('tienda') || lower.includes('catalogo') || lower.includes('catalog')) db.setSetting(i.guildId, 'catalog_channel_id', result.channel.id);
    }
    if (layout.channels.some(([channelName]) => channelName.toLowerCase().includes('tickets'))) db.setSetting(i.guildId, 'ticket_category_id', category.channel.id);
  }

  db.setSetting(i.guildId, 'store_name', storeName);
  db.setSetting(i.guildId, 'member_role_id', roleRefs.customer.id);
  db.setSetting(i.guildId, 'template_type', type);

  return i.editReply({ embeds: [makeEmbed('✅ Plantilla aplicada: ' + storeName,
    'La estructura está lista y no se eliminó ningún canal existente.\n\n' +
    '**Diseño:** ' + type + '\n**Roles nuevos:** ' + counts.roles +
    '\n**Categorías nuevas:** ' + counts.categories + '\n**Canales nuevos:** ' + counts.channels +
    '\n\nSiguiente paso: publica el panel con /ticket panel y añade productos con /producto agregar.')] });
}

async function handleRank(i) {
  if (!isStaff(i)) return i.reply({ content: 'Necesitas permisos de staff.', ephemeral: true });
  const sub = i.options.getSubcommand();
  if (sub === 'crear') {
    const name = i.options.getString('nombre');
    const level = i.options.getInteger('nivel');
    const color = i.options.getString('color') || '#7C3AED';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return i.reply({ content: 'El color debe tener formato #RRGGBB.', ephemeral: true });
    if (db.getRank(i.guildId, name)) return i.reply({ content: 'Ese rango ya existe.', ephemeral: true });
    const result = await ensureRole(i.guild, name, color);
    db.addRank(i.guildId, name, result.role.id, level, color);
    return i.reply({ content: 'Rango **' + name + '** creado con nivel **' + level + '**: ' + result.role.toString(), ephemeral: true });
  }
  if (sub === 'listar') {
    const all = db.getRanks(i.guildId);
    const text = all.length ? all.map(rank => '• **' + rank.name + '** · nivel ' + rank.level + ' · <@&' + rank.role_id + '>').join('\n') : 'No hay rangos configurados.';
    return i.reply({ embeds: [makeEmbed('🏅 Rangos de la tienda', text)], ephemeral: true });
  }
  const user = i.options.getUser('miembro');
  const member = await i.guild.members.fetch(user.id).catch(() => null);
  const rank = db.getRank(i.guildId, i.options.getString('nombre'));
  if (!member || !rank) return i.reply({ content: 'No se encontró el miembro o el rango.', ephemeral: true });
  const role = i.guild.roles.cache.get(rank.role_id);
  if (!role) return i.reply({ content: 'El rol de ese rango ya no existe.', ephemeral: true });
  if (role.position >= (await i.guild.members.fetchMe()).roles.highest.position) {
    return i.reply({ content: 'El rol del bot debe estar por encima del rango que quieres gestionar.', ephemeral: true });
  }
  if (sub === 'asignar') await member.roles.add(role, 'Rango de tienda asignado por staff');
  else await member.roles.remove(role, 'Rango de tienda retirado por staff');
  return i.reply({ content: (sub === 'asignar' ? 'Se asignó ' : 'Se quitó ') + '**' + rank.name + '** a ' + member.toString() + '.', ephemeral: true });
}

async function handleProduct(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'listar') {
    const all = db.getProducts(i.guildId);
    const text = all.map(p => '**#' + p.id + ' · ' + p.name + '**\n' + (p.description || 'Sin descripción') +
      '\nPrecio: **' + p.price.toFixed(2) + ' ' + p.currency + '** · Stock: **' +
      (p.stock < 0 ? 'Ilimitado' : p.stock) + '**').join('\n\n');
    return i.reply({ embeds: [makeEmbed('🛍️ Catálogo de productos', text || 'No hay productos activos.')] });
  }
  if (!isStaff(i)) return i.reply({ content: 'Solo staff puede modificar el catálogo.', ephemeral: true });
  if (sub === 'agregar') {
    const id = db.addProduct(i.guildId, {
      name: i.options.getString('nombre'), price: i.options.getNumber('precio'),
      stock: i.options.getInteger('stock'), description: i.options.getString('descripcion') || '',
      currency: (i.options.getString('moneda') || 'USD').toUpperCase()
    });
    return i.reply({ content: 'Producto añadido con ID **#' + id + '**.', ephemeral: true });
  }
  if (sub === 'stock') {
    const result = db.setStock(i.guildId, i.options.getInteger('id'), i.options.getInteger('cantidad'));
    return i.reply({ content: result.changes ? 'Inventario actualizado.' : 'No se encontró el producto activo.', ephemeral: true });
  }
  const result = db.removeProduct(i.guildId, i.options.getInteger('id'));
  return i.reply({ content: result.changes ? 'Producto desactivado.' : 'Producto no encontrado.', ephemeral: true });
}

async function handleOrder(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'crear') {
    try {
      const result = db.createOrder(i.guildId, i.user.id, i.options.getInteger('producto'), i.options.getInteger('cantidad'));
      return i.reply({ content: 'Pedido **#' + result.id + '** registrado para **' + result.product.name +
        '**. Total: **' + result.total.toFixed(2) + ' ' + result.product.currency +
        '**. Estado: pendiente. El staff verificará el pago.', ephemeral: true });
    } catch (error) {
      return i.reply({ content: error.message, ephemeral: true });
    }
  }
  if (sub === 'miscompras') {
    const orders = db.getUserOrders(i.guildId, i.user.id);
    const description = orders.map(order => '**#' + order.id + '** · ' + order.product_name + ' ×' + order.quantity +
      ' · ' + order.total.toFixed(2) + ' · **' + order.status + '**').join('\n');
    return i.reply({ embeds: [makeEmbed('🧾 Mis compras', description || 'Todavía no tienes pedidos registrados.')], ephemeral: true });
  }
  if (!isStaff(i)) return i.reply({ content: 'Solo staff puede consultar o actualizar pedidos.', ephemeral: true });
  if (sub === 'listar') {
    const all = db.getOrders(i.guildId);
    const text = all.map(order => '**#' + order.id + '** · ' + order.product_name + ' ×' +
      order.quantity + ' · <@' + order.user_id + '> · ' + order.total.toFixed(2) + ' · **' + order.status + '**').join('\n');
    return i.reply({ embeds: [makeEmbed('📦 Pedidos recientes', text || 'Todavía no hay pedidos.')], ephemeral: true });
  }
  try {
    const order = db.setOrderStatus(i.guildId, i.options.getInteger('id'), i.options.getString('estado'));
    return i.reply({ content: 'El pedido ahora está **' + order.status + '**.', ephemeral: true });
  } catch (error) {
    return i.reply({ content: error.message, ephemeral: true });
  }
}

async function handlePaymentMethod(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'listar') {
    const methods = db.getPaymentMethods(i.guildId);
    const description = methods.map(method => '**#' + method.id + ' · ' + method.name + '**\n' + method.details).join('\n\n');
    return i.reply({ embeds: [makeEmbed('💳 Métodos de pago', description || 'La tienda todavía no ha configurado métodos de pago.')] });
  }
  if (!isStaff(i)) return i.reply({ content: 'Solo el staff puede gestionar métodos de pago.', ephemeral: true });
  if (sub === 'agregar') {
    const id = db.addPaymentMethod(i.guildId, i.options.getString('nombre'), i.options.getString('instrucciones'));
    return i.reply({ content: 'Método añadido con ID **#' + id + '**.', ephemeral: true });
  }
  const result = db.removePaymentMethod(i.guildId, i.options.getInteger('id'));
  return i.reply({ content: result.changes ? 'Método de pago desactivado.' : 'No se encontró ese método activo.', ephemeral: true });
}

async function closeTicket(i, channel) {
  const ticket = db.getTicket(i.guildId, channel.id);
  if (!ticket || ticket.status !== 'open') return i.reply({ content: 'Este canal no es un ticket abierto.', ephemeral: true });
  if (ticket.opener_id !== i.user.id && !isStaff(i)) return i.reply({ content: 'Solo quien abrió el ticket o staff puede cerrarlo.', ephemeral: true });
  db.closeTicket(i.guildId, channel.id);
  const opener = await i.guild.members.fetch(ticket.opener_id).catch(() => null);
  if (opener) await channel.permissionOverwrites.edit(opener, { SendMessages: false }).catch(() => null);
  await channel.setName(('cerrado-' + channel.name).slice(0, 90)).catch(() => null);
  return i.reply({ content: 'Ticket cerrado; el historial se conserva.', ephemeral: true });
}

async function handleTicket(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'panel') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede publicar el panel.', ephemeral: true });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
      .setCustomId('ticket:create').setLabel('Abrir ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary));
    await i.channel.send({ embeds: [makeEmbed('🎟️ Centro de soporte', 'Pulsa el botón para abrir un canal privado con el equipo de atención.')], components: [row] });
    return i.reply({ content: 'Panel de tickets publicado.', ephemeral: true });
  }
  if (sub === 'cerrar') return closeTicket(i, i.channel);
  const ticket = db.getTicket(i.guildId, i.channelId);
  if (sub === 'reabrir') {
    if (!ticket || ticket.status !== 'closed') return i.reply({ content: 'Este canal no es un ticket cerrado.', ephemeral: true });
    if (ticket.opener_id !== i.user.id && !isStaff(i)) return i.reply({ content: 'Solo el cliente o staff puede reabrir este ticket.', ephemeral: true });
    const changed = db.reopenTicket(i.guildId, i.channelId);
    if (!changed.changes) return i.reply({ content: 'No se pudo reabrir el ticket.', ephemeral: true });
    const opener = await i.guild.members.fetch(ticket.opener_id).catch(() => null);
    if (opener) await i.channel.permissionOverwrites.edit(opener, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await i.channel.setName(i.channel.name.replace(/^cerrado-/, '').slice(0, 90)).catch(() => null);
    return i.reply({ content: 'Ticket reabierto correctamente.' });
  }
  if (sub === 'liberar') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede liberar tickets.', ephemeral: true });
    if (!ticket || ticket.status !== 'open') return i.reply({ content: 'Este no es un ticket abierto.', ephemeral: true });
    db.unclaimTicket(i.guildId, i.channelId);
    return i.reply({ content: 'El ticket quedó libre para otro miembro del staff.' });
  }
  if (!ticket || ticket.status !== 'open') return i.reply({ content: 'Este canal no es un ticket abierto.', ephemeral: true });
  if (sub === 'reclamar') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede reclamar tickets.', ephemeral: true });
    db.claimTicket(i.guildId, i.channelId, i.user.id);
    return i.reply({ content: 'Ticket reclamado por ' + i.user.toString() + '.' });
  }
  const user = i.options.getUser('miembro');
  const member = await i.guild.members.fetch(user.id).catch(() => null);
  if (!member) return i.reply({ content: 'No se encontró ese miembro.', ephemeral: true });
  if (ticket.opener_id !== i.user.id && !isStaff(i)) return i.reply({ content: 'No tienes permiso para gestionar este ticket.', ephemeral: true });
  await i.channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  return i.reply({ content: member.toString() + ' ahora tiene acceso al ticket.', ephemeral: true });
}

async function handleButton(i) {
  if (i.customId === 'ticket:create') {
    await i.deferReply({ ephemeral: true });
    const existing = db.findOpenTicket(i.guildId, i.user.id);
    if (existing) {
      const openChannel = i.guild.channels.cache.get(existing.channel_id);
      if (openChannel) return i.editReply({ content: 'Ya tienes un ticket abierto: ' + openChannel.toString() });
      db.closeTicket(i.guildId, existing.channel_id);
    }
    let categoryId = db.getSetting(i.guildId, 'ticket_category_id');
    let category = categoryId ? i.guild.channels.cache.get(categoryId) : null;
    if (!category) {
      category = (await ensureCategory(i.guild, '[TICKETS]')).channel;
      db.setSetting(i.guildId, 'ticket_category_id', category.id);
    }
    const safeName = i.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 18) || 'cliente';
    const support = i.guild.roles.cache.find(role => ['soporte', 'staff'].includes(role.name.toLowerCase()));
    const overwrites = [
      { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }
    ];
    if (support) overwrites.push({ id: support.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    const channel = await i.guild.channels.create({
      name: 'ticket-' + safeName, type: ChannelType.GuildText, parent: category.id,
      permissionOverwrites: overwrites, topic: 'Ticket abierto por ' + i.user.id, reason: 'Nuevo ticket'
    });
    db.createTicket(channel.id, i.guildId, i.user.id);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
      .setCustomId('ticket:close').setLabel('Cerrar ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));
    await channel.send({
      content: support ? support.toString() : '',
      embeds: [makeEmbed('🎫 Ticket de soporte', 'Hola ' + i.user.toString() + '. Describe tu consulta aquí; el equipo te atenderá por este canal.')],
      components: [row]
    });
    return i.editReply({ content: 'Tu ticket está listo: ' + channel.toString() });
  }
  if (i.customId === 'ticket:close') return closeTicket(i, i.channel);
}

async function handleModeration(i) {
  if (!isStaff(i)) return i.reply({ content: 'No tienes permisos para usar moderación.', ephemeral: true });
  const sub = i.options.getSubcommand();
  if (sub === 'limpiar') {
    if (!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: 'Necesitas Administrar mensajes.', ephemeral: true });
    const amount = i.options.getInteger('cantidad');
    const deleted = await i.channel.bulkDelete(amount, true);
    return i.reply({ content: 'Se eliminaron **' + deleted.size + '** mensajes recientes.', ephemeral: true });
  }
  const user = i.options.getUser('miembro');
  const member = await i.guild.members.fetch(user.id).catch(() => null);
  const reason = i.options.getString('motivo') || 'Sin motivo especificado';
  if (!member) return i.reply({ content: 'El miembro no está en el servidor.', ephemeral: true });
  if (member.id === i.user.id || member.id === i.client.user.id) return i.reply({ content: 'No puedes aplicar esa acción a ese usuario.', ephemeral: true });
  const moderator = await i.guild.members.fetch(i.user.id);
  if (member.roles.highest.position >= moderator.roles.highest.position && i.guild.ownerId !== i.user.id) {
    return i.reply({ content: 'No puedes moderar a alguien con un rol igual o superior al tuyo.', ephemeral: true });
  }
  if (sub === 'ban') {
    if (!i.memberPermissions?.has(PermissionFlagsBits.BanMembers)) return i.reply({ content: 'Necesitas Banear miembros.', ephemeral: true });
    await member.ban({ reason: reason.slice(0, 400) });
    return i.reply({ content: 'Miembro baneado. Motivo: ' + reason, ephemeral: true });
  }
  if (sub === 'kick') {
    if (!i.memberPermissions?.has(PermissionFlagsBits.KickMembers)) return i.reply({ content: 'Necesitas Expulsar miembros.', ephemeral: true });
    await member.kick(reason.slice(0, 400));
    return i.reply({ content: 'Miembro expulsado. Motivo: ' + reason, ephemeral: true });
  }
  if (!i.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return i.reply({ content: 'Necesitas Moderar miembros.', ephemeral: true });
  const minutes = i.options.getInteger('minutos');
  await member.timeout(minutes * 60 * 1000, reason.slice(0, 400));
  return i.reply({ content: 'Timeout de **' + minutes + ' minutos** aplicado. Motivo: ' + reason, ephemeral: true });
}

async function execute(i) {
  if (!i.inGuild()) return i.reply({ content: 'Este comando solo funciona dentro de un servidor.', ephemeral: true });
  if (i.commandName === 'plantilla') return applyTemplate(i);
  if (i.commandName === 'rango') return handleRank(i);
  if (i.commandName === 'producto') return handleProduct(i);
  if (i.commandName === 'pedido') return handleOrder(i);
  if (i.commandName === 'ticket') return handleTicket(i);
  if (i.commandName === 'metodo') return handlePaymentMethod(i);
  if (i.commandName === 'moderacion') return handleModeration(i);

  if (i.commandName === 'vouch') {
    const target = i.options.getUser('miembro');
    if (target.id === i.user.id) return i.reply({ content: 'No puedes valorar tu propia cuenta.', ephemeral: true });
    const stars = i.options.getInteger('estrellas');
    const comment = i.options.getString('comentario');
    db.addVouch(i.guildId, i.user.id, target.id, stars, comment);
    const channel = i.guild.channels.cache.get(db.getSetting(i.guildId, 'vouch_channel_id'));
    if (channel) await channel.send({ embeds: [makeEmbed('⭐ Nueva valoración',
      'Cliente: ' + i.user.toString() + '\nValorado: ' + target.toString() +
      '\nPuntuación: ' + '⭐'.repeat(stars) + '\n\n' + comment)] });
    return i.reply({ content: 'Valoración registrada correctamente.', ephemeral: true });
  }

  if (i.commandName === 'stats') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede consultar las estadísticas.', ephemeral: true });
    const s = db.getStats(i.guildId);
    return i.reply({ embeds: [makeEmbed('📊 Estadísticas de la tienda',
      'Productos activos: **' + s.products + '**\nPedidos pendientes: **' + s.pending +
      '**\nPedidos completados: **' + s.completed + '**\nVentas completadas: **' +
      Number(s.revenue).toFixed(2) + '**\nValoraciones: **' + s.vouches + '**')], ephemeral: true });
  }

  if (i.commandName === 'userinfo') {
    const user = i.options.getUser('miembro') || i.user;
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    const description = 'Usuario: ' + user.toString() + '\nID: ' + user.id +
      '\nCuenta creada: <t:' + Math.floor(user.createdTimestamp / 1000) + ':R>\n' +
      (member ? 'Entró al servidor: <t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>\nRoles: ' +
        (member.roles.cache.filter(role => role.id !== i.guild.id).map(role => role.toString()).join(', ') || 'Ninguno') : 'No está en este servidor.');
    return i.reply({ embeds: [makeEmbed('👤 Información del miembro', description).setThumbnail(user.displayAvatarURL({ size: 256 }))], ephemeral: true });
  }

  if (i.commandName === 'sugerencia') {
    const content = i.options.getString('texto');
    const channel = i.guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name.toLowerCase().includes('suger')) || i.channel;
    const message = await channel.send({ embeds: [makeEmbed('💡 Nueva sugerencia', content).setFooter({ text: 'Enviada por ' + i.user.tag })] });
    await message.react('👍').catch(() => null);
    await message.react('👎').catch(() => null);
    return i.reply({ content: 'Sugerencia publicada en ' + channel.toString() + '.', ephemeral: true });
  }

  if (i.commandName === 'encuesta') {
    const options = i.options.getString('opciones').split('|').map(value => value.trim()).filter(Boolean).slice(0, 4);
    if (options.length < 2) return i.reply({ content: 'Añade al menos dos opciones separadas por |.', ephemeral: true });
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const text = options.map((value, index) => emojis[index] + ' ' + value).join('\n');
    const message = await i.channel.send({ embeds: [makeEmbed('📊 ' + i.options.getString('pregunta'), text)] });
    for (let index = 0; index < options.length; index++) await message.react(emojis[index]).catch(() => null);
    return i.reply({ content: 'Encuesta publicada.', ephemeral: true });
  }

  if (i.commandName === 'anuncio') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede publicar anuncios.', ephemeral: true });
    const e = makeEmbed('📢 ' + i.options.getString('titulo'), i.options.getString('mensaje')).setFooter({ text: config.botName + ' · Anuncio oficial' });
    await i.channel.send({ embeds: [e] });
    return i.reply({ content: 'Anuncio publicado.', ephemeral: true });
  }

  if (i.commandName === 'say') {
    if (!isStaff(i)) return i.reply({ content: 'Solo staff puede utilizar este comando.', ephemeral: true });
    await i.channel.send({
      content: i.options.getString('mensaje'),
      allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
    });
    return i.reply({ content: 'Mensaje enviado.', ephemeral: true });
  }

  if (i.commandName === 'configuracion') {
    if (!isAdmin(i)) return i.reply({ content: 'Solo un administrador puede cambiar la configuración.', ephemeral: true });
    if (i.options.getSubcommand() === 'bienvenida') {
      const channel = i.options.getChannel('canal');
      db.setSetting(i.guildId, 'welcome_channel_id', channel.id);
      return i.reply({ content: 'Canal de bienvenida configurado: ' + channel.toString(), ephemeral: true });
    }
    const role = i.options.getRole('rol');
    const bot = await i.guild.members.fetchMe();
    if (role.position >= bot.roles.highest.position) return i.reply({ content: 'El rol del bot debe estar por encima del rol de autorol.', ephemeral: true });
    db.setSetting(i.guildId, 'member_role_id', role.id);
    return i.reply({ content: 'Autorol configurado: ' + role.toString(), ephemeral: true });
  }

  if (i.commandName === 'ayuda') {
    const sections = [
      '**Servidor:** /plantilla, /configuracion',
      '**Rangos:** /rango crear, /rango listar, /rango asignar, /rango quitar',
      '**Tienda:** /producto agregar, /producto listar, /producto stock, /metodo listar',
      '**Pedidos:** /pedido crear, /pedido miscompras, /pedido estado, /pedido listar, /stats',
      '**Tickets:** /ticket panel, /ticket cerrar, /ticket reabrir, /ticket reclamar, /ticket liberar, /ticket agregar',
      '**Comunidad:** /vouch, /sugerencia, /encuesta, /userinfo',
      '**Moderación:** /moderacion ban, /moderacion kick, /moderacion timeout, /moderacion limpiar',
      '**Staff:** /anuncio, /say'
    ];
    return i.reply({ embeds: [makeEmbed('🧭 Centro de comandos', sections.join('\n'))], ephemeral: true });
  }
}

module.exports = { commands, execute, handleButton };
