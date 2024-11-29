import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { botCommands } from '../config/commands.js';
import { startAlertChecker, stopAlertChecker } from './alertService.js';

let botInstance = null;
let isInitializing = false;
let pollingTimeout = null;

const createBot = () => {
  return new TelegramBot(config.botToken, {
    polling: {
      interval: 300,
      autoStart: false,
      params: {
        timeout: 10
      }
    }
  });
};

const setupCommands = async (bot) => {
  try {
    await bot.setMyCommands(botCommands);
    logger.info('Bot commands configured successfully');
  } catch (error) {
    logger.warn(`Failed to set bot commands: ${error.message}`);
  }
};

const cleanupBot = async () => {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }

  stopAlertChecker();

  if (botInstance) {
    try {
      await botInstance.stopPolling();
      botInstance = null;
      logger.info('Previous bot instance cleaned up');
    } catch (error) {
      logger.error(`Error cleaning up bot: ${error.message}`);
    }
  }
};

const setupErrorHandlers = (bot) => {
  bot.on('polling_error', async (error) => {
    logger.error(`Polling error: ${error.message}`);
    
    if (error.message.includes('ETELEGRAM: 404 Not Found')) {
      logger.error('Invalid bot token. Please check your BOT_TOKEN environment variable');
      process.exit(1);
    }
    
    if (error.message.includes('ETELEGRAM: 409 Conflict')) {
      logger.warn('Another bot instance detected. Cleaning up and reinitializing...');
      await cleanupBot();
      
      pollingTimeout = setTimeout(() => {
        initializeBot().catch(err => {
          logger.error(`Failed to reinitialize bot: ${err.message}`);
        });
      }, 5000);
    }
  });

  bot.on('error', (error) => {
    logger.error(`Bot error: ${error.message}`);
  });
};

export const initializeBot = async () => {
  if (isInitializing) {
    logger.warn('Bot initialization already in progress');
    return null;
  }

  try {
    isInitializing = true;
    await cleanupBot();

    if (!config.botToken) {
      throw new Error('BOT_TOKEN environment variable is not set');
    }

    botInstance = createBot();
    setupErrorHandlers(botInstance);
    await setupCommands(botInstance);
    
    // Start polling after setup
    await botInstance.startPolling();
    
    // Start alert checker
    startAlertChecker();
    
    logger.info('Bot initialized and polling started successfully');
    return botInstance;
  } catch (error) {
    logger.error(`Failed to initialize bot: ${error.message}`);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const getBotInstance = () => botInstance;