import Big from 'big.js';
import { logger } from './logger.js';

export const formatCurrency = (value, decimals = 2) => {
  try {
    const num = new Big(value);
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } catch (error) {
    logger.error(`Error formatting currency: ${error.message}`);
    return '0.00';
  }
};

export const fromWei = (value, decimals = 18) => {
  try {
    if (!value || value === '0') return '0';
    const amount = new Big(value);
    return amount.div(new Big(10).pow(decimals)).toString();
  } catch (error) {
    logger.error(`Error converting from wei: ${error.message}`);
    return '0';
  }
};

export const formatLargeNumber = (value) => {
  try {
    if (!value) return '0.00';
    const numStr = value.toString().replace(/[^\d]/g, '');
    const firstFive = numStr.slice(0, 5);
    return `${firstFive.slice(0, 3)}.${firstFive.slice(3)}...`;
  } catch (error) {
    logger.error(`Error formatting large number: ${error.message}`);
    return '0.00';
  }
};

export const formatNAV = (value) => {
  try {
    if (!value || value === '0') return '0.000000';
    const num = new Big(value);
    // Use 6 decimal places for small numbers
    if (num.lt(0.01)) {
      return num.toFixed(6);
    }
    // Use 4 decimal places for medium numbers
    if (num.lt(1)) {
      return num.toFixed(4);
    }
    // Use 2 decimal places for larger numbers
    return num.toFixed(2);
  } catch (error) {
    logger.error(`Error formatting NAV: ${error.message}`);
    return '0.000000';
  }
};