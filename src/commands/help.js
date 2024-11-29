export const handleHelp = (bot) => {
  bot.onText(/^\/help$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      'Available commands:\n\n' +
      '`/start` - Start the bot\n' +
      '`/help` - Show this help message\n' +
      '`/portfolio <address>` - Analyze a portfolio address\n' +
      '`/returns <address>` - Get portfolio returns for a specific time period\n' +
      '`/allreturns <address>` - Get portfolio returns for all time periods\n' +
      '`/setalert` - Set an alert for portfolio returns\n' +
      '`/alerts` - List your active alerts\n' +
      '`/removealert` - Remove alerts for a portfolio\n\n' +
      'Example:\n' +
      '`/portfolio 0x119056cd66a3e7e2a5168893eb839bfd415a779f`',
      { parse_mode: 'Markdown' }
    );
  });
};