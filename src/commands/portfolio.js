import { fetchPortfolioDetails } from '../services/portfolioService.js';
import { validatePortfolioAddress } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { getRandomTip } from '../utils/investmentTips.js';
import { savePortfolio, getSavedPortfolios } from '../services/portfolioStorage.js';

const formatPortfolioResponse = (data, portfolioAddress) => {
  const { name, symbol, creatorName, chainName, tvl, nav, returns } = data;
  
  return `
📊 *Portfolio Analysis*
━━━━━━━━━━━━━━━━━━━━━
• *Portfolio*: \`${portfolioAddress}\`
• *Name*: ${name} (${symbol})
• *Creator*: ${creatorName}
• *Network*: ${chainName.toUpperCase()}
• *NAV*: $${nav}
• *TVL*: ${tvl}
${returns ? `• *Returns*: ${parseFloat(returns) >= 0 ? '📈' : '📉'} ${parseFloat(returns) >= 0 ? '+' : ''}${returns}%` : ''}
`.trim();
};

const getLoadingMessage = () => {
  return `🔍 *Fetching portfolio details...*\n\n${getRandomTip()}`;
};

export const handlePortfolio = (bot) => {
  // Store active portfolio requests
  const activePortfolioRequests = new Set();

  // Handle /portfolio command without address
  bot.onText(/^\/portfolio$/, async (msg) => {
    const chatId = msg.chat.id;
    const savedPortfolios = getSavedPortfolios(chatId);

    if (savedPortfolios.length > 0) {
      // Create keyboard with saved portfolios
      const keyboard = savedPortfolios.map(portfolio => [{
        text: `${portfolio.name} (${portfolio.symbol})`,
        callback_data: `portfolio:${portfolio.address}`
      }]);

      // Add option to enter new address
      keyboard.push([{
        text: '➕ Enter New Portfolio Address',
        callback_data: 'portfolio:new'
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
      activePortfolioRequests.add(chatId);
      await bot.sendMessage(
        chatId,
        'Please enter the portfolio address:\n\n' +
        'Example: `0x119056cd66a3e7e2a5168893eb839bfd415a779f`',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Handle portfolio selection from saved portfolios
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('portfolio:')) return;

    const chatId = query.message.chat.id;
    const selection = query.data.split(':')[1];

    if (selection === 'new') {
      activePortfolioRequests.add(chatId);
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
      const loadingMessage = await bot.editMessageText(
        getLoadingMessage(),
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );

      const result = await fetchPortfolioDetails(selection);

      if (!result.success) {
        throw new Error(result.error);
      }

      const response = formatPortfolioResponse(result.data, selection);

      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      logger.error(`Portfolio command error: ${error.message}`);
      await bot.editMessageText(
        'Error: Unable to fetch portfolio details. Please try again later.',
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

    // Only process if it's an active portfolio request
    if (activePortfolioRequests.has(chatId) && text && !text.startsWith('/') && text.startsWith('0x')) {
      const portfolioAddress = text.trim();
      activePortfolioRequests.delete(chatId); // Clear the request

      try {
        validatePortfolioAddress(portfolioAddress);

        const loadingMessage = await bot.sendMessage(
          chatId,
          getLoadingMessage(),
          { parse_mode: 'Markdown' }
        );

        const result = await fetchPortfolioDetails(portfolioAddress);

        if (!result.success) {
          throw new Error(result.error);
        }

        // Save portfolio automatically
        savePortfolio(chatId, {
          address: portfolioAddress,
          ...result.data
        });

        const response = formatPortfolioResponse(result.data, portfolioAddress);

        await bot.editMessageText(response, {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
          parse_mode: 'Markdown'
        });

      } catch (error) {
        logger.error(`Portfolio command error: ${error.message}`);
        const errorMessage = error.message.includes('Invalid portfolio address') 
          ? error.message
          : 'Error: Unable to fetch portfolio details. Please ensure the portfolio address is correct or try again later.';
        
        bot.sendMessage(chatId, errorMessage);
      }
    }
  });

  // Handle /portfolio command with direct address
  bot.onText(/^\/portfolio\s+([^\s]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const portfolioAddress = match[1];

    try {
      validatePortfolioAddress(portfolioAddress);

      const loadingMessage = await bot.sendMessage(
        chatId,
        getLoadingMessage(),
        { parse_mode: 'Markdown' }
      );

      const result = await fetchPortfolioDetails(portfolioAddress);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save portfolio automatically
      savePortfolio(chatId, {
        address: portfolioAddress,
        ...result.data
      });

      const response = formatPortfolioResponse(result.data, portfolioAddress);

      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      logger.error(`Portfolio command error: ${error.message}`);
      const errorMessage = error.message.includes('Invalid portfolio address') 
        ? error.message
        : 'Error: Unable to fetch portfolio details. Please ensure the portfolio address is correct or try again later.';
      
      bot.sendMessage(chatId, errorMessage);
    }
  });
};