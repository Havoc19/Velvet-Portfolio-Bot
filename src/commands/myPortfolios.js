import { logger } from '../utils/logger.js';
import { getSavedPortfolios, removePortfolio } from '../services/portfolioStorage.js';

const formatPortfoliosList = (portfolios) => {
  if (portfolios.length === 0) {
    return '📊 *My Portfolios*\n\nNo portfolios saved yet.\nUse /portfolio to analyze and save portfolios.';
  }

  const message = ['📊 *My Saved Portfolios*\n'];
  portfolios.forEach(portfolio => {
    message.push(
      `\n*${portfolio.name}* (${portfolio.symbol})\n` +
      `• Address: \`${portfolio.address}\`\n` +
      `• Network: ${portfolio.chainName.toUpperCase()}\n` +
      `• Creator: ${portfolio.creatorName}`
    );
  });

  return message.join('');
};

const createPortfolioKeyboard = (portfolios) => {
  const keyboard = portfolios.map(portfolio => [{
    text: `❌ Remove ${portfolio.name} (${portfolio.symbol})`,
    callback_data: `removeportfolio:${portfolio.address}`
  }]);

  return keyboard;
};

export const handleMyPortfolios = (bot) => {
  bot.onText(/^\/myportfolios$/, async (msg) => {
    const chatId = msg.chat.id;
    const portfolios = getSavedPortfolios(chatId);
    
    try {
      await bot.sendMessage(
        chatId,
        formatPortfoliosList(portfolios),
        {
          parse_mode: 'Markdown',
          reply_markup: portfolios.length > 0 ? {
            inline_keyboard: createPortfolioKeyboard(portfolios)
          } : undefined
        }
      );
    } catch (error) {
      logger.error(`Error displaying portfolios: ${error.message}`);
      await bot.sendMessage(
        chatId,
        '❌ Error displaying your portfolios. Please try again later.'
      );
    }
  });

  // Handle portfolio removal
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('removeportfolio:')) return;

    const chatId = query.message.chat.id;
    const portfolioAddress = query.data.split(':')[1];

    try {
      const removed = removePortfolio(chatId, portfolioAddress);
      if (removed) {
        const portfolios = getSavedPortfolios(chatId);
        await bot.editMessageText(
          formatPortfoliosList(portfolios),
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: portfolios.length > 0 ? {
              inline_keyboard: createPortfolioKeyboard(portfolios)
            } : undefined
          }
        );
      }
    } catch (error) {
      logger.error(`Error removing portfolio: ${error.message}`);
      await bot.answerCallbackQuery(query.id, {
        text: 'Failed to remove portfolio. Please try again.',
        show_alert: true
      });
    }
  });
};