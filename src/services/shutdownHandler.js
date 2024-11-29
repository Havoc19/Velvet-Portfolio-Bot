import { logger } from '../utils/logger.js';
import { getBotInstance } from './botInitializer.js';

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  const bot = getBotInstance();
  
  if (bot) {
    try {
      await bot.stopPolling();
      logger.info('Bot polling stopped successfully');
    } catch (error) {
      logger.error(`Error stopping bot: ${error.message}`);
    }
  }

  // Force exit after 3 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.warn('Forcing process exit after timeout');
    process.exit(1);
  }, 3000);
};

export const setupShutdownHandlers = () => {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
};