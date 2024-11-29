import { logger } from '../utils/logger.js';
import { botService } from '../services/botService.js';

export const handleRestart = (bot) => {
  bot.onText(/\/restart/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      await bot.sendMessage(chatId, '🔄 Initiating bot restart...');
      
      const success = await botService.restartBot(bot, chatId);
      
      if (!success) {
        throw new Error('Restart operation failed');
      }
      
    } catch (error) {
      logger.error(`Restart command error: ${error.message}`);
      await bot.sendMessage(
        chatId,
        '❌ Failed to restart the bot. Please try again later.'
      ).catch(err => logger.error(`Failed to send error message: ${err.message}`));
    }
  });
};