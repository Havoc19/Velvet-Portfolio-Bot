import { logger } from '../utils/logger.js';

// In-memory storage for saved portfolios
const userPortfolios = new Map();

export const savePortfolio = (chatId, portfolioData) => {
  try {
    if (!userPortfolios.has(chatId)) {
      userPortfolios.set(chatId, new Map());
    }
    
    const portfolios = userPortfolios.get(chatId);
    portfolios.set(portfolioData.address, {
      name: portfolioData.name,
      symbol: portfolioData.symbol,
      creatorName: portfolioData.creatorName,
      chainName: portfolioData.chainName,
      savedAt: new Date()
    });

    logger.info(`Portfolio saved for user ${chatId}: ${portfolioData.address}`);
    return true;
  } catch (error) {
    logger.error(`Error saving portfolio: ${error.message}`);
    return false;
  }
};

export const removePortfolio = (chatId, portfolioAddress) => {
  try {
    const portfolios = userPortfolios.get(chatId);
    if (!portfolios) return false;
    
    const result = portfolios.delete(portfolioAddress);
    if (portfolios.size === 0) {
      userPortfolios.delete(chatId);
    }
    
    return result;
  } catch (error) {
    logger.error(`Error removing portfolio: ${error.message}`);
    return false;
  }
};

export const getSavedPortfolios = (chatId) => {
  try {
    const portfolios = userPortfolios.get(chatId);
    if (!portfolios) return [];
    
    return Array.from(portfolios.entries()).map(([address, data]) => ({
      address,
      ...data
    }));
  } catch (error) {
    logger.error(`Error getting saved portfolios: ${error.message}`);
    return [];
  }
};

export const isPortfolioSaved = (chatId, portfolioAddress) => {
  try {
    const portfolios = userPortfolios.get(chatId);
    return portfolios?.has(portfolioAddress) || false;
  } catch (error) {
    logger.error(`Error checking saved portfolio: ${error.message}`);
    return false;
  }
};