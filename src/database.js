const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });
const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec([
  'CREATE TABLE IF NOT EXISTS settings (guild_id TEXT NOT NULL, setting_key TEXT NOT NULL, setting_value TEXT NOT NULL, PRIMARY KEY (guild_id, setting_key))',
  "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', price REAL NOT NULL, currency TEXT DEFAULT 'USD', stock INTEGER NOT NULL DEFAULT -1, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pendiente', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (product_id) REFERENCES products(id))",
  "CREATE TABLE IF NOT EXISTS tickets (channel_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, opener_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', claimed_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TEXT)",
  "CREATE TABLE IF NOT EXISTS vouches (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, author_id TEXT NOT NULL, target_id TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS ranks (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, role_id TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1, color TEXT NOT NULL DEFAULT '#7C3AED', UNIQUE(guild_id, name))",
  "CREATE TABLE IF NOT EXISTS payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, details TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  'CREATE INDEX IF NOT EXISTS idx_products_guild ON products(guild_id, active)',
  'CREATE INDEX IF NOT EXISTS idx_orders_guild ON orders(guild_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_opener ON tickets(guild_id, opener_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_vouches_guild ON vouches(guild_id)'
].join(';\n') + ';');

const q = {
  setting: db.prepare('SELECT setting_value FROM settings WHERE guild_id = ? AND setting_key = ?'),
  saveSetting: db.prepare('INSERT INTO settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?) ON CONFLICT(guild_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value'),
  products: db.prepare('SELECT * FROM products WHERE guild_id = ? AND active = 1 ORDER BY id DESC'),
  product: db.prepare('SELECT * FROM products WHERE guild_id = ? AND id = ? AND active = 1'),
  productAny: db.prepare('SELECT * FROM products WHERE guild_id = ? AND id = ?'),
  addProduct: db.prepare('INSERT INTO products (guild_id, name, description, price, currency, stock) VALUES (?, ?, ?, ?, ?, ?)'),
  updateStock: db.prepare('UPDATE products SET stock = ? WHERE guild_id = ? AND id = ?'),
  removeProduct: db.prepare('UPDATE products SET active = 0 WHERE guild_id = ? AND id = ?'),
  addOrder: db.prepare('INSERT INTO orders (guild_id, user_id, product_id, quantity, total) VALUES (?, ?, ?, ?, ?)'),
  order: db.prepare('SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON p.id = o.product_id WHERE o.guild_id = ? AND o.id = ?'),
  orders: db.prepare('SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON p.id = o.product_id WHERE o.guild_id = ? ORDER BY o.id DESC LIMIT 15'),
  userOrders: db.prepare('SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON p.id = o.product_id WHERE o.guild_id = ? AND o.user_id = ? ORDER BY o.id DESC LIMIT 10'),
  paymentMethods: db.prepare('SELECT * FROM payment_methods WHERE guild_id = ? AND active = 1 ORDER BY id ASC'),
  addPaymentMethod: db.prepare('INSERT INTO payment_methods (guild_id, name, details) VALUES (?, ?, ?)'),
  removePaymentMethod: db.prepare('UPDATE payment_methods SET active = 0 WHERE guild_id = ? AND id = ? AND active = 1'),
  updateOrder: db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND id = ?'),
  openTicket: db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND opener_id = ? AND status = 'open' LIMIT 1"),
  ticket: db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND guild_id = ?'),
  addTicket: db.prepare('INSERT INTO tickets (channel_id, guild_id, opener_id) VALUES (?, ?, ?)'),
  closeTicket: db.prepare("UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE channel_id = ? AND guild_id = ?"),
  claimTicket: db.prepare("UPDATE tickets SET claimed_by = ? WHERE channel_id = ? AND guild_id = ? AND status = 'open'"),
  unclaimTicket: db.prepare("UPDATE tickets SET claimed_by = NULL WHERE channel_id = ? AND guild_id = ? AND status = 'open'"),
  reopenTicket: db.prepare("UPDATE tickets SET status = 'open', closed_at = NULL WHERE channel_id = ? AND guild_id = ? AND status = 'closed'"),
  addVouch: db.prepare('INSERT INTO vouches (guild_id, author_id, target_id, rating, comment) VALUES (?, ?, ?, ?, ?)'),
  addRank: db.prepare('INSERT INTO ranks (guild_id, name, role_id, level, color) VALUES (?, ?, ?, ?, ?)'),
  rank: db.prepare('SELECT * FROM ranks WHERE guild_id = ? AND lower(name) = lower(?)'),
  ranks: db.prepare('SELECT * FROM ranks WHERE guild_id = ? ORDER BY level DESC, name ASC'),
  stats: db.prepare("SELECT (SELECT COUNT(*) FROM products WHERE guild_id = ? AND active = 1) AS products, (SELECT COUNT(*) FROM orders WHERE guild_id = ? AND status = 'pendiente') AS pending, (SELECT COUNT(*) FROM orders WHERE guild_id = ? AND status = 'completado') AS completed, (SELECT COALESCE(SUM(total), 0) FROM orders WHERE guild_id = ? AND status = 'completado') AS revenue, (SELECT COUNT(*) FROM vouches WHERE guild_id = ?) AS vouches")
};

function getSetting(guildId, key, fallback = null) {
  const row = q.setting.get(guildId, key);
  return row ? row.setting_value : fallback;
}

function createOrder(guildId, userId, productId, quantity) {
  const product = q.product.get(guildId, productId);
  if (!product) throw new Error('No existe ese producto activo.');
  if (product.stock >= 0 && product.stock < quantity) throw new Error('No hay stock suficiente para esa cantidad.');
  const total = Math.round(product.price * quantity * 100) / 100;
  const id = q.addOrder.run(guildId, userId, productId, quantity, total).lastInsertRowid;
  return { id, product, total };
}

const updateOrderTransaction = db.transaction((guildId, orderId, status) => {
  const order = q.order.get(guildId, orderId);
  if (!order) throw new Error('No se encontró ese pedido.');
  if (!['pendiente', 'pagado', 'completado', 'cancelado'].includes(status)) throw new Error('Estado de pedido no válido.');

  if (order.status !== 'completado' && status === 'completado') {
    const product = q.productAny.get(guildId, order.product_id);
    if (product && product.stock >= 0) {
      if (product.stock < order.quantity) throw new Error('No hay stock suficiente para completar el pedido.');
      q.updateStock.run(product.stock - order.quantity, guildId, order.product_id);
    }
  }

  if (order.status === 'completado' && status !== 'completado') {
    const product = q.productAny.get(guildId, order.product_id);
    if (product && product.stock >= 0) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE guild_id = ? AND id = ?')
        .run(order.quantity, guildId, order.product_id);
    }
  }

  q.updateOrder.run(status, guildId, orderId);
  return { ...order, status };
});

module.exports = {
  db,
  setSetting: (guildId, key, value) => q.saveSetting.run(guildId, key, String(value)),
  getSetting,
  addProduct: (guildId, product) => q.addProduct.run(
    guildId, product.name, product.description, product.price, product.currency, product.stock
  ).lastInsertRowid,
  getProducts: guildId => q.products.all(guildId),
  setStock: (guildId, id, stock) => q.updateStock.run(stock, guildId, id),
  removeProduct: (guildId, id) => q.removeProduct.run(guildId, id),
  createOrder,
  getOrders: guildId => q.orders.all(guildId),
  getUserOrders: (guildId, userId) => q.userOrders.all(guildId, userId),
  getPaymentMethods: guildId => q.paymentMethods.all(guildId),
  addPaymentMethod: (guildId, name, details) => q.addPaymentMethod.run(guildId, name, details).lastInsertRowid,
  removePaymentMethod: (guildId, id) => q.removePaymentMethod.run(guildId, id),
  setOrderStatus: updateOrderTransaction,
  findOpenTicket: (guildId, userId) => q.openTicket.get(guildId, userId),
  getTicket: (guildId, channelId) => q.ticket.get(channelId, guildId),
  createTicket: (channelId, guildId, openerId) => q.addTicket.run(channelId, guildId, openerId),
  closeTicket: (guildId, channelId) => q.closeTicket.run(channelId, guildId),
  claimTicket: (guildId, channelId, userId) => q.claimTicket.run(userId, channelId, guildId),
  unclaimTicket: (guildId, channelId) => q.unclaimTicket.run(channelId, guildId),
  reopenTicket: (guildId, channelId) => q.reopenTicket.run(channelId, guildId),
  addVouch: (guildId, authorId, targetId, rating, comment) => q.addVouch.run(guildId, authorId, targetId, rating, comment),
  addRank: (guildId, name, roleId, level, color) => q.addRank.run(guildId, name, roleId, level, color),
  getRank: (guildId, name) => q.rank.get(guildId, name),
  getRanks: guildId => q.ranks.all(guildId),
  getStats: guildId => q.stats.get(guildId, guildId, guildId, guildId, guildId)
};
