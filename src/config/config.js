import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const requiredEnvVars = ['BOT_TOKEN'];

// Validate required environment variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

export const config = {
  botToken: process.env.BOT_TOKEN,
  apiBaseUrl: 'https://api.velvet.capital/api/v3'
};