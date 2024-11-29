import { fetchReturnsDataWithScale } from '../services/returnsService.js';
import { validatePortfolioAddress } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { getSavedPortfolios } from '../services/portfolioStorage.js';
import { getRandomTip } from '../utils/investmentTips.js';

const timeScaleOptions = {
  'hour': '1 Hour',
  'day': '24 Hours',
  'week': '1 Week',
  'one_month': '1 Month',
  'three_month': '3 Months',
  'all': 'All Time'
};

const createTimeScaleKeyboard = () => {
  const keyboard = [];
  const entries = Object.entries(timeScaleOptions);
  
  // Create rows with 2 buttons each
  for (let i = 0; i < entries.length; i += 2) {
    const row = [];
    row.push({ text: entries[i][1], callback_data: `scale:${entries[i][0]}` });
    if (entries[i + 1]) {
      row.push({ text: entries[i + 1][1], callback_data: `scale:${entries[i + 1][0]}` });
    }
    keyboard.push(row);
  }
  
  return keyboard;
};

const formatReturnsResponse = (data, portfolioAddress, selectedScale) => {
  const { returns, nav } = data;
  const timeFrame = timeScaleOptions[selectedScale];
  
  const returnsDisplay = returns !== null
    ? `${parseFloat(returns) >= 0 ? '📈' : '📉'} ${parseFloat(returns) >= 0 ? '+' : ''}${returns}%`
    : 'N/A';

  return `
📊 *Portfolio Returns* (${timeFrame})
━━━━━━━━━━━━━━━━━━━━━
• *Portfolio*: \`${portfolioAddress}\`
• *NAV*: $${nav}
• *Returns*: ${returnsDisplay}
`.trim();
};

const getLoadingMessage = () => {
  return `🔍 *Calculating returns...*\n\n${getRandomTip()}`;
};

export const handleReturns = (bot) => {
  // Store active returns requests
  const activeReturnsRequests = new Set();

  // Handle /returns command without address
  bot.onText(/^\/returns$/, async (msg) => {
    const chatId = msg.chat.id;
    const savedPortfolios = getSavedPortfolios(chatId);

    if (savedPortfolios.length > 0) {
      // Create keyboard with saved portfolios
      const keyboard = savedPortfolios.map(portfolio => [{
        text: `${portfolio.name} (${portfolio.symbol})`,
        callback_data: `returns:${portfolio.address}`
      }]);

      // Add option to enter new address
      keyboard.push([{
        text: '➕ Enter New Portfolio Address',
        callback_data: 'returns:new'
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
      activeReturnsRequests.add(chatId);
      await bot.sendMessage(
        chatId,
        'Please enter the portfolio address:\n\n' +
        'Example: `0x119056cd66a3e7e2a5168893eb839bfd415a779f`',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Handle portfolio selection for returns
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('returns:')) return;

    const chatId = query.message.chat.id;
    const selection = query.data.split(':')[1];

    if (selection === 'new') {
      activeReturnsRequests.add(chatId);
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

    // Show time scale options
    await bot.editMessageText(
      'Select the time scale:',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: createTimeScaleKeyboard()
        }
      }
    );

    // Store the address temporarily
    bot.userAddresses = bot.userAddresses || {};
    bot.userAddresses[chatId] = selection;
  });

  // Handle portfolio address input
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Only process if it's an active returns request
    if (activeReturnsRequests.has(chatId) && text && !text.startsWith('/') && text.startsWith('0x')) {
      const portfolioAddress = text.trim();
      activeReturnsRequests.delete(chatId);

      try {
        validatePortfolioAddress(portfolioAddress);
        
        await bot.sendMessage(
          chatId,
          'Select the time scale:',
          {
            reply_markup: {
              inline_keyboard: createTimeScaleKeyboard()
            }
          }
        );

        // Store the address temporarily
        bot.userAddresses = bot.userAddresses || {};
        bot.userAddresses[chatId] = portfolioAddress;

      } catch (error) {
        logger.error(`Returns command error: ${error.message}`);
        bot.sendMessage(chatId, error.message);
      }
    }
  });

  // Handle time scale selection
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('scale:')) return;

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const portfolioAddress = bot.userAddresses?.[chatId];
    
    if (!portfolioAddress) return;

    const selectedScale = query.data.split(':')[1];

    try {
      // Show loading message
      await bot.editMessageText(
        getLoadingMessage(),
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );

      const result = await fetchReturnsDataWithScale(portfolioAddress, selectedScale);

      if (!result.success) {
        throw new Error(result.error);
      }

      const response = formatReturnsResponse(result.data, portfolioAddress, selectedScale);

      // Update message with results
      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      });

      // Clean up stored address
      delete bot.userAddresses[chatId];

    } catch (error) {
      logger.error(`Returns calculation error: ${error.message}`);
      await bot.editMessageText(
        'Error: Unable to calculate returns. Please try again later.',
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
    }
  });

  // Handle /returns command with direct address
  bot.onText(/^\/returns\s+([^\s]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const portfolioAddress = match[1];

    try {
      validatePortfolioAddress(portfolioAddress);
      
      await bot.sendMessage(
        chatId,
        'Select the time scale:',
        {
          reply_markup: {
            inline_keyboard: createTimeScaleKeyboard()
          }
        }
      );

      // Store the address temporarily
      bot.userAddresses = bot.userAddresses || {};
      bot.userAddresses[chatId] = portfolioAddress;

    } catch (error) {
      logger.error(`Returns command error: ${error.message}`);
      bot.sendMessage(chatId, error.message);
    }
  });
};