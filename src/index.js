import { initializeBot } from './services/botInitializer.js';
import { setupShutdownHandlers } from './services/shutdownHandler.js';
import { registerCommands } from './services/commandHandler.js';
import { logger } from './utils/logger.js';

const startBot = async () => {
  try {
    const bot = await initializeBot();
    registerCommands(bot);
    setupShutdownHandlers();
  } catch (error) {
    logger.error(`Fatal error during initialization: ${error.message}`);
    process.exit(1);
  }
};

startBot();