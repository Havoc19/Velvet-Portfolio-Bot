const investmentTips = [
  '💎 Remember: Long-term investing often outperforms short-term trading.',
  '🔍 Always research the team behind a project before investing.',
  '📊 Past performance doesn\'t guarantee future results.',
  '⚖️ Diversification helps manage risk in your portfolio.',
  '🎯 Set clear investment goals and stick to your strategy.',
  '📈 Dollar-cost averaging can help reduce market timing risk.',
  '🔐 Keep your private keys secure and never share them.',
  '💰 Only invest what you can afford to lose.',
  '📱 Enable 2FA on all your crypto accounts.',
  '🌐 Stay informed about market trends and developments.',
  '⚡ Consider transaction fees when rebalancing portfolios.',
  '📚 Education is your best investment - keep learning.',
  '🛡️ Be cautious of projects promising unrealistic returns.',
  '🤝 Join communities but verify information independently.',
  '📱 Use reliable portfolio tracking tools.',
  '🔄 Regular portfolio rebalancing helps maintain your strategy.',
  '🎢 Prepare for volatility - it\'s normal in crypto.',
  '💼 Keep detailed records for tax purposes.',
  '⏰ Time in the market beats timing the market.',
  '🔍 Verify smart contract audits before investing.'
];

export const getRandomTip = () => {
  const randomIndex = Math.floor(Math.random() * investmentTips.length);
  return `*Investment Tip:* ${investmentTips[randomIndex]}`;
};