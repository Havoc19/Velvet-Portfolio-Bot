import { handleStart } from '../commands/start.js';
import { handleHelp } from '../commands/help.js';
import { handlePortfolio } from '../commands/portfolio.js';
import { handleReturns } from '../commands/returns.js';
import { handleAllReturns } from '../commands/allReturns.js';
import { handleMenu } from '../commands/menu.js';
import { handleMyPortfolios } from '../commands/myPortfolios.js';
import { handleAlerts, handleSetAlert, handleRemoveAlert } from '../commands/alerts.js';
import { logger } from '../utils/logger.js';
import { botCommands } from '../config/commands.js';

// Store active command states
const activeCommands = new Map();

// Clear command state when a new command starts
const clearCommandState = (chatId) => {
  activeCommands.delete(chatId);
};

export const registerCommands = (bot) => {
  try {
    // Register command state cleaner
    bot.on('text', (msg) => {
      if (msg.text?.startsWith('/')) {
        clearCommandState(msg.chat.id);
      }
    });

    // Register all command handlers
    handleStart(bot);
    handleHelp(bot);
    handlePortfolio(bot, activeCommands);
    handleReturns(bot, activeCommands);
    handleAllReturns(bot, activeCommands);
    handleMenu(bot, activeCommands);
    handleMyPortfolios(bot);
    handleAlerts(bot);
    handleSetAlert(bot);
    handleRemoveAlert(bot);

    // Handle unknown commands
    bot.onText(/^\/.*/, (msg) => {
      const command = msg.text.split(' ')[0];
      if (!botCommands.some(cmd => `/${cmd.command}` === command)) {
        bot.sendMessage(
          msg.chat.id,
          '❌ Unknown command. Use /help to see available commands.'
        );
      }
    });
    
    logger.info('All commands registered successfully');
  } catch (error) {
    logger.error(`Failed to register commands: ${error.message}`);
    throw error;
  }
};