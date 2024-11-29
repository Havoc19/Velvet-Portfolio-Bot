export const handleEcho = (bot) => {
  bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const response = match[1];
    bot.sendMessage(chatId, response);
  });
};