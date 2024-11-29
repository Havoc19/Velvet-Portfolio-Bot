import { fetchAllReturnsData } from '../services/returnsService.js';
import { validatePortfolioAddress } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { getSavedPortfolios } from '../services/portfolioStorage.js';
import { getRandomTip } from '../utils/investmentTips.js';

const formatAllReturnsResponse = (data, portfolioAddress) => {
  const { returns, nav } = data;
  
  const formatReturnPeriod = (period, value) => {
    if (!value || value === null) return 'N/A';
    const emoji = parseFloat(value) >= 0 ? '📈' : '📉';
    const sign = parseFloat(value) >= 0 ? '+' : '';
    return `${emoji} ${sign}${value}%`;
  };

  return `
📊 *Portfolio Returns Summary*
━━━━━━━━━━━━━━━━━━━━━
• *Portfolio*: \`${portfolioAddress}\`
• *NAV*: $${nav}

*Returns by Period:*
• 1 Hour: ${formatReturnPeriod('hour', returns.hour)}
• 24 Hours: ${formatReturnPeriod('day', returns.day)}
• 1 Week: ${formatReturnPeriod('week', returns.week)}
• 1 Month: ${formatReturnPeriod('one_month', returns.one_month)}
• 3 Months: ${formatReturnPeriod('three_month', returns.three_month)}
• All Time: ${formatReturnPeriod('all', returns.all)}
`.trim();
};

const getLoadingMessage = () => {
  return `🔍 *Calculating returns for all time periods...*\n\n${getRandomTip()}`;
};

export const handleAllReturns = (bot) => {
  // Store active allreturns requests
  const activeAllReturnsRequests = new Set();

  // Handle /allreturns command without address
  bot.onText(/^\/allreturns$/, async (msg) => {
    const chatId = msg.chat.id;
    const savedPortfolios = getSavedPortfolios(chatId);

    if (savedPortfolios.length > 0) {
      // Create keyboard with saved portfolios
      const keyboard = savedPortfolios.map(portfolio => [{
        text: `${portfolio.name} (${portfolio.symbol})`,
        callback_data: `allreturns:${portfolio.address}`
      }]);

      // Add option to enter new address
      keyboard.push([{
        text: '➕ Enter New Portfolio Address',
        callback_data: 'allreturns:new'
      }]);

      await bot.sendMessage(
        chatId,
        '📊 Select a portfolio or enter a new address:',
        {
          reply_markup: {
            inline_keyboard: keyboard
          }
        }
      );
    } else {
      activeAllReturnsRequests.add(chatId);
      await bot.sendMessage(
        chatId,
        'Please enter the portfolio address:\n\n' +
        'Example: `0x119056cd66a3e7e2a5168893eb839bfd415a779f`',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Handle portfolio selection for all returns
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('allreturns:')) return;

    const chatId = query.message.chat.id;
    const selection = query.data.split(':')[1];

    if (selection === 'new') {
      activeAllReturnsRequests.add(chatId);
      await bot.editMessageText(
        'Please enter the portfolio address:\n\n' +
        'Example: `0x119056cd66a3e7e2a5168893eb839bfd415a779f`',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    try {
      // Show loading message
      await bot.editMessageText(
        getLoadingMessage(),
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );

      const result = await fetchAllReturnsData(selection);

      if (!result.success) {
        throw new Error(result.error);
      }

      const response = formatAllReturnsResponse(result.data, selection);

      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      logger.error(`All returns calculation error: ${error.message}`);
      await bot.editMessageText(
        'Error: Unable to calculate returns. Please try again later.',
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      );
    }
  });

  // Handle portfolio address input
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Only process if it's an active allreturns request
    if (activeAllReturnsRequests.has(chatId) && text && !text.startsWith('/') && text.startsWith('0x')) {
      const portfolioAddress = text.trim();
      activeAllReturnsRequests.delete(chatId);

      try {
        validatePortfolioAddress(portfolioAddress);

        const loadingMessage = await bot.sendMessage(
          chatId,
          getLoadingMessage(),
          { parse_mode: 'Markdown' }
        );

        const result = await fetchAllReturnsData(portfolioAddress);

        if (!result.success) {
          throw new Error(result.error);
        }

        const response = formatAllReturnsResponse(result.data, portfolioAddress);

        await bot.editMessageText(response, {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
          parse_mode: 'Markdown'
        });

      } catch (error) {
        logger.error(`All returns command error: ${error.message}`);
        const errorMessage = error.message.includes('Invalid portfolio address') 
          ? error.message
          : 'Error: Unable to calculate returns. Please try again later.';
        
        bot.sendMessage(chatId, errorMessage);
      }
    }
  });

  // Handle /allreturns command with direct address
  bot.onText(/^\/allreturns\s+([^\s]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const portfolioAddress = match[1];

    try {
      validatePortfolioAddress(portfolioAddress);

      const loadingMessage = await bot.sendMessage(
        chatId,
        getLoadingMessage(),
        { parse_mode: 'Markdown' }
      );

      const result = await fetchAllReturnsData(portfolioAddress);

      if (!result.success) {
        throw new Error(result.error);
      }

      const response = formatAllReturnsResponse(result.data, portfolioAddress);

      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      logger.error(`All returns command error: ${error.message}`);
      const errorMessage = error.message.includes('Invalid portfolio address') 
        ? error.message
        : 'Error: Unable to calculate returns. Please try again later.';
      
      bot.sendMessage(chatId, errorMessage);
    }
  });
};