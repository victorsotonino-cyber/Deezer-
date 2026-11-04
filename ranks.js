const db = require('./db');
const hexn = (s) => parseInt(String(s || '').replace('#', ''), 16) || 0;

const rankFor = (g, spent) => [...g.ranks].sort((a, b) => b.min - a.min).find((r) => spent >= r.min) || null;
const nextRank = (g, spent) => [...g.ranks].sort((a, b) => a.min - b.min).find((r) => r.min > spent) || null;

async function ensureRankRole(guild, r) {
  if (r.roleId && guild.roles.cache.has(r.roleId)) return;
  const role = await guild.roles.create({ name: r.name, color: hexn(r.color), hoist: true, reason: 'Rango de tienda' }).catch(() => null);
  if (role) { r.roleId = role.id; db.save(); }
}

// Deja al miembro solo con el rol del rango que le corresponde por lo gastado.
async function syncRank(member) {
  const g = db.get(member.guild.id);
  const spent = g.customers[member.id]?.spent || 0;
  const target = rankFor(g, spent);
  if (target) await ensureRankRole(member.guild, target);
  const all = g.ranks.map((r) => r.roleId).filter(Boolean);
  const remove = all.filter((id) => id !== target?.roleId && member.roles.cache.has(id));
  if (remove.length) await member.roles.remove(remove).catch(() => {});
  if (target?.roleId && !member.roles.cache.has(target.roleId)) await member.roles.add(target.roleId).catch(() => {});
  return target;
}
module.exports = { rankFor, nextRank, ensureRankRole, syncRank };
