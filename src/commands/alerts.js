import { logger } from '../utils/logger.js';
import { validatePortfolioAddress } from '../utils/validation.js';
import { fetchPortfolioDetails } from '../services/portfolioService.js';
import { addAlert, getAlerts, removeAlert, removeAllAlerts } from '../services/alertService.js';
import { getSavedPortfolios } from '../services/portfolioStorage.js';
import { getRandomTip } from '../utils/investmentTips.js';

const formatAlertsList = (alerts) => {
  if (alerts.length === 0) {
    return '📊 *No Active Alerts*\n\nUse /setalert to create a new alert.';
  }

  const message = ['📊 *Active Alerts*\n'];
  const groupedAlerts = {};

  // Group alerts by portfolio
  alerts.forEach(alert => {
    if (!groupedAlerts[alert.portfolioAddress]) {
      groupedAlerts[alert.portfolioAddress] = [];
    }
    groupedAlerts[alert.portfolioAddress].push(alert);
  });

  // Format each portfolio's alerts
  for (const [address, portfolioAlerts] of Object.entries(groupedAlerts)) {
    message.push(`\n*Portfolio*: \`${address}\``);
    portfolioAlerts.forEach(alert => {
      const condition = alert.condition === 'gt' ? 'above' : 'below';
      message.push(`• Alert when returns go ${condition} ${alert.threshold}%`);
    });
  }

  return message.join('\n');
};

const getLoadingMessage = () => {
  return `🔍 *Setting up alert...*\n\n${getRandomTip()}`;
};

export const handleAlerts = (bot) => {
  bot.onText(/^\/alerts$/, async (msg) => {
    const chatId = msg.chat.id;
    const alerts = getAlerts(chatId);
    
    await bot.sendMessage(
      chatId, 
      formatAlertsList(alerts), 
      { parse_mode: 'Markdown' }
    );
  });
};

export const handleSetAlert = (bot) => {
  const pendingAlerts = new Map();

  bot.onText(/^\/setalert$/, async (msg) => {
    const chatId = msg.chat.id;
    const savedPortfolios = getSavedPortfolios(chatId);

    if (savedPortfolios.length > 0) {
      // Create keyboard with saved portfolios
      const keyboard = savedPortfolios.map(portfolio => [{
        text: `${portfolio.name} (${portfolio.symbol})`,
        callback_data: `setalert:${portfolio.address}`
      }]);

      // Add option to enter new address
      keyboard.push([{
        text: '➕ Enter New Portfolio Address',
        callback_data: 'setalert:new'
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
      pendingAlerts.set(chatId, { step: 'address' });
      await bot.sendMessage(
        chatId,
        '⏰ *Set Return Alert*\n\nPlease enter the portfolio address:',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Handle portfolio selection for alert
  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('setalert:')) return;

    const chatId = query.message.chat.id;
    const selection = query.data.split(':')[1];

    if (selection === 'new') {
      pendingAlerts.set(chatId, { step: 'address' });
      await bot.editMessageText(
        '⏰ *Set Return Alert*\n\nPlease enter the portfolio address:',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    try {
      const loadingMsg = await bot.editMessageText(
        getLoadingMessage(),
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );

      const details = await fetchPortfolioDetails(selection);
      if (!details.success) throw new Error('Portfolio not found');

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📈 Above', callback_data: `condition:gt:${selection}` },
              { text: '📉 Below', callback_data: `condition:lt:${selection}` }
            ]
          ]
        }
      };

      await bot.editMessageText(
        '📊 Select alert condition:',
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          ...keyboard
        }
      );
      
      pendingAlerts.set(chatId, { 
        step: 'condition', 
        address: selection,
        portfolioName: details.data.name,
        portfolioSymbol: details.data.symbol
      });
    } catch (error) {
      logger.error(`Error setting up alert: ${error.message}`);
      await bot.editMessageText(
        `❌ ${error.message}\n\nPlease try again or use /cancel to stop.`,
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      );
      pendingAlerts.delete(chatId);
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const pending = pendingAlerts.get(chatId);

    if (!pending || !text || text.startsWith('/')) return;

    try {
      switch (pending.step) {
        case 'address':
          validatePortfolioAddress(text);
          const details = await fetchPortfolioDetails(text);
          if (!details.success) throw new Error('Portfolio not found');

          const keyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📈 Above', callback_data: `condition:gt:${text}` },
                  { text: '📉 Below', callback_data: `condition:lt:${text}` }
                ]
              ]
            }
          };

          await bot.sendMessage(
            chatId,
            '📊 Select alert condition:',
            keyboard
          );
          
          pendingAlerts.set(chatId, { 
            step: 'condition', 
            address: text,
            portfolioName: details.data.name,
            portfolioSymbol: details.data.symbol
          });
          break;

        case 'threshold':
          const threshold = parseFloat(text);
          if (isNaN(threshold)) throw new Error('Please enter a valid number');
          if (threshold <= 0) throw new Error('Threshold must be greater than 0');
          if (threshold > 1000) throw new Error('Threshold must be less than 1000%');

          const alertId = addAlert(chatId, pending.address, threshold, pending.condition);
          const condition = pending.condition === 'gt' ? 'above' : 'below';
          const portfolioInfo = `${pending.portfolioName} (${pending.portfolioSymbol})`;
          
          await bot.sendMessage(
            chatId,
            `✅ *Alert Set Successfully!*\n\n` +
            `*Portfolio*: ${portfolioInfo}\n` +
            `*Condition*: Returns go ${condition} ${threshold}%\n\n` +
            `You'll be notified when the condition is met.`,
            { parse_mode: 'Markdown' }
          );
          
          pendingAlerts.delete(chatId);
          break;
      }
    } catch (error) {
      await bot.sendMessage(
        chatId,
        `❌ ${error.message}\n\nPlease try again or use /cancel to stop.`
      );
      pendingAlerts.delete(chatId);
    }
  });

  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('condition:')) return;

    const chatId = query.message.chat.id;
    const [, condition, address] = query.data.split(':');
    const pending = pendingAlerts.get(chatId);

    if (!pending) return;

    await bot.editMessageText(
      '📊 Enter return threshold percentage:\n\n' +
      'Example: Enter 50 for 50%\n\n' +
      'Note: Must be between 0 and 1000',
      {
        chat_id: chatId,
        message_id: query.message.message_id
      }
    );

    pendingAlerts.set(chatId, {
      ...pending,
      step: 'threshold',
      address,
      condition
    });

    await bot.answerCallbackQuery(query.id);
  });
};

export const handleRemoveAlert = (bot) => {
  bot.onText(/^\/removealert$/, async (msg) => {
    const chatId = msg.chat.id;
    const alerts = getAlerts(chatId);

    if (alerts.length === 0) {
      await bot.sendMessage(
        chatId,
        '📊 You have no active alerts to remove.'
      );
      return;
    }

    const groupedAlerts = {};
    for (const alert of alerts) {
      if (!groupedAlerts[alert.portfolioAddress]) {
        groupedAlerts[alert.portfolioAddress] = [];
      }
      groupedAlerts[alert.portfolioAddress].push(alert);
    }

    const keyboard = [];
    for (const [address, portfolioAlerts] of Object.entries(groupedAlerts)) {
      try {
        const details = await fetchPortfolioDetails(address);
        const displayName = details.success
          ? `${details.data.name} (${details.data.symbol})`
          : `Portfolio ${address.slice(0, 6)}...`;
        
        keyboard.push([{
          text: `${displayName} (${portfolioAlerts.length} alerts)`,
          callback_data: `remove:${address}`
        }]);
      } catch (error) {
        logger.error(`Error fetching portfolio details: ${error.message}`);
      }
    }

    keyboard.push([{
      text: '🗑️ Remove All Alerts',
      callback_data: 'remove:all'
    }]);

    await bot.sendMessage(
      chatId,
      '📊 Select alerts to remove:',
      {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
  });

  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('remove:')) return;

    const chatId = query.message.chat.id;
    const [, target] = query.data.split(':');

    try {
      if (target === 'all') {
        const count = removeAllAlerts(chatId);
        await bot.editMessageText(
          `✅ Successfully removed all alerts (${count} total).`,
          {
            chat_id: chatId,
            message_id: query.message.message_id
          }
        );
      } else {
        const alerts = getAlerts(chatId).filter(a => a.portfolioAddress === target);
        const keyboard = alerts.map(alert => [{
          text: `${alert.condition === 'gt' ? '📈' : '📉'} ${alert.threshold}%`,
          callback_data: `removealert:${alert.id}`
        }]);

        keyboard.push([{
          text: '« Back',
          callback_data: 'removealert:back'
        }]);

        await bot.editMessageText(
          '📊 Select alert to remove:',
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
              inline_keyboard: keyboard
            }
          }
        );
      }
    } catch (error) {
      logger.error(`Error removing alert: ${error.message}`);
      await bot.answerCallbackQuery(query.id, {
        text: 'Failed to remove alert. Please try again.',
        show_alert: true
      });
    }
  });

  bot.on('callback_query', async (query) => {
    if (!query.data.startsWith('removealert:')) return;

    const chatId = query.message.chat.id;
    const alertId = query.data.split(':')[1];

    try {
      if (alertId === 'back') {
        // Re-trigger the /removealert command
        bot.emit('text', { text: '/removealert', chat: { id: chatId } });
        await bot.deleteMessage(chatId, query.message.message_id);
        return;
      }

      const alerts = getAlerts(chatId);
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) throw new Error('Alert not found');

      const removed = removeAlert(chatId, alert.portfolioAddress, alertId);
      
      if (removed) {
        await bot.editMessageText(
          '✅ Alert removed successfully.',
          {
            chat_id: chatId,
            message_id: query.message.message_id
          }
        );
      } else {
        throw new Error('Failed to remove alert');
      }
    } catch (error) {
      logger.error(`Error removing specific alert: ${error.message}`);
      await bot.answerCallbackQuery(query.id, {
        text: 'Failed to remove alert. Please try again.',
        show_alert: true
      });
    }
  });
};