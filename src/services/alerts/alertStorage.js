import { logger } from '../../utils/logger.js';

// In-memory storage for alerts
const alerts = new Map();

export const addAlertToStorage = (chatId, portfolioAddress, threshold, condition) => {
  const key = `${chatId}:${portfolioAddress}`;
  const newAlert = {
    chatId,
    portfolioAddress,
    threshold: parseFloat(threshold),
    condition,
    id: Date.now().toString(),
    createdAt: new Date()
  };

  if (!alerts.has(key)) {
    alerts.set(key, []);
  }
  
  alerts.get(key).push(newAlert);
  logger.info(`Alert set for ${portfolioAddress} ${condition === 'gt' ? 'above' : 'below'} ${threshold}%`);
  return newAlert.id;
};

export const removeAlertFromStorage = (chatId, portfolioAddress, alertId) => {
  const key = `${chatId}:${portfolioAddress}`;
  const alertList = alerts.get(key);
  
  if (!alertList) return false;
  
  const index = alertList.findIndex(alert => alert.id === alertId);
  if (index === -1) return false;
  
  alertList.splice(index, 1);
  if (alertList.length === 0) {
    alerts.delete(key);
  }
  
  return true;
};

export const removeAllAlertsFromStorage = (chatId) => {
  let count = 0;
  for (const [key, alertList] of alerts) {
    if (key.startsWith(`${chatId}:`)) {
      count += alertList.length;
      alerts.delete(key);
    }
  }
  return count;
};

export const getAlertsFromStorage = (chatId) => {
  const userAlerts = [];
  for (const [key, alertList] of alerts) {
    if (key.startsWith(`${chatId}:`)) {
      userAlerts.push(...alertList);
    }
  }
  return userAlerts.sort((a, b) => a.threshold - b.threshold);
};

export const getAllAlerts = () => alerts;