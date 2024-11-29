import { logger } from '../../utils/logger.js';
import { 
  addAlertToStorage,
  removeAlertFromStorage,
  removeAllAlertsFromStorage,
  getAlertsFromStorage
} from './alertStorage.js';

export const addAlert = (chatId, portfolioAddress, threshold, condition) => {
  try {
    return addAlertToStorage(chatId, portfolioAddress, threshold, condition);
  } catch (error) {
    logger.error(`Error adding alert: ${error.message}`);
    return null;
  }
};

export const removeAlert = (chatId, portfolioAddress, alertId) => {
  try {
    return removeAlertFromStorage(chatId, portfolioAddress, alertId);
  } catch (error) {
    logger.error(`Error removing alert: ${error.message}`);
    return false;
  }
};

export const removeAllAlerts = (chatId) => {
  try {
    return removeAllAlertsFromStorage(chatId);
  } catch (error) {
    logger.error(`Error removing all alerts: ${error.message}`);
    return 0;
  }
};

export const getAlerts = (chatId) => {
  try {
    return getAlertsFromStorage(chatId);
  } catch (error) {
    logger.error(`Error getting alerts: ${error.message}`);
    return [];
  }
};