const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Muestra los comandos disponibles.'),
  async execute(interaction, client) {
    const lines = [...client.commands.values()].map(command => `• /${command.data.name} — ${command.data.description}`).sort();
    const embed = new EmbedBuilder().setColor(0x8B5CF6).setTitle('DATASHOP · Centro de comandos')
      .setDescription(lines.join('\n') || 'No hay comandos cargados.')
      .setFooter({ text: 'Usa /plantilla para crear la estructura de tienda.' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
