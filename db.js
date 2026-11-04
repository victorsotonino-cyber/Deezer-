// Base de datos JSON: todo lo que se cambia en /panel se guarda aquí y sobrevive reinicios.
const fs = require('fs');
const path = require('path');
const FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');

let data = { guilds: {} };
try {
  if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error('⚠️ DB ilegible, se guardó copia en .bak');
  try { fs.copyFileSync(FILE, FILE + '.bak'); } catch {}
  data = { guilds: {} };
}

let timer = null;
function flush() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}
function save() { clearTimeout(timer); timer = setTimeout(flush, 500); }
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { flush(); process.exit(0); });

const defaults = () => ({
  store: { name: 'Mi Tienda', color: '#e11d48', currency: '$', banner: '', footer: 'Gracias por confiar en nosotros' },
  channels: { welcome: null, logs: null, tickets: null, vouches: null, ventas: null, giveaways: null, announce: null, suggestions: null, shop: null, methods: null, ticketCategory: null, statsVentas: null, statsMiembros: null },
  roles: { owner: null, admin: null, staff: null, member: null },
  ticket: {
    max: 3, counter: 0,
    panelTitle: '🎫 Centro de soporte',
    panelDesc: 'Selecciona el tipo de ticket en el menú de abajo.\n\n🛠️ **Soporte** · 🛒 **Compras** · 🎁 **Reclaim**\n\nNo abras tickets sin motivo.',
    welcome: 'Hola {user}, gracias por abrir un ticket. Un miembro del staff te atenderá en breve. Explica tu consulta con el mayor detalle posible.',
    types: [
      { id: 'soporte', label: 'Soporte', emoji: '🛠️', desc: 'Ayuda general' },
      { id: 'compras', label: 'Compras', emoji: '🛒', desc: 'Quiero comprar un producto' },
      { id: 'reclaim', label: 'Reclaim', emoji: '🎁', desc: 'Reclamar un producto ya pagado' },
    ],
  },
  products: [],
  methods: [],
  ranks: [
    { id: 'cliente', name: 'Cliente', min: 1, color: '#9ca3af', roleId: null },
    { id: 'comprador', name: 'Comprador', min: 25, color: '#22c55e', roleId: null },
    { id: 'vip', name: 'VIP', min: 100, color: '#3b82f6', roleId: null },
    { id: 'elite', name: 'Elite', min: 300, color: '#a855f7', roleId: null },
    { id: 'leyenda', name: 'Leyenda', min: 1000, color: '#f59e0b', roleId: null },
  ],
  customers: {}, sales: 0, warns: {}, giveaways: {}, tickets: {},
  welcome: { enabled: true, title: '👋 ¡Bienvenido!', msg: '¡Bienvenido {user} a **{server}**! 🛒 Mira la tienda y abre un ticket si necesitas ayuda. Ya somos {count}.' },
  automod: { links: true, spam: true, badwords: [] },
});

function fill(t, d) {
  for (const k of Object.keys(d)) {
    if (t[k] === undefined) t[k] = structuredClone(d[k]);
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && t[k] && typeof t[k] === 'object') fill(t[k], d[k]);
  }
  return t;
}
function get(id) {
  data.guilds[id] = fill(data.guilds[id] || {}, defaults());
  return data.guilds[id];
}
module.exports = { get, save, flush };
