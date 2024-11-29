import { getRandomTip } from '../utils/investmentTips.js';

export const handleStart = (bot) => {
  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `🤖 *Velvet Portfolio Bot*

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

_Click any command to get started!_`,
      { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }
    );
  });
};