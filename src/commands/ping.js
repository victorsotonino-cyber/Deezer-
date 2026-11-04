const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Comprueba el estado y la latencia del bot.'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder().setColor(0x8B5CF6).setTitle('🏓 DATASHOP · Pong')
      .addFields(
        { name: 'Latencia API', value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: 'Tiempo activo', value: `${Math.floor(process.uptime() / 60)} min`, inline: true }
      ).setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
