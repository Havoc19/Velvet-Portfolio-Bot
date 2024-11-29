import { logger } from '../utils/logger.js';

class BotService {
  constructor() {
    this.isRestarting = false;
    this.restartTimeout = null;
  }

  async stopBot(bot) {
    try {
      await bot.stopPolling();
      logger.info('Bot polling stopped successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to stop bot polling: ${error.message}`);
      return false;
    }
  }

  async restartBot(bot, chatId) {
    if (this.isRestarting) {
      logger.debug('Restart already in progress');
      return false;
    }

    try {
      this.isRestarting = true;
      
      // Clear any existing timeout
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
      }

      // Stop the bot
      const stopped = await this.stopBot(bot);
      if (!stopped) {
        throw new Error('Failed to stop bot properly');
      }

      // Set restart timeout
      this.restartTimeout = setTimeout(() => {
        logger.info('Executing restart...');
        process.exit(0); // nodemon will handle the restart
      }, 1000);

      return true;
    } catch (error) {
      this.isRestarting = false;
      logger.error(`Restart failed: ${error.message}`);
      return false;
    }
  }
}

export const botService = new BotService();