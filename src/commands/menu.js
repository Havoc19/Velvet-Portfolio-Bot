import { logger } from '../utils/logger.js';
import { getRandomTip } from '../utils/investmentTips.js';

const formatMenuMessage = () => `
🤖 *Velvet Portfolio Bot*

*Portfolio Analysis:*
📊 /portfolio - View NAV, TVL & details
📈 /returns - Get time-based returns
📊 /allreturns - Full returns summary
💼 /myportfolios - View saved portfolios

*Alert Management:*
⏰ /setalert - Set return alerts
🔔 /alerts - View active alerts
❌ /removealert - Remove alerts

${getRandomTip()}

_Click any command to get started!_`;

export const handleMenu = (bot) => {
  bot.onText(/^\/menu$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await bot.sendMessage(
        chatId,
        formatMenuMessage(),
        { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );
    } catch (error) {
      logger.error(`Menu display error: ${error.message}`);
      await bot.sendMessage(
        chatId,
        '❌ Error displaying menu. Please try /help to see available commands.'
      );
    }
  });
};