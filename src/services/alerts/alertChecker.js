import { logger } from '../../utils/logger.js';
import { fetchReturnsDataWithScale } from '../returnsService.js';
import { getBotInstance } from '../botInitializer.js';
import { getAllAlerts, removeAlertFromStorage } from './alertStorage.js';

let checkInterval = null;

const createPortfolioLink = (portfolioAddress) => {
  return `https://app.velvet.capital/portfolio/${portfolioAddress}`;
};

const checkCondition = (currentReturn, alert) => {
  return alert.condition === 'gt' 
    ? currentReturn >= alert.threshold 
    : currentReturn <= alert.threshold;
};

const checkAlerts = async () => {
  const bot = getBotInstance();
  if (!bot) {
    logger.error('Bot instance not available for checking alerts');
    return;
  }

  const alerts = getAllAlerts();
  for (const [key, alertList] of alerts) {
    try {
      const [chatId, portfolioAddress] = key.split(':');
      const result = await fetchReturnsDataWithScale(portfolioAddress, 'all');
      
      if (!result.success) continue;
      
      const currentReturn = parseFloat(result.data.returns);
      if (isNaN(currentReturn)) continue;

      // Check each alert threshold
      for (const alert of alertList) {
        if (checkCondition(currentReturn, alert)) {
          const portfolioLink = createPortfolioLink(portfolioAddress);
          const condition = alert.condition === 'gt' ? 'risen above' : 'fallen below';
          
          await bot.sendMessage(
            chatId,
            `🚨 *Return Alert Triggered!*\n\n` +
            `📈 Portfolio return has ${condition} your target!\n\n` +
            `• Current Return: *${currentReturn >= 0 ? '+' : ''}${currentReturn}%*\n` +
            `• Target: ${alert.threshold}%\n\n` +
            `[View Portfolio](${portfolioLink})`,
            { 
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: [[
                  { text: '📊 View Portfolio', url: portfolioLink }
                ]]
              }
            }
          );

          // Remove this specific alert
          removeAlertFromStorage(chatId, portfolioAddress, alert.id);
        }
      }
    } catch (error) {
      logger.error(`Error checking alert: ${error.message}`);
    }
  }
};

export const startAlertChecker = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  checkInterval = setInterval(async () => {
    await checkAlerts();
  }, 3 * 60 * 1000); // Check every 3 minutes
  
  logger.info('Alert checker started with 3-minute interval');
};

export const stopAlertChecker = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Alert checker stopped');
  }
};