process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'validation-token';
const { commands } = require('./commands.js');

const names = new Set();
for (const command of commands) {
  if (names.has(command.name)) throw new Error('Comando duplicado: ' + command.name);
  names.add(command.name);
  command.toJSON();
}
if (commands.length > 25) throw new Error('Discord permite como máximo 25 comandos de aplicación.');
console.log('Comandos válidos: ' + [...names].join(', '));
